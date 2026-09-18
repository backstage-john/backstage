# backstage

This repo is the **Backstage aggregator** for a hypothetical enterprise,
**Aurora Logistics**, used as an end-to-end reference for how Backstage
integrates with REST APIs, Protobuf/gRPC APIs, A2A agents, MCP tool
servers, Kafka messaging, databases, observability tooling, and backend/
frontend apps.

- Design decisions and the full repo topology: [docs/adrs/0001-satellite-repository-topology.md](docs/adrs/0001-satellite-repository-topology.md)
- Catalog entities for the Domain/Systems/Groups/Users: [catalog/org.yaml](catalog/org.yaml)
- Catalog location wiring: [app-config.yaml](app-config.yaml)

The 12 satellite repos referenced by the catalog are mockups (no real
business logic) under the `backstage-john` org, prefixed `aurora-`.
