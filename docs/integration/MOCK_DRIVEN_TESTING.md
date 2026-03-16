# Contract-Driven Deterministic Mocking Protocol

## Overview

The yO3 Platform frontend implements a **Contract-Driven Deterministic Mocking Protocol** that achieves **100% integration readiness without backend runtime dependencies**.

### Key Achievements

- **Decoupled Development:** Frontend UI development proceeds independently of backend microservices
- **Deterministic Testing:** O(1) execution time per test (no network latency, no state mutation)
- **Contract Compliance:** Mock API handlers are auto-generated from OpenAPI 3.0.3 specification
- **Network-Level Interception:** Mock Service Worker (MSW) intercepts fetch/XHR at the Service Worker level
- **Hot-Swappable Environments:** Instant switching between mock, proxy, and production modes via VITE_API_MODE
- **Edge-Case Coverage:** Built-in error scenarios (401, 403, 429, 500) for resilience testing

---

## Architecture

### Three Operational Modes

| Mode | Environment | Use Case | Speed |
|------|-------------|----------|-------|
| **mock** | `npm run dev:mock` | Development, offline testing, CI/CD | ~0ms (service worker) |
| **proxy** | `npm run dev:proxy` | Integration testing, live backend | ~100-500ms (network) |
| **real** | `npm run dev` | Production, external APIs | Depends on backend |

### Tech Stack

- **Mock Service Worker (MSW):** Browser-level HTTP interception
- **OpenAPI 3.0.3:** Source of truth for API contracts
- **TypeScript:** Auto-generated type definitions (optional)
- **Vite:** Environment variable injection for mode switching

### Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Browser React Application                                   │
│ (Identical code paths regardless of API mode)               │
└─────────────────────────┬───────────────────────────────────┘
│
fetch/XHR
│
┌────────────────┼────────────────┐
│                │                │
┌────▼─────┐    ┌─────▼──────┐   ┌───▼──────┐
│    MSW    │    │   Proxy    │   │  Bypass  │
│ Browser   │    │   Vite Dev │   │ (Outside │
│ Service   │    │   Server   │   │  Vite)   │
│ Worker    │    │            │   │          │
└────┬─────┘    └─────┬──────┘   └───┬──────┘
│                │               │
┌────▼─────┐    ┌─────▼──────┐   ┌───▼──────────┐
│   Mock Handlers (deterministic)   │ Real Backend │
│   • Cameras                       │ • Auth       │
│   • Detections                    │ • Cameras    │
│   • Analytics                     │ • Detections │
└────────────────────────────────────┘ • Analytics  │
│            │
└────────────┘
VITE_API_MODE environment variable controls the path
```

---

## Quick Start

### 1. Install Dependencies

```bash
cd teraApi/frontend
npm install
```

This installs:

* `msw` (v2.0.0+) - Mock Service Worker
* `@openapitools/openapi-generator-cli` - For auto-generating types

### 2. Run in Mock Mode (Default)

```bash
npm run dev:mock
# or simply
npm run dev
```

Output:

```
═══════════════════════════════════════════════════════════════
🔧 YO3 Platform Frontend Configuration
═══════════════════════════════════════════════════════════════
📍 Environment: development
🗂️  Base URL: /

🌐 API Mode Configuration:
   Current: 🎭 MOCK
   ✓ Using Mock Service Worker (MSW)
   ✓ All API calls intercepted by browser Service Worker
   ✓ Contract-driven deterministic Testing
   ✓ No backend dependencies required

   For live backend testing:
   → npm run dev:proxy
═══════════════════════════════════════════════════════════════
```

Browser console:

```
[MSW] ✓ Mock Service Worker initialized
[MSW] API requests are being intercepted and mocked
[MSW] To test real API: npm run dev:proxy
```

### 3. Test Integration with Real Backend

```bash
npm run dev:proxy
```

This activates Vite's proxy configuration, forwarding requests to:

* **Auth Service:** `http://localhost:8081`
* **Stream Service:** `http://localhost:8080`
* **Video Service:** `http://localhost:8082`
* **Events Service:** `http://localhost:8091`

Ensure backend microservices are running before using proxy mode.

---

## MSW Handler Architecture

All handlers are located in `src/mocks/handlers.ts` and organized by domain:

