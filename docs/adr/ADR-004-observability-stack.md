# ADR-004: Observability Stack – Grafana and Prometheus

**Status:** Accepted  
**Date:** November 2025  
**Decision Makers:** Lê Ngọc Anh, Lê Văn Bảo, Nguyễn Bá Tuấn Anh  
**Module Context:** ***Module A*** - Architectural Design for Scalability and Performance

---

## Context and Problem Statement

The UIT-Go platform is built as a microservices architecture with multiple distributed components. To ensure system reliability, performance monitoring, and operational visibility, we need a comprehensive observability stack that can:

- Collect and store metrics from all microservices and infrastructure
- Provide real-time visualization and dashboards for system health
- Enable alerting based on predefined thresholds
- Support troubleshooting and performance optimization
- Integrate seamlessly with our existing technology stack

The team evaluated multiple observability solutions to balance functionality, performance, scalability, and operational simplicity.

### Requirements

1. **Functional Requirements:**

- Collect metrics from microservices, databases, message brokers, and API gateway
- Store time-series data with efficient querying capabilities
- Provide customizable dashboards for real-time monitoring
- Support alerting based on metric thresholds
- Integrate with existing logging and tracing infrastructure

2. **Non-Functional Requirements:**

- Low resource overhead on monitored services
- Horizontal scalability to handle growing metric volume
- Easy deployment and configuration in development and production
- Open-source with strong community support
- Docker/Kubernetes deployment compatibility

---

## Decision Drivers

1. **Scalability**: Ability to handle increasing metric volume as system grows
2. **Performance**: Minimal impact on monitored services, efficient data storage and querying
3. **Operational Simplicity**: Easy to deploy, configure, and maintain
4. **Ecosystem Integration**: Compatibility with existing tools and frameworks
5. **Cost Effectiveness**: Open-source solution with no licensing costs

---

## Considered Options

### Option 1: Prometheus + Grafana

**Pros:**

- ✅ Prometheus: Specialized time-series database built for monitoring, efficient metric collection and storage
- ✅ Grafana: Rich visualization capabilities with extensive dashboard options
- ✅ Strong integration: Native support for microservices, containers, and cloud-native environments
- ✅ Powerful query language (PromQL) for complex metric analysis
- ✅ Mature ecosystem with extensive exporters for various systems
- ✅ Easy Docker deployment with minimal configuration

**Cons:**

- ❌ Prometheus uses pull model, which may not suit all monitoring scenarios
- ❌ Long-term storage requires additional setup (e.g., Thanos, Cortex)
- ❌ Alert management can become complex at scale

**Architectural Fit:**:
Ideal for cloud-native microservices monitoring, providing comprehensive visibility into system performance and health, fully aligned with Module A objectives.

### Option 2: Elastic Stack (ELK) for Metrics

**Pros:**

- ✅ Unified platform for logs, metrics, and traces
- ✅ Powerful search and analytics capabilities
- ✅ Horizontal scaling with built-in clustering

**Cons:**

- ❌ Higher resource consumption compared to Prometheus
- ❌ More complex deployment and configuration
- ❌ Overkill for pure metrics monitoring when logs are handled separately

**Architectural Fit:**
Better suited for log analytics rather than dedicated metrics monitoring in microservices architecture.

### Option 3: Datadog

**Pros:**

- ✅ Fully managed service with minimal operational overhead
- ✅ Comprehensive feature set including APM, logs, and metrics
- ✅ Easy setup and extensive integrations

**Cons:**

- ❌ Vendor lock-in and subscription costs
- ❌ Limited customization compared to open-source solutions
- ❌ Less suitable for development and testing environments

**Architectural Fit:**
Good for enterprise environments with budget for managed services, but less flexible for academic project with cost constraints.

---

## Decision Summary

After evaluating multiple options, the team selected Prometheus + Grafana as the observability stack for UIT-Go:

> Prometheus provides efficient metric collection and storage with powerful query capabilities, while Grafana offers rich visualization and dashboarding. This combination delivers comprehensive monitoring coverage for all system components with minimal operational overhead, enabling the team to maintain system reliability and performance—fully aligned with Module A objectives.

### Trade-offs

| What We Sacrifice   | Impact                                        | Mitigation Strategy                                     |
| ------------------- | --------------------------------------------- | ------------------------------------------------------- |
| Long-term storage   | Default Prometheus retention is 15 days       | Implement Thanos for long-term retention if needed      |
| Push-based metrics  | Pull model may not suit all services          | Use Pushgateway for short-lived jobs                    |
| Alert management	  | Can become complex at scale                   | Document alerting rules and use GitOps for management   |

### Positive Consequences

- ✅ Comprehensive monitoring of all microservices and infrastructure
- ✅ Real-time visibility into system performance and health
- ✅ Powerful alerting enables proactive issue detection
- ✅ Open-source solution with no licensing costs
- ✅ Strong community support and extensive documentation
- ✅ Easy integration with existing NestJS microservices and Kong Gateway

### Negative Consequences

- ❌ Additional operational overhead for maintaining monitoring stack
- ❌ Learning curve for PromQL and dashboard configuration
- ❌ Long-term storage requires additional components

## Validation and Measurement

- **Test Setup:** Docker Compose with Prometheus, Grafana, and 6 microservices
- **Metric Collection:** Successfully collects metrics from all services, databases, and message brokers
- **Dashboard Performance:** Dashboards load in < 2 seconds with 10+ panels
- **Resource Usage:** Prometheus uses < 500MB RAM for MVP-scale metrics
- **Alert Testing:** Alerts trigger correctly based on CPU, memory, and latency thresholds

**Conclusion:** Prometheus + Grafana meets **all observability requirements** for MVP and provides foundation for future scaling.

### Future Considerations

- **When to reconsider:**
  - Metric volume exceeds Prometheus single-node capacity
  - Need for unified logs, metrics, and traces in single platform
  - Enterprise features required (SLA monitoring, advanced analytics)
- **Migration Path:**
  - Evaluate Thanos or Cortex for long-term storage and global view
  - Consider commercial solutions if operational overhead becomes too high

---

## References

1. [Prometheus Documentation](https://prometheus.io/docs/introduction/overview/)
2. [Grafana Documentation](https://grafana.com/docs/)
3. [Prometheus Node Exporter](https://github.com/prometheus/node_exporter)
4. [ADR-002]: Kong Gateway for API Gateway (metrics integration)
5. [ADR-003]: Database Choice – Polyglot Persistence (database monitoring)

## Changelog

| Date     | Version | Changes                        | Author             |
| -------- | ------- | ------------------------------ | ------------------ |
| Nov 2025 | 1.0     | Initial decision               | Nguyễn Bá Tuấn Anh |
| Nov 2025 | 1.1     | Added future considerations    | Nguyễn Bá Tuấn Anh |

---

**Decision Status:** ✅ **ACCEPTED**  
**Last Review:** November 2025  
**Next Review:** Q2 2026 (after MVP launch)
