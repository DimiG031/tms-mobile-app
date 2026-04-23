# TMS Mobile App (Driver)

React Native + Expo Router mobile client for drivers, designed to consume the existing TMS REST API.

## Quick start

1. Copy `.env.example` to `.env` and set `EXPO_PUBLIC_API_URL`.
2. Install dependencies: `npm install`
3. Start app: `npm run start`

## Implemented foundation

- Expo Router route groups: `(auth)` and `(driver)`
- SecureStore-based auth session
- Mobile login and refresh token flow integration points
- Driver-only guard (`driverId` required)
- React Query + AsyncStorage persistence baseline
- Dashboard/tours/notifications/profile query hooks
- API response normalizers (`data[]` and `data.items[]`)
- Notifications list + mark-as-read mutation
- Tour status transition actions wired to backend
- Background GPS tracking task (`expo-location` + `expo-task-manager`)
- Auto-start GPS on `IN_TRANSIT` and auto-stop on `COMPLETED` / logout
- Expense sheet flow: create, add/edit/delete items, grouped list, totals, submit
- Documents flow: list + create + image upload (camera/gallery)
- Push notifications client setup: Expo token registration + notification tap routing
- Offline write queue (AsyncStorage) for GPS logs and expense/document metadata writes

## Auth mode

This mobile client currently uses JWT endpoints:

- `POST /api/auth/mobile-login`
- `POST /api/auth/mobile-refresh`

If your current backend does not expose these routes yet, login will fail until they are added (planned for your separate backend implementation project).

## Offline notes

- Queued when offline: `POST/PATCH/DELETE` writes made through `api.postQueued/patchQueued/deleteQueued`.
- Current usage: GPS logs, expense sheet writes, and document metadata writes.
- Queue flush runs periodically while authenticated (every 20s) and after successful queued-capable writes.
- Binary upload itself (file/image bytes) still requires network at capture time.

## Next implementation steps

- Add hard offline queue for binary uploads (deferred file upload + metadata submit)
- Add user-facing sync status badge for queued operations
- Optional: add strict `expo-camera` custom camera screen (currently image-picker camera is used)
- Finalize backend endpoint `POST /api/users/{id}/push-token` and enable production push flow
