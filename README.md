# Fragments

A lightweight REST API microservice for storing and retrieving fragments of data (text, JSON, images, and more), with built-in type conversion and AWS cloud support.

## Overview

Fragments is a cloud-native microservice that allows authenticated users to store, manage, and retrieve arbitrary pieces of data called "fragments". Each fragment can be any supported content type — plain text, Markdown, HTML, CSV, JSON, YAML, or images (PNG, JPEG, WebP, GIF, AVIF).

What makes Fragments useful is its on-the-fly type conversion. For example, you can store a fragment as Markdown and retrieve it as rendered HTML, or store an image as PNG and get it back as JPEG — all through the same API without any extra tooling.

The service is designed to be storage-agnostic. In development it runs entirely in memory with no external dependencies. In production it connects to AWS S3 (for raw fragment data) and DynamoDB (for metadata), and authenticates users via AWS Cognito JWT tokens. This makes it easy to develop and test locally, then deploy to the cloud without changing any application code.

Authentication is enforced on all data routes. Every fragment is scoped to its owner, so users can only access their own data.

## Getting Started

### Prerequisites

- Node.js v22+
- npm v10+
- Docker & Docker Compose (optional, for local AWS emulation)

### Installation

```bash
git clone https://github.com/avinav456/fragments.git
cd fragments
npm install
```

### Configuration

Create a `.env` file in the project root:

```env
PORT=8080
LOG_LEVEL=debug
API_URL=http://localhost:8080

# Local dev auth (pick one)
HTTPASSWD_FILE=tests/.htpasswd

# OR production auth
# AWS_COGNITO_POOL_ID=your-pool-id
# AWS_COGNITO_CLIENT_ID=your-client-id
```

### Running

```bash
# Development (auto-reload)
npm run dev

# Production
npm start

# With Docker Compose (includes local S3 + DynamoDB)
docker compose up --build
```

The API will be available at `http://localhost:8080`.

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start the server |
| `npm run dev` | Start with auto-reload |
| `npm test` | Run unit tests |
| `npm run coverage` | Run tests with coverage |
| `npm run lint` | Run ESLint |
| `npm run test:integration` | Run integration tests |

## Project Structure

```
fragments/
├── src/
│   ├── app.js              # Express app & middleware
│   ├── index.js            # Entry point
│   ├── server.js           # Server with graceful shutdown
│   ├── auth/               # Authentication strategies (Cognito / Basic Auth)
│   ├── model/
│   │   ├── fragment.js     # Fragment class & type conversion logic
│   │   └── data/
│   │       ├── memory/     # In-memory storage (dev/test)
│   │       └── aws/        # S3 + DynamoDB storage (production)
│   └── routes/
│       └── api/            # Route handlers (GET, POST, PUT, DELETE)
├── tests/
│   ├── unit/               # Jest unit tests
│   └── integration/        # Hurl integration tests
├── Dockerfile
├── docker-compose.yml
└── package.json
```


