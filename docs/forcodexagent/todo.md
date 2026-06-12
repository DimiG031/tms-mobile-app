# Coordination TODO za Codex agente

Ovaj dokument je ručni most između mobilnog i backend projekta.

Mobilni projekat:

```text
C:\Users\goran\Documents\TMS-mobile-app
```

Backend projekat:

```text
C:\Users\goran\transport-website-app
```

## Pravila

1. Koristiti srpsku latinicu bez mojibake.
2. Status svake stavke pisati kao `TODO`, `IN_PROGRESS`, `DONE`, `BLOCKED`, `NEEDS_MOBILE` ili `NEEDS_BACKEND`.
3. Ne tražiti ponovo stavke koje su označene kao `DONE`.
4. Kada backend nešto implementira, upisati endpoint, payload, response shape i šta mobile treba da promeni.

## Već urađeno

### Mobile profile i permissions

Status: `DONE`

Backend je implementirao:

```text
GET /api/mobile/profile
```

Mobile koristi ovaj endpoint kao centralni izvor istine za:

- `user`
- `role`
- `companyId`
- `driverId`
- `permissions`
- `availableMobileModules`
- `preferences`
- `settings`
- `driver`
- `company`

`GET /api/mobile/driver-profile` ostaje samo za detalje profila vozača.

### Mobile preferences

Status: `DONE`

Backend je implementirao:

```text
PATCH /api/mobile/preferences
```

Mobile šalje:

```json
{
  "selectedModules": ["home", "tours", "chat", "notifications", "profile"],
  "moduleOrder": ["home", "tours", "chat", "notifications", "profile"],
  "sliceNavigationEnabled": true
}
```

Mobile posle uspeha osvežava `mobile-profile` cache.

### Driver scope za ture, stanice i dokumenta

Status: `DONE`

Backend je dodao driver-scope zaštitu za:

```text
GET /api/tours/:id
GET /api/route-stops?tourId=...
PATCH /api/route-stops/:id
GET /api/documents?relatedType=tour&relatedId=...
```

Mobile više ne šalje `driverId` kao sigurnosni filter za ture, dashboard i notifikacije.

### Troškovnik ture (expense sheet)

Status: `DONE`

Backend je dodao driver-scope zaštitu i za troškovnik (potvrđeno u backend dokumentu 2026-06-09):

```text
GET    /api/tours/:id/expense-sheet
POST   /api/tours/:id/expense-sheet
DELETE /api/tours/:id/expense-sheet
```

Mobile je povezao pun rad sa troškovnikom kroz `src/queries/useExpenseSheet.ts`:

- učitavanje troškovnika ture i stavki:
  - `GET /api/tours/:id/expense-sheet`
  - `GET /api/tours/:id/expense-sheet/:sheetId/items`
- kreiranje i izmena troškovnika:
  - `POST /api/tours/:id/expense-sheet`
  - `PATCH /api/tours/:id/expense-sheet/:sheetId`
- rad sa stavkama troška:
  - `POST /api/tours/:id/expense-sheet/:sheetId/items`
  - `PATCH /api/tours/:id/expense-sheet/:sheetId/items/:itemId`
  - `DELETE /api/tours/:id/expense-sheet/:sheetId/items/:itemId`

Mobile posle izmene osvežava `expense-sheet`, `tour-details`, `tours` i `dashboard` cache.

Foto računa: stavke koriste `receiptUrl`; mobile upload je povezan kroz `src/services/upload.ts` po backend presign toku (`POST /api/upload/presign` → `PUT`/multipart → `fileUrl`), iz kamere ili galerije, folder `receipts`. Status: `DONE` (ne treba dalja mobilna izmena).

Driver-scope na svim podrutama (`:sheetId`, `items`, `items/:itemId`) je backend potvrdio i implementirao 2026-06-11 — zatvoren IDOR.

Dvostrani potpis workflow (vozač ↔ dispečer) — backend isporučio, mobile povezao:

- statusi: `OPEN` (vozač uređuje), `SUBMITTED` (predato dispečeru), `REVISED` (dispečer izmenio, čeka potvrdu vozača), `CONFIRMED` (vozač potvrdio), `CLOSED` (zaključano), `APPROVED` (legacy);
- vozač menja sadržaj samo dok je `OPEN`; `isReadOnly = status !== "OPEN"`;
- kad je status `REVISED`, ekran troškovnika prikazuje amber baner sa dugmadima `Potvrdi izmene` i `Vrati na doradu` koja gađaju `POST /api/mobile/tours/:id/expense-sheet/confirm` (`{ action: "CONFIRM" | "REJECT" }`, `src/queries/useExpenseSheet.ts` → `useConfirmExpenseSheet`);
- statusi su prevedeni na srpsku latinicu (`translateExpenseStatus`) i imaju boje (`REVISED` amber, `CONFIRMED/APPROVED` emerald).

