# Self Storage System Backend (`self-storage-system-be`)

Backend RESTful API for the Self-Storage System management and rental platform. Built with **Node.js (ESM)**, **TypeScript**, **Express 5**, **MongoDB (Mongoose)**, **Redis**, **Zod**, and **`tsoa`** (OpenAPI documentation via TypeScript Decorators/Annotations).

---

## 1. Project Architecture

The project follows a **Layered Architecture (N-Tier)** combined with a **Modular Domain Structure**, **Dependency Injection (DI)** powered by container modules, and **Annotation-Driven Route & OpenAPI Generation (`tsoa`)**.

### 1.1. Data Flow

```
Client Request
      │
      ▼
[Express / tsoa Generated Routes] ── (Middlewares: validateRequest, expressAuthentication / Security)
      │
      ▼
[Controller]    ── Decorated with tsoa (@Route, @Get, @Post, @Body, @Queries, @Security)
      │
      ▼
[Service]       ── Core Business Logic, Password Hashing, Token Generation, Validations
      │
      ├──► [Repository]   ── Database Access Layer via Mongoose Models
      └──► [Redis / Mail] ── Token Family Rotation, Caching, Email Notifications
```

- **Feature-Driven Modular Design**: Each module in `src/modules/` acts as a cohesive unit comprising Controller, Service, Repository, Model, Container, and Validation Schemas.
- **Annotation-Driven OpenAPI & Routes**: Endpoints, HTTP verbs, request parameters, request bodies, and responses are declared directly on Controller classes using decorators. No manual YAML JSDoc comments or duplicate route files required.
- **Loose Coupling**: Controllers do not instantiate Services directly, nor do Services instantiate Repositories. All instances are assembled and injected via `*.container.ts` and resolved by `src/ioc.ts`.

---

## 2. Directory Structure

```
self-storage-system-be/
├── src/
│   ├── common/          # Shared global definitions (constants, enums, errors, schemas, types, templates)
│   ├── config/          # Infrastructure setup (MongoDB, Redis, Mail, Passport, Swagger)
│   ├── middlewares/     # Express middlewares (auth, validation, error handling)
│   ├── modules/         # Each contains controller, service, repository, model, container, schemas
│   │   ├── auth/        # Authentication: OTP, register, login, Google OAuth, JWT refresh/logout
│   │      ├── schemas/  # Schemas for request and response
│   │      ├── .controller
│   │      ├── .container
│   │      ├── .service
│   │      ├── .model
│   ├── routes/          # Auto-generated Express routes by tsoa
│   ├── utils/           # Reusable helpers (JWT, cookie, mail, response, pagination, validation)
│   ├── ioc.ts           # IoC container — resolves controller instances for tsoa
│   └── app.ts           # Entry point — Express setup, middleware registration, server start
│
├── .agents/             # AI agent customizations (skills, rules, memory)
├── docker-compose.yml   # Redis service container
├── tsoa.json            # tsoa configuration (route & OpenAPI spec generation)
└── .env.example         # Required environment variables template
```

---

## 3. Design Patterns Applied

The codebase implements several recognized software design patterns to ensure maintainability, scalability, and testability:

### 3.1. Repository Pattern

- **Location**: `src/modules/user/user.repository.ts`, `src/modules/auth/auth.repository.ts`.
- **Purpose**: Decouples the Data Access Layer from the Business Logic Layer. Services never interact directly with Mongoose query operators; instead, all database operations are encapsulated within repositories, enabling straightforward switching or mocking of the persistence layer.

### 3.2. Dependency Injection (DI) & IoC Container Pattern

- **Location**: `src/modules/*/*.container.ts`, `src/ioc.ts`.
- **Purpose**:
  - Classes (`Controller`, `Service`, `Repository`) receive their dependencies via constructor parameters (Constructor Injection).
  - Each module provides a `.container.ts` file that assembles instances and wires dependencies together.
  - `src/ioc.ts` serves as the Inversion-of-Control (IoC) adapter for `tsoa`, allowing it to resolve instantiated singletons from domain containers during route handling.

### 3.3. Annotation / Decorator Pattern (`tsoa`)

- **Location**: `src/modules/*/*.controller.ts`.
- **Purpose**:
  - Replaces tedious and fragile manual JSDoc/YAML comments with strongly-typed TypeScript decorators:
    - `@Tags()`, `@Route()`: Controller group and base path.
    - `@Get()`, `@Post()`, `@Patch()`, `@Delete()`: HTTP methods and sub-paths.
    - `@Body()`, `@Queries()`, `@Path()`: Parameter bindings.
    - `@Security('bearerAuth' | 'cookieAuth')`: Authentication declaration.
    - `@SuccessResponse()`, `@Response<T>()`: HTTP status codes and schema responses.
    - `@Middlewares()`: Express middleware chaining (e.g. Zod validation).
  - Single Source of Truth: TypeScript types and interfaces define both code types and OpenAPI documentation simultaneously.

### 3.4. Singleton Pattern

- **Location**: `src/config/redis.config.ts`, `src/config/mail.config.ts`, and exported container instances.
- **Purpose**: Guarantees that single instances of shared infrastructure clients (e.g., Redis client, Mail transporter, instantiated Controllers/Services) are created and shared across the entire application runtime, preventing resource wastage and connection leaks.

### 3.5. Strategy Pattern