### Authentication Handlers

```typescript
// POST /api/auth/login
// Success (200): Returns JWT + user info
// Failure (401): Invalid credentials
// Edge case (429): Rate limit exceeded
```

**Test scenario:** Add header `x-test-scenario: invalid-credentials`

### Camera Handlers

```typescript
// GET /api/cameras - Paginated list
// GET /api/cameras/:id - Single camera
// POST /api/cameras - Create camera
// PATCH /api/cameras/:id - Update camera
// DELETE /api/cameras/:id - Delete camera
```

All handlers support contract-compliant pagination with `CameraFull[]` response type.

### Detection Event Handlers

```typescript
// GET /api/detections - Paginated detections with filtering
// GET /api/detections/:id - Single event
```

Supports filter parameters:

* `cameraId` - Filter by camera
* `limit` - Results per page (default 20)
* `offset` - Pagination offset

### Analytics Handlers

```typescript
// GET /api/analytics/summary - Aggregated stats
// GET /api/analytics/timeseries - Historic trend data
```

---

## Edge-Case Testing

The protocol includes built-in edge-case handlers for validating frontend error resilience.

### Trigger via x-test-scenario Header

```typescript
// Example: Trigger 403 Forbidden
fetch('/api/cameras', {
  headers: {
    'x-test-scenario': 'forbidden'
  }
});
// Response: 403 Forbidden with ApiErrorResponse

// Example: Trigger 500 Server Error
fetch('/api/detections', {
  headers: {
    'x-test-scenario': 'server-error'
  }
});
// Response: 500 Internal Server Error

// Example: Trigger Request Timeout
fetch('/api/analytics/summary', {
  headers: {
    'x-test-scenario': 'timeout'
  }
});
// Response: 408 Request Timeout
```

### Debug in Browser Console

```javascript
// Access debug utilities set up in window.__YO3_DEBUG__
window.__YO3_DEBUG__.apiMode // "mock" | "proxy" | "real"

// Manually test edge cases
fetch('/api/cameras', {
  headers: { 'x-test-scenario': 'server-error' }
}).then(r => r.json()).then(console.log);
```

---

## OpenAPI Type Generation

### Prerequisites

Ensure the backend OpenAPI specification is available at:

```
../teraApi/docs/openapi.json
```

### Generate TypeScript Interfaces

```bash
npm run generate:api
```

This generates:

* Fully typed request/response interfaces
* Client SDK (optional)
* Output directory: `src/contracts/api/`

### Using Generated Types

```typescript
import { LoginRequest, LoginResponse } from '@/contracts/api';

const loginPayload: LoginRequest = {
  username: 'admin',
  password: 'secret'
};

const response: LoginResponse = await fetch('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify(loginPayload),
}).then(r => r.json());
```

---

## Vite Configuration Details

### Environment Variables

| Variable | Values | Purpose |
| --- | --- | --- |
| `VITE_API_MODE` | `mock`, `proxy`, undefined | Controls request routing |
| `VITE_BASE` | `/`, `/yO3-platform/` | Asset base path |
| `VITE_ENV` | `development`, `staging`, `production` | Environment context |

### Set Environment Variables

**Linux/macOS:**

```bash
export VITE_API_MODE=mock
npm run dev
```

**Windows (PowerShell):**

```powershell
$env:VITE_API_MODE='mock'
npm run dev
```

**Windows (CMD):**

```cmd
set VITE_API_MODE=mock
npm run dev
```

### Vite Config Logic

```typescript
// src/mocks/browser.ts is imported ONLY when:
if (import.meta.env.VITE_API_MODE === 'mock') {
  const { initializeMockServiceWorker } = await import('./mocks/browser');
  await initializeMockServiceWorker();
}

// Proxy configuration is applied ONLY when:
proxy: useProxyForwarding ? { /* proxy rules */ } : undefined
// where useProxyForwarding = (apiMode === 'proxy' && isDev)
```

---

## Trade-offs & Limitations

