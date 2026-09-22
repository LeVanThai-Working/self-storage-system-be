# Self Storage System Backend (`self-storage-system-be`)

Backend RESTful API for the Self-Storage System management and rental platform. Built with **Node.js (ESM)**, **TypeScript**, **Express 5**, **MongoDB (Mongoose)**, **Redis**, and **Zod**.

---

## 1. Project Architecture

The project follows a **Layered Architecture (N-Tier)** combined with a **Modular Domain Structure** and **Dependency Injection (DI)** powered by container modules.

### 1.1. Data Flow

```
Client Request
      │
      ▼
[Express Route] ── (validateRequest / authMiddleware)
      │
      ▼
[Controller]    ── Handles HTTP Request/Response, Status Codes, ResponseUtils
      │
      ▼
[Service]       ── Core Business Logic, Password Hashing, Token Generation, Validations
      │
      ├──► [Repository]   ── Database Access Layer via Mongoose Models
      └──► [Redis / Mail] ── Token Family Rotation, Caching, Email Notifications
```

- **Feature-Driven Modular Design**: Each module in `src/modules/` acts as a cohesive unit comprising Route, Controller, Service, Repository, Model, Container, and Validation Schemas.
- **Loose Coupling**: Controllers do not instantiate Services directly, nor do Services instantiate Repositories. All instances are assembled and injected via `*.container.ts`.

---

## 2. Directory Structure & File Roles

```
self-storage-system-be/
├── src/
│   ├── common/                  # Shared global definitions, constants, and utilities
│   │   ├── consts/              # Standardized system message & status codes
│   │   │   └── messageCode.const.ts
│   │   ├── enums/               # Domain enumerations (Roles, Account Status, Auth Providers)
│   │   │   └── user.enum.ts
│   │   ├── errors/              # Custom application error classes (AppError)
│   │   │   └── appError.error.ts
│   │   ├── schemas/             # Shared reusable Zod schemas (e.g., pagination query)
│   │   │   └── pagination.schema.ts
│   │   ├── templates/           # Email HTML templates (e.g., OTP emails)
│   │   │   └── otpEmail.template.ts
│   │   └── types/               # Global TypeScript definitions (ApiResponse, Pagination, Express typings)
│   │       ├── apiResponse.type.ts
│   │       ├── express.d.ts
│   │       └── pagination.type.ts
│   │
│   ├── config/                  # External service configurations & infrastructure setup
│   │   ├── connect.config.ts    # MongoDB connection management via Mongoose
│   │   ├── redis.config.ts      # Redis client initialization and configuration (ioredis)
│   │   ├── mail.config.ts       # Nodemailer SMTP transporter configuration
│   │   ├── passport.config.ts   # Passport Google OAuth 2.0 authentication strategy
│   │   ├── swagger.config.ts    # Swagger UI & OpenAPI 3.0 specification setup
│   │   └── swaggerSchemas.config.ts # Automatic conversion of Zod schemas to OpenAPI Component Schemas
│   │
│   ├── middlewares/             # Express HTTP request lifecycle middlewares
│   │   ├── auth.middleware.ts   # JWT authentication (Bearer header / HttpOnly cookie) & status verification
│   │   ├── error.middleware.ts  # Global error handler (AppError, ZodError, HttpError) returning unified error responses
│   │   └── validate.middleware.ts # Automatic request validation (body, query, params) via Zod schemas
│   │
│   ├── modules/                 # Business domain modules
│   │   ├── auth/                # Authentication & authorization module
│   │   │   ├── schemas/         # Request & response Zod schemas for Auth
│   │   │   │   ├── auth.request.schema.ts
│   │   │   │   └── auth.response.schema.ts
│   │   │   ├── auth.container.ts     # Dependency Injection container for Auth
│   │   │   ├── auth.controller.ts    # HTTP request handling for Auth endpoints
│   │   │   ├── auth.redis.service.ts # Redis-backed Token Family & Refresh Token Rotation
│   │   │   ├── auth.repository.ts    # Data access for OTP records
│   │   │   ├── auth.route.ts         # Endpoint declarations and OpenAPI documentation
│   │   │   ├── auth.service.ts       # Business logic (OTP, register, login, refresh, logout)
│   │   │   └── otp.model.ts          # Mongoose model for OTP with TTL index (expires: 300)
│   │   │
│   │   └── user/                # User management module
│   │       ├── schemas/         # Request & response Zod schemas for User
│   │       │   ├── user.request.schema.ts
│   │       │   └── user.response.schema.ts
│   │       ├── user.container.ts     # Dependency Injection container for User
│   │       ├── user.controller.ts    # HTTP request handling for User CRUD operations
│   │       ├── user.model.ts         # Mongoose User model with soft delete support (mongoose-delete)
│   │       ├── user.repository.ts    # Data access for Users (regex search, pagination, soft delete)
│   │       ├── user.route.ts         # Endpoint declarations and OpenAPI documentation
│   │       └── user.service.ts       # Business logic (password hashing, duplication checks, formatting)
│   │
│   ├── utils/                   # Shared helper utilities
│   │   ├── cookie.util.ts       # Secure HttpOnly cookie helper for token management
│   │   ├── jwt.util.ts          # JWT generation, signing, and verification (Access & Refresh tokens)
│   │   ├── mail.util.ts         # Email sending utility via Nodemailer
│   │   ├── pagination.util.ts   # Generic pagination helper for Mongoose queries
│   │   ├── response.util.ts     # Standardized API response formatters (success, paginated, error, noContent)
│   │   └── validateReponse.util.ts # Runtime output verification against Zod response schemas
│   │
│   └── app.ts                   # Application entry point (Express setup, middleware pipeline, route mounting)
│
├── docker-compose.yml           # Redis service container definition (`sss-redis`)
├── package.json                 # Project dependencies, scripts, and package metadata
├── tsconfig.json                # TypeScript compiler configuration (NodeNext, ES2022)
├── eslint.config.js             # ESLint configuration and code quality rules
├── .prettierrc                  # Prettier code formatting rules
└── .env.example                 # Template for required environment variables
```

