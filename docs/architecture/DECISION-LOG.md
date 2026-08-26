# Architecture Decision Log

## Worker and Redis Decision — Stage 1

**Status:** Accepted

**Date:** 2026-08-24

**Scope:** Stage 1 internal-alpha deployment

### Decision

For Stage 1 of deployment, Orgni will retain the current synchronous,
in-process document-processing path.

The worker service is not a durable queue consumer in this stage. Redis is
provisioned as Azure infrastructure and exposed through `REDIS_URL`, but
Redis/BullMQ is not currently used for job queueing or worker coordination.

### Current Worker Behavior

- Document processing runs synchronously in the current API/runtime path.
- The deployed worker is currently a heartbeat service and does not consume
  persistent jobs.
- There is no Redis/BullMQ-backed job queue.
- There is no dead-letter queue (DLQ).
- Current failure handling does not provide durable queue-based recovery for
  in-flight work.

### Stage 1 Scope

This decision applies to the internal-alpha deployment only.

Stage 1 is a controlled internal deployment intended to validate the core
document-processing flow before introducing additional queueing
infrastructure.

This decision does not establish the synchronous path as the final
production ingestion architecture.

### Rationale

Introducing BullMQ + DLQ at Stage 1 would add operational complexity before
the core processing flow has been validated.

For a controlled internal deployment, synchronous processing keeps the flow
easier to observe, debug, and validate.

BullMQ, Redis-backed job processing, retries, DLQ handling, and related
operational controls can be introduced when the queue-based architecture is
required.

### Known Limitations

- No durable job queue.
- No queue-based retry handling.
- No DLQ.
- An in-flight document can be lost if the processing runtime fails before
  durable persistence.
- The current worker does not provide persistent job recovery.

### Required Before a Queue-Based Production Path

- Implement Redis/BullMQ job processing.
- Add durable retry and DLQ handling.
- Add idempotency and appropriate failure recovery.
- Add queue-depth, retry, and DLQ observability.
- Retire the synchronous in-request path for workloads that require durable
  asynchronous processing.

### Approval

The Stage 1 synchronous-processing decision was reviewed and approved by
Stakio on 2026-08-24.

Stage 1 remains internal-only, with synchronous in-process processing.
BullMQ + DLQ is intentionally deferred until the core processing flow has
been validated.

### Owner

**Deployment owner:** Alisha

### Date

2026-08-24
## Stage 1 Internal-Alpha Scope & Incident Ownership

- **Scope:** Stage 1 is limited to a controlled internal-alpha deployment.
  External customer onboarding is out of scope for this stage.
- **Deployment authority:** Alisha owns deployment decisions for Stage 1.
  This was confirmed by Tabu during the deployment review.
- **Incident owner:** Alisha is the incident owner for Stage 1 deployment and
  runtime incidents.
- **Escalation:** Any incident requiring decisions beyond the Stage 1 internal
  scope will be escalated to the appropriate project owner.
- **Status:** Confirmed for Stage 1.
- **Date:** 2026-08-24