### Pojedinačno označavanje notifikacije kao pročitane

Status: `DONE`

Backend podržava:

```text
PATCH /api/notifications/:id
```

Mobile koristi ovaj endpoint za pojedinačno `Označi kao pročitano`.

### Bulk označavanje notifikacija kao pročitane

Status: `DONE`

Backend je omogućio:

```text
POST /api/notifications/mark-all-read
```

Mobile sada koristi ovaj endpoint bez query parametara za dugme `Označi sve kao pročitano`.

Posle uspeha mobile osvežava:

- listu notifikacija
- unread count
- dashboard

### Chat Expo push

Status: `DONE`

Backend coordination dokument kaže da je implementirano slanje Expo push-a za chat poruke kroz postojeći chat API.

Očekivani payload:

```json
{
  "type": "CHAT_MESSAGE",
  "threadId": "thread-id",
  "messageId": "message-id",
  "senderId": "sender-user-id"
}
```

Mobile ponašanje:

- ne prikazuje chat DB notifikacije u ekranu `Obaveštenja`
- `CHAT_MESSAGE` invalidira `chat-threads`
- `CHAT_MESSAGE` invalidira samo `chat-messages` za konkretan `threadId`
- klik na push otvara konkretan razgovor
- back iz razgovora otvorenog preko push-a vraća na `Poruke`
- nema stalnog polling-a

Backend je potvrdio (backend dokument, provera 2026-06-11) da slanje poruke zaista šalje Expo push preko `sendExpoPushNotifications` u `src/app/api/chat/threads/[id]/messages/route.ts`. Ovo pitanje je zatvoreno.

### Role-based mobile navigacija

Status: `DONE` za osnovnu verziju

Mobile je implementirao:

- `GET /api/mobile/profile` kao izvor modula
- `PATCH /api/mobile/preferences` iz `Profil > Podešavanja`
- izbor modula
- redosled modula
- `sliceNavigationEnabled`
- top-level `Dokumenta`
- donju navigaciju sa `Početna`, `Više`, `Profil` kada ima više modula
- wheel picker iznad tab bara
- swipe levo/desno za izbor modula
- tap na fokusiranu ikonicu otvara stranicu

Nije hitno za backend:

- inertial/spin animacija točka je mobile UX dorada
- novi top-level moduli čekaju backend `availableMobileModules` i mobile ekran

## Novi zahtevi prema backendu

### Nedeljni i godišnji agregat za istoriju vozača

Status: `NEEDS_BACKEND`

Mobile je dodao ekran `Istorija` (mini-dashboard + lista tura). Lista tura već radi preko postojećeg `GET /api/tours` (podržava `status`, `q`, `dateFrom`, `dateTo`, `cursor`, `limit`).

Za mini-dashboard nam treba još nedeljni i godišnji bucket. Trenutni `GET /api/mobile/tours/summary` vraća samo `month` i `total`.

Predlog (jedna od dve opcije):

```text
GET /api/mobile/tours/summary            → dodati week i year uz month i total
GET /api/mobile/tours/summary?period=week|month|year|total
```

Oblik bucket-a ostaje isti kao za `month`:

```json
{ "label": "24. nedelja 2026", "tours": 1, "km": 1850, "completed": 1, "activeTours": 1 }
```

Mobile trenutno prikazuje samo `Mesec` i `Ukupno` (jer to backend već daje); čim stignu `week`/`year`, dodaju se tabovi `Sedmica` i `Godina` bez dalje backend izmene.

## Sledeće za backend agenta

Status na dan 2026-06-11: backend je isporučio sve stavke iz ove sekcije. Nema otvorenih backend zahteva iz mobilnog dokumenta. Stavke ispod ostaju kao istorijat sa finalnim `DONE` statusom i mobilnom integracijom.

### 1. Akcije na stanici

Status: `DONE`

Backend je omogućio endpoint:

```text
POST /api/mobile/route-stops/:id/actions
```

Payload:

```json
{
  "action": "ARRIVED",
  "timestamp": "2026-06-05T10:30:00.000Z",
  "latitude": 44.8125,
  "longitude": 20.4612,
  "note": "Stigao na rampu 3"
}
```

Podržane akcije:

- `ARRIVED`
- `DEPARTED`
- `CANCELED`
- `NOTE`

Backend treba da proveri da stanica pripada turi dodeljenoj vozaču.

Mobile je povezao ovaj endpoint u ekranu:

```text
Tura > Detaljnije > Stanice
```

Za svaku stanicu koja ima `id`, mobile prikazuje akcije:

- `Stigao` -> `ARRIVED`
- `Krenuo` -> `DEPARTED`

Mobile posle uspeha osvežava:

- `tour-stops`
- `tour-details`
- `dashboard`

### 2. SOS

Status: `DONE`

Backend endpoint:

```text
POST /api/mobile/sos
```

Payload:

```json
{
  "tourId": "tour-id",
  "latitude": 44.8125,
  "longitude": 20.4612,
  "message": "Problem na putu, potrebna pomoć.",
  "timestamp": "2026-06-05T10:30:00.000Z"
}
```

Mobile je povezao (`src/queries/useSos.ts`, ekran `Tura > SOS`):

- SOS dugme je na ekranu detalja ture (crveno, `app/(driver)/tours/[id]/sos.tsx`);
- pre slanja traži GPS preko `expo-location` i šalje `latitude/longitude` ako je dozvola data, inače `null`;
- opciona poruka; `timestamp` se generiše na klijentu;
- ide kroz offline queue (`postQueued`) pa radi i bez mreže.

### 3. Prijava problema sa ture

Status: `DONE`

Backend endpoint:

```text
POST /api/mobile/tours/:id/issues
```

Payload:

```json
{
  "type": "DELAY",
  "title": "Kašnjenje na utovaru",
  "description": "Čekam rampu više od sat vremena.",
  "stopId": "route-stop-id",
  "severity": "NORMAL"
}
```

Tipovi: `DELAY`, `ACCIDENT`, `DOCUMENT_PROBLEM`, `VEHICLE_PROBLEM`, `CUSTOMS_PROBLEM`, `OTHER`.
Hitnost (`severity`): `LOW`, `NORMAL`, `HIGH` (default `NORMAL`).

Mobile je povezao (`src/queries/useTourIssue.ts`, ekran `app/(driver)/tours/[id]/issues.tsx`):

- izbor tipa i hitnosti, obavezan naslov, opcioni opis;
- opcioni izbor stanice (`stopId`) iz liste stanica ture (`useTourStops`);
- dugme `Prijavi problem` je na ekranu detalja ture;
- ide kroz offline queue.

### 4. Checklist za vozača

Status: `DONE`

Backend endpoint-i:

```text
GET /api/mobile/tours/:id/checklist
PATCH /api/mobile/tours/:id/checklist/:itemId
```

GET vraća `items`, `completedCount` i `requiredRemaining`. PATCH payload je `{ "completed": true }`.

Mobile je povezao (`src/queries/useTourChecklist.ts`, ekran `app/(driver)/tours/[id]/checklist.tsx`):

- prikazuje sve stavke sa oznakom `Obavezno`/`Opciono`;
- tap na stavku šalje PATCH i invalidira `tour-checklist`;
- prikazuje broj završenih i preostalih obaveznih stavki;
- dugme `Checklist` je na ekranu detalja ture.

### 5. Mark all notifications read za običnog korisnika

Status: `DONE`

Problem:

- `POST /api/notifications/mark-all-read` trenutno traži širu `notifications:update` dozvolu
- običan `USER` dobija `Forbidden`
- mobile trenutno obilazi problem pojedinačnim `PATCH /api/notifications/:id`

Rešenje:

- backend dozvoljava self-service bulk read za sopstvene notifikacije
- mobile koristi `POST /api/notifications/mark-all-read` bez query parametara
- endpoint ne sme menjati tuđe notifikacije
- chat notifikacije ne moraju biti deo operativnog ekrana `Obaveštenja`

### 6. Promena lozinke za mobile

Status: `DONE`

Backend endpoint:

```text
PATCH /api/mobile/account/password
```

Payload:

```json
{
  "currentPassword": "stara-lozinka",
  "newPassword": "nova-lozinka"
}
```

Mobile je povezao (`src/queries/useMobileAccount.ts`) u `Profil > Podešavanja > Nalog`:

