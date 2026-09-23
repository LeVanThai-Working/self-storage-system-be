# Coding Rules

> This document is based on the current source code of this repository. It is a team guideline for maintaining the existing style and architecture. It is not a proposal to refactor the project into a different architecture.
>
> Rule levels: `[MUST]` is required, `[SHOULD]` is the default unless there is a reason, and `[OPTIONAL]` is situational.
>
> Rule status: `[EXISTING]` is evidenced by current source; `[PROPOSED]` is a suggested convention for inconsistent or missing areas and requires team confirmation.

## 1. Project Structure

### [MUST] [EXISTING] Keep code organized by feature module

Feature code belongs under `src/modules/<domain>/`.

```text
src/modules/
  auth/
  user/
```

**Evidence:** `src/modules/auth/`, `src/modules/user/`.

### [MUST] [EXISTING] Use the existing top-level responsibilities

- `src/modules/`: feature/domain code.
- `src/common/`: shared types, enums, constants, schemas, errors, and templates.
- `src/config/`: external service and infrastructure setup.
- `src/middlewares/`: Express request pipeline middleware.
- `src/utils/`: reusable technical helpers.
- `src/app.ts`: application composition, middleware registration, route mounting, and server startup.

**Evidence:** `src/app.ts`, `src/common/`, `src/config/`, `src/middlewares/`, `src/modules/`, `src/utils/`.

### [MUST] [EXISTING] Keep normal feature layers together

A module may contain the layers it needs:

```text
<domain>.route.ts
<domain>.controller.ts
<domain>.service.ts
<domain>.repository.ts
<domain>.model.ts
<domain>.container.ts
schemas/<domain>.request.schema.ts
schemas/<domain>.response.schema.ts
```

**Evidence:** `src/modules/auth/` and `src/modules/user/`.

### [SHOULD] [EXISTING] Add only layers that have a real responsibility

Do not create a repository, service, model, or utility only to satisfy a template. Follow the module's existing needs. Do not introduce a new top-level architecture folder without evidence that the existing boundaries cannot support the feature.

## 2. Naming Convention

### [MUST] [EXISTING] Use role-based lowercase file names

```text
auth.route.ts
auth.controller.ts
auth.service.ts
auth.repository.ts
auth.model.ts
auth.container.ts
auth.middleware.ts
```

**Evidence:** `src/modules/auth/`, `src/modules/user/`, `src/middlewares/`.

### [MUST] [EXISTING] Use PascalCase for classes

```ts
class AuthService {}
class UserRepository {}
class UserController {}
```

**Evidence:** `src/modules/auth/auth.service.ts`, `src/modules/user/user.repository.ts`, `src/modules/user/user.controller.ts`.

### [MUST] [EXISTING] Use camelCase for functions, methods, variables, and fields

```ts
findUserById();
createUser();
userRepository;
refreshToken;
```

**Evidence:** `src/modules/user/user.service.ts`, `src/modules/auth/auth.controller.ts`.

### [MUST] [EXISTING] Use SCREAMING_SNAKE_CASE for shared constants

```ts
export const MESSAGE_CODE = { ... } as const;
```

**Evidence:** `src/common/consts/messageCode.const.ts`.

### [MUST] [EXISTING] Use PascalCase enum types and uppercase enum members

```ts
enum UserStatusEnum {
  ACTIVE = 'active',
  BANNED = 'banned',
}
```

**Evidence:** `src/common/enums/user.enum.ts`.

### [MUST] [EXISTING] Prefix persistence interfaces with `I`

```ts
export interface IUser extends SoftDeleteDocument { ... }
```

**Evidence:** `src/modules/user/user.model.ts`, `src/modules/auth/otp.model.ts`.

### [SHOULD] [PROPOSED] Use descriptive names for new request/response types

Use names such as `CreateUserRequest`, `UpdateUserRequest`, `UserResponse`, and `UserQuery`. This is already the dominant module pattern.

