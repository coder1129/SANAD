# SANAD Frontend

Next.js frontend for the SANAD career-services platform.

The application supports any Node.js or Docker host; it is not tied to a specific provider. See [`../DEPLOYMENT.md`](../DEPLOYMENT.md) for the complete self-hosting flow.

## Local development

Keep `.env.local` pointed at the local API, then run:

```bash
npm install
npm run dev
```

The frontend starts at `http://localhost:3000`. The local API normally runs at `http://localhost:3001/api/v1`.

## Production

The production image uses the Next.js `standalone` output and runs as a non-root user. Build it through the root Compose file or directly from this directory.

For a direct Node.js deployment, run `npm run build` and then start the generated server with `HOSTNAME=0.0.0.0 PORT=3000 npm start`.

Required public build variables are documented in [`.env.production.example`](./.env.production.example):

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_MEDIA_BASE_URL`
- `NEXT_PUBLIC_CHECKOUT_MODE` (`manual` hides the online payment route; `gateway` restores it)

Every public URL must use HTTPS outside localhost. The API URL must include `/api/v1`.

`NEXT_PUBLIC_*` values are embedded during `npm run build`, so rebuild the image after changing them.

## Verification

```bash
npm run lint
npm run test
npm run build
npm audit --omit=dev
```