- forma sa trenutnom lozinkom, novom i potvrdom;
- klijentska validacija (min. 8 karaktera, poklapanje potvrde) pre slanja;
- backend greške (`400`/`401`) se prikazuju korisniku.

### 7. Tema i notifikacione preference u mobile settings

Status: `DONE`

Backend endpoint:

```text
PATCH /api/mobile/settings
```

Payload (sva polja opciona, bar jedno obavezno):

```json
{
  "theme": "system",
  "notifyEmail": true,
  "notifyWeb": true,
  "notifyMobile": true
}
```

Dozvoljene vrednosti za `theme`: `system`, `light`, `dark`.

Mobile je povezao (`src/queries/useMobileAccount.ts`) u `Profil > Podešavanja > Izgled i obaveštenja`:

- izbor teme i prekidači za push (`notifyMobile`) i email (`notifyEmail`) obaveštenja;
- inicijalne vrednosti iz `GET /api/mobile/profile`; `null` tema se tretira kao `system`;
- posle uspeha invalidira `mobile-profile` cache.

Napomena: izbor teme se trajno čuva na backendu, ali vizuelna tamna tema još nije primenjena kroz ceo UI (trenutno se renderuje svetla tema). Primena tamne teme je zasebna mobilna UX dorada.

### 8. Kilometraža ture za mobile dashboard

Status: `DONE`

Backend `GET /api/tours` sada vraća `distanceKm` (alias za `Tour.kilometers`) po stavci.

`normalizeTourSummary` čita kilometražu (prihvata `distanceKm`, `routeDistanceKm`, `totalDistanceKm`, `plannedDistanceKm`, `mileageKm`), a dashboard je sabira u ukupan zbir (`totalDistanceKm`). Ako kilometraža nije uneta, prikazuje `Nije uneto`.

## Najnovije mobile izmene

### 2026-06-12 - Nova vozačeva početna i ekran Istorija

Status: `DONE` (osim nedeljnog/godišnjeg agregata koji čeka backend)