**Evidence:** `src/modules/user/schemas/user.request.schema.ts`, `src/modules/user/schemas/user.response.schema.ts`.

### [PROPOSED] Test file naming

**Status:** Proposed. No test or spec files exist in the current source, so there is not enough evidence to declare a current convention. The team should choose one convention before adding tests, for example `<subject>.test.ts`.

## 3. Import / Export

### [MUST] [EXISTING] Use ES modules

Use `import` and `export`, never CommonJS `require` or `module.exports` in new TypeScript code.

**Evidence:** `package.json` has `"type": "module"`; all source files use ESM imports/exports.

### [MUST] [EXISTING] Use explicit `.ts` extensions for relative imports

```ts
import { User } from './user.model.ts';
import { AppError } from '../../common/errors/appError.error.ts';
```

**Evidence:** `tsconfig.json` uses `NodeNext` and `rewriteRelativeImportExtensions`; all current relative imports include `.ts`.

### [MUST] [EXISTING] Prefer `import type` for type-only imports

```ts
import type { Request, Response } from 'express';
import type { UserService } from './user.service.ts';
```

**Evidence:** `src/middlewares/error.middleware.ts`, `src/modules/user/user.controller.ts`, `src/utils/response.util.ts`.

### [MUST] [EXISTING] Use relative imports

There is no configured path alias in `tsconfig.json`, and current source uses relative imports. Do not introduce an alias without a deliberate repository-wide configuration change.

### [SHOULD] [EXISTING] Use named exports for reusable definitions

Classes, utilities, constants, schemas, and configured instances are generally named exports. Default export is used for routers and the database `connect` function.

**Evidence:** `src/modules/user/user.route.ts`, `src/config/connect.config.ts`, `src/utils/response.util.ts`.

### [PROPOSED] Barrel files

**Status:** Proposed. No `index.ts` barrel files exist. Do not add barrel files unless they solve a demonstrated import problem and the team agrees on the convention.

### [PROPOSED] Import ordering

**Status:** Proposed. No import-order ESLint rule is configured. Keep imports grouped logically (external packages, internal modules, type-only imports where practical), but do not reformat unrelated imports solely to impose a new ordering rule.

## 4. TypeScript

### [MUST] [EXISTING] Keep strict TypeScript enabled

Do not weaken `strict` settings or bypass type checking to make a feature compile.

**Evidence:** `tsconfig.json` has `"strict": true` and `"skipLibCheck": true`.

### [MUST] [EXISTING] Use interfaces for persisted document contracts

Mongoose document contracts are represented with interfaces such as `IUser` and `IOtp`.

**Evidence:** `src/modules/user/user.model.ts`, `src/modules/auth/otp.model.ts`.

### [MUST] [EXISTING] Use Zod-inferred types for request contracts

```ts
export type CreateUserRequest = z.infer<typeof createUserSchema>;
```

**Evidence:** `src/modules/user/schemas/user.request.schema.ts`, `src/modules/auth/schemas/auth.request.schema.ts`.

### [SHOULD] [EXISTING] Let TypeScript infer local implementation types

Use explicit types at public boundaries, constructor dependencies, exported contracts, and places where inference is unclear. Do not annotate every local variable without a reason.

### [MUST] [EXISTING] Avoid `any` in new code

Use a concrete type, a generic, or `unknown` followed by narrowing. Existing type assertions such as `req.query as unknown as UserQuery` may be preserved when required by Express typings, but should not be copied without need.

**Evidence:** `src/modules/user/user.controller.ts`, `src/middlewares/validate.middleware.ts`.

### [MUST] [EXISTING] Use enums already defined for domain values

Do not duplicate role, status, or authentication-provider string literals when an enum exists.

**Evidence:** `src/common/enums/user.enum.ts`, `src/modules/user/user.model.ts`.

### [PROPOSED] Return types for repository methods

**Status:** Proposed. Repository methods are not consistently annotated with explicit return types. Prefer explicit return types for exported/public methods in new code, while preserving Mongoose's useful inferred query types where they improve correctness. The team should confirm whether all repository methods must be annotated.

