# ADR-009: Choose gRPC Over REST For Client-Facing Communication

**Status:** Accepted  
**Date:** November 2025  
**Decision Makers:** Lê Ngọc Anh, Lê Văn Bảo, Nguyễn Bá Tuấn Anh  
**Module Context:** **_Module A_** - Architectural Design for Scalability and Performance

---

## Background / Context

The UIT-Go platform is a microservices-based system:

- Client → Kong Gateway: requires low-latency, high-throughput communication
- Gateway → Microservices (User, Trip, Driver, Notification, etc.): continues to use RabbitMQ for internal event-driven communication
- Current REST API for client-facing calls has high overhead (JSON serialization) and lacks streaming support
- gRPC offers low-latency, streaming, and type-safe payloads, making it suitable for real-time client interactions

---

## Requirements

### Functional Requirements

- Clients must call APIs via Kong Gateway using gRPC
- Gateway forwards requests to microservices, while microservices still communicate internally via RabbitMQ

---

### Non-Functional Requirements

- Low latency (<5ms) for client-facing RPC
- Streaming support for real-time data (e.g., GPS updates, trip status)
- Backward compatibility with REST if required temporarily
- Easy integration with multiple client platforms

---

## Decison Drivers

1. Performance and low-latency requirements for client-facing APIs
2. Streaming support for real-time updates
3. Type-safe payloads through proto files
4. Interoperability for multi-platform clients
5. Maintaining internal event-driven architecture via RabbitMQ

---

## Considered Options

### Option 1: gRPC client-facing + RabbitMQ internal (SELECTED)

**Pros:**

- ✅ Low-latency communication from clients to Gateway
- ✅ Supports bi-directional streaming and type-safe payloads
- ✅ Internal microservices remain decoupled using RabbitMQ
- ✅ Easy integration with Kong Gateway

**Cons:**

- ❌ Learning curve for team to master gRPC and proto files
- ❌ Debugging is more complex compared to REST

**Architectural Fit:**  
Ideal for real-time client interactions, while preserving event-driven microservices internally.

---

### Option 2: REST client-facing + RabbitMQ internal

**Pros:**

- ✅ Familiar to developers
- ✅ Easier to debug and inspect payloads (JSON)

**Cons:**

- ❌ Higher latency than gRPC
- ❌ No streaming support for real-time updates
- ❌ Less type safety

**Architectural Fit:**  
Suitable for basic client-facing APIs, but not optimal for real-time communication requirements.

---

## Decision Summary

The team chose gRPC for client-facing communication (Client → Kong Gateway), while keeping RabbitMQ for internal microservices communication.

> gRPC ensures low latency, streaming, and type-safe payloads, while RabbitMQ continues to support decoupled, event-driven microservices.

---

## Trade-offs

| What We Sacrifice    | Impact                                   | Mitigation Strategy                         |
| -------------------- | ---------------------------------------- | ------------------------------------------- |
| Learning curve       | Team must learn gRPC and proto files     | Conduct workshops and provide documentation |
| Debugging complexity | Payloads are harder to inspect than JSON | Use grpcurl or gRPC debugging tools         |
| Proto management     | Need to version and manage proto files   | Maintain central proto repository           |

---

## Positive Consequences

- ✅ Low-latency client-facing API calls
- ✅ Streaming support for real-time updates
- ✅ Type-safe communication
- ✅ Maintains internal event-driven microservices

---

## Negative Consequences

- ❌ Learning curve for team
- ❌ Debugging less straightforward than REST
- ❌ Proto file versioning required

---

## Validation & Measurement

- Test Setup: 4 microservices (User, Trip, Driver, Notification) deployed in local Kubernetes cluster
- Throughput: ~12k req/sec for client-facing calls (target >10k)
- Latency: 2–5ms per RPC (target <5ms)
- Streaming: GPS updates from 1000 drivers handled in real-time without loss
- Conclusion: gRPC meets all Module A client-facing communication requirements

---

## Future Considerations

- Explore gRPC-Web for frontend clients that require direct gRPC access
- Evaluate load balancing, retries, and circuit breaker patterns for production gRPC calls
- Maintain proto versioning strategy to ensure backward compatibility

---

## References

1. [gRPC Documentation](https://grpc.io/docs/)
2. ADR-001: Choosing RabbitMQ Instead of Kafka for Event-Driven Messaging
3. RabbitMQ internal microservices communication

---

## Changelog

| Date     | Version | Changes                                    | Author             |
| -------- | ------- | ------------------------------------------ | ------------------ |
| Nov 2025 | 1.0     | Initial decision                           | Nguyễn Bá Tuấn Anh |
| Nov 2025 | 1.1     | Added trade-offs, validation, future plans | Lê Ngọc Anh        |

**Decision Status:** ✅ **ACCEPTED**  
**Last Review:** November 2025  
**Next Review:** Q2 2026
