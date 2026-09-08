# Orgni Technology Stack

**Architecture version:** 0.1  
**Roadmap coverage:** Phase 1 to Phase 9  
**Status:** Authoritative engineering baseline

Orgni is Olyxee's operational intelligence platform. It converts evidence from business systems and documents into a living, queryable, temporal model of how an organization operates. The platform must understand organizational objects, preserve their history, maintain their current state, assemble useful context, predict risks, recommend actions, and execute approved actions under policy control.

This document assigns a technology stack and technical boundary to every module in the Orgni Development Roadmap. It is an architectural baseline, not an instruction to deploy thirty independent services. Modules begin as well-separated packages inside a modular monorepo and are extracted into separately deployed services only when scale, security, reliability, or team ownership requires it.

## 1. Architecture principles

1. **Evidence first.** Every fact, state, relationship, prediction, and recommendation must link to its evidence and confidence.
2. **One canonical contract.** TypeScript and Python models are generated from the same versioned JSON Schemas.
3. **Events preserve history.** Accepted organizational changes are immutable events. Current state is derived from them.
4. **Unknown remains unknown.** Orgni must not convert missing or uncertain information into asserted fact.
5. **Conflicts are preserved.** Conflicting claims remain available with their provenance until reviewed or resolved.
6. **Human control.** Material external actions require policy checks and, where required, explicit approval.
7. **Tenant isolation.** Every document, fact, event, query, job, model output, and action belongs to an organization.
8. **Modular monolith first.** Clear internal boundaries come before operational microservices.
9. **Contract-first integration.** HTTP uses OpenAPI; asynchronous events use CloudEvents and AsyncAPI.
10. **Provider abstraction.** Model, OCR, storage, and connector providers sit behind internal interfaces.

## 2. Platform-wide stack

| Layer | Standard |
|---|---|
| Web product | React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI |
| Client data | TanStack Query, generated OpenAPI client |
| Forms and validation | React Hook Form, Zod |
| API | Node.js 24, TypeScript, Express 5, OpenAPI, Zod |
| Background work | TypeScript worker, BullMQ, Azure Managed Redis |
| Intelligence | Python 3.12, FastAPI, Pydantic |
| Operational database | Azure Database for PostgreSQL |
| Graph | Neo4j, introduced in Phase 2 as a rebuildable projection |
| Semantic retrieval | PostgreSQL with pgvector |
| Working memory and cache | Azure Managed Redis |
| Evidence and files | Azure Blob Storage |
| Event backbone | PostgreSQL event store and transactional outbox, then Azure Event Hubs |
| Workflow orchestration | Temporal, introduced in Phase 7 |
| Policy evaluation | Open Policy Agent, introduced in Phase 7 |
| AI providers | Azure OpenAI behind an internal model gateway |
| OCR and layout | Azure AI Document Intelligence, PyMuPDF, OpenCV, Tesseract fallback |
| Authentication | Microsoft Entra External ID, OIDC/OAuth 2.0 |
| Observability | OpenTelemetry, Pino, Azure Monitor, Application Insights, Sentry |
| Containers | Docker, Azure Container Registry, Azure Container Apps |
| Frontend hosting | Vercel |
| Secrets | Azure Key Vault and managed identities |
| Infrastructure as code | Bicep |
| CI/CD | GitHub Actions |
| TypeScript testing | Vitest, Testing Library, Playwright, Testcontainers |
| Python testing | Pytest, Hypothesis, Testcontainers |
| Performance testing | k6 |
| Security scanning | CodeQL, Dependabot, Trivy |

## 3. Language and contract boundary

The platform has two implementation planes:

- **TypeScript control plane:** web, API, authentication, jobs, workflow coordination, integrations, approvals, actions, and administration.
- **Python intelligence plane:** document intelligence, ontology processing, entity resolution, state computation, memory, retrieval, predictions, recommendations, anomalies, evaluations, and research.

`packages/contracts` is the only authority for cross-module payloads. It publishes:

- TypeScript types
- Zod validators
- JSON Schema
- Python Pydantic models
- OpenAPI components
- CloudEvent and AsyncAPI event definitions

No module may define a second `OrganizationalToken`, source envelope, evidence model, or organizational-event model.

## 4. Repository structure