## 5. Functions

### [MUST] [EXISTING] Name functions after the operation they perform

Use names such as `findAllUser`, `findUserById`, `createUser`, `updateUser`, `deleteUser`, `validateRequest`, and `connectRedis`.

**Evidence:** `src/modules/user/user.controller.ts`, `src/middlewares/validate.middleware.ts`, `src/config/redis.config.ts`.

### [MUST] [EXISTING] Use async/await for asynchronous application operations

```ts
const user = await this.userRepository.findById(id);
```

Do not mix callback-style control flow with async/await unless an API requires it.

**Evidence:** `src/modules/user/user.service.ts`, `src/modules/auth/auth.service.ts`.

### [MUST] [EXISTING] Return a Promise type for public async boundaries when it is already the local pattern

Controllers use `Promise<void>` and connection functions use `Promise<void>`.

**Evidence:** `src/modules/user/user.controller.ts`, `src/config/connect.config.ts`.

### [SHOULD] [EXISTING] Use early returns for simple absence cases

```ts
if (!user) return user;
```

**Evidence:** `src/modules/user/user.service.ts` (`formatUser`).

### [SHOULD] [PROPOSED] Keep functions focused on one layer responsibility

Do not impose a line-count limit; the current source does not provide evidence for one. Split a function when it combines HTTP handling, business rules, persistence, or unrelated transformations.

### [MUST] [EXISTING] Do not return expected errors as ordinary result objects

Throw `AppError` and let the global error middleware format the response. Services currently throw for not found, duplicate, unauthorized, and invalid-token cases.

**Evidence:** `src/modules/user/user.service.ts`, `src/modules/auth/auth.service.ts`, `src/middlewares/error.middleware.ts`.

## 6. Controllers

### [MUST] [EXISTING] Keep controllers as the HTTP boundary

Controllers may read request data, call a service, and write a response. They must not contain Mongoose queries, Redis operations, password hashing, or business decision logic.

```ts
const user = await this.userService.findUserById(req.params.id as string);
ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, user);
```

**Evidence:** `src/modules/user/user.controller.ts`, `src/modules/auth/auth.controller.ts`.

### [MUST] [EXISTING] Use arrow-function class fields for Express handlers

```ts
findUserById = async (req: Request, res: Response): Promise<void> => { ... };
```

This preserves the controller instance context when passed to Express.

**Evidence:** `src/modules/user/user.controller.ts`, `src/modules/auth/auth.controller.ts`.

### [MUST] [EXISTING] Use `ResponseUtils` for HTTP responses

Use `success`, `paginated`, or `noContent` instead of ad-hoc JSON shapes.

**Evidence:** `src/utils/response.util.ts`, all current controllers.

### [SHOULD] [EXISTING] Keep controller error handling delegated to middleware

Controllers currently do not catch expected service errors. Preserve this flow unless an error must be translated at the HTTP boundary.

## 7. Services

### [MUST] [EXISTING] Put business rules in services

Services handle workflows such as duplicate checks, password hashing, token generation, OTP behavior, user formatting, and business-level error decisions.

**Evidence:** `src/modules/user/user.service.ts`, `src/modules/auth/auth.service.ts`.

### [MUST] [EXISTING] Receive dependencies through constructors

```ts
constructor(
  private readonly userRepository: UserRepository,
  private readonly authRedisService?: AuthRedisService
) {}
```

Do not instantiate repositories or infrastructure clients inside service methods.

**Evidence:** `src/modules/user/user.service.ts`, `src/modules/auth/auth.service.ts`.

### [MUST] [EXISTING] Use `AppError` for expected business failures

```ts
throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
```

### [SHOULD] [EXISTING] Validate serialized service output when a response schema exists

Use `validateResponse` for important output contracts, especially after formatting Mongoose documents.

**Evidence:** `src/modules/user/user.service.ts`, `src/utils/validateReponse.util.ts`.

## 8. Data Access

