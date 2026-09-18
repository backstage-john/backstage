export interface ProtoRpc {
  name: string;
  requestType: string;
  requestStreaming: boolean;
  responseType: string;
  responseStreaming: boolean;
}

export interface ProtoService {
  name: string;
  rpcs: ProtoRpc[];
}

export interface ProtoMessage {
  name: string;
  fields: string[];
}

export interface ParsedProto {
  packageName?: string;
  services: ProtoService[];
  messages: ProtoMessage[];
}

const SERVICE_RE = /service\s+(\w+)\s*\{([^}]*)\}/g;
const RPC_RE =
  /rpc\s+(\w+)\s*\(\s*(stream\s+)?(\w+)\s*\)\s*returns\s*\(\s*(stream\s+)?(\w+)\s*\)/g;
const MESSAGE_RE = /message\s+(\w+)\s*\{([^}]*)\}/g;
const PACKAGE_RE = /package\s+([\w.]+)\s*;/;

// A lightweight, regex-based parser covering the flat proto3 shapes used in
// this reference catalog (single-level services/messages, no nested types).
// It is not a full protobuf grammar — good enough for a read-only contract
// viewer, not for code generation.
export function parseProto(source: string): ParsedProto {
  const packageMatch = PACKAGE_RE.exec(source);

  const services: ProtoService[] = [];
  let serviceMatch: RegExpExecArray | null;
  while ((serviceMatch = SERVICE_RE.exec(source))) {
    const [, name, body] = serviceMatch;
    const rpcs: ProtoRpc[] = [];
    let rpcMatch: RegExpExecArray | null;
    RPC_RE.lastIndex = 0;
    while ((rpcMatch = RPC_RE.exec(body))) {
      rpcs.push({
        name: rpcMatch[1],
        requestStreaming: Boolean(rpcMatch[2]),
        requestType: rpcMatch[3],
        responseStreaming: Boolean(rpcMatch[4]),
        responseType: rpcMatch[5],
      });
    }
    services.push({ name, rpcs });
  }

  const messages: ProtoMessage[] = [];
  let messageMatch: RegExpExecArray | null;
  while ((messageMatch = MESSAGE_RE.exec(source))) {
    const [, name, body] = messageMatch;
    const fields = body
      .split('\n')
      .map(line => line.trim().replace(/;$/, ''))
      .filter(line => line.length > 0 && !line.startsWith('//'));
    messages.push({ name, fields });
  }

  return { packageName: packageMatch?.[1], services, messages };
}