- Redizajnirana početna (`app/(driver)/index.tsx`) kao operativni centar aktivne ture: sledeća stanica sa `Stigao`/`Krenuo`, mini-paneli Checklist i Troškovnik (sa statusom), Detaljnije/Dokumenta, SOS, mesečni sažetak (`GET /api/mobile/tours/summary`).
- Novi ekran `Istorija` (`app/(driver)/istorija.tsx`): mini-dashboard (Mesec/Ukupno) + pretraživa/filtrirana lista tura sa infinite scroll-om preko `GET /api/tours` (`status`, `q`, `cursor`). Dostupan sa početne (mesečni sažetak + brza akcija); registrovan kao skriven ekran (`href: null`) u tab layout-u.
- Novi query-ji: `src/queries/useToursSummary.ts`, `src/queries/useToursHistory.ts`.
- Profil (`app/(driver)/profile/index.tsx`) dobio sekciju „Rokovi i podsetnici": vozačka, lekarski, tahograf kartica, ADR/CPC — sa odbrojavanjem i bojom (istekao/ističe za N dana/još N dana) i upozorenjem kad nešto ističe u 30 dana. Koristi postojeća polja iz `GET /api/mobile/driver-profile`, bez backend izmene.
- Otvoreno prema backendu: nedeljni i godišnji bucket za `tours/summary` (vidi „Novi zahtevi prema backendu").

### 2026-06-11 - Integracija svih backend isporuka

Status: `DONE`

Backend je 2026-06-11 isporučio sve preostale stavke; mobilna strana ih je povezala:

- Troškovnik workflow (`REVISED`/`CONFIRMED` + `confirm` endpoint) — `app/(driver)/tours/[id]/expense.tsx`, `useConfirmExpenseSheet`.
- SOS — `app/(driver)/tours/[id]/sos.tsx`, `src/queries/useSos.ts` (sa GPS preko `expo-location`).
- Prijava problema — `app/(driver)/tours/[id]/issues.tsx`, `src/queries/useTourIssue.ts`.
- Checklist — `app/(driver)/tours/[id]/checklist.tsx`, `src/queries/useTourChecklist.ts`.
- Promena lozinke i tema/notifikacije — `app/(driver)/profile/settings.tsx`, `src/queries/useMobileAccount.ts`.
- Kilometraža — `GET /api/tours` vraća `distanceKm`, dashboard prikazuje ukupan zbir.
- Nove rute registrovane u `app/(driver)/tours/_layout.tsx`; linkovi (Checklist, Prijavi problem, SOS) na ekranu detalja ture.
- Prijava problema ima opcioni izbor stanice (`stopId`) preko `useTourStops`.
- SOS je dostupan i sa početne strane (`app/(driver)/index.tsx`) kao crveno dugme u kartici aktivne ture, pored ekrana detalja ture.
- `npx tsc --noEmit` prolazi bez grešaka.

Preostala mobilna UX dorada (nije blokirano backendom): vizuelna primena tamne teme kroz ceo UI (app trenutno renderuje svetlu temu bez obzira na sačuvan izbor).

### 2026-06-11 - Troškovnik i kilometraža

Status: `DONE`

- Dokumentovan je pun rad mobilne aplikacije sa troškovnikom ture (`src/queries/useExpenseSheet.ts`) i dodat kao `DONE`.
- `normalizeTourSummary` sada čita kilometražu ture (`distanceKm`, `routeDistanceKm`, `totalDistanceKm`, `plannedDistanceKm`, `mileageKm`), pa dashboard prikazuje ukupne kilometre čim ih backend vrati. Stavka kilometraže je prebačena na `NEEDS_BACKEND` jer je mobilna strana spremna.

Sinhronizacija sa backend dokumentom (provera 2026-06-11):

- Backend je potvrdio da chat zaista šalje Expo push; pitanje u sekciji `Chat Expo push` je zatvoreno.
- Dodata napomena da `settings.theme` može biti `null` (tretirati kao `system`).
- I dalje otvoreno prema backendu: driver-scope za `PATCH` troškovnika i `items` podrute, i vraćanje kilometraže u `GET /api/tours`.

### 2026-06-06 - Početna strana za vozača

Status: `DONE`

Mobile početna strana sada prikazuje praktičan vozački pregled:

- aktivnu turu
- dane na aktivnoj turi
- nepročitane poruke
- broj tura u učitanom pregledu
- završene ture
- dane na završenim turama
- kilometre ako backend vrati kilometražu
- brze akcije
- predstojeće ture

### 2026-06-08 - Route stop actions i bulk read notifikacija

Status: `DONE`

Mobile je povezao nove backend contract-e:

- `POST /api/mobile/route-stops/:id/actions`
- `POST /api/notifications/mark-all-read`

Route stop akcije su dostupne u `Detaljnije > Stanice`.

Bulk `Označi sve kao pročitano` više ne radi pojedinačne PATCH pozive, nego koristi novi backend endpoint bez query parametara.

### 2026-06-06 - Razdvajanje chat push-a i operativnih obaveštenja

Status: `DONE`

Mobile sada razlikuje:

- `from=notifications` za operativna obaveštenja
- `from=chat-push` za chat push

Ponašanje:

- klik na operativno obaveštenje vodi na ciljnu turu/dokument i back vraća na `Obaveštenja`
- klik na `CHAT_MESSAGE` push vodi na konkretan razgovor i back vraća na `Poruke`
- chat DB notifikacije su filtrirane iz ekrana `Obaveštenja`

### 2026-06-06 - Podešavanja profila

Status: `DONE`

Mobile je razdvojio:

- `Profil` kao pregled korisnika/vozača
- `Profil > Podešavanja` za navigaciju, module, točak, temu i buduću promenu lozinke

### 2026-06-06 - Detaljnije na turi

Status: `DONE`

Ekran `Detaljnije` sada ima unutrašnju navigaciju:

- `Osnovno`
- `Stanice`
- `Carina`
- `Dokumenta`
- `Napomene`

## Zadaci za mobilnog agenta kada backend nastavi

Status: `DONE`

Svi zadaci sa ove liste su završeni 2026-06-11 (backend je isporučio, mobile povezao):

1. Pročitani tačni endpoint-i i response shape. ✓
2. Dodate API metode u mobilnoj aplikaciji. ✓
3. Route stop actions povezane sa dugmadima na stanici/turi. ✓
4. Dodat SOS UI. ✓
5. Dodata prijava problema sa ture. ✓
6. Dodat checklist ekran. ✓
7. Povezana promena lozinke. ✓
8. Povezana tema (čuva se na backendu; vizuelna tamna tema je preostala UX dorada). ✓
9. Ovaj dokument ažuriran statusom mobilne strane. ✓

Nema otvorenih stavki prema backendu. Preostale mobilne dorade su čisto UX (tamna tema kroz ceo UI, izbor stanice u prijavi problema).