### [MUST] [EXISTING] Keep normal Mongoose queries in repositories

Repositories receive a model and encapsulate queries such as `findByEmail`, `findById`, `createUser`, `updateUser`, and soft deletion.

**Evidence:** `src/modules/user/user.repository.ts`, `src/modules/auth/auth.repository.ts`.

### [MUST] [EXISTING] Services use repository methods instead of duplicating queries

Do not access Mongoose models directly from a service for normal module operations.

### [SHOULD] [EXISTING] Do not create a repository for non-persistent logic

A repository is appropriate for database access, not for mail, JWT, Redis token management, or response formatting. Those concerns use their existing utilities/services.

### [MUST] [EXISTING] Compose dependencies in a container

```ts
const userRepository = new UserRepository(User);
const userService = new UserService(userRepository, authRedisService);
export const userController = new UserController(userService);
```

**Evidence:** `src/modules/user/user.container.ts`, `src/modules/auth/auth.container.ts`.

## 9. Request / Response

### [MUST] [EXISTING] Validate body, query, and params at the route boundary

```ts
validateRequest({
  params: userIdParamSchema,
  body: updateUserSchema,
});
```

**Evidence:** `src/modules/user/user.route.ts`, `src/middlewares/validate.middleware.ts`.

### [MUST] [EXISTING] Use the standard success envelope

```json
{
  "success": true,
  "statusCode": 200,
  "message": "MESSAGE_CODE_001",
  "data": {}
}
```

**Evidence:** `src/utils/response.util.ts`, `src/common/types/apiResponse.type.ts`.

### [MUST] [EXISTING] Use `ResponseUtils.paginated` for list responses

```ts
ResponseUtils.paginated(
  res,
  200,
  MESSAGE_CODE.MESSAGE_CODE_001,
  items,
  pagination
);
```

Pagination data contains `items` and `pagination` with page, limit, total, and navigation fields.

**Evidence:** `src/utils/response.util.ts`, `src/common/types/pagination.type.ts`, `src/utils/pagination.util.ts`.

### [SHOULD] [EXISTING] Use the existing status-code conventions

- `200`: successful read/update/action.
- `201`: successful creation.
- `204`: no content through `ResponseUtils.noContent`.
- `400`: invalid request or domain conflict currently represented as invalid request.
- `401`: unauthorized or invalid token.
- `404`: resource not found.
- `500`: internal error.

**Evidence:** `src/modules/user/user.controller.ts`, `src/middlewares/error.middleware.ts`, `src/common/consts/messageCode.const.ts`.

### [MUST] [EXISTING] Keep request schema and OpenAPI documentation synchronized

When a request body, query parameter, path parameter, status, or response changes, update both the Zod schema and the route's `@openapi` block.

**Evidence:** `src/modules/auth/auth.route.ts`, `src/modules/user/user.route.ts`, `src/config/swaggerSchemas.config.ts`.

## 10. Validation

### [MUST] [EXISTING] Use Zod for request validation

Request schemas live in module `schemas/*.request.schema.ts` and are applied through `validateRequest`.

**Evidence:** `src/modules/auth/schemas/auth.request.schema.ts`, `src/modules/user/schemas/user.request.schema.ts`, `src/middlewares/validate.middleware.ts`.

### [MUST] [EXISTING] Separate validation concerns

- Request shape/type validation: Zod schemas at the route boundary.
- Business validation: services, such as duplicate email or user existence.
- Persistence validation: Mongoose schema constraints.

**Evidence:** `src/middlewares/validate.middleware.ts`, `src/modules/user/user.service.ts`, `src/modules/user/user.model.ts`.

### [MUST] [EXISTING] Convert validation failures into `AppError`

`validateRequest` catches Zod failures and forwards `AppError(400, MESSAGE_CODE.MESSAGE_CODE_101, [error])`.

**Evidence:** `src/middlewares/validate.middleware.ts`.

### [SHOULD] [PROPOSED] Use one Zod import style in future touched files

