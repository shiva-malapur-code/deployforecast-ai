# DeployForecast AI

DeployForecast AI is an AI Engineering Forecast workflow that turns source-code signals into a structured, time-based view of likely production risks and preventive actions.

**Live demo:** [https://deployforecast-ai.netlify.app/](https://https://deployforecast-ai.netlify.app/)

## Product workflow

- Detects code-specific reliability, performance, accessibility, security, and maintainability signals
- Converts signals into calibrated now, 7-day, 30-day, and 90-day risks
- Runs custom “what-if” deployment scenarios such as traffic growth or dependency latency
- Links every risk to evidence, potential impact, confidence, and a preventive action
- Filters the forecast by category and timeline
- Downloads a complete Markdown engineering report

## Quick start

Requirements: Node.js 20+ and npm 10+.

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
npm run dev
```

Open `http://localhost:5173`. The Vite development server proxies `/api` requests to Express on port `4000`.

## Workspace

- `client` — React, TypeScript, Vite, Tailwind CSS and shadcn-style UI primitives
- `server` — Express API, validation, provider abstraction and forecast service
- `shared` — framework-independent forecast types shared by both apps

## AI providers

The API defaults to `mock`, so the complete interface works without a model or API key. To use local Ollama, set `AI_PROVIDER=ollama`, start Ollama, and configure `OLLAMA_MODEL` in `server/.env`.

```bash
ollama serve
ollama pull qwen2.5-coder:7b
```

The provider interface keeps model-specific behavior out of routes and product logic.

The hosted demo uses a deterministic public-demo provider so the workflow remains available without exposing credentials. Local development retains the Express-based Ollama integration for real model responses.

## Commands

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm run format:check
```
