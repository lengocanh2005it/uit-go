# ADR-006: Monorepo Structure for Microservice Management

**Status:** Accepted  
**Date:** November 2025  
**Decision Makers:** Lê Ngọc Anh, Lê Văn Bảo, Nguyễn Bá Tuấn Anh  
**Module Context:** ***Module A*** - Architectural Design for Scalability and Performance

---

## Context and Problem Statement

UIT-Go contains multiple NestJS microservices (User, Trip, Driver, Notification) plus shared libraries (common DTOs/enums/utils, protobuf contracts). We needed a repository strategy that keeps service boundaries clear while enabling code reuse, consistent tooling, and fast iteration for both local and cloud environments.

### Requirements

- Single source of truth for shared code (common module, decorators, DTOs, proto definitions)
- Consistent lint/test/build/release tooling across services
- Simple local onboarding (`docker compose up` from one root)
- Support for isolated deployability per service (Dockerfile per app, independent pipelines)
- Reduced duplication of config (ESLint, Prettier, tsconfig, scripts)

---

## Decision Drivers

1. **Developer Velocity:** minimize setup friction and drift across services
2. **Consistency:** shared standards for linting, testing, and code generation
3. **Isolation for Deploy:** each service still builds and ships independently
4. **Visibility:** single place to review changes that span contracts and services
5. **Tooling Fit:** works with NestJS workspace layout and shared libs

---

## Considered Options

### Option 1: Polyrepo (one repo per service)

**Pros:**
- Clear isolation and blast-radius boundaries
- Smaller repos can be simpler to reason about

**Cons:**
- Contract and DTO duplication or complex sync needed
- Harder to coordinate breaking changes across services
- Heavier CI/CD maintenance (multiple pipelines to keep aligned)

### Option 2: Monorepo (SELECTED)

**Pros:**
- Shared libs (`libs/common`) for DTOs/enums/utils/proto, reducing duplication
- Single lint/test/build tooling and lockfile for all services
- Easier cross-service refactors and contract updates
- One `docker-compose` for the full stack; simpler local onboarding

**Cons:**
- Larger repo; CI jobs need scoping to avoid unnecessary work
- Potential blast radius if shared packages change without care
- Requires discipline for service boundaries and ownership

### Option 3: Hybrid (monorepo for shared libs, polyrepo for services)

**Pros:**
- Keeps shared code centralized while isolating services

**Cons:**
- Still introduces cross-repo dependency management and version bumps
- More coordination overhead than a single repo

---

## Decision Summary

> Adopt a **monorepo** for all microservices and shared libraries, using the NestJS workspace layout with `apps/` for services and `libs/common` for shared code.

### Rationale

- Aligns with existing NestJS tooling and generators
- Minimizes duplication of DTOs, enums, and protobuf contracts
- Simplifies local and CI workflows with one `package-lock.json` and unified scripts
- Supports per-service Dockerfiles and deploy steps while keeping code close

---

## Accepted Trade-offs

| What We Sacrifice        | Impact                                   | Mitigation Strategy                                  |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------- |
| Larger repo size         | Longer clone/install for new devs        | Use cached deps; document minimal install steps      |
| Blast radius of changes  | Shared code changes can affect all apps  | CI test matrix per service; versioned shared modules |
| CI time                  | Running all tests can be slower          | Scope jobs to touched services; cache builds         |

---

## Positive Consequences

- Faster cross-service refactors and schema updates
- Consistent tooling (ESLint, Prettier, Jest, Nest CLI) reduces drift
- One `docker-compose` and script set for full-stack local runs
- Clear location for shared infra scripts (proto generation, secrets handling)

## Negative Consequences

- Requires discipline to avoid tight coupling via shared code
- CI must be optimized to avoid unnecessary builds/tests
- Onboarding requires understanding monorepo layout

---

## Validation and Measurement

- Local onboarding time: <30 minutes from clone to running `docker compose up`
- CI job scoping: verify only changed services run unit tests/builds
- Contract changes: proto/DTO updates visible and testable within one PR

---

## References

1. NestJS Monorepo Patterns (apps/libs)  
2. ADR-001: RabbitMQ for Event-Driven Messaging  
3. ADR-002: Kong Gateway for API routing

---

## Changelog

| Date     | Version | Changes               | Author       |
| -------- | ------- | --------------------- | ------------ |
| Nov 2025 | 1.0     | Initial decision      | Lê Văn Bảo   |
