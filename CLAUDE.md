# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Emigrantes FT Admin** is a NestJS backend API for managing POA (Power of Attorney) and financial services for emigrants. The application follows a modular architecture with standardized responses and comprehensive Swagger documentation.

**Tech Stack:**
- NestJS 11.x with TypeScript
- PostgreSQL via TypeORM
- JWT authentication with refresh token rotation
- Swagger/OpenAPI documentation
- pnpm package manager

## Development Commands

### Installation
```bash
pnpm install
```

### Running the Application
```bash
pnpm run start             # Start application
pnpm run start:dev         # Development mode with watch
pnpm run start:debug       # Debug mode with watch
pnpm run start:prod        # Production mode
```

### Building
```bash
pnpm run build             # Build using Nest CLI
```

### Testing
```bash
pnpm run test              # Run unit tests
pnpm run test:watch        # Run tests in watch mode
pnpm run test:cov          # Run tests with coverage report
pnpm run test:e2e          # Run end-to-end tests
pnpm run test:debug        # Debug tests
```

### Code Quality
```bash
pnpm run lint              # ESLint with auto-fix
pnpm run format            # Format code with Prettier
```

### API Documentation
- Access Swagger UI at: `http://localhost:3001/api/docs` when server is running
- All endpoints are automatically documented via decorators

## Architecture

### Module Structure

The application follows a **layered modular architecture**:

```
src/
├── modules/              # Domain modules (feature-based)
│   └── auth/            # Authentication module (JWT, OTP, password management)
├── common/              # Cross-cutting concerns
│   ├── dto/            # Standard response DTOs
│   ├── filters/        # Exception filters
│   ├── guards/         # Authorization guards
│   ├── interceptors/   # Response/logging interceptors
│   └── utils/          # Shared utilities
├── shared/              # Shared services
│   ├── database.module.ts    # TypeORM configuration
│   └── module-loader.service.ts
├── app.module.ts        # Root module
└── main.ts             # Application bootstrap
```

### Standard Response Format

**All API responses** follow this standardized format, enforced by `ResponseInterceptor`:

**Success Response:**
```typescript
{
  "success": true,
  "data": any,                    // Response payload
  "message": string,              // Descriptive message
  "timestamp": string,            // ISO 8601 timestamp
  "path": string                  // Request path
}
```

**Error Response:**
```typescript
{
  "success": false,
  "error": {
    "code": string,               // Error code (e.g., "VALIDATION_ERROR")
    "message": string,            // Error message
    "details": any                // Additional error details (optional)
  },
  "timestamp": string,
  "path": string
}
```

### Database Configuration

- **Primary DB:** PostgreSQL (`emigrantes_ft` database)
- **Connection:** Configured via environment variables (see `.env.example`)
- **ORM:** TypeORM with auto-synchronize in development
- **Entities:** Auto-discovered from `**/*.entity{.ts,.js}` pattern
- **Fallback:** Application continues running if database connection fails (logs warning)

### Authentication System

The auth module implements a complete JWT-based authentication system:

**Key Features:**
- **JWT Access Tokens:** 15-minute expiration
- **Refresh Tokens:** 7-day expiration with automatic rotation
- **Email Verification:** OTP-based (6-digit code, 10-minute expiration, 3 max attempts)
- **Password Reset:** Token-based flow via email
- **Password Requirements:** Min 8 chars, must include uppercase, lowercase, number, and special character

**Protected Endpoints:**
- Use `@UseGuards(JwtAuthGuard)` for access token validation
- Use `@UseGuards(JwtRefreshGuard)` for refresh token validation
- Use `@Public()` decorator to exclude endpoints from global auth guard
- Access current user via `@CurrentUser()` decorator

**User Registration Flow:**
1. POST `/auth/register` - Creates user (requires: email, password, firstName, lastName, phone)
2. System sends 6-digit OTP to email
3. POST `/auth/verify-email` - Validates OTP
4. User can now login

**User Entity Fields:**
- `id` (UUID), `email`, `password` (hashed), `firstName`, `lastName`, `phone`
- `role` (enum: 'client' | 'admin' | 'super_admin')
- `emailVerified`, `phoneVerified`, `isActive`, `lastLoginAt`
- `refreshToken` (hashed), `resetPasswordToken`, `resetPasswordExpires`
- `otpCode`, `otpExpires`, `otpAttempts`

## Swagger Documentation Standards

**All modules MUST include complete Swagger documentation:**

### Controller Level
```typescript
@Controller('resource')
@ApiTags('Resource Name')
export class ResourceController {
  // ...
}
```

