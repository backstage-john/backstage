import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

export const TEST_PROTO = `
syntax = "proto3";
package test.v1;

service EchoService {
  rpc Echo(EchoRequest) returns (EchoResponse);
  rpc EchoStream(EchoRequest) returns (stream EchoResponse);
}

message EchoRequest {
  string message = 1;
}

message EchoResponse {
  string message = 1;
}
`;

// A tiny, real gRPC server used to exercise invokeGrpcMethod against an
// actual live service instead of mocks.
export async function startTestEchoServer(): Promise<{
  address: string;
  stop: () => Promise<void>;
}> {
  const tmpFile = path.join(
    os.tmpdir(),
    `test-echo-${crypto.randomUUID()}.proto`,
  );
  fs.writeFileSync(tmpFile, TEST_PROTO, 'utf8');
  let packageDefinition;
  try {
    packageDefinition = protoLoader.loadSync(tmpFile, {
      keepCase: false,
      longs: Number,
      enums: String,
      defaults: true,
      oneofs: true,
    });
  } finally {
    fs.unlinkSync(tmpFile);
  }

  const proto = grpc.loadPackageDefinition(packageDefinition) as any;
  const server = new grpc.Server();
  server.addService(proto.test.v1.EchoService.service, {
    echo: (call: grpc.ServerUnaryCall<any, any>, callback: grpc.sendUnaryData<any>) => {
      callback(null, { message: `echo: ${call.request.message}` });
    },
    echoStream: (call: grpc.ServerWritableStream<any, any>) => {
      const words = String(call.request.message).split(' ');
      words.forEach(word => call.write({ message: word }));
      call.end();
    },
  });

  const port = await new Promise<number>((resolve, reject) => {
    server.bindAsync(
      '127.0.0.1:0',
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) reject(err);
        else resolve(boundPort);
      },
    );
  });

  return {
    address: `127.0.0.1:${port}`,
    stop: () => new Promise<void>(resolve => server.tryShutdown(() => resolve())),
  };
}
