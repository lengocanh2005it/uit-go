# ADR-007: Infrastructure as Code with Terraform

**Status:** Accepted  
**Date:** November 2025  
**Decision Makers:** Lê Ngọc Anh, Lê Văn Bảo, Nguyễn Bá Tuấn Anh  
**Module Context:** ***Module A*** - Architectural Design for Scalability and Performance

---

## Context and Problem Statement

UIT-Go must provision and manage cloud infrastructure (VPC, subnets, IAM, RDS/Postgres, RDS/MySQL, DynamoDB, ElastiCache/Redis, RabbitMQ host, Kong host, ECS services, monitoring) in a repeatable and reviewable way. Manual console setup or ad-hoc scripts do not scale, are error-prone, and hinder reproducibility across environments.

### Requirements

- Declarative, version-controlled infrastructure definitions
- Reproducible environments (dev/stage/prod) with minimal drift
- Modular design to reuse building blocks (network, data stores, messaging, compute)
- Works with AWS and our current stack (ECS Fargate, RDS, ElastiCache, DocumentDB/DynamoDB, Kong)
- Fits existing CI/CD and code review practices

---

## Decision Drivers

1. **Reproducibility:** deterministic infra creation across environments
2. **Modularity:** reusable modules for VPC, DBs, messaging, and compute
3. **Ecosystem Fit:** broad AWS support, community modules, state management
4. **Observability of change:** infra changes via PRs with plan/apply transparency
5. **Team familiarity:** low learning curve relative to alternatives

---

## Considered Options

### Option 1: Manual AWS Console / CLI Scripts

**Pros:**  
- Quick for one-off experiments

**Cons:**  
- High drift risk; hard to review and audit  
- Not reproducible; poor for team collaboration  
- Error-prone and slow to update consistently

### Option 2: AWS CloudFormation / CDK

**Pros:**  
- Native AWS support; managed state  
- CDK offers higher-level constructs

**Cons:**  
- AWS-specific; harder to port or reuse outside AWS  
- Learning curve for CDK constructs; more verbose for some resources  
- Limited community ecosystem compared to Terraform modules

### Option 3: Terraform (SELECTED)

**Pros:**  
- Cloud-agnostic, mature ecosystem and registry modules  
- Strong AWS provider coverage for VPC, RDS, ECS, ElastiCache, IAM, etc.  
- Declarative plans with `terraform plan/apply` for reviewability  
- Module reuse (e.g., VPC, RDS, Redis, RabbitMQ, Kong, ECS services) already structured in `infra/`  
- Fits existing workflows (Git-based reviews, remote state)

**Cons:**  
- State management overhead (needs remote backend and locking)  
- HCL adds another DSL for the team to learn  
- Large plans can be slower to run without caching

---

## Decision Summary

> Use **Terraform** to define, version, and provision all cloud infrastructure for UIT-Go, organized into reusable modules under `infra/`.

### Rationale

- Matches Module A goals of scalability and repeatability for the architecture in `uit-go.drawio.png`
- Provides plan/apply transparency for peer review and audit
- Modularizes core components (VPC, IAM, RDS, DynamoDB, Redis, RabbitMQ host, Kong host, ECS services)
- Simplifies environment parity and rollback via state and plans

---

## Accepted Trade-offs

| What We Sacrifice      | Impact                                      | Mitigation Strategy                              |
| ---------------------- | ------------------------------------------- | ------------------------------------------------ |
| State management       | Need remote backend and locking             | Use S3 + DynamoDB state/lock; guardrails in CI   |
| HCL learning curve     | Team learns Terraform DSL                   | Standards, examples in `infra/`, internal docs   |
| Plan/apply time        | Larger changes can be slower                | Module scoping; cached providers; smaller plans  |

---

## Positive Consequences

- Reproducible, reviewable infra changes via PRs and `terraform plan`
- Shared modules reduce duplication and enforce best practices (networking, DBs, messaging)
- Easier environment parity (dev/stage/prod) and faster onboarding

## Negative Consequences

- Additional tooling to maintain (backends, providers)
- Mismanaged state can block applies or cause drift if not disciplined
- Requires CI integration to avoid local-only applies

---

## Validation and Measurement

- Successful `terraform plan`/`apply` for VPC, RDS, DynamoDB, ElastiCache, RabbitMQ host, Kong host, ECS services
- Environment parity: dev/stage/prod created from the same modules with different tfvars
- Change auditability: infra changes merged only after reviewed plans

---

## References

1. Terraform AWS Provider documentation  
2. ADR-002: Kong Gateway (needs infra support)  
3. ADR-003: Database Choice (RDS/DynamoDB/DocumentDB/Redis provisioning)

---

## Changelog

| Date     | Version | Changes          | Author       |
| -------- | ------- | ---------------- | ------------ |
| Nov 2025 | 1.0     | Initial decision | Lê Văn Bảo   |
