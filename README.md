# Ancestree — Frontend

Main web app for [Ancestree](https://knownyourancestry.com) — build, visualise, and share your family graph.

| Environment | URL |
|---|---|
| Production | `https://knownyourancestry.com` |
| Dev (Vercel preview) | `https://dev.knownyourancestry.com` |

## Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Canvas | @xyflow/react v12 (React Flow) |
| Animation | framer-motion |
| State | Zustand |
| Data fetching | TanStack Query v5 |
| Icons | @tabler/icons-react |
| Fonts | Inter + Fraunces (next/font/google) |
| Deploy | **Vercel** (`vercel.json`) |

## Local development

```bash
npm install
npm run dev    # http://localhost:3000
```

No `.env` file is needed for local dev — the API client falls back to `http://localhost:4000` automatically. If you're pointing at a remote API:

```env
# .env.local  (gitignored)
NEXT_PUBLIC_API_URL=https://dev.api.knownyourancestry.com
NEXT_PUBLIC_FAMILYGRAPH_URL=https://3d.knownyourancestry.com
```

## Build

```bash
npm run build    # next build — also runs TypeScript check
npm start        # next start (requires a built output)
```

---

## Deploy to Vercel

### Production (branch: `main`)

1. Vercel → **Add New Project** → import `Dipu2552003/Ancestree-frontend`
2. Framework preset: **Next.js** (auto-detected via `vercel.json`)
3. Set **Production** environment variables:
   - `NEXT_PUBLIC_API_URL` → `https://api.knownyourancestry.com`
   - `NEXT_PUBLIC_FAMILYGRAPH_URL` → `https://3d.knownyourancestry.com`
4. Deploy from branch `main`
5. Project → Settings → Domains → add `knownyourancestry.com`
   - Vercel will prompt you to add a CNAME/A record at your DNS registrar

### Dev (branch: `dev`)

Vercel automatically builds all branches as **Preview deployments** — no extra setup needed. To give the `dev` branch a stable custom domain:

1. Project → Settings → Domains → add `dev.knownyourancestry.com`
2. Assign it to branch `dev`
3. Set **Preview** environment variables (scope: `dev` branch or all previews):
   - `NEXT_PUBLIC_API_URL` → `https://dev.api.knownyourancestry.com`
   - `NEXT_PUBLIC_FAMILYGRAPH_URL` → `https://3d.knownyourancestry.com`

---

## Environment variable reference

| Variable | Local | Vercel prod | Vercel dev preview |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | *(falls back to `http://localhost:4000`)* | `https://api.knownyourancestry.com` | `https://dev.api.knownyourancestry.com` |
| `NEXT_PUBLIC_FAMILYGRAPH_URL` | *(falls back to `http://localhost:5173`)* | `https://3d.knownyourancestry.com` | `https://3d.knownyourancestry.com` |

`NEXT_PUBLIC_*` vars are baked into the client bundle at build time — a redeploy is required to change them.

---

## Branch → environment mapping

| Branch | Deploys to | API |
|---|---|---|
| `main` | `knownyourancestry.com` | `api.knownyourancestry.com` |
| `dev` | `dev.knownyourancestry.com` | `dev.api.knownyourancestry.com` |

Workflow: feature branches off `dev` → merge to `dev` (test on dev URL) → merge to `main` (auto-deploys to prod).