---

## 3. Design Patterns Applied

The codebase implements several recognized software design patterns to ensure maintainability, scalability, and testability:

### 3.1. Repository Pattern

- **Location**: `src/modules/user/user.repository.ts`, `src/modules/auth/auth.repository.ts`.
- **Purpose**: Decouples the Data Access Layer from the Business Logic Layer. Services never interact directly with Mongoose query operators; instead, all database operations are encapsulated within repositories, enabling straightforward switching or mocking of the persistence layer.

### 3.2. Dependency Injection (DI) / IoC Container Pattern

- **Location**: `src/modules/*/*.container.ts`.
- **Purpose**:
  - Classes (`Controller`, `Service`, `Repository`) receive their dependencies via constructor parameters (Constructor Injection).
  - Each module provides a `.container.ts` file that assembles instances and wires dependencies together, eliminating hardcoded dependencies and facilitating unit testing with mocks.

### 3.3. Singleton Pattern

- **Location**: `src/config/redis.config.ts`, `src/config/mail.config.ts`, and exported container instances.
- **Purpose**: Guarantees that single instances of shared infrastructure clients (e.g., Redis client, Mail transporter, instantiated Controllers/Services) are created and shared across the entire application runtime, preventing resource wastage and connection leaks.

### 3.4. Strategy Pattern

- **Location**: `src/config/passport.config.ts`.
- **Purpose**: Leverages Passport's pluggable strategy architecture (`GoogleStrategy`). Additional authentication providers (e.g., Facebook, GitHub, Apple) can be attached by registering new strategies without altering the core authentication pipeline.

### 3.5. Chain of Responsibility (Middleware Pipeline Pattern)

- **Location**: `src/middlewares/validate.middleware.ts`, `auth.middleware.ts`, `error.middleware.ts`.
- **Purpose**: Requests pass through a sequence of discrete processing handlers:
  1. `validateRequest`: Validates and sanitizes incoming request payloads.
  2. `authMiddleware`: Verifies caller identity and validates account state.
  3. `errorMiddleware`: Acts as the terminal handler to catch and format exceptions into standardized error payloads.

### 3.6. Factory / Builder Pattern (Response & Schema Builders)

- **Location**: `src/utils/response.util.ts`, `src/config/swaggerSchemas.config.ts`.
- **Purpose**:
  - `ResponseUtils.success()`, `ResponseUtils.paginated()`, and `ResponseUtils.error()` serve as factory methods to create consistent `ApiResponse<T>` response structures.
  - Helpers such as `createApiResponseSchema()`, `createPaginatedResponseSchema()`, and `zodToOpenApiSchema()` programmatically build OpenAPI component schemas directly from Zod models.

### 3.7. Token Family & Grace Period Rotation Pattern (Security Pattern)

- **Location**: `src/modules/auth/auth.redis.service.ts`, `auth.service.ts`.
- **Purpose**:
  - **Refresh Token Rotation (RTR)**: Each refresh token request invalidates the current token and issues a new token pair within the same **Token Family**.
  - **Grace Period (30s)**: Mitigates network latency race conditions by allowing concurrent requests within a 30-second window to receive the replacement tokens without terminating the session.
  - **Reuse Detection**: If a previously consumed or invalidated token is reused, the entire Token Family is revoked immediately, safeguarding against token theft and replay attacks.

---

## 4. Development Workflows

### 4.1. Initial Project Setup:

```bash
npx husky init        # Initialize Git hooks via Husky
npm install           # Install all project dependencies
npm run format        # Automatically format all files with Prettier
npm run check         # Run TypeScript checks, ESLint, and Prettier verification
```

### 4.2. Daily Development Tasks:

```bash
npm run dev           # Start development server with live reload (nodemon + tsx)
npm run build         # Compile TypeScript source code into JavaScript (`dist/`)
npm start             # Launch the compiled production server (`node dist/app.js`)
```

---

## 5. Git Rules & Conventions

### 5.1. Branch Naming Conventions:

- `feature/branch-name` : New application features
- `fix/branch-name` : Bug fixes
- `hotfix/branch-name` : Critical fixes directly targeting production
- `chore/branch-name` : Tooling, dependencies, configurations, or documentation
- `refactor/branch-name`: Code refactoring without changing functional behavior

### 5.2. Commit Message Conventions:

Format: `[PREFIX] (feature): short description here...`

- `[PREFIX]`: `FEATURE`, `CHORE`, `FIX`, `HOTFIX`, `REFACTOR`
- `(feature)`: Target domain/module name (e.g., `auth`, `user`, `server`, `docs`)
- `short description`: Clear and concise summary of changes

_Examples:_

- `[CHORE] (auth): config jwt guards`
- `[FEATURE] (user): implement soft delete user api`

---

## 6. Docker Management (Redis Service)

The application relies on Redis for token storage, session revocation, and refresh token rotation:

```bash
docker compose up -d   # Build and start the Redis container in the background
docker compose stop    # Pause the running Redis container
docker compose logs    # View live Redis output logs
docker compose down    # Stop and remove the Redis container
```

---

## 7. API Documentation (Swagger UI)

When the server is running, the interactive Swagger OpenAPI documentation is accessible at:
👉 **`http://localhost:5000/api-docs`**