```text
apps/
  web/                         Product and marketing frontend
  api/                         Public HTTP API
  worker/                      Background job coordination
  admin/                       Internal operations interface

intelligence/
  document-intelligence/
  organizational-tokenizer/
  organizational-ontology/
  entity-resolution/
  relationship-builder/
  timeline-engine/
  state-engine/
  conflict-engine/
  memory/
  context-engine/
  prediction/
  recommendation/
  anomaly-detection/
  simulation/

platform/
  event-store/
  policy-engine/
  action-engine/
  workflow-engine/
  connectors/
  evaluation/

packages/
  contracts/
  events/
  auth/
  config/
  observability/
  testing/
  ui/

lib/
  api-spec/
  api-client-react/
  api-zod/
  db/

infrastructure/
  azure/
  docker/
  monitoring/

docs/
```

## 5. Phase 1: Foundation

**Release V0.1 objective:** Orgni understands business documents.

### 5.1 Organizational Tokenizer

- **Mission:** Convert normalized source evidence into Organizational Tokens.
- **Runtime:** TypeScript package executed by `apps/worker`.
- **Stack:** TypeScript, Zod, canonical contracts, Vitest.
- **Input:** `NormalizedDocumentEnvelope` version `0.1.0`.
- **Output:** Versioned `OrganizationalToken[]` containing events, states, policies, and relations.
- **Storage:** Token records in PostgreSQL; source evidence remains in Blob Storage.
- **Rules:** Deterministic IDs, provenance, confidence, evidence references, epistemic status, and no OCR logic.
- **Deployment:** Initially compiled into the worker, not deployed independently.

### 5.2 Organizational Ontology

- **Mission:** Define and validate organizational entities, relationships, events, policies, and states.
- **Runtime:** Python 3.12 package invoked by the intelligence worker.
- **Stack:** Pydantic, generated token contracts, Pytest, JSON Schema export.
- **Input:** The exact canonical `OrganizationalToken[]` produced by the tokenizer.
- **Output:** Typed ontology facts with provenance and confidence.
- **Storage:** PostgreSQL in Phase 1; Neo4j projection begins in Phase 2.
- **Rules:** Preserve unknowns and conflicts. No cross-document entity resolution in Phase 1.
- **Deployment:** Package inside the intelligence container until independent scaling is justified.

### 5.3 Ingestion Pipeline

- **Mission:** Receive evidence from every supported source and reliably start processing.
- **Runtime:** TypeScript API and background worker.
- **Stack:** Express, OpenAPI, Zod, BullMQ, Redis, PostgreSQL, Azure Blob Storage.
- **Input:** File uploads and, later, connector events.
- **Output:** Versioned source record and processing job.
- **Storage:** Original bytes in Blob Storage; metadata, checksum, tenant, ACL, and state in PostgreSQL.
- **Rules:** SHA-256 integrity, idempotency, MIME validation, malware scanning, bounded retries, dead-letter handling, and tenant isolation.
- **Deployment:** API and worker on Azure Container Apps.

### 5.4 Document Intelligence

- **Mission:** Perform OCR, classification, extraction, validation, and trust scoring.
- **Runtime:** Python 3.12 internal intelligence component.
- **Stack:** FastAPI, Pydantic, PyMuPDF, OpenCV, Azure AI Document Intelligence, Tesseract fallback, Azure OpenAI through the model gateway.
- **Input:** Source record and protected Blob Storage reference.
- **Output:** `NormalizedDocumentEnvelope` version `0.1.0`.
- **Storage:** Extracted text, tables, evidence locations, warnings, confidence, and model versions in PostgreSQL; large artifacts in Blob Storage.
- **Rules:** Phase 1 supports Invoice, Proof of Payment, and general Contract. Missing values are not inferred. Payment evidence does not automatically settle an invoice, and unsigned contracts are not treated as executed.
- **Deployment:** Azure Container Apps internal endpoint or worker container.

## 6. Phase 2: Organizational Understanding

**Release V0.2 objective:** Orgni understands the organization.

### 6.1 Entity Resolution

- **Mission:** Identify when records from different sources refer to the same organizational entity.
- **Runtime:** Python.
- **Stack:** Pydantic, RapidFuzz, deterministic rules, embedding candidate retrieval, pgvector, Pytest.
- **Input:** Ontology entities and their evidence-backed identifiers.
- **Output:** Match candidates, confidence, explanation, and merge proposal.
- **Storage:** PostgreSQL resolution records and review decisions.
- **Rules:** Stable identifiers take priority. Ambiguous matches require review. Merges must be reversible and audited.
- **Deployment:** Intelligence worker, later independently scalable.

