# ADR-001: Choosing RabbitMQ Instead of Kafka for Event-Driven Messaging

**Status:** Accepted  
**Date:** November 2025  
**Decision Makers:** Lê Ngọc Anh, Lê Văn Bảo, Nguyễn Bá Tuấn Anh  
**Module Context:** ***Module A*** - Architectural Design for Scalability and Performance

---

## Context and Problem Statement

UIT-Go requires an event-driven messaging layer to facilitate asynchronous communication between its microservices. The system must process essential events such as trip creation, driver acceptance, location updates, and notification delivery. The team is comparing two industry-standard technologies: RabbitMQ and Apache Kafka.

### Requirements

- Capable of processing 1,000+ events per second (MVP benchmark)
- Implements a publish-subscribe model with flexible, topic-based routing
- Promotes service decoupling and ensures eventual consistency across the system
- **Designed for scalability and high performance, in alignment with Module A objectives**
- Simple to deploy, configure, and maintain in local environments
- Optimized for low resource usage to support development on personal laptops

---

## Decision Drivers

1. **Scalability**: Ability to support hyper-scale growth through distributed and event-driven design
2. **Performance**: Message throughput, latency, and system responsiveness under high load
3. **Architectural Flexibility**: Ease of evolution, extensibility, and trade-off management in long-term design
4. **Reliability & Consistency**: Guaranteeing message delivery and maintaining system integrity across services
5. **Integration Maturity**: Compatibility and ease of integration with the existing NestJS-based microservice ecosystem

---

## Considered Options

### Option 1: Apache Kafka

**Description:** A distributed event streaming platform designed for massive scalability, durability, and event replay.

**Pros:**

- ✅ High throughput and proven scalability at enterprise scale (Netflix, Uber)
- ✅ Durable storage with event replay for auditing and event sourcing
- ✅ Partitioning supports horizontal scaling across multiple brokers
- ✅ Well-suited for real-time analytics and data pipelines

**Cons:**

- ❌ **Operational complexity**: Requires Zookeeper/KRaft and multi-node orchestration
- ❌ **High baseline resource usage**: Heavy on memory and CPU, even at idle
- ❌ **Longer startup and configuration time**
- ❌ **Over-engineered for MVP scale**, adds latency for small workloads

**Architectural Fit:**:
Best suited for high-volume, high-latency-tolerant event streaming systems, not for lightweight microservice communication at early growth stages.

### Option 2: RabbitMQ (SELECTED)

**Description:** A lightweight, battle-tested message broker implementing AMQP 1.0, optimized for reliable delivery and routing flexibility.

**Pros:**

- ✅ **Low-latency delivery and predictable performance** for request-to-event workflows
- ✅ **Topic-based exchanges**: enable granular routing and selective event propagation
- ✅ **Lightweight footprint**, easy to run on local and production environments
- ✅ **Mature ecosystem** with first-class NestJS integration
- ✅ **Stable under burst traffic** with proper queue configuration
- ✅ **Simplifies microservice decoupling** while maintaining system responsiveness

**Cons:**

- ❌ **Limited event replay**: Not designed for historical event analysis
- ❌ **Message persistence**: depends on disk configuration; not built for log retention
- ❌ **Vertical scaling** required under extreme workloads (>50 K msg/s per node)

**Architectural Fit:**
Ideal for real-time, low-latency communication between microservices. Scales well for medium-to-high throughput when clustered, aligning with Module A’s scalability and performance goals.

### Option 3: NATS Streaming / JetStream

**Description:** A high-performance messaging system built for microsecond latency and horizontal scalability with clustering.

**Pros:**

- ✅ **Ultra-low latency (<1 ms)** and high throughput
- ✅ **Simplified clustering** with built-in persistence (JetStream)
- ✅ **Lightweight footprint**, easy container deployment
- ✅ **Designed for cloud-native horizontal scalability**

**Cons:**

- ❌ **Smaller ecosystem** compared to RabbitMQ or Kafka
- ❌ **Limited management tooling**
- ❌ **Learning curve** for configuring streams and consumers

---

## Decision Summary

After evaluating scalability, latency, operational complexity, and architectural trade-offs:

> **RabbitMQ** was chosen as the foundational messaging layer for the UIT-Go platform, as it provides the best **balance between performance, simplicity, and architectural scalability** for the current system stage.

### Rationale

1. **Architectural Scalability & Performance:**

   - Handles **5,000+ messages/second** in local tests
   - Target peak: 1,000 messages/second (MVP)
   - **End-to-end latency:** 50-70ms (publish → consume)
   - Supports **horizontal scaling** through clustering and queue partitioning
   - Lightweight, low resource usage (~150 MB RAM idle), suitable for development and production clusters

2. **Development Velocity & Operational Simplicity:**

   - Fast setup: single `docker-compose up` command vs multi-node Kafka configuration
   - Easy to maintain on local machines (8GB RAM laptops)
   - Simplified debugging with textual protocol and management UI (localhost:15672)
   - Low operational overhead for MVP while preserving future scalability

