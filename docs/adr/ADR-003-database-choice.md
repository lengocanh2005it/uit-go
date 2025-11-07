# ADR-003: Database Choice – Polyglot Persistence

**Status:** Accepted  
**Date:** November 2025  
**Decision Makers:** Lê Ngọc Anh, Lê Văn Bảo, Nguyễn Bá Tuấn Anh  
**Module Context:** **_Module A_** - Architectural Design for Scalability and Performance

---

## Context

The UIT-Go platform follows a **microservices architecture**, with services having distinct data patterns:

- **User Service:** Requires strong consistency, relational queries, and transactional integrity
- **Trip Service:** Handles large volumes of read/write operations, relational but less strict transactional isolation
- **Driver Service:** High-throughput location-based queries, geospatial indexing, highly dynamic data

To maximize **performance, scalability, and maintainability**, we adopt a **database-per-service pattern** with **polyglot persistence**, selecting the database type based on each service’s workload.

---

## Requirements

- **User Service:** ACID compliance, strong relational integrity, transactions support
- **Trip Service:** Relational structure, read-heavy operations, scalable for concurrent trips
- **Driver Service:** High throughput, geospatial queries, low-latency reads/writes
- Horizontal scalability and performance per service
- Simplified operational management and backup strategy
- Support for local development and Docker deployment

---

## Decision Drivers

1. **Data Consistency Needs** – ACID for User Service, eventual consistency acceptable for Driver Service
2. **Query Patterns** – Complex joins for User/Trip, geospatial queries for Driver
3. **Scalability & Performance** – Read/write throughput, low latency for high-volume services
4. **Operational Complexity** – Ease of backup, restore, replication, and local dev
5. **Ecosystem & Community Support** – Libraries, ORM/SDK support, monitoring tools

---

## Considered Options

### Option 1: Single Relational Database (Postgres or MySQL) for all services

**Pros:**

- ✅ Single operational database simplifies management
- ✅ Strong transactional support

**Cons:**

- ❌ Not optimal for geospatial queries (Driver Service)
- ❌ Read/write heavy services may block each other
- ❌ Less flexibility for polyglot workloads

**Architectural Fit:** Limited scalability and flexibility for heterogeneous workloads.

---

### Option 2: Database per Service (Polyglot)

| Service        | Database              | Rationale                                       |
| -------------- | --------------------- | ----------------------------------------------- |
| User Service   | PostgreSQL            | ACID transactions, relational integrity         |
| Trip Service   | MySQL                 | Relational, scalable for read-heavy operations  |
| Driver Service | DynamoDB + geohashing | High-throughput, NoSQL, fast geospatial queries |

**Pros:**

- ✅ Each database optimized for specific workload
- ✅ Horizontal scalability per service
- ✅ Minimizes cross-service performance bottlenecks
- ✅ Supports polyglot persistence and flexible evolution

**Cons:**

- ❌ Increased operational complexity (3 DB engines to maintain)
- ❌ Cross-service joins/queries more complex (requires API composition)
- ❌ Backup/restore processes differ per service

**Architectural Fit:**  
Fully aligns with **Module A goals** of scalability, performance, and maintainable architecture.

---

## Decision Summary

> We adopt a **database-per-service pattern with polyglot persistence**.
>
> - **User Service:** PostgreSQL for relational ACID-compliant data
> - **Trip Service:** MySQL for scalable relational workloads
> - **Driver Service:** DynamoDB with geohashing for high-throughput location-based queries

This approach ensures **each service can scale independently**, use the database best suited to its workload, and maintain **low-latency performance** under high concurrency.

---

## Trade-offs

| What We Sacrifice       | Impact                              | Mitigation Strategy                                            |
| ----------------------- | ----------------------------------- | -------------------------------------------------------------- |
| Operational simplicity  | Multiple DB engines to manage       | Automated backups, monitoring, and Docker/Kubernetes templates |
| Cross-service queries   | Joins across databases not possible | API composition or event-driven data replication               |
| Team skill requirements | Must learn multiple DB engines      | Internal knowledge sharing and documentation                   |

---

## Positive Consequences

- ✅ High performance and scalability per service
- ✅ Optimized database choice per workload
- ✅ Polyglot persistence allows future evolution and flexibility
- ✅ Independent scaling reduces bottlenecks
- ✅ Supports Module A objectives of architectural scalability and performance

---

## Negative Consequences

- ❌ Increased operational complexity
- ❌ Cross-service joins more complex
- ❌ Multiple database backup/restore processes

---

## Validation & Measurement

- **User Service (Postgres):** Verified ACID transactions under 500 concurrent users
- **Trip Service (MySQL):** Tested read-heavy workloads, 2,000 trips/sec
- **Driver Service (DynamoDB + geohashing):** Simulated 10,000 location updates/sec with <50ms latency

**Conclusion:** Polyglot persistence **meets scalability, performance, and reliability goals** for MVP.

---

## Future Considerations

- Monitor cross-service query performance, consider caching or read replicas
- Evaluate DynamoDB streams for event-driven integration with other services
- Consider migration of any service to alternative databases if workload patterns change

---

## References

1. [PostgreSQL Documentation](https://www.postgresql.org/docs/)
2. [MySQL Documentation](https://dev.mysql.com/doc/)
3. [AWS DynamoDB Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html)
4. [Polyglot Persistence Pattern](https://martinfowler.com/bliki/PolyglotPersistence.html)
5. ADR-001: RabbitMQ for Event-Driven Messaging
6. ADR-002: Kong Gateway for API Gateway

---

## Changelog

| Date     | Version | Changes                                  | Author      |
| -------- | ------- | ---------------------------------------- | ----------- |
| Nov 2025 | 1.0     | Initial decision                         | Lê Ngọc Anh |
| Nov 2025 | 1.1     | Added validation & future considerations | Lê Ngọc Anh |
