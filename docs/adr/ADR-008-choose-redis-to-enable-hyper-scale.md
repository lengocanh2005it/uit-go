# ADR-008: Redis Adoption – Low-Latency Caching & Realtime Scalability

**Status:** Accepted  
**Date:** November 2025  
**Decision Makers:** Lê Ngọc Anh, Lê Văn Bảo, Nguyễn Bá Tuấn Anh  
**Module Context:** **_Module A_** - Architectural Design for Scalability and Performance

---

## Background / Context

UIT-Go is a real-time ride-hailing platform requiring ultra-low latency, high concurrency, and hyper-scale growth capability. Several parts of the platform require:

- Real-time GPS updates (driver location tracking every 1–3 seconds)
- Low-latency caching layer for high-read operations (nearby drivers, trip statuses)
- High-speed pub/sub for event propagation between microservices
- Transient storage where performance is more critical than persistence
- Session/token storage for authentication flows

To achieve all of the above while supporting long-term scalability targets (hyper-scale), the team evaluated multiple technologies: Redis, DynamoDB, PostgreSQL, and in-memory caching on each service instance.

---

## Requirements

### Functional Requirements

- Store and query driver GPS data in real-time
- Support Pub/Sub for cross-service communication
- Cache frequently accessed data (driver status, user session, trip state)
- TTL-based automatic cleanup
- Fast lookup for geo-based filtering (e.g., nearest drivers)

---

### Non-Functional Requirements

- Latency: <5ms for cache reads/writes
- Throughput: >50,000 ops/sec for MVP
- Scalability: Horizontal sharding & clustering
- High Availability: Cluster mode with failover
- Operational efficiency: Simple local + Kubernetes deployment

---

## Decison Drivers

1. **Performance:** Must handle growth in traffic without service bottlenecks
2. **Scalability:** Must scale to millions of location updates per minute
3. **Simplicity:** Easy to integrate with microservices, simple operational overhead
4. **Geo Capabilities:** Support storing hash prefixes and geolocation indexes
5. **Observability:** Metrics, monitoring, and debugging support

---

## Considered Options

### Option 1: Redis (Cluster Mode) (SELECTED)

**Pros:**

- ✅ Extremely low latency (sub-millisecond)
- ✅ High throughput (>1M ops/sec with clustering)
- ✅ Built-in Pub/Sub for real-time messaging
- ✅ Supports GEO operations (geohash, radius search)
- ✅ Ideal for caching + session/token storage
- ✅ Automatic TTL expiration for short-lived GPS data
- ✅ Horizontally scalable with sharding & replicas
- ✅ Strong ecosystem (Redis Stack, RedisInsight)

**Cons:**

- ❌ In-memory model = higher cost at scale
- ❌ Persistence (AOF/RDB) is optional and needs tuning
- ❌ Requires careful cluster design to avoid hotspots
- ❌ Pub/Sub is not durable (requires Redis Streams if durability needed)

**Architectural Fit:**  
Perfect for real-time driver location, cache, session store, and low-latency operations. Redis becomes a core component for achieving hyper-scale in UIT-Go.

---

### Option 2: DynamoDB

**Pros:**

- ✅ Fully managed and highly scalable
- ✅ High write throughput
- ✅ Durable storage

**Cons:**

- ❌ Latency too high for GPS (typically 10–20ms)
- ❌ No native geo radius queries (requires custom geohashing logic)
- ❌ Not suitable for high-frequency updates (1–3 seconds per driver)
- ❌ Higher cost for real-time usage
- ❌ Limited support for Pub/Sub

**Architectural Fit:**  
Great for persistent data, but not for real-time caching/GPS/low-latency operations.

### Option 3: In-Memory Cache per Microservice Instance

**Pros:**

- ✅ Fastest possible reads
- ✅ Zero network latency
- ✅ No external dependency

**Cons:**

