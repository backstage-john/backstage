import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { InputError } from '@backstage/errors';

export interface InvokeGrpcMethodInput {
  /** Raw .proto source, as resolved from an API entity's `spec.definition`. */
  protoText: string;
  /** Fully- or partially-qualified service name, e.g. "aurora.tracking.v1.TrackingService". */
  serviceName: string;
  /** RPC method name, matching the .proto source exactly (e.g. "GetTrackingHistory"). */
  methodName: string;
  /** host:port of the live gRPC server to call. */
  address: string;
  /** Request message payload. */
  request: Record<string, unknown>;
}

export interface InvokeGrpcMethodResult {
  responseStream: boolean;
  responses: unknown[];
}

// @grpc/proto-loader only loads from a file path, so the incoming .proto text
// (which lives inside a catalog entity, not on this process' filesystem) is
// written to a throwaway temp file for the duration of the load.
function loadPackageDefinition(protoText: string) {
  const tmpFile = path.join(
    os.tmpdir(),
    `grpc-explorer-${crypto.randomUUID()}.proto`,
  );
  fs.writeFileSync(tmpFile, protoText, 'utf8');
  try {
    return protoLoader.loadSync(tmpFile, {
      keepCase: false,
      longs: Number,
      enums: String,
      defaults: true,
      oneofs: true,
    });
  } finally {
    fs.unlinkSync(tmpFile);
  }
}

function resolveServiceConstructor(
  grpcPackage: grpc.GrpcObject,
  serviceName: string,
): grpc.ServiceClientConstructor | undefined {
  // gRPC packages nest by proto package path (e.g. grpcPackage.aurora.tracking.v1.TrackingService),
  // so accepting a bare service name ("TrackingService") requires searching the
  // whole tree, not just stripping leading segments off a dotted name.
  const wantedLeaf = serviceName.split('.').pop();

  function search(node: unknown, path: string[]): grpc.ServiceClientConstructor | undefined {
    if (typeof node === 'function' && (node as any).service) {
      const isMatch =
        path.join('.') === serviceName || path[path.length - 1] === wantedLeaf;
      return isMatch ? (node as grpc.ServiceClientConstructor) : undefined;
    }
    if (node && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) {
        const found = search(child, [...path, key]);
        if (found) return found;
      }
    }
    return undefined;
  }

  return search(grpcPackage, []);
}

function findMethodDefinition(
  ServiceCtor: grpc.ServiceClientConstructor,
  methodName: string,
) {
  const normalized = methodName.toLowerCase();
  const entries = Object.entries(ServiceCtor.service);
  const match = entries.find(
    ([key, def]) =>
      key.toLowerCase() === normalized ||
      (def.originalName ?? '').toLowerCase() === normalized,
  );
  return match?.[1];
}

function toClientMethodName(originalName: string) {
  return originalName.charAt(0).toLowerCase() + originalName.slice(1);
}

export async function invokeGrpcMethod({
  protoText,
  serviceName,
  methodName,
  address,
  request,
}: InvokeGrpcMethodInput): Promise<InvokeGrpcMethodResult> {
  const packageDefinition = loadPackageDefinition(protoText);
  const grpcPackage = grpc.loadPackageDefinition(packageDefinition);

  const ServiceCtor = resolveServiceConstructor(grpcPackage, serviceName);
  if (!ServiceCtor) {
    throw new InputError(
      `Service "${serviceName}" was not found in the provided .proto contract`,
    );
  }

  const methodDefinition = findMethodDefinition(ServiceCtor, methodName);
  if (!methodDefinition) {
    throw new InputError(
      `Method "${methodName}" was not found on service "${serviceName}"`,
    );
  }
  if (methodDefinition.requestStream) {
    throw new InputError(
      `Method "${methodName}" is client-streaming, which this explorer does not support`,
    );
  }

  const client = new ServiceCtor(address, grpc.credentials.createInsecure());
  const clientMethodName = toClientMethodName(
    methodDefinition.originalName ?? methodName,
  );
  const call = (client as any)[clientMethodName];
  if (typeof call !== 'function') {
    throw new InputError(
      `Could not resolve a callable client method for "${methodName}"`,
    );
  }

  const responseStream = Boolean(methodDefinition.responseStream);

  try {
    if (!responseStream) {
      const response = await new Promise<unknown>((resolve, reject) => {
        call.call(
          client,
          request,
          (err: grpc.ServiceError | null, res: unknown) => {
            if (err) reject(err);
            else resolve(res);
          },
        );
      });
      return { responseStream: false, responses: [response] };
    }

    const responses = await new Promise<unknown[]>((resolve, reject) => {
      const collected: unknown[] = [];
      const stream = call.call(client, request);
      stream.on('data', (chunk: unknown) => collected.push(chunk));
      stream.on('end', () => resolve(collected));
      stream.on('error', (err: grpc.ServiceError) => reject(err));
    });
    return { responseStream: true, responses };
  } finally {
    client.close();
  }
}