- **Location**: `src/config/passport.config.ts`.
- **Purpose**: Leverages Passport's pluggable strategy architecture (`GoogleStrategy`). Additional authentication providers (e.g., Facebook, GitHub, Apple) can be attached by registering new strategies without altering the core authentication pipeline.

### 3.6. Chain of Responsibility (Middleware Pipeline Pattern)

- **Location**: `src/middlewares/validate.middleware.ts`, `auth.middleware.ts`, `auth.tsoa.ts`, `error.middleware.ts`.
- **Purpose**: Requests pass through a sequence of discrete processing handlers:
  1. `validateRequest`: Validates and sanitizes incoming request payloads via Zod.
  2. `expressAuthentication`: Verifies caller identity and validates account state for `@Security` endpoints.
  3. `errorMiddleware`: Acts as the terminal handler to catch and format exceptions into standardized error payloads.

### 3.7. Factory / Builder Pattern (Response Builders)

- **Location**: `src/utils/response.util.ts`.
- **Purpose**: `ResponseUtils.success()`, `ResponseUtils.paginated()`, and `ResponseUtils.error()` serve as factory methods to create consistent `ApiResponse<T>` response structures across all endpoints.

### 3.8. Token Family & Grace Period Rotation Pattern (Security Pattern)

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
npm run dev               # Start development server with live reload (auto-runs swagger:generate)
npm run swagger:generate  # Manually re-generate OpenAPI specification & Express routes
npm run build             # Compile TypeScript source code into JavaScript (`dist/`)
npm start                 # Launch the compiled production server (`node dist/app.js`)
npm run check             # Run full pipeline: typecheck + lint + format:check
```

> **Note**: Both `npm run dev` and `npm run build` automatically trigger `npm run swagger:generate` before launching, ensuring your API routes and Swagger documentation are always in sync with your controllers.

---

## 5. API Documentation & Annotations (Swagger UI)

When the server is running, the interactive Swagger OpenAPI documentation is accessible at:
👉 **`http://localhost:5000/api-docs`**

### 5.1. Creating a New Controller with Annotations

To add a new endpoint, decorate your controller class and methods directly:

```typescript
import {
  Controller,
  Route,
  Tags,
  Get,
  Post,
  Body,
  Queries,
  Path,
  Security,
  SuccessResponse,
  Response,
  Middlewares,
} from 'tsoa';
import { validateRequest } from '../../middlewares/validate.middleware.ts';
import type {
  ApiResponse,
  ApiErrorResponse,
} from '../../common/types/apiResponse.type.ts';

@Tags('Items')
@Route('items')
export class ItemController extends Controller {
  @Get('')
  @Security('bearerAuth')
  @Security('cookieAuth')
  @Response<ApiErrorResponse>(400, 'Invalid query parameters')
  public async getItems(
    @Queries() query: ItemQuery
  ): Promise<ApiResponse<Item[]>> {
    // Controller logic
  }

  @Post('')
  @Middlewares(validateRequest({ body: createItemSchema }))
  @SuccessResponse(201, 'Created successfully')
  @Response<ApiErrorResponse>(400, 'Validation error')
  public async createItem(
    @Body() body: CreateItemRequest
  ): Promise<ApiResponse<Item>> {
    this.setStatus(201);
    // Controller logic
  }
}
```

### 5.2. Adding Rich Examples to Swagger UI

Swagger UI automatically generates preview mock data based on TypeScript types and Enums. To customize the displayed examples, add JSDoc tags to your types/interfaces:

```typescript
export interface CreateUserRequest {
  /**
   * User full name
   * @example "John Doe"
   */
  name: string;

  /**
   * User email address
   * @example "john.doe@example.com"
   */
  email: string;

  /**
   * Vietnamese phone number (10 digits)
   * @example "0987654321"
   */
  phoneNumber?: string;
}
```

### 5.3. Authentication in Swagger UI

Endpoints decorated with `@Security('bearerAuth')` or `@Security('cookieAuth')` will display a lock icon 🔒 on Swagger UI:

- Click the **Authorize** button at the top right of Swagger UI.
- Enter your JWT Access Token in `bearerAuth` to test authenticated endpoints directly in your browser.

---

## 6. Git Rules & Conventions

### 6.1. Branch Naming Conventions:

- `feature/branch-name` : New application features
- `fix/branch-name` : Bug fixes
- `hotfix/branch-name` : Critical fixes directly targeting production
- `chore/branch-name` : Tooling, dependencies, configurations, or documentation
- `refactor/branch-name`: Code refactoring without changing functional behavior

### 6.2. Commit Message Conventions:

Format: `[PREFIX] (feature): short description here...`

- `[PREFIX]`: `FEATURE`, `CHORE`, `FIX`, `HOTFIX`, `REFACTOR`
- `(feature)`: Target domain/module name (e.g., `auth`, `user`, `server`, `docs`)
- `short description`: Clear and concise summary of changes

_Examples:_

- `[CHORE] (auth): config jwt guards`
- `[FEATURE] (user): implement soft delete user api`

---

## 7. Docker Management (Redis Service)

The application relies on Redis for token storage, session revocation, and refresh token rotation:

```bash
docker compose up -d   # Build and start the Redis container in the background
docker compose stop    # Pause the running Redis container
docker compose logs    # View live Redis output logs
docker compose down    # Stop and remove the Redis container
```
