import { createBackend } from '@backstage/backend-defaults';
import { mockServices } from '@backstage/backend-test-utils';

// Start this standalone dev backend with `yarn start` in this package, then:
//
//   curl http://localhost:7007/api/grpc-explorer/invoke \
//     -H 'Content-Type: application/json' \
//     -d '{
//       "protoText": "syntax = \"proto3\"; package test.v1; service Echo { rpc Say(Req) returns (Res); } message Req { string message = 1; } message Res { string message = 1; }",
//       "serviceName": "Echo",
//       "methodName": "Say",
//       "address": "localhost:50051",
//       "request": { "message": "hi" }
//     }'
//
// ...against any real gRPC server listening on that address, e.g.
// aurora-tracking-service's `npm start`.

const backend = createBackend();

backend.add(mockServices.auth.factory());
backend.add(mockServices.httpAuth.factory());

backend.add(import('../src'));

backend.start();