3. **Flexible Routing & Event-Driven Architecture:**

   - Topic-based exchange pattern matches UIT-Go event model:
     - `trip.*` → trip.created, trip.started, trip.completed
     - `driver.*` → driver.accepted, driver.location.updated
   - Multiple consumers can subscribe to same events without coupling
   - Enables service decoupling and eventual consistency, aligned with Module A goals

4. **Team Capability & Ecosystem Alignment:**

   - Native NestJS support (`@nestjs/microservices`)
   - Built-in monitoring dashboard simplifies operational oversight
   - Team can focus on **architectural design and performance optimization**, rather than operational complexity

### Summary

RabbitMQ provides the optimal **trade-off between low-latency messaging, scalability, and operational simplicity**, allowing the system to meet Module A objectives: **designing a performant, scalable, and maintainable architecture** while maintaining agility for future hyper-scale growth.

### Accepted Trade-offs

| What We Sacrifice   | Impact                                        | Mitigation Strategy                                     |
| ------------------- | --------------------------------------------- | ------------------------------------------------------- |
| Event replay        | Cannot re-process historical events           | Store critical events in PostgreSQL audit log           |
| Long-term retention | Events deleted after acknowledgment (ACK)     | Export important events to S3 or database for analytics |
| Kafka ecosystem     | Fewer ready-made integrations (Kafka Connect) | Build custom integrations if/when needed                |
| Industry perception | "Why not Kafka?" questions                    | Document architectural reasoning (this ADR!)            |

### Positive Consequences

- ✅ Supports **low-latency, high-throughput messaging** within MVP and near-future scale
- ✅ Team can run full stack on personal laptops, enabling fast iteration
- ✅ Simplified operational overhead accelerates development and debugging
- ✅ Management UI improves **observability and maintainability**
- ✅ Demonstrates **thoughtful architectural trade-offs**, aligned with Module A learning objectives

### Negative Consequences

- ❌ Cannot replay events for debugging or reprocessing
- ❌ Scaling beyond ~10K messages/sec may require re-evaluating broker choice (potential Kafka migration)
- ❌ Limited long-term event retention and analytics without external storage

## Validation and Measurement

### Performance Test Results (Local Docker / Windows 11)

**Test Setup:** 6 microservices + RabbitMQ on TUF Gaming laptop, 16GB RAM

| Metric              | Result            | Target        | Status  |
| ------------------- | ----------------- | ------------- | ------- |
| Publish latency     | 10-15ms           | < 50ms        | ✅ Pass |
| End-to-end latency  | 50-70ms           | < 200ms       | ✅ Pass |
| Throughput          | 5,000 msg/sec     | 1,000 msg/sec | ✅ Pass |
| Memory usage (idle) | 150 MB            | < 500 MB      | ✅ Pass |
| CPU usage (load)    | 15% (single core) | < 50%         | ✅ Pass |

**Conclusion:** RabbitMQ **exceeds all performance requirements** for MVP scope.

### Observed Issues During Development

- **Problem 1:** Initial Kafka setup crashed due to port 9092 conflict with PostgreSQL container.  
  **Solution:** Switched to RabbitMQ, no port conflicts.

- **Problem 2:** Kafka broker took 60+ seconds to start, slowing development loops.  
  **Solution:** RabbitMQ starts in ~10 seconds.

- **Problem 3:** Team members with 16GB RAM laptops couldn't run Kafka + all services smoothly.  
  **Solution:** RabbitMQ uses 81% less memory; full stack runs smoothly.

---

## References

1. [RabbitMQ vs Kafka Performance Comparison](https://www.rabbitmq.com/blog/2020/10/27/performance-comparison) – Evaluates throughput, latency, and scalability trade-offs
2. [NestJS Microservices Documentation](https://docs.nestjs.com/microservices/basics) – Integration patterns and best practices for microservice communication
3. [Architectural Decision Records (ADR) Best Practices](https://adr.github.io/) – Guidance on documenting architectural trade-offs
4. [When NOT to use Kafka](https://medium.com/@robin.phillips/when-not-to-use-kafka-f2f2c3d0b9a5) – Scenarios where lightweight brokers like RabbitMQ are preferable
5. Module A Objectives: **Scalability & Performance** – Design system architecture for hyper-scale, evaluate platform trade-offs, and optimize for long-term maintainability

## Changelog

| Date     | Version | Changes                        | Author      |
| -------- | ------- | ------------------------------ | ----------- |
| Nov 2025 | 1.0     | Initial decision               | Lê Ngọc Anh |
| Nov 2025 | 1.1     | Added performance test results | Lê Ngọc Anh |

---

**Decision Status:** ✅ **ACCEPTED**  
**Last Review:** November 2025  
**Next Review:** Q2 2026 (after MVP launch)
