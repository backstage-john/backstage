# Ubiquitous language glossary

Each subdomain below has its own vocabulary — the same word can mean
different things in different bounded contexts, which is exactly why the
boundary exists. See [ADR-0002](../adrs/0002-domain-driven-design-model.md)
for how these subdomains map onto Backstage `Domain`/`System` entities, and
[the context map](context-map.md) for how they relate to each other.

## shipment-fulfillment

Owned by `team-shipments`. Core subdomain.

| Term | Definition | Notes |
| --- | --- | --- |
| Shipment | An order for one or more items to be delivered to a single destination, from creation until it leaves the warehouse. | Once it leaves the warehouse, Fleet Tracking takes over and stops calling it a "Shipment" — see **Stop**, below. |
| Allocation | Reserving specific warehouse inventory against a Shipment's line items. | Happens before a Shipment is eligible for dispatch. |
| Fulfillment status | The lifecycle state of a Shipment inside the warehouse (`received`, `allocated`, `packed`, `dispatched`). | Distinct from delivery status, which is Fleet Tracking's concern. |

## fleet-tracking

Owned by `team-fleet`. Core subdomain.

| Term | Definition | Notes |
| --- | --- | --- |
| Stop | A single point on a vehicle's route where a package is picked up or dropped off. | This is the *same physical package* Shipment Fulfillment calls a "Shipment" — Fleet Tracking doesn't model orders or inventory, only movement, so it re-models the package as a routable Stop. This divergence is intentional, not an inconsistency: it's why the two are separate bounded contexts. |
| Route | An ordered sequence of Stops assigned to one vehicle. | Computed by `aurora-routing-agent`. |
| Location ping | A single GPS reading ingested from a vehicle. | Raw telemetry; distinct from a Stop, which is a planning concept. |
| Dispatch decision | The assignment of a Shipment to a Route/vehicle. | Crosses the boundary back into Shipment Fulfillment's `dispatched` status — see the context map's Partnership entry. |

## customer-experience

Owned by `team-frontend`. Supporting subdomain.

| Term | Definition | Notes |
| --- | --- | --- |
| Tracking view | The customer-facing summary of a Shipment's progress. | A read-only projection over Fleet Tracking's Stops, translated into customer-friendly language ("Out for delivery" rather than "en route to Stop 4"). |
| Ops console session | An internal operator's authenticated session for managing shipments/routes by hand. | Distinct audience from the customer portal, same underlying data. |

## platform-engineering

Owned by `team-platform`. Generic subdomain.

| Term | Definition | Notes |
| --- | --- | --- |
| Event contract | A versioned Avro/Protobuf schema plus its AsyncAPI description, published by `aurora-event-contracts`. | The Published Language shared between Shipment Fulfillment and Fleet Tracking — see the context map. |
| Topic | A named Kafka stream carrying one event contract. | Modeled as a `Resource` per topic. |
| Observability signal | A metric, log, or trace emitted in the format `aurora-observability-stack` defines. | Every consuming system is a Conformist to this format — see the context map. |

## agent-orchestration

Owned by `team-ai-agents`. Supporting subdomain (candidate for promotion to
core — see [ADR-0002](../adrs/0002-domain-driven-design-model.md)).

| Term | Definition | Notes |
| --- | --- | --- |
| Agent Card | The machine-readable manifest an A2A agent publishes at `/.well-known/agent.json`, describing its skills. | The Published Language both agents (`routing-agent`, `support-agent`) and any future agent expose. |
| Task | A unit of work delegated from one agent to another over A2A. | e.g. `support-agent` delegates a routing question to `routing-agent` as a Task. |
| Tool call | A governed request from an agent to `aurora-mcp-gateway` for access to an internal API. | Never a direct call to `aurora-shipments-api`/`aurora-tracking-service` — that's the Anticorruption Layer's job (see the context map's one documented exception). |
