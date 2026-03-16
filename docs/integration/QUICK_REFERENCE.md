# Quick Reference Guide - Contract-Driven Mocking

## Installation

```bash
cd teraApi/frontend
npm install
```

## Running

### Development (Mock Mode - Fastest)

```bash
npm run dev:mock
# or
npm run dev
```

**When:** UI development, offline work, testing in isolation

**Speed:** ~0ms per request (Service Worker)

### Integration Testing

```bash
npm run dev:proxy
```

**When:** Testing against real backend services

**Requires:** Backend services at localhost:8080-8091

**Speed:** ~100-500ms per request (network latency)

### Generate API Types (When Backend Changes)

```bash
npm run generate:api
```

**When:** Backend team updates OpenAPI spec

**Input:** `../teraApi/docs/openapi.json`

---

## API Endpoints (Mocked)

### Authentication

```
POST   /api/auth/login       → LoginResponse (200, 401, 429)
POST   /api/auth/refresh     → TokenResponse (200)
GET    /api/auth/logout      → success (200)
```

### Cameras

```
GET    /api/cameras          → CameraFull[] (paginated, 200)
GET    /api/cameras/:id      → CameraFull (200)
POST   /api/cameras          → CameraFull (201)
PATCH  /api/cameras/:id      → CameraFull (200)
DELETE /api/cameras/:id      → (204)
```

### Detections

```
GET    /api/detections       → DetectionEvent[] (200)
GET    /api/detections/:id   → DetectionEvent (200)
```

**Query Params:** `cameraId`, `limit`, `offset`

### Analytics

```
GET    /api/analytics/summary     → AnalyticsSummary (200)
GET    /api/analytics/timeseries  → AnalyticsTimeSeries[] (200)
```

---

## Edge-Case Testing

Add `x-test-scenario` header to trigger error responses:

```javascript
// 401 Unauthorized
fetch('/api/auth/login', {
  headers: { 'x-test-scenario': 'invalid-credentials' }
})

// 403 Forbidden
fetch('/api/cameras', {
  headers: { 'x-test-scenario': 'forbidden' }
})

// 429 Rate Limited
fetch('/api/auth/login', {
  headers: { 'x-test-scenario': 'rate-limit' }
})

// 500 Server Error
fetch('/api/detections', {
  headers: { 'x-test-scenario': 'server-error' }
})

// 408 Request Timeout
fetch('/api/analytics/summary', {
  headers: { 'x-test-scenario': 'timeout' }
})
```

---

## File Locations

| What | Where |
| --- | --- |
| MSW Setup | `src/mocks/browser.ts` |
| Handlers | `src/mocks/handlers.ts` |
| Types | `src/contracts/api.d.ts` |
| Bootstrap | `src/main.tsx` |
| Config | `vite.config.ts` |
| Main Guide | `MOCK_DRIVEN_TESTING.md` |
| Dev Guide | `src/mocks/README.md` |

---

## Environment Variables

```bash
# Mock mode (default for dev)
VITE_API_MODE=mock

# Proxy to real backend
VITE_API_MODE=proxy

# Production (omit or undefined)
# VITE_API_MODE=<undefined>
```

---

## Debugging

### Check Active Mode

```javascript
window.__YO3_DEBUG__.apiMode  // "mock" | "proxy" | "real"
```

### MSW Logs

Browser console shows all intercepted requests:

```
[MSW] ✓ POST /api/auth/login 200
[MSW] ✓ GET /api/cameras 200
```

### DevTools Network Tab

Look for `[MSW]` badge next to request URL = mocked

---

## Adding New Endpoint

1. **Update `src/contracts/api.d.ts`:**
```typescript
export interface MyResourceResponse { ... }
```

2. **Add handler to `src/mocks/handlers.ts`:**
```typescript
http.get('*/api/resources', () => {
  return HttpResponse.json(data, { status: 200 });
})
```

3. **Export handler:**
```typescript
export const handlers = [
  ...myResourceHandlers,  // ← Add here
];
```

See `src/mocks/README.md` for step-by-step guide.

---

## Tips

✅ **Do:**

* Use `npm run dev:mock` for UI development (fastest)
* Use `npm run dev:proxy` when testing API integration
* Test edge cases with `x-test-scenario` headers
* Update handlers when backend changes
* Keep OpenAPI spec in sync

❌ **Don't:**

* Hardcode API URLs (use `/api/` paths)
* Mix mock data and real API calls
* Forget to run `npm run generate:api` after backend changes
* Use `VITE_API_MODE=mock` in production (it's ignored)
* Manually edit auto-generated types (they'll be overwritten)

---

## Troubleshooting

| Problem | Solution |
| --- | --- |
| **API calls still hit real backend** | Check: `VITE_API_MODE=mock`, restart dev server |
| **MSW not working** | Browser console > check for `[MSW]` logs, F12 DevTools |
| **404 on endpoint** | Handler URL pattern probably wrong, check `*/` prefix |
| **Stale mock data** | Handlers use timestamps, but clear browser cache: `Ctrl+Shift+Del` |
| **CORS errors in proxy mode** | Backend CORS config is wrong, test in real backend |
| **Can't find type definition** | Run `npm run generate:api` from `../teraApi/docs/openapi.json` |

---

## Performance

* **Mock Mode:** <1ms per request (Service Worker)
* **Proxy Mode:** ~100-500ms per request (network)
* **MSW Size:** ~50KB (gzipped)
* **Zero Production Overhead:** MSW only loads in development

---

## Environment Startup Logs

```
═══════════════════════════════════════════════════════════════
🔧 YO3 Platform Frontend Configuration
═══════════════════════════════════════════════════════════════
📍 Environment: development
🗂️  Base URL: /

🌐 API Mode Configuration:
   Current: 🎭 MOCK (or 🔀 PROXY, or 🔴 REAL)
   ...messages about current mode...
═══════════════════════════════════════════════════════════════
```

---

## Quick Commands

```bash
# Development (mock)
npm run dev

# Integration testing (proxy)
npm run dev:proxy

# Regenerate types
npm run generate:api

# Run tests
npm run test

# Build for production
npm run build
```

---

## Links

* 📖 **Full Guide:** `MOCK_DRIVEN_TESTING.md`
* 🛠️ **Handler Development:** `src/mocks/README.md`
* 🔗 **MSW Docs:** https://mswjs.io
* 📋 **OpenAPI Spec:** `../teraApi/docs/openapi.json`
