# YO3 Platform Frontend Architectural Consolidation

This document details the approved architectural changes as of 2026-04-01, following the "Frontend Development Directives".

## Core Directives

### 1. Centralized Ingress & Axios Unification
- **Target**: Eradication of localized `fetch` instances and direct `localStorage` token lookups.
- **Implementation**: Creation of a central `apiClient.ts` Axios singleton configured to the API Gateway (`http://localhost:8091`).
- **Enforcement**: Mandatory request interceptors for Bearer token injection.

### 2. Transport Protocol Replacement (STOMP)
- **Target**: Elimination of SSE polling race conditions and custom WebSocket management.
- **Implementation**: Migration to `@stomp/stompjs` managed via `useWebSocketStore`.
- **Ingress**: All telemetry bound strictly to the STOMP connection.

### 3. Anti-Corruption Layer (ACL)
- **Target**: Isolation of React domain from backend DTOs.
- **Implementation**: Structural mappers in `src/infrastructure/api/mappers/`.
- **Mapping**: JSONB projection `{x, y, width, height}` -> Mathematically continuous tuple `[x, y, w, h]`.

---

## Technical Debt Eradication
- Removal of hardcoded ports (8083, 8084, 9090) in service files.
- Consolidation of auth headers.
- Standardization of error handling across the gateway.

## Implementation Tasks

1. **Infrastructure Init**: `apiClient.ts`, `telemetryMapper.ts`.
2. **Transport Migration**: `useWebSocketStore.ts`, `DetectionEventService.ts`.
3. **Service Refactoring**: `api.ts`, `CameraService.ts`.
4. **Validation**: Canvas telemetry rendering check and network flow inspection.
