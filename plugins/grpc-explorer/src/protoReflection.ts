import protobuf from 'protobufjs';

export interface GrpcFieldModel {
  name: string;
  type: string;
  repeated: boolean;
}

export interface GrpcMethodModel {
  name: string;
  requestTypeName: string;
  responseTypeName: string;
  requestStream: boolean;
  responseStream: boolean;
  requestFields: GrpcFieldModel[];
}

export interface GrpcServiceModel {
  name: string;
  /** Fully-qualified name, e.g. "aurora.tracking.v1.TrackingService" (no leading dot). */
  fullName: string;
  methods: GrpcMethodModel[];
}

function collectServices(
  node: protobuf.ReflectionObject,
  results: protobuf.Service[],
) {
  if (node instanceof protobuf.Service) {
    results.push(node);
  }
  const nested = (node as protobuf.NamespaceBase).nestedArray;
  nested?.forEach(child => collectServices(child, results));
}

function toFieldModel(field: protobuf.Field): GrpcFieldModel {
  return {
    name: field.name,
    type: field.type,
    repeated: field.repeated,
  };
}

/**
 * Parses raw .proto source (as found in an API entity's `spec.definition`)
 * into a reflection-based model of its services, methods, and request
 * message fields — generic over whatever contract is provided, using
 * protobufjs's own parser rather than any bespoke text parsing.
 */
export function parseGrpcContract(protoText: string): GrpcServiceModel[] {
  const { root } = protobuf.parse(protoText, new protobuf.Root(), {
    keepCase: false,
  });

  const services: protobuf.Service[] = [];
  collectServices(root, services);

  return services.map(service => {
    service.methodsArray.forEach(method => method.resolve());

    return {
      name: service.name,
      fullName: service.fullName.replace(/^\./, ''),
      methods: service.methodsArray.map(method => ({
        name: method.name,
        requestTypeName: method.requestType,
        responseTypeName: method.responseType,
        requestStream: Boolean(method.requestStream),
        responseStream: Boolean(method.responseStream),
        requestFields: (method.resolvedRequestType?.fieldsArray ?? []).map(
          toFieldModel,
        ),
      })),
    };
  });
}

const SCALAR_NUMBER_TYPES = new Set([
  'double',
  'float',
  'int32',
  'int64',
  'uint32',
  'uint64',
  'sint32',
  'sint64',
  'fixed32',
  'fixed64',
  'sfixed32',
  'sfixed64',
]);

/** How the explorer form should render an input for this field. */
export function fieldInputKind(
  field: GrpcFieldModel,
): 'number' | 'boolean' | 'text' | 'json' {
  if (field.repeated) return 'json';
  if (field.type === 'bool') return 'boolean';
  if (SCALAR_NUMBER_TYPES.has(field.type)) return 'number';
  if (field.type === 'string' || field.type === 'bytes') return 'text';
  return 'json'; // message or enum type
}

/** Converts a raw form input string into the value to send over the wire. */
export function coerceFieldValue(field: GrpcFieldModel, raw: string): unknown {
  const kind = fieldInputKind(field);
  switch (kind) {
    case 'number':
      return Number(raw);
    case 'boolean':
      return raw === 'true';
    case 'json':
      return JSON.parse(raw);
    default:
      return raw;
  }
}