### 6.2 Relationship Builder

- **Mission:** Build validated relationships between organizational objects.
- **Runtime:** Python.
- **Stack:** Pydantic, ontology constraints, Neo4j driver, PostgreSQL.
- **Input:** Resolved entities, tokens, events, and evidence.
- **Output:** Typed, directional, temporal relationships.
- **Storage:** PostgreSQL as authority; Neo4j as query projection.
- **Rules:** Every relationship needs evidence, valid direction, permitted types, confidence, and effective time.
- **Deployment:** Intelligence worker and graph projector.

### 6.3 Timeline Engine

- **Mission:** Maintain a complete temporal history for organizational objects.
- **Runtime:** Python consumers and TypeScript query API.
- **Stack:** PostgreSQL temporal queries, Event Hubs consumers, Pydantic.
- **Input:** Accepted organizational events.
- **Output:** Per-entity and organization-wide timelines.
- **Storage:** Append-only event records plus temporal indexes in PostgreSQL.
- **Rules:** Distinguish `occurred_at`, `recorded_at`, `effective_from`, and `effective_to`.
- **Deployment:** Worker projection with API query endpoints.

### 6.4 Event Store

- **Mission:** Durably store every accepted organizational event.
- **Runtime:** TypeScript persistence package and workers.
- **Stack:** PostgreSQL append-only tables, transactional outbox, CloudEvents, AsyncAPI, Azure Event Hubs.
- **Input:** Validated organizational events.
- **Output:** Immutable event record and published event notification.
- **Storage:** PostgreSQL is authoritative; Event Hubs distributes events.
- **Rules:** Idempotency, schema versioning, causation IDs, correlation IDs, tenant IDs, and no destructive updates.
- **Deployment:** Shared platform module used by the API and workers.

## 7. Phase 3: Organizational State

**Release V0.3 objective:** Orgni maintains the live organizational state.

### 7.1 State Engine

- **Mission:** Materialize the current organizational state from accepted events.
- **Runtime:** Python event consumer.
- **Stack:** Pydantic, PostgreSQL projections, Event Hubs, Redis cache.
- **Input:** Ordered organizational event streams.
- **Output:** Versioned state projections.
- **Storage:** PostgreSQL state tables; Redis for short-lived hot state.
- **Rules:** State must be reproducible by replaying the event history.
- **Deployment:** Azure Container Apps worker.

### 7.2 State Transition Engine

- **Mission:** Validate and apply permitted state changes.
- **Runtime:** Python.
- **Stack:** Declarative JSON state-machine definitions, Pydantic, event-store integration.
- **Input:** Current state, proposed event, policy context, and evidence.
- **Output:** Accepted or rejected transition plus explanation.
- **Storage:** Transition definitions and decisions in PostgreSQL.
- **Rules:** No direct state mutation. Every accepted transition emits an event.
- **Deployment:** Called by the state worker and, later, the workflow engine.

### 7.3 Conflict Engine

- **Mission:** Detect and manage contradictory organizational information.
- **Runtime:** Python.
- **Stack:** Pydantic, deterministic conflict rules, optional model-assisted classification, PostgreSQL review queues.
- **Input:** Claims, provenance, confidence, time, and current state.
- **Output:** Conflict cases, severity, proposed resolution, or human-review request.
- **Storage:** All claims and resolution history in PostgreSQL.
- **Rules:** Never discard conflicting evidence. Automated resolution must remain explainable and reversible.
- **Deployment:** State-processing worker.

## 8. Phase 4: Memory

**Release V0.4 objective:** Orgni remembers organizational knowledge.

### 8.1 Working Memory

- **Mission:** Hold active tasks, sessions, and live context.
- **Runtime:** TypeScript and Python clients.
- **Stack:** Azure Managed Redis, PostgreSQL checkpoints.
- **Input:** Current task, actor, workflow, and recently retrieved context.
- **Output:** Short-lived, permission-scoped working context.
- **Storage:** Redis with TTL; durable checkpoints in PostgreSQL.
- **Rules:** Tenant isolation, strict size limits, expiry, and no use as the source of truth.
- **Deployment:** Managed Redis shared through a memory interface.

### 8.2 Episodic Memory