- ❌ No cross-instance consistency
- ❌ Cannot be used in distributed environments
- ❌ Loses data when service restarts
- ❌ Cannot support cross-service caching or synchronization
- ❌ Poor fit for real-time GPS data

**Architectural Fit:**  
Invalid for distributed systems & real-time matching.

---

## Decision Summary

The team selected Redis (Cluster Mode) as the caching, geospatial, and real-time messaging backbone of the UIT-Go system.

> Redis provides sub-millisecond latency, high throughput, built-in geospatial indexing, cluster scalability, and lightweight pub/sub—precisely matching the needs of a real-time ride-hailing platform.
> Redis enables UIT-Go to scale towards hyper-scale traffic, process thousands of GPS updates per second, and maintain low-latency responses for user and driver apps.

Redis will be used for:

- Driver GPS location storage (Geohash + hashPrefix)
- User/driver session token caching
- Trip state caching
- Real-time pub/sub between services
- Nearby driver queries (radius search)
- Rate limiting (via Redis scripts)

---

## Trade-offs

| What We Sacrifice    | Impact                                       | Mitigation Strategy                                         |
| -------------------- | -------------------------------------------- | ----------------------------------------------------------- |
| Persistence          | Redis is not designed for durable storage    | Persistent DBs (Postgres, DynamoDB) remain system-of-record |
| Higher memory cost   | In-memory = higher infrastructure cost       | Use TTL, eviction, clustering, right-sizing memory          |
| Pub/Sub not durable  | Events may be lost if node fails             | Use Redis Streams if durability needed                      |
| Operational overhead | Cluster needs monitoring and failover tuning | Kubernetes operator + automated failover                    |

---

## Positive Consequences

- ✅ Ultra-low latency read/write
- ✅ Supports hyper-scale GPS updates
- ✅ Real-time driver matching
- ✅ Reduces load on core databases
- ✅ Enables rate-limiting, authentication caching
- ✅ Improves system resilience during traffic spikes
- ✅ Easy integration with NestJS and microservices

---

## Negative Consequences

- ❌ More expensive than disk-based databases
- ❌ Requires cluster management
- ❌ Data loss acceptable for GPS cache but must be understood

---

## Validation & Measurement

- Benchmark Setup: Redis cluster (3 shards, 2 replicas each)
- Throughput: ~150k ops/sec (target: ~50k ops/sec)
- Latency: 0.7–2ms per operation (target: <5ms)
- Geo Queries: <5ms for radius search of 10k drivers
- Pub/Sub: 1M messages/min with <5ms delivery

**Conclusion:**  
Redis satisfies all Module A requirements for real-time, low-latency, and high scalability.

---

## Future Considerations

- Evaluate Redis Streams for durable real-time events
- Move to Redis Enterprise if:
  - Traffic > 3M ops/sec
  - Active-Active (CRDT) replication is needed
  - Better memory optimizations required
- Consider adding:
  - RedisBloom for probabilistic data structures
  - RedisJSON for structured caching
  - RedisSearch for advanced indexing

---

## References

1. [Redis Documentation](https://redis.io/docs/latest/)
2. [Redis GEO Commands (GEOADD, GEORADIUS, GEOSEARCH)](https://redis.io/docs/latest/commands/#geo)
3. [Redis Cluster Architecture](https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/)
4. ADR-001: RabbitMQ for Event-Driven Messaging (Internal project reference)
5. ADR-002: API Gateway Choice – Kong Gateway (Internal project reference)

---

## Changelog

| Date     | Version | Changes                                        | Author      |
| -------- | ------- | ---------------------------------------------- | ----------- |
| Nov 2025 | 1.0     | Initial Redis decision & analysis              | Lê Văn Bảo  |
| Nov 2025 | 1.1     | Added geo context & hyper-scale considerations | Lê Ngọc Anh |

**Decision Status:** ✅ **ACCEPTED**  
**Last Review:** November 2025  
**Next Review:** Q2 2026 (post-MVP scale testing)
