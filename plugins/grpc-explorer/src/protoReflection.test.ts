import {
  coerceFieldValue,
  fieldInputKind,
  parseGrpcContract,
} from './protoReflection';

// The real contract from aurora-tracking-service, inlined so this test has
// no dependency on that repo.
const TRACKING_PROTO = `
syntax = "proto3";

package aurora.tracking.v1;

service TrackingService {
  rpc GetTrackingHistory(GetTrackingHistoryRequest) returns (GetTrackingHistoryResponse);
  rpc StreamLocationUpdates(StreamLocationUpdatesRequest) returns (stream LocationUpdate);
}

message GetTrackingHistoryRequest {
  string shipment_id = 1;
}

message GetTrackingHistoryResponse {
  repeated LocationUpdate updates = 1;
}

message StreamLocationUpdatesRequest {
  string shipment_id = 1;
}

message LocationUpdate {
  string shipment_id = 1;
  double latitude = 2;
  double longitude = 3;
  int64 recorded_at_unix = 4;
}
`;

describe('parseGrpcContract', () => {
  it('reflects the service, methods, and request fields from a real .proto contract', () => {
    const [service] = parseGrpcContract(TRACKING_PROTO);

    expect(service.name).toBe('TrackingService');
    expect(service.fullName).toBe('aurora.tracking.v1.TrackingService');
    expect(service.methods.map(m => m.name)).toEqual([
      'GetTrackingHistory',
      'StreamLocationUpdates',
    ]);

    const [getHistory, streamUpdates] = service.methods;
    expect(getHistory.responseStream).toBe(false);
    expect(getHistory.requestFields).toEqual([
      { name: 'shipmentId', type: 'string', repeated: false },
    ]);

    expect(streamUpdates.responseStream).toBe(true);
    expect(streamUpdates.requestFields).toEqual([
      { name: 'shipmentId', type: 'string', repeated: false },
    ]);
  });

  it('returns an empty list for a contract with no services', () => {
    expect(parseGrpcContract('syntax = "proto3"; message Foo {}')).toEqual([]);
  });
});

describe('fieldInputKind', () => {
  it('classifies scalar and complex field types', () => {
    expect(fieldInputKind({ name: 'x', type: 'string', repeated: false })).toBe('text');
    expect(fieldInputKind({ name: 'x', type: 'int64', repeated: false })).toBe('number');
    expect(fieldInputKind({ name: 'x', type: 'bool', repeated: false })).toBe('boolean');
    expect(fieldInputKind({ name: 'x', type: 'LocationUpdate', repeated: false })).toBe('json');
    expect(fieldInputKind({ name: 'x', type: 'string', repeated: true })).toBe('json');
  });
});

describe('coerceFieldValue', () => {
  it('coerces raw form strings to the right wire type', () => {
    expect(coerceFieldValue({ name: 'x', type: 'string', repeated: false }, 'hi')).toBe('hi');
    expect(coerceFieldValue({ name: 'x', type: 'int64', repeated: false }, '42')).toBe(42);
    expect(coerceFieldValue({ name: 'x', type: 'bool', repeated: false }, 'true')).toBe(true);
    expect(coerceFieldValue({ name: 'x', type: 'bool', repeated: false }, 'false')).toBe(false);
    expect(
      coerceFieldValue({ name: 'x', type: 'string', repeated: true }, '["a","b"]'),
    ).toEqual(['a', 'b']);
  });
});
