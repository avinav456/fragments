# Fragments

A cloud-native **RESTful microservice** for storing, retrieving, converting, and managing small pieces of arbitrary data ("fragments") — text, JSON, Markdown, CSV, YAML, and images. Built with Node.js and Express, it supports both a local in-memory store (for development/testing) and a production-grade AWS backend (S3 + DynamoDB).

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Supported Fragment Types](#supported-fragment-types)
- [Type Conversion](#type-conversion)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [Data Storage Backends](#data-storage-backends)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Running with Docker Compose](#running-with-docker-compose)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Project Structure](#project-structure)

---

## Overview

Fragments is a back-end API service that lets authenticated users:

- **Create** fragments of any supported MIME type (up to 5 MB)
- **List** all their fragments (IDs only, or full metadata)
- **Retrieve** fragment data, with optional on-the-fly type conversion
- **Update** existing fragment data
- **Delete** fragments
- **Inspect** fragment metadata

The service is stateless and containerised, designed to run on AWS ECS with S3 and DynamoDB, or locally against an in-memory store.

---

## Architecture

```
┌─────────────┐      HTTP      ┌──────────────────────────────────────┐
│   Client    │ ─────────────► │  Express App (src/app.js)            │
└─────────────┘                │                                      │
                               │  Middleware stack:                   │
                               │    pino-http  (logging)              │
                               │    helmet     (security headers)     │
                               │    cors       (cross-origin)         │
                               │    compression (gzip/deflate)        │
                               │    passport   (authentication)       │
                               └──────────────┬───────────────────────┘
                                              │
                               ┌──────────────▼───────────────────────┐
                               │  Router  GET /  (health check)       │
                               │  Router  /v1/*  (authenticated API)  │
                               └──────────────┬───────────────────────┘
                                              │
                               ┌──────────────▼───────────────────────┐
                               │  Fragment Model  (src/model/)        │
                               │    ├─ In-memory store (dev/test)     │
                               │    └─ AWS S3 + DynamoDB (production) │
                               └──────────────────────────────────────┘
```

**Key modules:**

| File | Role |
|---|---|
| `src/index.js` | Starts the HTTP server via `stoppable` |
| `src/server.js` | Graceful shutdown logic |
| `src/app.js` | Express app, middleware, error handling |
| `src/routes/index.js` | Health-check route + mounts `/v1` |
| `src/routes/api/` | Individual route handlers (CRUD) |
| `src/model/fragment.js` | Fragment class, validation, conversion |
| `src/model/data/` | Storage adapter (memory or AWS) |
| `src/auth/` | Passport strategy selection |
| `src/hash.js` | SHA-256 email hashing for owner IDs |
| `src/logger.js` | Pino logger instance |
| `src/response.js` | Standardised `{ status, ...payload }` helpers |

---

## Supported Fragment Types

| MIME Type | Extension |
|---|---|
| `text/plain` | `.txt` |
| `text/markdown` | `.md` |
| `text/html` | `.html` |
| `text/csv` | `.csv` |
| `application/json` | `.json` |
| `application/yaml` | `.yaml` / `.yml` |
| `image/png` | `.png` |
| `image/jpeg` | `.jpg` / `.jpeg` |
| `image/webp` | `.webp` |
| `image/gif` | `.gif` |
| `image/avif` | `.avif` |

Requests with any other `Content-Type` are rejected with `415 Unsupported Media Type`.

---

## Type Conversion

When retrieving a fragment you can append a file extension to the URL (e.g. `GET /v1/fragments/:id.html`) to request an automatic conversion. Supported conversions:

| Source type | Valid target extensions |
|---|---|
| `text/plain` | `.txt` |
| `text/markdown` | `.md`, `.html`, `.txt` |
| `text/html` | `.html`, `.txt` |
| `text/csv` | `.csv`, `.txt`, `.json` |
| `application/json` | `.json`, `.yaml`, `.yml`, `.txt` |
| `application/yaml` | `.yaml`, `.yml`, `.txt` |
| `image/png` | `.png`, `.jpg`, `.webp`, `.gif`, `.avif` |
| `image/jpeg` | `.png`, `.jpg`, `.webp`, `.gif`, `.avif` |
| `image/webp` | `.png`, `.jpg`, `.webp`, `.gif`, `.avif` |
| `image/gif` | `.png`, `.jpg`, `.webp`, `.gif`, `.avif` |
| `image/avif` | `.png`, `.jpg`, `.webp`, `.gif`, `.avif` |

Image conversion is powered by [sharp](https://sharp.pixelplumbing.com/). Markdown to HTML conversion uses [markdown-it](https://github.com/markdown-it/markdown-it).

---

## API Reference

All API routes are prefixed with `/v1` and require authentication.

### Health Check

```
GET /
```

No authentication required. Returns service metadata.

**Response `200`:**
```json
{
  "status": "ok",
  "author": "Avinav",
  "githubUrl": "https://github.com/avinav456/fragments",
  "version": "0.10.2",
  "hostname": "<server-hostname>"
}
```

---

### List Fragments

```
GET /v1/fragments[?expand=1]
```

Returns an array of fragment IDs belonging to the authenticated user. Pass `?expand=1` to get full metadata objects instead.

**Response `200`:**
```json
{
  "status": "ok",
  "fragments": ["id1", "id2"]
}
```

With `?expand=1`:
```json
{
  "status": "ok",
  "fragments": [
    {
      "id": "<uuid>",
      "ownerId": "<sha256-hash>",
      "type": "text/plain; charset=utf-8",
      "size": 42,
      "created": "2024-01-01T00:00:00.000Z",
      "updated": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Create a Fragment

```
POST /v1/fragments
Content-Type: <supported-mime-type>
```

Body must be the raw binary content of the fragment (max **5 MB**).

**Response `201`** — includes a `Location` header pointing to the new fragment:
```json
{
  "status": "ok",
  "fragment": {
    "id": "<uuid>",
    "ownerId": "<sha256-hash>",
    "type": "text/plain; charset=utf-8",
    "size": 13,
    "created": "2024-01-01T00:00:00.000Z",
    "updated": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error codes:**
- `415` — missing body, missing/invalid `Content-Type`, or unsupported type

---

### Get Fragment Data

```
GET /v1/fragments/:id[.ext]
```

Returns the raw data of the fragment with the appropriate `Content-Type` header. Append an extension (e.g. `.html`, `.png`) to trigger type conversion.

**Error codes:**
- `404` — fragment not found
- `415` — requested conversion is not supported for this fragment type

---

### Get Fragment Metadata

```
GET /v1/fragments/:id/info
```

Returns the metadata object for a fragment without its data.

**Response `200`:**
```json
{
  "status": "ok",
  "fragment": { "id": "...", "ownerId": "...", "type": "...", "size": 0, "created": "...", "updated": "..." }
}
```

**Error codes:**
- `404` — fragment not found

---

### Update a Fragment

```
PUT /v1/fragments/:id
Content-Type: <same-mime-type-as-original>
```

Replaces the data of an existing fragment. The `Content-Type` must match the original fragment's type.

**Response `200`** — updated fragment metadata.

**Error codes:**
- `400` — `Content-Type` does not match the existing fragment's type
- `404` — fragment not found
- `415` — unsupported `Content-Type`

---

### Delete a Fragment

```
DELETE /v1/fragments/:id
```

Permanently removes the fragment metadata and its data.

**Response `200`:**
```json
{ "status": "ok" }
```

**Error codes:**
- `404` — fragment not found

---

### Response Format

All responses follow a consistent envelope:

```json
// Success
{ "status": "ok", ...payload }

// Error
{ "status": "error", "error": { "code": 404, "message": "not found" } }
```

---

## Authentication

The service supports two mutually exclusive authentication strategies, selected at startup via environment variables:

### 1. AWS Cognito (production)

Set `AWS_COGNITO_POOL_ID` and `AWS_COGNITO_CLIENT_ID`. The service validates incoming **JWT Bearer tokens** issued by Cognito using `aws-jwt-verify`.

### 2. HTTP Basic Auth (development/testing)

Set `HTPASSWD_FILE` to the path of an `.htpasswd` file (must **not** be used in `NODE_ENV=production`). Test credentials are stored in `tests/.htpasswd`.

The server will throw at startup if neither, or both, strategies are configured.

---

## Data Storage Backends

The backend is selected automatically based on the presence of `AWS_REGION`:

| Condition | Backend |
|---|---|
| `AWS_REGION` is set | AWS (S3 + DynamoDB) |
| `AWS_REGION` not set | In-memory (development/testing) |

### In-Memory

Used for local development and all unit tests. Data does not persist across server restarts.

### AWS Backend

- **Fragment metadata** → Amazon DynamoDB (`AWS_DYNAMODB_TABLE_NAME`)
- **Fragment raw data** → Amazon S3 (`AWS_S3_BUCKET_NAME`)

For local development with AWS-compatible storage, Docker Compose spins up **LocalStack** (S3 emulation) and **DynamoDB Local**.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v22+ (LTS recommended)
- [npm](https://www.npmjs.com/) v10+
- [Docker](https://www.docker.com/) & Docker Compose (for containerised development)

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/avinav456/fragments.git
cd fragments

# 2. Install dependencies
npm install

# 3. Create a .env file (use HTTP Basic Auth for local dev)
cat <<'EOF' > .env
PORT=8080
LOG_LEVEL=debug
HTTPASSWD_FILE=tests/.htpasswd
API_URL=http://localhost:8080
EOF

# 4. Start the dev server (auto-restarts on file changes)
npm run dev
```

The API is now available at `http://localhost:8080`.

**Available npm scripts:**

| Script | Description |
|---|---|
| `npm start` | Start server (production mode) |
| `npm run dev` | Start with nodemon + debug logging |
| `npm run debug` | Start with nodemon + Node inspector on port 9229 |
| `npm test` | Run unit tests |
| `npm run test:watch` | Run unit tests in watch mode |
| `npm run coverage` | Run unit tests with coverage report |
| `npm run lint` | Run ESLint |
| `npm run test:integration` | Run Hurl integration tests |

### Running with Docker Compose

Docker Compose starts the fragments service alongside **LocalStack** (S3) and **DynamoDB Local**, providing a full AWS-compatible local environment.

```bash
# Build and start all services
docker compose up --build

# Set up local AWS resources (S3 bucket + DynamoDB table)
chmod +x ./scripts/local-aws-setup.sh
./scripts/local-aws-setup.sh
```

The service will be available at `http://localhost:8080`.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `8080` | HTTP port the server listens on |
| `LOG_LEVEL` | No | `info` | Pino log level (`silent`, `debug`, `info`, `warn`, `error`) |
| `API_URL` | Yes (prod) | Request host | Base URL used to build `Location` headers |
| `HTPASSWD_FILE` | Dev/test | — | Path to `.htpasswd` file for HTTP Basic Auth |
| `AWS_COGNITO_POOL_ID` | Prod | — | Cognito User Pool ID |
| `AWS_COGNITO_CLIENT_ID` | Prod | — | Cognito App Client ID |
| `AWS_REGION` | AWS | — | AWS region; triggers AWS backend when set |
| `AWS_S3_BUCKET_NAME` | AWS | `fragments` | S3 bucket for fragment data |
| `AWS_DYNAMODB_TABLE_NAME` | AWS | `fragments` | DynamoDB table for fragment metadata |
| `AWS_S3_ENDPOINT_URL` | Local AWS | — | Override S3 endpoint (e.g. LocalStack) |
| `AWS_DYNAMODB_ENDPOINT_URL` | Local AWS | — | Override DynamoDB endpoint (e.g. DynamoDB Local) |
| `AWS_ACCESS_KEY_ID` | AWS | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS | — | AWS secret key |
| `AWS_SESSION_TOKEN` | AWS | — | AWS session token |

> **Note:** Set either `HTPASSWD_FILE` **or** `AWS_COGNITO_POOL_ID`+`AWS_COGNITO_CLIENT_ID` — never both.

---

## Testing

### Unit Tests

Unit tests use [Jest](https://jestjs.io/) and [Supertest](https://github.com/ladjs/supertest). They run against the in-memory backend with HTTP Basic Auth.

```bash
npm test
npm run coverage
```

Test environment variables are loaded from `env.jest`.

**Test coverage:**

| Test file | What it covers |
|---|---|
| `app.test.js` | Express app bootstrap |
| `health.test.js` | `GET /` health check |
| `fragment.test.js` | Fragment model (validation, CRUD, conversions) |
| `memory.test.js` | In-memory storage adapter |
| `memory-db.test.js` | Low-level memory DB operations |
| `get.test.js` | `GET /v1/fragments` listing |
| `get-id.test.js` | `GET /v1/fragments/:id` retrieval & conversion |
| `get-id-info.test.js` | `GET /v1/fragments/:id/info` metadata |
| `post.test.js` | `POST /v1/fragments` creation |
| `put.test.js` | `PUT /v1/fragments/:id` update |
| `delete.test.js` | `DELETE /v1/fragments/:id` deletion |
| `response.test.js` | Response helper functions |
| `hash.test.js` | SHA-256 hashing utility |

### Integration Tests

Integration tests use [Hurl](https://hurl.dev/) and run against a live server (started via Docker Compose).

```bash
# Start services first
docker compose up -d
./scripts/local-aws-setup.sh

# Run integration tests
npm run test:integration
```

**Integration test suites:**

| File | What it tests |
|---|---|
| `health-check.hurl` | Health endpoint |
| `post-fragments.hurl` | Fragment creation flow |
| `post-fragments-json.hurl` | JSON fragment creation |
| `post-fragments-charset.hurl` | Content-Type with charset param |
| `post-fragments-unauthenticated.hurl` | Auth enforcement |
| `post-fragments-unsupported-type.hurl` | Type rejection |
| `put-fragments.hurl` | Fragment update flow |
| `lab-9-s3.hurl` | S3 backend integration |
| `lab-10-dynamodb.hurl` | DynamoDB backend integration |

---

## CI/CD Pipeline

### Continuous Integration (`.github/workflows/ci.yaml`)

Triggered on every push and pull request to `main`:

1. **ESLint** — lints all `src/` and `tests/` JavaScript
2. **Dockerfile Lint** — lints the Dockerfile with [Hadolint](https://github.com/hadolint/hadolint)
3. **Unit Tests** — runs the full Jest suite
4. **Integration Tests** — spins up Docker Compose, sets up local AWS resources, runs Hurl tests
5. **Build & Push to Docker Hub** — builds the image and pushes three tags on success:
   - `avinavg56/fragments:sha-<commit-sha>`
   - `avinavg56/fragments:main`
   - `avinavg56/fragments:latest`

### Continuous Deployment (`.github/workflows/cd.yaml`)

Triggered when a `v*` tag is pushed (e.g. `v1.0.0`):

1. Builds and pushes the Docker image to **Amazon ECR**
2. Renders an updated ECS task definition injecting production environment variables
3. Deploys to **Amazon ECS** (`fragments-cluster`) and waits for service stability

---

## Project Structure

```
fragments/
├── .github/
│   └── workflows/
│       ├── ci.yaml              # CI pipeline
│       └── cd.yaml              # CD pipeline (AWS ECS)
├── scripts/
│   └── local-aws-setup.sh      # Creates S3 bucket & DynamoDB table locally
├── src/
│   ├── app.js                   # Express app & middleware
│   ├── server.js                # HTTP server with graceful shutdown
│   ├── index.js                 # Entry point
│   ├── hash.js                  # SHA-256 email hashing
│   ├── logger.js                # Pino logger
│   ├── response.js              # Success/error response helpers
│   ├── auth/
│   │   ├── index.js             # Selects auth strategy from env
│   │   ├── cognito.js           # AWS Cognito JWT strategy
│   │   ├── basic-auth.js        # HTTP Basic Auth (.htpasswd) strategy
│   │   └── auth-middleware.js   # Passport authenticate middleware
│   ├── model/
│   │   ├── fragment.js          # Fragment class (validation, conversion, CRUD)
│   │   └── data/
│   │       ├── index.js         # Picks memory or AWS backend
│   │       ├── memory/          # In-memory storage adapter
│   │       └── aws/
│   │           ├── index.js     # S3 + DynamoDB operations
│   │           ├── s3Client.js  # AWS S3 client setup
│   │           └── ddbDocClient.js # DynamoDB Document client setup
│   └── routes/
│       ├── index.js             # Health check + /v1 mount
│       └── api/
│           ├── index.js         # API router & raw body parser
│           ├── get.js           # GET /v1/fragments
│           ├── get-id.js        # GET /v1/fragments/:id
│           ├── get-id-info.js   # GET /v1/fragments/:id/info
│           ├── post.js          # POST /v1/fragments
│           ├── put.js           # PUT /v1/fragments/:id
│           └── delete.js        # DELETE /v1/fragments/:id
├── tests/
│   ├── .htpasswd                # Test credentials (Basic Auth)
│   ├── unit/                    # Jest unit tests
│   └── integration/             # Hurl integration tests
├── Dockerfile                   # Multi-stage Docker build (node:22-alpine)
├── docker-compose.yml           # Local stack: app + LocalStack + DynamoDB Local
├── fragments-definition.json    # ECS task definition template
├── env.jest                     # Test environment variables
├── debug.env                    # Debug environment variables
├── jest.config.js               # Jest configuration
├── eslint.config.mjs            # ESLint configuration
└── package.json
```

---

## License

This project is private and unlicensed.