- **Mission:** Store business cases, workflows, decisions, and their outcomes as episodes.
- **Runtime:** Python.
- **Stack:** PostgreSQL event store, Blob Storage for large artifacts, pgvector for retrieval.
- **Input:** Bounded event sequences and evidence.
- **Output:** Versioned organizational episodes.
- **Storage:** PostgreSQL metadata and embeddings; original evidence in Blob Storage.
- **Rules:** Episodes retain participants, timeline, decisions, outcome, confidence, and source links.
- **Deployment:** Memory module within the intelligence worker.

### 8.3 Semantic Memory

- **Mission:** Preserve durable organizational concepts, rules, facts, and learned knowledge.
- **Runtime:** Python.
- **Stack:** PostgreSQL, pgvector, Neo4j, hybrid search.
- **Input:** Approved facts, graph context, policies, and compressed episodes.
- **Output:** Searchable semantic records linked to evidence.
- **Storage:** PostgreSQL and pgvector; graph relationships in Neo4j.
- **Rules:** Version knowledge and distinguish asserted, inferred, disputed, and superseded information.
- **Deployment:** Intelligence worker with query APIs through `apps/api`.

### 8.4 Memory Compression

- **Mission:** Reduce retrieval cost while preserving important organizational meaning.
- **Runtime:** Python background jobs.
- **Stack:** Azure OpenAI model gateway, deterministic deduplication, hierarchical summarization, PostgreSQL.
- **Input:** Episodes, events, semantic records, access patterns, and time windows.
- **Output:** Versioned summaries and compact retrieval representations.
- **Storage:** PostgreSQL and Blob Storage.
- **Rules:** Every compressed record must link back to its source evidence. Compression must not replace authoritative records.
- **Deployment:** Scheduled worker jobs.

## 9. Phase 5: Context Intelligence

**Release V0.5 objective:** Lucy understands organizational context.

### 9.1 Context Builder

- **Mission:** Assemble AI-ready business context for a defined user, task, and permission scope.
- **Runtime:** Python.
- **Stack:** Pydantic, graph traversal, temporal queries, hybrid retrieval, model gateway.
- **Input:** User intent, identity, permissions, live state, memory, graph, and evidence.
- **Output:** Structured `ContextPackage` with citations, confidence, freshness, and token budget.
- **Storage:** Context manifests in PostgreSQL; cache in Redis.
- **Rules:** Permission filtering happens before content reaches a model.
- **Deployment:** Internal context endpoint on Azure Container Apps.

### 9.2 Context Retrieval

- **Mission:** Retrieve the most relevant organizational evidence and knowledge.
- **Runtime:** Python.
- **Stack:** PostgreSQL full-text search, pgvector, Neo4j traversal, reciprocal-rank fusion, reranking.
- **Input:** Query, tenant, actor, task, time, and permission constraints.
- **Output:** Ranked evidence-backed results.
- **Storage:** Search indexes in PostgreSQL and Neo4j.
- **Rules:** Ranking combines relevance, graph proximity, recency, confidence, authority, and permissions.
- **Deployment:** Shared retrieval component used by Context Builder and Lucy.

### 9.3 Context Streaming

- **Mission:** Deliver live context changes to users and authorized consumers.
- **Runtime:** TypeScript API gateway and event consumers.
- **Stack:** Azure Event Hubs internally, Server-Sent Events externally, Redis connection coordination.
- **Input:** Organizational events and subscription filters.
- **Output:** Ordered, tenant-scoped context updates.
- **Storage:** Event offsets and subscriptions in PostgreSQL.
- **Rules:** Resume tokens, backpressure, permission revalidation, and no sensitive broadcast channels.
- **Deployment:** Azure Container Apps with autoscaling.

## 10. Phase 6: Intelligence

**Release V0.6 objective:** Orgni becomes proactive.

### 10.1 Prediction Engine

- **Mission:** Predict future organizational events and outcomes.
- **Runtime:** Python.
- **Stack:** scikit-learn, XGBoost, PyTorch when justified, MLflow, Azure Machine Learning, Evidently.
- **Input:** Versioned features derived from events, state, timelines, and graph context.
- **Output:** Prediction, probability, horizon, explanation, evidence, and model version.
- **Storage:** PostgreSQL feature and prediction records; MLflow artifacts in managed storage.
- **Rules:** Calibrate probabilities, prevent data leakage, monitor drift, and never present predictions as facts.
- **Deployment:** Batch jobs first; online inference only where latency requires it.

