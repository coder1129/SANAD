# API core

Transport layer for the SANAD backend. Domain modules (`lib/api/modules/*`) are
built on top of it; React components never import from here directly and never
contain endpoint paths.

## Response unwrapping

The backend wraps every successful response in an envelope:

```json
{ "success": true, "data": <payload>, "message": null }
```

`api.get<Package[]>('/packages')` resolves to `Package[]` — no
`response.data.data` at the call site. Paginated endpoints put
`{ items, meta }` in `data`, so their callers use
`api.get<PaginatedData<Package>>(...)`.

Endpoints with no meaningful body (and 204 responses) resolve to `null`. A 2xx
body that is not an envelope is treated as a contract violation and throws.

Raw binary responses are not supported through `api` / `apiRequest`; use
`apiClient` directly if an endpoint ever needs them.

## Errors

Every rejection is an `ApiError`. Nothing else escapes this layer.

| Field         | Use                                                        |
| ------------- | ---------------------------------------------------------- |
| `kind`        | Failure category — branch on this, not on `status`         |
| `userMessage` | Safe to render; never carries 5xx or stack detail          |
| `message`     | Technical text for logs                                    |
| `status`      | HTTP status; absent for `network`, `timeout`, `canceled`   |
| `code`        | Backend code, e.g. `VALIDATION_ERROR`, `TOO_MANY_REQUESTS` |
| `details`     | Backend validation/detail payload, preserved as `unknown`  |
| `meta`        | `retryAfterSeconds` (429), `requestId` (`X-Request-Id`)    |

Guard with `isApiError(error)`.

`details` is intentionally `unknown`: class-validator failures currently arrive
grouped under a single `validation` key, but other error envelopes are not
guaranteed to be field-keyed. Narrowing and mapping it onto React Hook Form
fields belongs to the form phases.

The layer decides nothing about presentation: no toasts, no redirects, no
retries. A 401 is normalized and rethrown — it does not navigate to `/login`.

## Configuration

`NEXT_PUBLIC_API_BASE_URL` must be the backend base including the version
prefix (`https://backend.example.com/api/v1`). It is validated on first use;
a missing or malformed value throws with an explicit message.

## Extension points

- **Auth (Phase 7):** add the request/response interceptors to `client.ts`.
  Token attachment and refresh need no changes in `request.ts` or in callers.
- **TanStack Query (Phase 6):** pass the `queryFn` signal through as
  `{ signal }`; every helper forwards it to Axios for cancellation.
