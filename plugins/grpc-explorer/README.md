# grpc-explorer

A generic "try it out" experience for gRPC/Protobuf API entities, the same
way `@backstage/plugin-api-docs`' Swagger UI works for OpenAPI entities —
but there's no ecosystem plugin that does this for gRPC, so this one exists.

Adds a **gRPC Explorer** tab to any API entity with `spec.type: grpc`. It:

1. Parses the entity's `spec.definition` (raw `.proto` source) with
   [`protobufjs`](https://www.npmjs.com/package/protobufjs) — real
   reflection, generic over whatever contract the entity declares, not
   hardcoded to any one service.
2. Renders a form for the selected method's request fields.
3. Sends the call to the `grpc-explorer-backend` plugin, which dials the
   live address declared in the entity's `grpc-explorer.io/endpoint`
   annotation using `@grpc/grpc-js` + `@grpc/proto-loader`, and shows the
   real response.

## Requirements on the API entity

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: tracking-api
  annotations:
    grpc-explorer.io/endpoint: localhost:50051 # host:port of the live server
spec:
  type: grpc
  definition:
    $text: ./proto/tracking.proto
```

Without the `grpc-explorer.io/endpoint` annotation, the tab still shows the
parsed service/method list, but calls are disabled (there's nowhere to send
them).

## Installation

This plugin is installed via the `@internal/backstage-plugin-grpc-explorer`
package, and needs `@internal/backstage-plugin-grpc-explorer-backend`
installed on the backend to actually make calls. Both are already wired
into this app's `packages/app/src/App.tsx` and
`packages/backend/src/index.ts`.

## Development

You can serve this plugin in isolation by running `yarn start` in this
directory — a limited setup most convenient for developing the plugin
itself. To see it working against a real entity, run `yarn start` from the
repo root instead.