### 10.2 Recommendation Engine

- **Mission:** Recommend the next best organizational actions.
- **Runtime:** Python.
- **Stack:** Rules, ranking models, contextual bandits only after sufficient data, model gateway, policy pre-checks.
- **Input:** State, goals, predictions, policies, constraints, and historical outcomes.
- **Output:** Ranked actions with benefit, risk, confidence, evidence, and approval requirement.
- **Storage:** Recommendations and outcomes in PostgreSQL.
- **Rules:** Recommendations cannot execute directly. Capture user acceptance, rejection, and outcome feedback.
- **Deployment:** Intelligence container called asynchronously or by the context API.

### 10.3 Anomaly Detection

- **Mission:** Detect unusual organizational behaviour, process deviations, and risks.
- **Runtime:** Python.
- **Stack:** Statistical rules, Isolation Forest, time-series models, graph anomaly methods when justified, MLflow.
- **Input:** Events, state transitions, timelines, graph patterns, and historical baselines.
- **Output:** Anomaly record with severity, explanation, evidence, and review status.
- **Storage:** PostgreSQL alerts and outcomes.
- **Rules:** Tenant-specific baselines, feedback tracking, and measurable false-positive rates.
- **Deployment:** Streaming and scheduled workers.

## 11. Phase 7: Actions and Governance

**Release V0.7 objective:** Orgni can safely perform business actions.

### 11.1 Policy Engine

- **Mission:** Enforce permissions, compliance controls, and business rules.
- **Runtime:** Open Policy Agent with a TypeScript integration layer.
- **Stack:** Rego, signed policy bundles, PostgreSQL policy metadata, Git-based policy review.
- **Input:** Actor, tenant, requested action, resource, context, risk, and current state.
- **Output:** Allow, deny, or require approval, with reasons and obligations.
- **Storage:** Policies, versions, decisions, and audit records in PostgreSQL.
- **Rules:** Default deny for external actions. Policies are versioned, tested, and attributable.
- **Deployment:** OPA sidecar or internal service in Azure Container Apps.

### 11.2 Action Engine

- **Mission:** Execute approved actions against internal and external systems.
- **Runtime:** TypeScript.
- **Stack:** Temporal activities, connector framework, OAuth, idempotency keys, signed requests.
- **Input:** Approved `ActionRequest` and policy decision.
- **Output:** Verified action result and organizational event.
- **Storage:** Requests, approvals, attempts, responses, compensations, and audits in PostgreSQL.
- **Rules:** Allowlisted actions, least privilege, retries, compensation where possible, and result verification.
- **Deployment:** Isolated worker on Azure Container Apps.

### 11.3 Workflow Engine

- **Mission:** Manage long-running workflows, approvals, timeouts, and human tasks.
- **Runtime:** TypeScript workers using Temporal.
- **Stack:** Temporal, PostgreSQL business records, Event Hubs notifications.
- **Input:** Workflow definition and triggering event.
- **Output:** Durable workflow execution and emitted state-change events.
- **Storage:** Temporal history plus Orgni workflow metadata in PostgreSQL.
- **Rules:** Version workflows, preserve deterministic execution, and separate business state from orchestration state.
- **Deployment:** Temporal Cloud or a separately managed Temporal cluster, with workers on Azure Container Apps.

## 12. Phase 8: Platform

**Release V1.0 objective:** Enterprise-ready Orgni platform.

### 12.1 API Platform

- **Mission:** Provide secure internal and external access to Orgni capabilities.
- **Runtime:** TypeScript.
- **Stack:** Express 5, OpenAPI, Zod, Azure API Management, OAuth 2.0, webhooks.
- **Input:** Authenticated HTTP requests and integration events.
- **Output:** Versioned resources, commands, queries, and subscriptions.
- **Storage:** API clients, keys, quotas, usage, and webhook deliveries in PostgreSQL.
- **Rules:** Tenant isolation, rate limiting, idempotency, pagination, versioning, auditability, and deprecation policy.
- **Deployment:** Azure Container Apps behind Azure API Management and WAF.

### 12.2 MCP Connectors

