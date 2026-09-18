# backstage

This repo is a runnable [Backstage](https://backstage.io) instance acting
as the **Backstage aggregator** for a hypothetical enterprise, **Aurora
Logistics**, used as an end-to-end reference for how Backstage integrates
with REST APIs, Protobuf/gRPC APIs, A2A agents, MCP tool servers, Kafka
messaging, databases, observability tooling, and backend/frontend apps.

- Design decisions and the full repo topology: [docs/adrs/0001-satellite-repository-topology.md](docs/adrs/0001-satellite-repository-topology.md)
- Catalog entities for the Domain/Systems/Groups/Users: [catalog/org.yaml](catalog/org.yaml)
- Catalog location wiring: [app-config.yaml](app-config.yaml)

The 12 satellite repos referenced by the catalog are mockups (no real
business logic) under the `backstage-john` org, prefixed `aurora-`.

## Getting started

```sh
make install   # yarn install
make run       # starts the frontend (:3000) and backend (:7007)
```

See `make help` for other targets (`build`, `test`, `lint`, `clean`).

## Troubleshooting: catalog graph is empty / entities won't load

The catalog's GitHub `url` locations (see [app-config.yaml](app-config.yaml))
need outbound HTTPS access to `api.github.com`. Since these are public
repos, no `GITHUB_TOKEN` is strictly required, but if you're behind a
corporate or sandboxed proxy, Node's built-in `fetch` (used by the catalog's
GitHub integration) does **not** read `HTTPS_PROXY` by default. `make run`
already sets `NODE_USE_ENV_PROXY=1` (supported on Node >=22.21) so it will,
as long as `HTTPS_PROXY`/`NO_PROXY` are set correctly in your shell — that's
a no-op if you're not behind a proxy. If entities still 401/403, set a real
`GITHUB_TOKEN` with `repo` read access.

## Troubleshooting: TechDocs fails with a Docker error

TechDocs is configured to generate docs locally (`techdocs.generator.runIn:
local` in [app-config.yaml](app-config.yaml)) rather than via Docker, so no
Docker daemon is required. This does need the `mkdocs-techdocs-core` Python
package available on the machine running the backend:

```sh
pip install mkdocs-techdocs-core
```

If you'd rather use the Docker-based generator instead (e.g. you already
have Docker Desktop running and don't want a Python dependency), switch
`runIn` back to `'docker'` in `app-config.yaml`.

## API contract viewers

- **REST (`spec.type: openapi`)** — rendered with the built-in
  `@backstage/plugin-api-docs` Swagger UI. No extra setup: any API entity
  with an OpenAPI definition gets this automatically (currently
  `shipments-api`).
- **gRPC (`spec.type: grpc`)** — no viewer is wired up. There's no built-in
  Swagger-equivalent for Protobuf/gRPC in core Backstage, and the one
  community plugin (`backstage-grpc-playground` + its backend) isn't
  usable here: its frontend needs the legacy Backstage app architecture
  (`apis.ts`/`FlatRoutes`, React 16/17) this app doesn't use, and its
  backend depends on `@backstage/backend-common`, which Backstage has
  deprecated. `tracking-api`'s `.proto` contract is currently only visible
  via the entity's "Raw" definition text and the repo's own
  `proto/tracking.proto` file.
