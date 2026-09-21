# ADR-0002: Modeling Aurora Logistics' bounded contexts and subdomains

* Status: Accepted
* Date: 2026-09-21

## Context

ADR-0001 gave Aurora Logistics a single flat `Domain` (`logistics-platform`)
containing four `System`s. That grouping was useful for organizing the
catalog, but it didn't say anything about *why* those four boundaries
exist, whether they're equally important to the business, or how they
actually relate to each other. Two people looking at the catalog couldn't
tell a core differentiating capability from a commodity one, and there was
no shared vocabulary recorded anywhere for what a "Shipment" or a "Stop"
actually means to each team.

Domain-Driven Design gives names to exactly these gaps:

* A **Bounded Context** is a boundary within which a model and its
  vocabulary are consistent — outside it, the same word can mean something
  else.
* A **Subdomain** classifies a piece of the problem space as **core**
  (the actual competitive differentiator), **supporting** (necessary, not
  differentiating), or **generic** (could be bought off the shelf).
* A **Context Map** describes *how* bounded contexts relate: Partnership,
  Shared Kernel, Customer-Supplier, Conformist, Anticorruption Layer, Open
  Host Service, Published Language, Separate Ways.

Backstage's own catalog model maps onto this almost directly: a `System`
is documented as a boundary that hides its internal `Component`s and
`Resource`s behind the `API`s it exposes — the same shape as a Bounded
Context — and `Domain` supports a `subdomainOf` hierarchy for grouping
related systems. No plugin or new entity kind is needed; the primitives
already exist, they just weren't being used with DDD precision.

This ADR also folds in a real modeling bug surfaced while doing this work:
`team-ai-agents` was documented (in `org.yaml`) as owning Aurora's AI
agents, but the agent `Component`s' `spec.system` actually pointed at
`fleet-tracking` and `customer-experience` — systems owned by other teams.
The team that owns the code didn't own the bounded context it lived in.

## Decision

**Bounded context = `System`.** We keep `System` as the bounded-context
unit and make one change to the boundaries themselves: agent orchestration
becomes its own bounded context.

**Subdomain = `Domain` with `subdomainOf`.** `logistics-platform` stays as
the top-level Domain (the whole problem space). Five new `Domain` entities
are added underneath it via `subdomainOf: logistics-platform`, one per
System, each carrying a `subdomain` tag plus a `core-domain` /
`supporting-domain` / `generic-domain` tag:

| Subdomain (Domain) | Bounded context (System) | Classification | Why |
| --- | --- | --- | --- |
| `shipment-fulfillment` | `shipment-fulfillment` | core | Reliably getting orders in and allocated is Aurora's product |
| `fleet-tracking` | `fleet-tracking` | core | Real-time tracking/dispatch is the other half of the differentiator |
| `customer-experience` | `customer-experience` | supporting | Necessary customer/ops surfaces, not themselves differentiating |
| `platform-engineering` | `platform-engineering` | generic | Infra/messaging/data/observability — could be bought, not built |
| `agent-orchestration` | `agent-orchestration` (new) | supporting | Valuable automation today; a candidate for promotion to core as AI investment grows — worth revisiting, not a permanent label |

We give each subdomain `Domain` the **same name** as its corresponding
`System`. Backstage disambiguates by kind, so `domain:default/fleet-tracking`
and `system:default/fleet-tracking` coexisting is valid, and it makes the
1:1 mapping obvious at a glance.

**New System: `agent-orchestration`.** Owned by `group:default/team-ai-agents`,
containing `aurora-routing-agent` and `aurora-support-agent` (previously
split across `fleet-tracking` and `customer-experience`). This resolves
the owner/system mismatch above for real — the two agent repos'
`catalog-info.yaml` `spec.system` fields were updated to match — not just
in this aggregator's documentation. It also has a side effect worth
noting: `support-agent`'s existing `consumesApis: routing-agent-a2a` edge
is now an *intra-context* call, correctly reflecting that two agents
directly collaborating is one team's internal concern, not a cross-context
integration.

**`platform-engineering` is deliberately not split further**, even though
it bundles messaging, database, and observability concerns and is
coarser-grained than the others. It's one team, one ownership boundary,
and one "platform capability" vocabulary; splitting it would add entity
count without adding teaching value here. This is a scope boundary, not an
oversight.

**Ubiquitous language and context map are documentation, not code.** See
[`docs/ddd/glossary.md`](../ddd/glossary.md) for the per-subdomain term
glossaries and [`docs/ddd/context-map.md`](../ddd/context-map.md) for the
relationship-pattern diagram between bounded contexts. Both are TechDocs
pages, and every `Domain`/`System` entity links to them via
`metadata.links` — no new plugin was built for this, because unlike, say,
live gRPC invocation, a context map is static metadata that a Mermaid
diagram already renders faithfully; there is also no ecosystem plugin for
this today.

## Consequences

**Positive**

* Anyone browsing the catalog can now see, per subdomain, whether it's
  core/supporting/generic — informing where investment should go — and
  can follow a link straight to that subdomain's glossary and the context
  map from the entity page.
* The owner/system mismatch for the AI agents is fixed at the source
  (the satellite repos' own `catalog-info.yaml`), not papered over here.
* The Catalog Graph, rooted at `domain:default/logistics-platform`, now
  renders the full subdomain hierarchy via `subdomainOf` edges alongside
  the existing System/Component/API relations.

**Negative / trade-offs**

* Entity count roughly doubles at the top of the hierarchy (1 Domain → 6).
  This is deliberate: collapsing subdomain and bounded-context into tags
  on the existing 4 Systems would be less catalog churn, but would blur
  Backstage's own problem-space/solution-space split, which is the whole
  point of using `Domain` and `System` as distinct kinds.
* Core/supporting/generic and the context-map relationship patterns are
  encoded as tags and prose, not first-class Backstage fields — there is
  no native field for either. If a real DDD-aware plugin appears in the
  ecosystem later, this tagging convention should be revisited.
* The context map is hand-maintained prose/Mermaid, not derived from the
  catalog's actual `dependsOn`/`consumesApis` edges, so it can drift from
  reality if those edges change without a matching update here.

## Alternatives considered

* **Tags only, no new `Domain` entities.** Rejected: keeping one flat
  Domain and tagging the 4 Systems directly with `core-domain` /
  `supporting-domain` / `generic-domain` would be simpler and avoid
  entity churn, but conflates subdomain (problem space) with bounded
  context (solution space) — exactly the distinction DDD asks you to make,
  and exactly what Backstage's own Domain/System split already models.
* **An interactive context-map plugin.** Considered building a small
  frontend plugin (in the style of `plugins/grpc-explorer`) rendering a
  color-coded, interactive context-map graph as a Domain entity tab.
  Rejected for now: a context map is static metadata about a fixed set of
  relationships, not a live capability like gRPC invocation, so a Mermaid
  diagram in TechDocs — a pattern already proven in ADR-0001 — delivers
  the same information with zero new code to maintain.