- **Mission:** Connect Orgni to external business systems and AI clients.
- **Runtime:** TypeScript connector framework; Python adapters only when SDK requirements demand it.
- **Stack:** MCP TypeScript SDK, OAuth 2.0, webhooks, scheduled sync, canonical ingestion contracts.
- **Input:** External system events, files, records, and authorized tool calls.
- **Output:** Normalized sources, connector events, queries, and governed actions.
- **Storage:** Credentials in Key Vault; connector configuration, cursors, and sync state in PostgreSQL.
- **Rules:** Least-privilege scopes, tenant-specific credentials, rate limits, replay safety, and complete action audit.
- **Deployment:** Connector workers isolated by trust level.

Initial targets include Microsoft SharePoint, OneDrive, Outlook, Teams, Google Drive, Gmail, Salesforce, SAP, generic REST APIs, databases, webhooks, and file uploads.

### 12.3 Infrastructure Platform

- **Mission:** Provide repeatable deployment, storage, security, monitoring, and operational controls.
- **Runtime:** Azure infrastructure and GitHub Actions.
- **Stack:** Bicep, Azure Container Apps, Container Registry, PostgreSQL, Blob Storage, Event Hubs, Managed Redis, Key Vault, Monitor, Application Insights, Vercel.
- **Input:** Versioned application artifacts and infrastructure definitions.
- **Output:** Local, development, staging, and production environments.
- **Storage:** Environment state in approved infrastructure backends; secrets only in Key Vault.
- **Rules:** Managed identities, environment separation, backups, disaster recovery, cost budgets, vulnerability scanning, and deployment approvals.
- **Deployment:** GitHub Actions with staging validation before production.

AKS is not part of the initial standard. It may be introduced only when Container Apps has a demonstrated operational limitation.

## 13. Phase 9: Research

**Research objective:** Advance Orgni through measurable experimentation.

### 13.1 Evaluation and Benchmarks

- **Mission:** Measure the quality, safety, performance, and cost of the complete platform.
- **Runtime:** Python evaluation framework with TypeScript integration tests.
- **Stack:** Pytest, MLflow, custom benchmark harnesses, golden datasets, k6, Evidently.
- **Input:** Versioned datasets, event replays, model outputs, user feedback, and release candidates.
- **Output:** Reproducible scorecards and release-gate reports.
- **Storage:** Benchmark definitions in Git; run metadata and artifacts in MLflow/Blob Storage.
- **Rules:** Dataset versioning, tenant-data protection, reproducible environments, confidence intervals, and regression thresholds.
- **Deployment:** CI for small suites; Azure Machine Learning jobs for larger evaluations.

Required metrics include extraction accuracy, entity-resolution precision and recall, relationship precision, state accuracy, retrieval quality, prediction calibration, recommendation usefulness, policy compliance, action success rate, evidence coverage, latency, and cost.

### 13.2 Testing and Simulation

- **Mission:** Simulate organizations, workflows, failures, and actions before production use.
- **Runtime:** Python simulation framework.
- **Stack:** Pytest, Hypothesis, synthetic data generators, event replay, Testcontainers, k6, optional Ray for large simulations.
- **Input:** Scenario definitions, policies, workflow models, and synthetic organizations.
- **Output:** Replayable events, expected outcomes, failures, and performance results.
- **Storage:** Scenarios and expected outputs in Git; large generated artifacts in Blob Storage.
- **Rules:** No production action endpoints during simulation, deterministic seeds, and clear separation of synthetic and customer data.
- **Deployment:** CI and isolated Azure jobs.

### 13.3 Organizational Foundation Model

- **Mission:** Research model architectures specialized for organizational representation, memory, state, and reasoning.
- **Runtime:** Python research environment.
- **Stack:** PyTorch, Hugging Face, MLflow, Azure Machine Learning, Jupyter, Ray when distributed training is necessary.
- **Input:** Governed, de-identified, versioned research datasets and synthetic organizations.
- **Output:** Experimental models, evaluation results, papers, and architecture proposals.
- **Storage:** Azure ML and Blob Storage with dataset and model registries.
- **Rules:** Research outputs do not enter production without evaluation, security review, model governance, and a controlled release process.
- **Deployment:** Isolated research subscriptions and compute, separate from production.

## 14. Product surfaces

The React product should eventually expose:

- Home
- Sources
- Knowledge
- Organizational Graph
- Timeline
- State
- Memory
- Workflows
- Exceptions
- Review Queue
- Lucy Assistant
- Predictions
- Recommendations
- Policies
- Actions
- Integrations
- Evaluation
- Administration

