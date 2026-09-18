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

The GitHub catalog locations in [app-config.yaml](app-config.yaml) need a
`GITHUB_TOKEN` environment variable with `repo` read access to resolve; set
it before `make run` if you want the `aurora-*` entities to load.
