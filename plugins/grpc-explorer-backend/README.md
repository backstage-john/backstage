# grpc-explorer-backend

Backend for the `grpc-explorer` frontend plugin. Exposes a single generic
gRPC invocation gateway:

```
POST /api/grpc-explorer/invoke
{
  "protoText": "<raw .proto source>",
  "serviceName": "TrackingService",
  "methodName": "GetTrackingHistory",
  "address": "localhost:50051",
  "request": { "shipmentId": "SHP-42" }
}
```

Given any `.proto` contract, service name, method name, and a live
`host:port`, it dynamically loads the contract with
[`@grpc/proto-loader`](https://www.npmjs.com/package/@grpc/proto-loader) (no
codegen step) and dials the real service with
[`@grpc/grpc-js`](https://www.npmjs.com/package/@grpc/grpc-js) (Google's
official Node gRPC implementation), returning the response(s) as JSON. This
is not specific to any one API — it works for whatever `.proto` an entity's
`spec.definition` declares.

Unary and server-streaming methods are supported; client-streaming and
bidirectional-streaming methods are rejected with a 400.

## Installation

This plugin is installed via the
`@internal/backstage-plugin-grpc-explorer-backend` package. To install it to
your backend package, run the following command:

```bash
# From your root directory
yarn --cwd packages/backend add @internal/backstage-plugin-grpc-explorer-backend
```

Then add the plugin to your backend in `packages/backend/src/index.ts`:

```ts
const backend = createBackend();
// ...
backend.add(import('@internal/backstage-plugin-grpc-explorer-backend'));
```

## Development

This plugin backend can be started in a standalone mode from directly in this
package with `yarn start`. It is a limited setup that is most convenient when
developing the plugin backend itself.

If you want to run the entire project, including the frontend, run `yarn start` from the root directory.