The interface must make source evidence, confidence, freshness, conflicts, and approval status visible wherever decisions are presented.

## 15. Authentication, authorization, and tenancy

- Microsoft Entra External ID using OIDC/OAuth 2.0
- Organization-based multitenancy
- Role-based and resource-level authorization
- Policy evaluation before sensitive reads and every external action
- Tenant IDs included in every database row, event, cache key, blob path, trace, job, and model request
- Initial roles: Owner, Administrator, Contributor, Reviewer, and Viewer
- Audit all uploads, corrections, exports, administrative changes, approvals, policies, and actions

## 16. Security and governance

- Azure Key Vault and managed identities
- Encryption in transit and at rest
- Short-lived signed Blob Storage access
- MIME inspection, file limits, malware scanning, and archive protection
- No document content or sensitive business values in application logs
- POPIA-aware retention, export, correction, and deletion controls
- Data residency and customer isolation documented per environment
- Software composition analysis, CodeQL, container scanning, and dependency review
- Model requests logged by metadata and cost, without leaking protected content
- Human review queues for low-confidence or high-impact outputs

## 17. Observability

Every synchronous request and background operation carries a correlation ID, tenant ID, source ID, and processing-stage name.

Required signals include:

- API latency and errors
- Queue depth, age, retries, and dead letters
- Document-processing duration
- OCR and extraction quality
- Evidence coverage
- Token and ontology validation failures
- Entity-resolution review rate
- State projection lag
- Retrieval quality and latency
- Prediction drift and calibration
- Recommendation acceptance and outcome
- Policy denials and approval duration
- Action success and compensation rate
- Model usage and cost
- Infrastructure saturation and spend

## 18. Testing standard

| Scope | Standard |
|---|---|
| TypeScript unit tests | Vitest |
| Python unit tests | Pytest |
| Property-based tests | Hypothesis |
| React component tests | Testing Library |
| Browser journeys | Playwright |
| API validation | OpenAPI and Schemathesis |
| Cross-language contracts | Shared JSON Schema fixtures |
| Databases and queues | Testcontainers |
| Performance | k6 |
| Security | CodeQL, Dependabot, Trivy |
| Intelligence quality | Golden datasets and benchmark suites |
| Platform behaviour | Event replay and synthetic organization simulations |

Each release must define measurable acceptance thresholds. A successful test run alone does not prove extraction quality, matching accuracy, retrieval relevance, prediction reliability, or action safety.

## 19. Deployment topology

| Component | Target |
|---|---|
| React web application | Vercel |
| TypeScript API | Azure Container Apps |
| TypeScript background worker | Azure Container Apps |
| Python intelligence runtime | Azure Container Apps |
| PostgreSQL | Azure Database for PostgreSQL |
| Neo4j | Managed Neo4j deployment on Azure |
| Files and model artifacts | Azure Blob Storage |
| Event distribution | Azure Event Hubs |
| Cache and working memory | Azure Managed Redis |
| Secrets | Azure Key Vault |
| Container images | Azure Container Registry |
| Monitoring | Azure Monitor and Application Insights |
| Model training and evaluation | Azure Machine Learning |
| API gateway | Azure API Management |
| CI/CD | GitHub Actions |

## 20. Delivery order

The roadmap phases are cumulative. A later phase cannot bypass the guarantees established by an earlier phase.

```text
Evidence and Tokens
        ↓
Organizational Understanding
        ↓
Live State
        ↓
Memory
        ↓
Context
        ↓
Predictions and Recommendations
        ↓
Governed Actions
        ↓
Enterprise Platform
        ↓
Research and Future Architectures
```

The event store, contracts, tenant isolation, evidence model, observability, evaluation, and human-review capability are platform-wide foundations. They must evolve from the beginning rather than being postponed until the later roadmap phases.

## 21. Final technology decision

Orgni standardizes on:

> **A TypeScript control plane, Python intelligence plane, PostgreSQL system of record, Neo4j organizational graph, Azure Event Hubs event backbone, Redis working memory, pgvector semantic memory, Azure Blob Storage evidence layer, Temporal workflow orchestration, Open Policy Agent governance, Azure cloud infrastructure, and a React frontend deployed on Vercel.**

All engineering work must preserve one canonical contract, one traceable evidence chain, immutable organizational history, tenant isolation, and human control over consequential actions.
