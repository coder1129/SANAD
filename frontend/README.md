# SANAD Frontend

Next.js frontend for the SANAD career-services platform.

For the full Railway + Vercel deployment flow, see
[`../DEPLOYMENT.md`](../DEPLOYMENT.md).

## Local development

Keep the existing `.env.local` values pointed at the local backend, then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The SANAD backend API runs
separately on `http://localhost:3001/api/v1`.

## Deploy on Vercel

1. Import the repository into Vercel.
2. Set the project **Root Directory** to `frontend`.
3. Keep the detected framework as **Next.js**. No custom build command is
   required.
4. In **Settings > Environment Variables**, add the keys documented in
   [`.env.production.example`](./.env.production.example) for both Preview and
   Production, using the real public frontend, API, and media URLs.
5. Deploy the backend first, then set `NEXT_PUBLIC_API_BASE_URL` to its HTTPS URL
   including `/api/v1`.
6. Add the final Vercel domain to the backend `FRONTEND_URL` and
   `CORS_ORIGINS` settings before testing the packages pages.
7. Redeploy after changing any `NEXT_PUBLIC_*` value because Next.js embeds
   these values during the build.

Do not copy `.env.local` to Vercel: its `localhost` URLs are intentionally only
for local development. The `.vercel` directory also remains ignored because it
contains machine-specific project-linking state.

## Verification

Run these checks before deployment:

```bash
npm run lint
npm run build
```
