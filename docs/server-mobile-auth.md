# Server Integration Blueprint (Next.js 15 + Prisma)

This file defines the backend changes needed for the mobile app.

## 1) New auth routes

- `POST /api/auth/mobile-login`
- `POST /api/auth/mobile-refresh`

### JWT payload

```ts
{
  sub: userId,
  companyId,
  role,
  driverId
}
```

### Login flow

1. Validate body with `zod`: `email`, `password`.
2. Find user by email in Prisma.
3. Verify password hash.
4. Ensure tenant/company access is valid.
5. Issue short token (30 days) and refresh token (90 days, rotation enabled).
6. Persist refresh token hash + expiry in DB.
7. Return:

```json
{
  "ok": true,
  "data": {
    "token": "jwt",
    "refreshToken": "opaque-or-jwt",
    "user": {
      "id": "u_123",
      "name": "Driver Name",
      "email": "driver@example.com",
      "role": "DRIVER",
      "companyId": "c_123",
      "driverId": "d_123"
    }
  }
}
```

### Refresh flow

1. Validate incoming refresh token.
2. Check DB hash + expiry + revoked flag.
3. Revoke old refresh token.
4. Issue new access token and new refresh token (rotation).
5. Persist new refresh token hash.
6. Return new access token (and optionally new refresh token).

## 2) Dual auth support on API routes

On protected API routes, resolve user from:

1. NextAuth session cookie (web), else
2. `Authorization: Bearer <jwt>` (mobile)

Recommended helper:

`getApiAuthContext(req) => { userId, companyId, role, driverId, source: "session" | "bearer" }`

Use it in route guards so current web behavior stays unchanged.

## 3) Push token registration route

Add:

- `POST /api/users/{userId}/push-token`

Body:

```json
{
  "expoPushToken": "ExponentPushToken[...]",
  "platform": "ios"
}
```

Rules:

- Auth user must match `userId` or be admin.
- Upsert by `(userId, expoPushToken)`.
- Track `lastSeenAt` for token cleanup.

## 4) Security checklist

- Never store raw refresh tokens in DB. Store hash.
- Rotate refresh token on every refresh.
- Revoke token family on suspicious activity.
- Add rate limit to `/api/auth/mobile-login` and `/api/auth/mobile-refresh`.
- Keep JWT signing key separate from NextAuth secret.

## 5) Suggested Prisma model for refresh tokens

```prisma
model MobileRefreshToken {
  id           String   @id @default(cuid())
  userId       String
  tokenHash    String   @unique
  expiresAt    DateTime
  revokedAt    DateTime?
  replacedById String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, expiresAt])
}
```

