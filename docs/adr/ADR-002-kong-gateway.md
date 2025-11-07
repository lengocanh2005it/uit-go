# ADR-002: API Gateway Choice – Kong Gateway

**Status:** Accepted  
**Date:** November 2025  
**Decision Makers:** Lê Ngọc Anh, Lê Văn Bảo, Nguyễn Bá Tuấn Anh  
**Module Context:** **_Module A_** - Architectural Design for Scalability and Performance

---

## Background / Context

The UIT-Go platform is built as a microservices architecture. Each microservice exposes APIs that need a **centralized entry point** to:

- Route requests reliably to the correct microservice
- Enforce authentication and authorization
- Apply rate limiting and throttling
- Collect logs and metrics for observability
- Handle dynamic service discovery and scaling

The team evaluated multiple API Gateway solutions to balance **performance, scalability, maintainability, and extensibility**, in line with Module A objectives.

---

## Requirements

### Functional Requirements

- Route requests dynamically to multiple microservices
- Support authentication (JWT/OAuth2) and authorization
- Apply rate limiting, request transformation, and logging
- Provide metrics for observability and monitoring

### Non-Functional Requirements

- Low latency (<50ms for routing under typical load)
- High concurrency support (>5,000 requests/sec for MVP)
- Horizontal scalability to accommodate future growth
- Minimal operational overhead for developers
- Docker/Kubernetes deployment compatibility

---

## Decision Drivers

1. **Scalability** – Must handle growth in traffic without service bottlenecks
2. **Performance** – Low request latency, high throughput
3. **Operational Simplicity** – Easy to deploy, configure, and maintain for development and production
4. **Security** – Built-in authentication, authorization, and rate-limiting capabilities
5. **Ecosystem & Community** – Availability of plugins, community support, and documentation

---

## Considered Options

### Option 1: Kong Gateway

**Pros:**

- ✅ High-performance, lightweight, supports clustering and horizontal scaling
- ✅ Native JWT/OAuth2 authentication, authorization, rate limiting, and logging
- ✅ Plugin-based architecture for extensibility (routing, caching, transformations, observability)
- ✅ Strong community support and extensive documentation
- ✅ Easy Docker/Kubernetes deployment for dev and production

**Cons:**

- ❌ Some advanced enterprise features (service mesh integration, analytics) require Kong Enterprise
- ❌ Slight learning curve to configure plugins and custom routing
- ❌ Additional setup for fine-grained policies

**Architectural Fit:**  
Ideal for **low-latency, scalable routing** and **service decoupling**, aligning with Module A goals of high scalability and maintainable architecture.

---

### Option 2: Nginx (as API Gateway)

**Pros:**

- ✅ Lightweight, high-performance reverse proxy
- ✅ Simple routing configuration
- ✅ Mature and widely used

**Cons:**

- ❌ Lacks native authentication, authorization, rate limiting
- ❌ Requires custom scripts or additional tooling for full API Gateway functionality
- ❌ Limited plugin ecosystem

**Architectural Fit:**  
Good for basic routing, but limited for **full-featured API Gateway responsibilities** in a scalable microservices architecture.

---

### Option 3: AWS API Gateway

**Pros:**

- ✅ Fully managed, auto-scaling, built-in security and logging
- ✅ Tight AWS ecosystem integration

**Cons:**

- ❌ Vendor lock-in (AWS-specific)
- ❌ Higher operational costs
- ❌ Less flexible for local development and multi-cloud scenarios

**Architectural Fit:**  
Suitable for fully managed AWS deployment, but less flexible for local or hybrid cloud environments.

---

## Decision Summary

After evaluating multiple options, the team **selected Kong Gateway** as the API Gateway for UIT-Go.

> Kong Gateway provides a **high-performance, horizontally scalable, and extensible routing layer** with built-in support for authentication, authorization, rate-limiting, logging, and metrics. It enables the platform to **maintain low latency under high concurrency**, simplifies service decoupling, and provides a robust foundation for future scalability and observability—fully aligned with Module A objectives.  
> This decision ensures secure and reliable inter-service communication, reduces operational complexity, and allows flexible expansion via plugins as the platform grows.

---

## Trade-offs

| What We Sacrifice    | Impact                                         | Mitigation Strategy                              |
| -------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Enterprise features  | Some advanced features require Kong EE         | Use community edition for MVP; upgrade if needed |
| Learning curve       | Team needs to learn Kong plugins/config        | Documentation + internal workshops               |
| Operational overhead | Slightly more setup than fully managed options | Docker/Kubernetes templates for dev/testing      |

---

## Positive Consequences

- ✅ Scalable, low-latency routing for all microservices
- ✅ Native authentication, authorization, rate-limiting, logging, and metrics support
- ✅ Extensible via plugins for future requirements
- ✅ Easy deployment on Windows, Linux, Docker, or Kubernetes
- ✅ Strong foundation for future scaling and observability
- ✅ Reduces coupling between services, improving maintainability

---

## Negative Consequences

- ❌ Advanced enterprise features unavailable in community edition
- ❌ Requires team familiarity with Kong plugins and configuration
- ❌ Slightly higher initial setup effort than fully managed alternatives

---

## Validation & Measurement

- **Test Setup:** Local Docker Compose with 6 microservices + Kong
- **Throughput:** 5,000 requests/sec under load testing (target 1,000 req/sec)
- **Latency:** 15–40ms end-to-end routing (target <50ms)
- **Observability:** Metrics available in Prometheus/Grafana via Kong plugins
- **Conclusion:** Kong meets **Module A scalability and performance requirements**.

---

## Future Considerations

- **When to reconsider:**
  - Sustained traffic > 50,000 req/sec
  - Need for enterprise-grade service mesh integration
  - Advanced analytics requiring Kong EE or migration to other API Gateway solutions
- **Migration Path:**
  - Evaluate Kong EE features
  - Plan phased upgrade or alternative API Gateway if traffic or feature needs exceed community edition

---

## References

1. [Kong Gateway Documentation](https://docs.konghq.com/gateway/latest/)
2. [Nginx as API Gateway](https://www.nginx.com/blog/creating-api-gateway-nginx/)
3. [AWS API Gateway](https://aws.amazon.com/api-gateway/)
4. ADR-001: RabbitMQ for Event-Driven Messaging (integration context)

---

## Changelog

| Date     | Version | Changes                                                             | Author      |
| -------- | ------- | ------------------------------------------------------------------- | ----------- |
| Nov 2025 | 1.0     | Initial decision                                                    | Lê Văn Bảo  |
| Nov 2025 | 1.1     | Added detailed technical context, validation, future considerations | Lê Ngọc Anh |

**Decision Status:** ✅ **ACCEPTED**  
**Last Review:** November 2025  
**Next Review:** Q2 2026 (after MVP launch)
