# System Architecture

## Proposed architecture

```text
                    +----------------------+
                    |      Web Frontend    |
                    | Dashboard / Analysis |
                    +----------+-----------+
                               |
                         REST / JSON
                               |
                    +----------v-----------+
                    |   Spring Boot API    |
                    +----------+-----------+
                               |
          +--------------------+--------------------+
          |                    |                    |
+---------v--------+  +--------v---------+  +-------v--------+
| Portfolio Engine |  | Analysis Engine  |  | Alert Engine   |
+---------+--------+  +--------+---------+  +-------+--------+
          |                    |                    |
          +--------------------+--------------------+
                               |
                    +----------v-----------+
                    | Provider Abstraction |
                    +----------+-----------+
                               |
          +--------------------+--------------------+
          |                    |                    |
+---------v--------+  +--------v---------+  +-------v--------+
| Market Data      |  | Zerodha/Coin MCP |  | Groww MCP      |
| Providers        |  | Adapter          |  | Adapter        |
+------------------+  +------------------+  +----------------+

                    +----------------------+
                    | PostgreSQL           |
                    | Redis (optional)     |
                    +----------------------+
```

## Recommended stack

### Backend

- Java 21+ (or project-approved LTS)
- Spring Boot
- Spring Web
- Spring Data JPA
- PostgreSQL
- Spring Security
- Validation
- Actuator
- Resilience/retry layer

### Frontend

- Angular
- Angular Material
- Standalone components
- Reactive forms
- Charts

### Infrastructure

- Docker
- Kubernetes optional
- CI/CD
- Centralized logging

## Architectural principles

- Hexagonal/clean architecture
- Provider interfaces
- Domain-driven rule engine
- Immutable analysis snapshots
- Idempotent synchronization
- Strong validation
- Auditability

## Modules

```text
backend/
  domain/
  application/
  infrastructure/
  api/

frontend/
  core/
  shared/
  features/
    dashboard/
    stocks/
    mutual-funds/
    portfolio/
    alerts/
    settings/
```