The source currently uses both `import z from 'zod'` and `import { z } from 'zod'`. This is an inconsistency, not an existing universal rule. The team should choose one style before enforcing it; do not make unrelated import-only changes.

**Evidence:** `src/modules/auth/schemas/auth.request.schema.ts`, `src/config/swaggerSchemas.config.ts`.

## 11. Error Handling

### [MUST] [EXISTING] Use `AppError` for expected application errors

```ts
throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
```

**Evidence:** `src/common/errors/appError.error.ts`, `src/modules/user/user.service.ts`, `src/modules/auth/auth.service.ts`.

### [MUST] [EXISTING] Let the global error middleware format errors

The global middleware handles `AppError`, `http-errors`, Zod errors carried in `AppError.params`, and generic `Error` values.

**Evidence:** `src/middlewares/error.middleware.ts`, `src/app.ts`.

### [MUST] [EXISTING] Preserve the error response envelope

```json
{
  "success": false,
  "statusCode": 400,
  "message": "MESSAGE_CODE_101",
  "errors": [],
  "path": "/users",
  "timestamp": "2026-09-23T00:00:00.000Z"
}
```

`stack` is optional and controlled by the current environment check.

**Evidence:** `src/utils/response.util.ts`, `src/common/types/apiResponse.type.ts`.

### [MUST] [EXISTING] Do not catch and replace errors without preserving meaning

Services may log an unexpected error and convert it to `MESSAGE_CODE_106`, as in `findAllUser`. Expected `AppError` values must be rethrown.

**Evidence:** `src/modules/user/user.service.ts`.

### [MUST] [EXISTING] Use `MESSAGE_CODE` constants

Do not use arbitrary application error-code strings in a new feature. Add a constant to `src/common/consts/messageCode.const.ts` when a genuinely new category is required.

## 12. Database

### [MUST] [EXISTING] Use Mongoose models and schemas

Database documents are defined with Mongoose schemas and typed interfaces.

**Evidence:** `src/modules/user/user.model.ts`, `src/modules/auth/otp.model.ts`.

### [MUST] [EXISTING] Keep persistence rules in models

Required fields, enum values, unique indexes, timestamps, conditional passwords, and plugins belong in the model schema.

### [MUST] [EXISTING] Preserve soft-delete behavior for users

User deletion updates status to `deleted` and uses `mongoose-delete`'s `deleteById` through the repository.

**Evidence:** `src/modules/user/user.model.ts`, `src/modules/user/user.repository.ts`, `src/modules/user/user.service.ts`.

### [MUST] [EXISTING] Use shared pagination behavior

Use `paginate` from `src/utils/pagination.util.ts` and preserve the configured maximum limit of 100.

### [PROPOSED] Transactions and migrations

**Status:** No transaction or migration implementation exists in the current source. Do not invent a migration convention. Introduce transactions only when a feature has a demonstrated multi-write atomicity requirement and the team agrees on the MongoDB transaction policy.

### [MUST] [EXISTING] Do not expose password values

Password fields may be used for hashing/authentication but must not be included in public response schemas or response data.

**Evidence:** `src/modules/user/schemas/user.response.schema.ts`, `src/modules/auth/schemas/auth.response.schema.ts`, `src/modules/user/user.service.ts`.

## 13. Async Programming

### [MUST] [EXISTING] Use async/await consistently

Await database, Redis, mail, hashing, and token operations when their result or completion is required.

### [MUST] [EXISTING] Propagate asynchronous failures to the existing error flow

Do not swallow rejected promises. Route/controller async errors should reach the Express error middleware according to the existing Express 5 flow.

**Evidence:** `src/app.ts`, `src/middlewares/error.middleware.ts`, controllers and services.

### [SHOULD] [PROPOSED] Use `Promise.all` only for independent operations

No current source establishes a `Promise.all` convention. Use it only when operations are independent and parallel execution cannot violate ordering, consistency, or rate limits. Keep dependent operations sequential.

### [PROPOSED] Background jobs

