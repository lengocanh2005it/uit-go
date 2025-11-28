# UIT-Go Backend – Cloud-Native Ride Management

[![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Redlock](https://img.shields.io/badge/Redlock-593C8F?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![BullMQ](https://img.shields.io/badge/BullMQ-FF1E1E?style=for-the-badge&logoColor=white)](https://docs.bullmq.io/)
[![Opossum](https://img.shields.io/badge/Opossum-0D3B66?style=for-the-badge&logoColor=white)](https://nodeshift.github.io/opossum/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Grafana](https://img.shields.io/badge/Grafana-F46800?style=for-the-badge&logo=grafana&logoColor=white)](https://grafana.com/)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=for-the-badge&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![k6](https://img.shields.io/badge/k6-FF5C5C?style=for-the-badge&logo=k6&logoColor=white)](https://k6.io/)
[![Apache Pulsar](https://img.shields.io/badge/Apache%20Pulsar-1E2D3D?style=for-the-badge&logo=apachepulsar&logoColor=white)](https://pulsar.apache.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![DynamoDB](https://img.shields.io/badge/DynamoDB-4053D6?style=for-the-badge&logo=amazondynamodb&logoColor=white)](https://aws.amazon.com/dynamodb/)
[![Kong](https://img.shields.io/badge/Kong-ED1C24?style=for-the-badge&logo=kong&logoColor=white)](https://konghq.com/)
[![gRPC](https://img.shields.io/badge/gRPC-00B1E1?style=for-the-badge&logo=grpc&logoColor=white)](https://grpc.io/)

UIT-Go is a **cloud-native microservices backend system** for a **ride-sharing platform**, developed as part of the **SE360: Cloud-Native System Architecture** course at the **University of Information Technology (UIT)**. Provides **gRPC APIs** for **users, drivers, trips, and notifications**, optimized for **scalability** and **real-time operations**.

The system architecture is designed following **Module A: Scalability & Performance**, employing **microservices**, **distributed databases**, **message queues**, **caching**, and **asynchronous processing** to ensure **high throughput**, **low latency**, and **horizontal scalability** under peak loads.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Prerequisites](#prerequisites)
5. [Installation & Setup](#installation--setup)
6. [Running the Application](#running-the-application)
7. [Testing Inter-Service Communication](#testing-inter-service-communication)
8. [Project Structure](#project-structure)
9. [Development Guide](#development-guide)
10. [Troubleshooting](#troubleshooting)
11. [Documentation](#documentation)
12. [Team Members](#team-members)
13. [License](#license)

---

## 📖 Project Overview

UIT-Go simulates a real-world ride-sharing platform (similar to Uber/Grab) with a focus on:

- **Microservices Architecture**: Four independent, scalable services + **Kong API Gateway**
- **Cloud-Native Design**: Containerized deployment with Docker
- **Event-Driven Communication**: Asynchronous messaging with RabbitMQ
- **Module A Focus**: Scalability & Performance

## 🔑 Key Features

- 🔐 **Authentication & API Gateway**: Kong handles routing, request validation, and JWT-based authentication
- 👤 **User Management**: Handle registration and login for **passengers and drivers**, as well as profile management
- 🧑‍✈️ **Driver Management**: Manage driver profiles, vehicle information, and availability
- 🚗 **Trip Management**: Create, track, and complete ride requests
- 🔔 **Notifications Management**: Manage in-app notifications for trip events
- 📍 **Real-Time Location**: Redis Geospatial for driver location tracking

---

## 🏗 Architecture

UIT-Go is built following a **cloud-native microservices architecture**, composed of the following core services:

![Architecture Diagram](docs/images/arch.png)

**See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.**

---

## 🛠 Technology Stack
