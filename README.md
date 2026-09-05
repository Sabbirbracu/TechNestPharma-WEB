# TechNest Pharma ERP — Web

The browser application for TechNest Pharma's pharmaceutical sourcing ERP. It
works with the FastAPI backend in `../backend` to manage products, suppliers,
offers, tenders, sourcing work, documents, imports, enquiries, and tender
notices.

## Technology

- Next.js 16, React 19, TypeScript, and Tailwind CSS 4
- TanStack Query for server-state management
- React Hook Form and Zod for forms and validation
- A FastAPI, SQLAlchemy, and PostgreSQL API in the sibling `../backend`
  directory

## Local development

### 1. Start the backend

Follow the setup in [the backend README](../backend/README.md). The backend
normally runs at `http://localhost:8000`, with API documentation at
`http://localhost:8000/docs`.

### 2. Configure the web app

```bash
cp .env.local.example .env.local
```

For a local backend, set the API URL in `.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

For the deployed backend, use the proxy configuration already documented in
`.env.local.example`. Do not commit `.env.local`.

### 3. Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You must sign in before
opening the main application; the backend seed command prints local owner
credentials.

## Commands

```bash
npm run dev     # development server
npm run lint    # ESLint
npm run build   # production build
npm run start   # serve a production build
```

## Project layout

```text
src/
  app/          Routes: public pages and authenticated ERP screens
  components/   Feature components and shared UI
  lib/          API client, query hooks, and utilities
  types/        API and domain TypeScript types
  config/       Client configuration
```

Authenticated screens live under `src/app/(app)`. The shared application shell
enforces authentication and a forced password change for temporary passwords.

## Main areas

- Dashboard, global search, and inbox/notifications
- Companies, contacts, products, offers, samples, and documents
- Tenders, sourcing requests, supplier enquiries, and mailbox settings
- Import workflows for spreadsheet and OCR-assisted product data
- Tender-notice monitoring, document extraction, and site/document cross-checks
- Administration, activity history, users, and account settings

## UI guidelines

Use the existing tokens and components before introducing one-off styling.

- Brand colours: navy `#003B78` and medical green `#158B45`
- Default spacing: 16–28px between related groups
- Prefer rounded, restrained surfaces with clear contrast and visible focus
  states
- Use responsive layouts and keep interactive targets comfortably tappable
- Use motion sparingly: short transitions for feedback, not decoration

The source of truth for active styles is the codebase, especially the global
styles and shared UI components. The old design-transformation notes were
intentionally consolidated into this document.

## Troubleshooting

### The app shows no products or says “Not authenticated”

This normally means the user has not signed in, the backend is not running, or
the API URL is incorrect.

1. Confirm the backend health endpoint responds: `http://localhost:8000/health`.
2. Sign in through the app using a valid backend user.
3. Check `NEXT_PUBLIC_API_BASE_URL` in `.env.local` and restart `npm run dev`
   after changing it.
4. If the API works directly but the browser blocks it, check the backend
   `CORS_ORIGINS` setting includes `http://localhost:3000`.

## Guidance for coding agents

Keep both `AGENTS.md` and `CLAUDE.md`.

`AGENTS.md` contains important instructions for the installed Next.js version.
`CLAUDE.md` forwards Claude Code to those same instructions. Neither file is
part of the running application or exposed to users.