**Status:** No background job framework or worker exists. Do not introduce background jobs as an incidental abstraction; define ownership, retries, and failure handling first.

## 14. Logging

### [MUST] [EXISTING] Use the current logging mechanisms consistently

The project currently uses `console.log` for startup and connection messages, `console.error` for connection failures and unexpected service errors, and Morgan for HTTP access logs.

**Evidence:** `src/app.ts`, `src/config/connect.config.ts`, `src/config/redis.config.ts`, `src/modules/user/user.service.ts`, `package.json`.

### [MUST] [EXISTING] Never log secrets

Do not log passwords, JWTs, refresh tokens, cookies, SMTP credentials, MongoDB credentials, or OAuth secrets.

### [SHOULD] [PROPOSED] Do not add a second logger without an agreed migration

**Status:** Proposed. No structured logger or log-level configuration exists. Use the current approach for small changes; adopt a logger only as an explicit cross-cutting decision.

### [MUST] [EXISTING] Do not expose internal error details in production responses

The error middleware only replaces the generic message with the underlying error message under its development check. Preserve this security boundary.

**Evidence:** `src/middlewares/error.middleware.ts`, `src/utils/response.util.ts`.

## 15. Testing

### [PROPOSED] Test framework and test layout

**Status:** There are no test files, test script, or test framework configured in the current repository. Therefore there is not enough evidence to declare a testing convention.

Before adding tests, the team should decide:

- test framework;
- unit/integration/e2e scope;
- test file location and naming;
- database and Redis test strategy;
- fixtures and cleanup policy.

### [MUST] [EXISTING] Run available quality checks

The repository currently provides:

```bash
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run check
```

CI runs `npm ci`, `npm run check`, and `npm run build` on Node 22.

**Evidence:** `package.json`, `.github/workflows/ci.yml`.

### [SHOULD] [PROPOSED] Add focused tests for new behavior once tooling is approved

This is a proposed quality rule, not an existing project convention. Do not claim tests pass when no test runner exists.

## 16. Comments & Documentation

### [MUST] [EXISTING] Document OpenAPI endpoints beside routes

Use `@openapi` JSDoc blocks in route files and keep them synchronized with runtime routes.

**Evidence:** `src/modules/auth/auth.route.ts`, `src/modules/user/user.route.ts`.

### [SHOULD] [EXISTING] Comment non-obvious behavior and contracts

Existing comments explain schema groups, response wrappers, JWT/OpenAPI conversion, and error branches. Follow this style for behavior that is not obvious from the code.

### [SHOULD] [EXISTING] Avoid comments that merely restate code

Do not add comments such as `// assign value to variable`. Prefer a short explanation of why a workaround, security rule, TTL, or compatibility behavior exists.

### [PROPOSED] TODO/FIXME policy

**Status:** No TODO/FIXME convention is established by the current source. If the team adopts them, each TODO should include an actionable description and, where applicable, an issue reference.

## 17. Git Convention

### [MUST] [EXISTING] Follow the repository commit format

Current commits use:

```text
[PREFIX] (scope): short description
```

Observed examples:

```text
[FEATURE] (user): User apis for management
[CHORE] (server): Configure swagger documentation for REST Api
[CHORE] (auth, redis): Handle RTR, Family token, Redis
```

**Evidence:** `git log`.

### [MUST] [EXISTING] Use the documented branch prefixes

The README documents:

```text
feature/<name>
fix/<name>
hotfix/<name>
chore/<name>
refactor/<name>
```

**Evidence:** `README.md`.

### [SHOULD] [EXISTING] Keep commits scoped to one coherent change

Use the module or infrastructure scope in the commit subject where appropriate. Do not mix unrelated refactors into a feature commit.

## 18. Formatting