| Trade-off | Impact | Mitigation |
| --- | --- | --- |
| **Mock Maintenance vs. Drift** | MSW handlers must match OpenAPI spec | Automated OpenAPI schema validation in CI/CD |
| **Server-Sent Events (SSE)** | Complex backpressure simulation | Use websocket simulation library for advanced scenarios |
| **CORS Validation** | Client-side mocking bypasses `OPTIONS` preflight | Integration testing with `npm run dev:proxy` catches CORS |
| **Large Payloads** | No real network latency for stress testing | Use load test tools (Artillery, k6) for production validation |

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Frontend

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci --prefix teraApi/frontend
      
      - name: Run frontend tests (MSW mocked)
        run: npm run test:ci --prefix teraApi/frontend
        env:
          VITE_API_MODE: mock
      
      - name: Build for production
        run: npm run build --prefix teraApi/frontend
```

---

## Debugging

### Inspect MSW Activity

Browser DevTools → Network tab shows all MSW-intercepted requests:

```
Method Status URL                        Size  Time
POST   200    http://localhost:5173/api/auth/login
       (msw) [Mock Service Worker]
GET    200    http://localhost:5173/api/cameras
       (msw) [Mock Service Worker]
```

### Console Logging

```javascript
// MSW logs handler matches when quiet: false
[MSW] ✓ POST /api/auth/login 200
[MSW] ✓ GET /api/cameras 200

// Application logs API mode
SYSTEM: {
  environment: "development",
  apiMode: "mock"
}
```

### Disable MSW Temporarily

```bash
# Bypass MSW and proxy to real backend
VITE_API_MODE=proxy npm run dev
```

---

## Best Practices

1. **Always commit updated OpenAPI schemas**
* MSW handlers depend on spec accuracy
* Run `npm run generate:api` when backend contracts change

2. **Test edge cases in mock mode first**
* Ensures frontend error handling works before integration
* Faster feedback loop (no backend latency)

3. **Use proxy mode for integration testing**
* Validates CORS, auth, and actual backend behavior
* Identify real infrastructure issues early

4. **Verify contract parity**
* Run MSW handlers against OpenAPI schema validator
* Detect drift between mock and real API

5. **Document test scenarios in headers**
* Use `x-test-scenario` headers consistently
* Makes test intent explicit for future maintainers

---

## Troubleshooting

### "Service Worker registration failed"

**Cause:** HTTPS required for production Service Workers
**Solution:** Use `https://` in production, or check browser console for details

```javascript
// Browser console (DevTools)
[MSW] Service Worker registration failed
// Check the Network tab for failed `mockServiceWorker.js` requests
```

### "MSW not intercepting requests"

**Cause:** Handler not matching request URL
**Solution:** Verify URL pattern in handler

```typescript
// ❌ Wrong (too specific)
http.get('http://localhost:5173/api/cameras', () => { ... })

// ✓ Correct (wildcard hostname)
http.get('*/api/cameras', () => { ... })
```

### "API calls still hitting the real backend"

**Cause:** `VITE_API_MODE` not set to `mock`
**Solution:** Restart dev server

```bash
npm run dev:mock  # Explicitly set mock mode
```

### "Stale mock data in tests"

**Cause:** MSW handlers have static mock data
**Solution:** Generate fresh mock data in handlers using timestamps

```typescript
function generateMockCamera(id: string, index: number): CameraFull {
  return {
    id,
    createdAt: new Date(Date.now() - 86400000 * (index + 1)).toISOString(),
    // Use relative timestamps, not hardcoded dates
  };
}
```

---

## References

* [Mock Service Worker Documentation](https://mswjs.io/)
* [OpenAPI 3.0.3 Specification](https://spec.openapis.org/oas/v3.0.3)
* [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
* [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

## Summary

This contract-driven mocking protocol ensures:

✅ **100% Integration Readiness** - Frontend is always ready for backend without stalling

✅ **Deterministic Testing** - O(1) execution time, no network jitter

✅ **Contract Compliance** - Mock handlers match OpenAPI specification exactly

✅ **Developer Agility** - Hot-swap between mock/proxy/real with one env variable

✅ **Error Resilience** - Built-in edge-case testing for 401, 403, 429, 500

✅ **CORS Confidence** - Integration tests validate real CORS configuration

Recommended workflow:

1. **Develop locally:** `npm run dev:mock` (instant feedback, no dependencies)
2. **Test integration:** `npm run dev:proxy` (validates against running backend)
3. **Deploy to production:** API requests go directly to production gateway
