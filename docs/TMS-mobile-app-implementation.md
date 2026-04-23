# TMS Mobile App Implementation

## 1) Projekat i stack

- Projekat: `C:\Users\goran\Documents\TMS-mobile-app`
- Framework: React Native + Expo + Expo Router (file-based)
- Jezik: TypeScript (`strict`)
- Data: `@tanstack/react-query`
- Cache persist: `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister`
- Auth storage: `expo-secure-store`
- Offline queue: `src/lib/offline-queue.ts`
- GPS background: `expo-location` + `expo-task-manager`
- Push: `expo-notifications`
- Upload: `/api/upload/presign` + `POST /api/documents`

## 2) Status faza

- Faza 1: zavrsena
- Faza 2: zavrsena
- Faza 3: zavrsena
- Faza 4: zavrsena
- Faza 5: implementirana (offline polish + EAS setup)
- Faza 6: implementirana (Chat / Messenger MVP)

## 3) Faze 1-4 (rezime)

### Faza 1 - Auth + navigacija

- JWT mobile login + refresh
- Session u SecureStore
- Auto refresh tokena na 401
- Biometrijsko otkljucavanje
- Driver/SUPERADMIN guard
- Tab navigacija: `Pocetna`, `Ture`, `Poruke`, `Obavestenja`, `Profil`

### Faza 2 - Status ture + GPS

- Status tranzicije ture (`PLANNED -> CONFIRMED -> IN_TRANSIT -> COMPLETED`)
- `PATCH /api/tours/{id}`
- GPS start/stop vezan za status ture
- Background slanje logova na `/api/gps-logs`

### Faza 3 - Troskovnik

- Sheet i item endpointi uskladjeni sa backendom
- DatePicker + `date` polje u payload-u
- Lifecycle: `OPEN` editable, ostalo read-only
- `Zakljucaj troskovnik`
- `COMPLETED` blokiran dok je sheet `OPEN`

### Faza 4 - Dokumenti + notifikacije

- Dokumenti: lista + upload + metadata save
- Notifikacije: infinite, mark one/all, badge
- Push token lifecycle: register/sync/delete
- Deep-link handling iz push payload-a

## 4) Faza 5 - implementirano

### 5a React Query persist + stale policy

- Persist aktivan preko `PersistQueryClientProvider`
- Persist key: `tms-query-cache`
- `maxAge`: 24h
- StaleTime:
  - ture lista + detalji: 5 min
  - notifikacije: 2 min
  - profil vozaca: 10 min
  - expense sheet: 1 min

### 5b NetInfo + OfflineBanner

- `@react-native-community/netinfo` integrisan
- `OfflineBanner`:
  - offline: zuta traka
  - online + queue > 0: plava traka
  - synced: traka nestaje
- Banner dodat u `app/(driver)/_layout.tsx`

### 5c GPS flush strategija

- GPS queue batch obrada u chunk-u do 50
- Parallel chunk flush (`Promise.allSettled`)
- Reconnect trigger preko NetInfo
- Interval flush svakih 20s

### 5d PDF upload

- `expo-document-picker` integrisan
- Dokumenti ekran ima opciju `Fajl (PDF)`
- Koristi isti presign/upload flow kao slike

### 5e EAS setup

- `app.json`:
  - iOS bundle id: `rs.softechrs.tms`
  - Android package: `rs.softechrs.tms`
- `eas.json` dodan:
  - `development`, `preview`, `production`
- API URL vrednosti u `eas.json` su placeholder i menjaju se per env

### 5f Offline UX dodatno

- Expense ekran prikazuje pending sync stanje
- Marker uz stavke koje cekaju sync

## 5) Faza 6 - Chat / Messenger

Implementirano:

- Novi tab `Poruke`
- Chat lista (`/api/chat/threads`):
  - sortiranje po zadnjoj poruci
  - preview + timestamp + unread indikator
  - polling 5s
- Novi razgovor (`/api/chat/users` + `/api/chat/threads`)
- Thread ekran (`/api/chat/threads/:id/messages`):
  - poruke staro -> novo
  - `Ucitaj starije` (cursor)
  - polling 3s
  - mark read (`PATCH /api/chat/threads/:id/read`) pri otvaranju i novim porukama
  - slanje poruka (`POST /api/chat/threads/:id/messages`)
  - optimisticki append
- Offline chat MVP:
  - slanje blokirano offline
  - read iz cache-a ostaje dostupno
- Push/deeplink za chat:
  - podrzan `threadId`
  - podrzan `type: chat`
  - ruta `/chat/:threadId`

## 6) Kljucni fajlovi promenjeni u Fazi 5 i 6

- `src/providers/QueryProvider.tsx`
- `src/lib/offline-queue.ts`
- `src/services/gpsTracking.ts`
- `src/components/OfflineBanner.tsx`
- `app/_layout.tsx`
- `app/(driver)/_layout.tsx`
- `src/queries/useTours.ts`
- `src/queries/useTourDetails.ts`
- `src/queries/useNotifications.ts`
- `src/queries/useDriverProfile.ts`
- `src/queries/useExpenseSheet.ts`
- `src/queries/useDashboardData.ts`
- `app/(driver)/tours/[id]/expense.tsx`
- `app/(driver)/tours/[id]/documents.tsx`
- `src/queries/useChat.ts`
- `app/(driver)/chat/_layout.tsx`
- `app/(driver)/chat/index.tsx`
- `app/(driver)/chat/new.tsx`
- `app/(driver)/chat/[id].tsx`
- `src/services/notifications.ts`
- `src/lib/types.ts`
- `app.json`
- `eas.json`

## 7) Komande

- typecheck: `npm run typecheck`
- start: `npm run start -- --clear`
- EAS android dev: `npx eas build --profile development --platform android`
- EAS ios dev: `npx eas build --profile development --platform ios`

## 8) QA checklist status

Kodom pokriveno:

- cache persist + stale policy
- offline banner + queue indikator
- reconnect flush + interval flush
- PDF picker upload flow
- EAS config
- chat tab + thread flow + polling + read status + offline send block

Manual QA (potrebno odraditi):

- auth edge-case scenariji
- status ture end-to-end
- GPS start/stop + log flush
- expense lock + 422 flow
- upload slika/PDF + otvaranje dokumenata
- push foreground + deep links
- offline/povratak mreze
- chat 1:1 flow sa drugim korisnikom iz firme

## 9) Napomene za drugi AI tool

- Ne menjati API shape bez backend potvrde.
- Troškovnik lifecycle mora ostati striktan.
- `COMPLETED` mora ostati blokiran dok je sheet `OPEN`.
- Sve mutacije i dalje kroz `src/lib/api.ts`.
- UI copy ostaje srpski kao default.
