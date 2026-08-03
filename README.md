AI-Enabled Conference Management Platform

A production-ready, AI-enabled Conference Management platform demonstrating enterprise backend architecture using Domain-Driven Design, Event-Driven Architecture, Transactional Outbox, Redis, PostgreSQL, and natural-language function calling.

🚀 Highlights
Production-ready modular architecture
Domain-Driven Design (DDD)
Event-Driven Architecture
Transactional Outbox Pattern
Optimistic Concurrency Control
JWT Authentication & Role-Based Authorization
Redis Integration
PostgreSQL Persistence
Repository & Data Mapper Patterns
Domain Events & Aggregate Roots
Dockerized Development Environment
AI-powered Natural Language → Function Calling
Load Tested for High Concurrency
📊 Performance Benchmark

The application was benchmarked using Autocannon under sustained concurrent traffic.

Metric	Result
Duration	30 seconds
Concurrent Connections	100
Total Requests	100,178
Throughput	3,293 req/sec
Success Rate	100% (2xx)
Errors	0
Timeouts	0
Average Latency	298 ms

These results demonstrate stable throughput and reliable request processing under concurrent load.

🤖 AI-Powered Conference Assistant

One of the platform's unique capabilities is an integrated LLM-powered assistant that enables users to interact with the system using natural language.

Example:

"Register Sarah for the AI Conference and reserve a VIP ticket."

↓

LLM translates the request into validated backend function calls.

↓

Application executes the request through the standard backend pipeline:

Authentication
Authorization
Request Validation
Business Rules
Transaction Management
Domain Events
Transactional Outbox
Event Publishing

The AI layer never bypasses business rules—it simply provides a more intuitive interface to the same production-grade backend services.

🏗 Architecture

The project follows Domain-Driven Design (DDD) with a modular architecture that keeps business logic isolated from infrastructure concerns.

src/
├── config/
├── modules/
│   ├── authentication/
│   ├── conference/
│   ├── registration/
│   ├── ticket/
│   ├── payment/
│   ├── notification/
│   └── user/
│
├── shared/
│   ├── application/
│   ├── domain/
│   ├── infrastructure/
│   └── interfaces/
│
├── routes/
├── middleware/
└── app.js

Each module contains its own:

Domain
Application
Infrastructure
Presentation

This keeps modules loosely coupled and independently maintainable.

⚙ Core Architecture Patterns
Domain-Driven Design (DDD)

Business logic is implemented using rich domain models consisting of:

Aggregates
Entities
Value Objects
Domain Services
Domain Events
Repositories

Business rules remain independent of persistence and infrastructure.

Event-Driven Architecture

Business state changes are represented as immutable domain events.

Examples include:

RegistrationCreated
TicketReserved
TicketPurchased
PaymentSucceeded
TicketCancelled
NotificationQueued

These events enable reliable asynchronous communication across modules.

Transactional Outbox Pattern

To guarantee reliable event publishing, aggregate state and domain events are persisted atomically within the same database transaction.

HTTP Request
      │
Controller
      │
Application Service
      │
Aggregate
      │
Repository
      │
Database Transaction
      ├── Aggregate State
      └── Outbox Events
      │
Outbox Publisher
      │
Kafka / RabbitMQ

This prevents lost events while ensuring database consistency.

Optimistic Concurrency Control

Aggregates use version-based concurrency control to prevent lost updates.

UPDATE tickets
SET version = version + 1
WHERE id = ?
AND version = ?;

Concurrent modifications are detected safely without database locking.

Repository Pattern

Repositories are responsible for:

Loading aggregates
Persisting aggregates
Saving domain events
Managing transactions
Enforcing optimistic concurrency

Business rules remain inside the domain model.

Data Mapper Pattern

Persistence models are translated into domain models through dedicated mappers.

Database
      │
Persistence Model
      │
Data Mapper
      │
Domain Aggregate

This keeps the domain independent of ORM-specific concerns.

🛠 Technology Stack
Backend
Node.js
Express.js
JavaScript (ES Modules)
Database
PostgreSQL
Knex.js
Caching & Messaging
Redis
Kafka / RabbitMQ (Transactional Outbox)
AI
OpenAI Function Calling
Tool Registry
Natural Language → Backend Operations
Testing
Jest
Autocannon
Infrastructure
Docker
Docker Compose
Security
JWT Authentication
Refresh Tokens
Role-Based Authorization
📦 Running the Project

Install dependencies

npm install

Create a .env file

PORT=3000

DATABASE_URL=postgres://user:password@localhost:5432/conference

JWT_ACCESS_SECRET=your-secret

JWT_REFRESH_SECRET=your-secret

REDIS_URL=redis://localhost:6379

Run database migrations

npm run migrate

Start the application

npm run dev

Run tests

npm test
🎯 Design Principles
Domain First
Clean Architecture
High Cohesion
Low Coupling
SOLID Principles
Dependency Injection
Persistence Ignorance
Immutable Domain Events
Explicit Dependencies
Reliability by Design
🚀 Roadmap
✅ Domain-Driven Design
✅ Transactional Outbox
✅ Redis Integration
✅ JWT Authentication
✅ AI Function Calling
✅ Performance Benchmarking
🚧 Kafka Integration
🚧 OpenTelemetry
🚧 Distributed Tracing
🚧 Kubernetes Deployment
🚧 Multi-tenancy
🚧 CQRS Read Models
📄 License

MIT License

👨‍💻 Author

Rowland Obi

Senior Backend Engineer specializing in:

Distributed Systems
Event-Driven Architecture
Domain-Driven Design
Payment Infrastructure
PostgreSQL
Redis
AI-Enabled Backend Systems
Cloud-Native Applications