### [MUST] [EXISTING] Follow Prettier configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5"
}
```

**Evidence:** `.prettierrc`.

### [MUST] [EXISTING] Follow ESLint and TypeScript checks

The project uses ESLint 10 with `typescript-eslint`, recommended rules, and `eslint-config-prettier`. Unused variables are warnings under the current configuration.

**Evidence:** `eslint.config.js`.

### [MUST] [EXISTING] Use two-space indentation, semicolons, and single quotes

These are enforced or formatted by the current Prettier configuration.

### [PROPOSED] Line length and import sorting

**Status:** No explicit line-length or import-order rule is configured. Do not add a manual limit or reorder imports globally without team agreement.

## 19. Anti-patterns

### [MUST] [EXISTING] Do not put database queries in controllers

```ts
// Do not add Mongoose queries here.
const user = await User.findById(req.params.id);
```

Use the service and repository layers instead.

### [MUST] [EXISTING] Do not put business rules in routes

Routes should compose middleware and controller handlers. They should not hash passwords, check duplicate users, or manipulate Redis.

### [MUST] [EXISTING] Do not bypass `ResponseUtils`

Do not create a second success/error response shape in a controller.

### [MUST] [EXISTING] Do not use literal message codes

```ts
// Do not.
throw new AppError(401, 'INVALID_TOKEN');
```

Use `MESSAGE_CODE.MESSAGE_CODE_201` or an approved constant.

### [MUST] [EXISTING] Do not bypass request validation

New body/query/params inputs must have a Zod schema and use `validateRequest` at the route boundary.

### [MUST] [EXISTING] Do not treat Swagger security as runtime security

OpenAPI `security` only documents an endpoint. A protected endpoint must also use `authMiddleware` or an approved authorization middleware.

### [SHOULD] [PROPOSED] Do not create duplicate utilities

Search `src/utils/`, `src/common/`, and the owning module before adding a helper. Extend an existing helper when its responsibility matches; create a new helper only when the responsibility is genuinely different.

### [MUST] [EXISTING] Do not copy known shortcuts into new code

For example, `src/config/passport.config.ts` directly accesses the user model. This is an existing exception, not a pattern for new feature flows; new code should use the module's repository/container boundary.

## 20. Examples

### Creating a new user-facing operation

```text
1. Add or update a request schema in src/modules/<domain>/schemas/.
2. Add or update a response schema if the output contract changes.
3. Add repository methods only for persistence operations.
4. Add service logic and AppError handling.
5. Wire dependencies in <domain>.container.ts.
6. Add a controller method using ResponseUtils.
7. Add route middleware in auth -> validation -> controller order.
8. Add @openapi documentation and reusable Swagger schemas.
9. Add or update MESSAGE_CODE constants for new error categories.
10. Run npm run check and npm run build.
```

### Existing-style controller

```ts
findUserById = async (req: Request, res: Response): Promise<void> => {
  const user = await this.userService.findUserById(req.params.id as string);
  ResponseUtils.success(res, 200, MESSAGE_CODE.MESSAGE_CODE_001, user);
};
```

**Evidence:** `src/modules/user/user.controller.ts`.

### Existing-style service error

```ts
if (!user) {
  throw new AppError(404, MESSAGE_CODE.MESSAGE_CODE_104, ['User']);
}
```

**Evidence:** `src/modules/user/user.service.ts`.

### Existing-style dependency composition

```ts
const userRepository = new UserRepository(User);
const userService = new UserService(userRepository, authRedisService);
export const userController = new UserController(userService);
```

**Evidence:** `src/modules/user/user.container.ts`.

### Existing-style protected route documentation

```ts
/**
 * @openapi
 * /auth/me:
 *   get:
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 */
authRouter.get('/me', authMiddleware, authController.getMe);
```

**Evidence:** `src/modules/auth/auth.route.ts`, `src/config/swagger.config.ts`.

## Summary Table

| Category        | Rule                                                            |    Level | Status   | Evidence                                                          |
| --------------- | --------------------------------------------------------------- | -------: | -------- | ----------------------------------------------------------------- |
| Structure       | Feature code lives in `src/modules/<domain>`                    |     MUST | EXISTING | `src/modules/auth`, `src/modules/user`                            |
| Structure       | Shared code uses `common`, `config`, `middlewares`, and `utils` |     MUST | EXISTING | `src/`                                                            |
| Naming          | Role-based TypeScript files use lowercase dotted names          |     MUST | EXISTING | `src/modules/`, `src/middlewares/`                                |
| Naming          | Classes use PascalCase                                          |     MUST | EXISTING | `src/modules/*/*.service.ts`                                      |
| Naming          | Methods and variables use camelCase                             |     MUST | EXISTING | `src/modules/*`                                                   |
| Naming          | Constants use SCREAMING_SNAKE_CASE                              |     MUST | EXISTING | `src/common/consts/messageCode.const.ts`                          |
| Import          | Use ESM with explicit `.ts` relative extensions                 |     MUST | EXISTING | `package.json`, `src/**/*.ts`                                     |
| Import          | Use `import type` for type-only imports                         |     MUST | EXISTING | `src/middlewares`, `src/utils`                                    |
| TypeScript      | Keep strict mode enabled                                        |     MUST | EXISTING | `tsconfig.json`                                                   |
| TypeScript      | Infer request types from Zod schemas                            |     MUST | EXISTING | `src/modules/*/schemas/*.request.schema.ts`                       |
| Controller      | Keep HTTP handling in controllers                               |     MUST | EXISTING | `src/modules/*/*.controller.ts`                                   |
| Service         | Keep business rules in services                                 |     MUST | EXISTING | `src/modules/*/*.service.ts`                                      |
| Data access     | Keep Mongoose queries in repositories                           |     MUST | EXISTING | `src/modules/*/*.repository.ts`                                   |
| DI              | Compose dependencies in containers                              |     MUST | EXISTING | `src/modules/*/*.container.ts`                                    |
| Request         | Validate at route boundary with Zod                             |     MUST | EXISTING | `src/middlewares/validate.middleware.ts`                          |
| Response        | Use `ResponseUtils` envelopes                                   |     MUST | EXISTING | `src/utils/response.util.ts`                                      |
| Errors          | Throw `AppError` with `MESSAGE_CODE`                            |     MUST | EXISTING | `src/common/errors`, `src/common/consts`                          |
| Auth            | Runtime protection requires middleware                          |     MUST | EXISTING | `src/middlewares/auth.middleware.ts`                              |
| Swagger         | Keep OpenAPI security aligned with runtime middleware           |     MUST | EXISTING | `src/modules/auth/auth.route.ts`                                  |
| Database        | Preserve Mongoose soft-delete and TTL behavior                  |     MUST | EXISTING | `src/modules/user/user.model.ts`, `src/modules/auth/otp.model.ts` |
| Logging         | Never log credentials or tokens                                 |     MUST | EXISTING | `src/config`, `src/middlewares`                                   |
| Testing         | Test framework and naming are not established                   |   SHOULD | PROPOSED | No test files/scripts found                                       |
| Formatting      | Use Prettier and ESLint configuration                           |     MUST | EXISTING | `.prettierrc`, `eslint.config.js`                                 |
| Git             | Use `[PREFIX] (scope): message` commits                         |     MUST | EXISTING | `git log`, `README.md`                                            |
| Import ordering | Adopt an ordering rule                                          |   SHOULD | PROPOSED | No configured rule                                                |
| Logging library | Adopt structured logging                                        | OPTIONAL | PROPOSED | No logger package/config found                                    |

## Evidence Gaps

The following areas cannot be classified as existing conventions from the current source:

- No unit, integration, or end-to-end test files are present.
- No test script or test framework is configured in `package.json`.
- No structured logger or explicit log-level policy is configured.
- No import-order ESLint rule is configured.
- No path alias is configured in `tsconfig.json`.
- No migration framework or transaction convention is present.
- No role/permission middleware is present; `role` values exist but are not sufficient evidence of authorization enforcement.
- Repository method return-type annotation is inconsistent, so a universal rule would be a proposal.
- Both default and named Zod imports exist, so import style requires team confirmation.