### Endpoint Level
```typescript
@Post('create')
@ApiOperation({
  summary: 'Brief description',
  description: 'Detailed description'
})
@ApiResponse({
  status: 201,
  description: 'Success case',
  type: StandardResponseDto,
  schema: { example: { /* example response */ } }
})
@ApiBadRequestResponse({
  description: 'Error case',
  type: ErrorResponseDto
})
async create(@Body() dto: CreateDto) {
  // ...
}
```

### DTO Level
```typescript
export class CreateDto {
  @ApiProperty({
    example: 'example value',
    description: 'Field description'
  })
  @IsNotEmpty()
  field: string;
}
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

### Required Variables
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3001)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD` - PostgreSQL config
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT signing secrets
- `JWT_EXPIRATION` - Access token expiration (e.g., '15m')
- `JWT_REFRESH_EXPIRATION` - Refresh token expiration (e.g., '7d')

### Optional Variables
- Email (SMTP), SMS (Twilio), WhatsApp, Stripe, PayPal, AWS S3
- See `.env.example` for full list with defaults

## Adding New Modules

1. Generate module structure:
```bash
nest g module modules/feature-name
nest g controller modules/feature-name
nest g service modules/feature-name
```

2. **REQUIRED:** Add complete Swagger documentation:
   - `@ApiTags()` on controller
   - `@ApiOperation()` and `@ApiResponse()` on all endpoints
   - `@ApiProperty()` on all DTO fields

3. **REQUIRED:** Responses automatically follow standard format via `ResponseInterceptor`

4. Import module in `app.module.ts`:
```typescript
import { FeatureModule } from './modules/feature-name/feature-name.module';

@Module({
  imports: [DatabaseModule, AuthModule, FeatureModule],
  // ...
})
```

5. Create entity if using database:
```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('table_name')
export class FeatureName {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // columns...
}
```

6. Register entity in module:
```typescript
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureName } from './entities/feature-name.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureName])],
  // ...
})
```

## Database Management

### Accessing PostgreSQL
```bash
psql -U postgres -d emigrantes_ft
```

### TypeORM Synchronization
- **Development:** `synchronize: true` (auto-creates/updates tables)
- **Production:** `synchronize: false` (use migrations)

### Creating Migrations (for production)
```bash
pnpm run typeorm migration:generate -- -n MigrationName
pnpm run typeorm migration:run
```

## Current Implemented Modules

### Auth Module (`/auth`)
Complete authentication system with:
- **POST `/register`** - Register new user (requires: email, password, firstName, lastName, phone)
- **POST `/verify-email`** - Verify email with OTP code
- **POST `/resend-otp`** - Resend OTP code
- **POST `/login`** - Login and get JWT tokens
- **POST `/refresh`** - Refresh access token (requires refresh token)
- **POST `/logout`** - Logout (invalidates refresh token)
- **POST `/forgot-password`** - Request password reset
- **POST `/reset-password`** - Reset password with token
- **POST `/change-password`** - Change password (requires authentication)
- **GET `/me`** - Get current user profile (requires authentication)

## Global Interceptors & Filters

### ResponseInterceptor
- Automatically wraps all successful responses in standard format
- Adds `success: true`, `timestamp`, and `path` fields
- Applied globally via `APP_INTERCEPTOR`

### HttpExceptionFilter
- Catches HTTP exceptions and formats as standard error response
- Handles validation errors from `class-validator`
- Applied globally via `APP_FILTER`

## Validation

- **Global ValidationPipe** configured with:
  - `whitelist: true` - Strips non-whitelisted properties
  - `forbidNonWhitelisted: true` - Throws error if non-whitelisted properties present
  - `transform: true` - Auto-transforms payloads to DTO instances

- All DTOs use `class-validator` decorators:
  - `@IsNotEmpty()`, `@IsEmail()`, `@IsString()`, `@MinLength()`, `@MaxLength()`, `@Matches()`, etc.

## CORS Configuration

CORS is enabled globally. Configure allowed origins via `CORS_ORIGIN` environment variable.

## Project-Specific Business Logic

### Emigrantes FT Domain

This application manages services for emigrants, focusing on:
- **POA (Power of Attorney)** management
- **Financial services** for emigrants
- **Document processing** and verification
- **Payment processing** (Stripe/PayPal integration)
- **Appointment scheduling** (Calendly integration)
- **Multi-channel notifications** (Email, SMS, WhatsApp)

### User Roles
- `client` - Regular customer (default)
- `admin` - Administrative user
- `super_admin` - Super administrator

### Security Features
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with short expiration (15 min access, 7 day refresh)
- Refresh token rotation on every use
- OTP verification for email with attempt limiting
- All sensitive operations require authentication
- Password reset tokens expire after use

## Port Configuration

Default server port: **3001** (configurable via `PORT` env variable)
