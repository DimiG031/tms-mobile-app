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

Trenutno **nema otvorenih** zahteva prema backendu — sve iz ranije liste je isporučeno (vidi „Završeni zahtevi prema backendu").

## Završeni zahtevi prema backendu

### Koordinate (lat/lng) po stanici — `DONE` (backend + mobile)

Backend je 2026-07-02 dodao `latitude`/`longitude` u `GET /api/route-stops?tourId=` (razrešeno: eksplicitna stanica → lokacija → geokodirano → `null`) + auto-geokodiranje lokacija pri čuvanju. Mobile: `TourStop` proširen, mapa rute (`app/(driver)/tours/[id]/map.tsx`, Leaflet u WebView-u) koristi backend koordinate, a `src/lib/geocode.ts` (OSM Nominatim, keš + throttle) je rezerva kad su `null`.

### `rokovnik` i `putni-nalog` u `availableMobileModules` — `DONE` (backend + mobile)

Backend je 2026-07-02 dodao oba modula u `availableMobileModules` (`rokovnik` = `notes`, `putni-nalog` = `travelOrders`). Mobile: sada se pojavljuju u biraču modula (`Profil > Podešavanja`) i mogu se slati kroz `PATCH /api/mobile/preferences` bez odbijanja; i dalje su „pinovani" u „Više" krug radi zajamčene dostupnosti. Nisu podrazumevano uključeni (backend `DEFAULT_DRIVER_MODULES` netaknut).

### Pogodnosti na carini — `DONE` (backend + mobile)

### Pogodnosti na carini — `DONE` (backend + mobile)

Backend je 2026-06-21 dodao `GET /api/mobile/customs/:id` (Opcija B): `{ id, name, city, country, amenities, amenitiesList[{key,label,details}], workingHours, notes, phone, email, address }`. Mobile (`src/queries/useCustomsAmenities.ts`) prikazuje sekciju „Pogodnosti na carini" u proširenoj carinskoj stanici (`Detaljnije > Stanice`) kad stanica ima `customsOffice.id` (normalizer sad hvata `customsOfficeId`). Ključevi: `parking, toilet, shower, restaurant, wifi, atm, fuel, store, lodging` (napomena: „menjačnica" ne postoji — najbliže `atm`).

### Rokovnik vozača — `DONE` (backend + mobile)

Backend je 2026-06-21 dodao `GET/POST/PATCH/DELETE /api/mobile/rokovnik[/:id]` (model `ReminderNote`, driver-scoped). Mobile (`src/queries/useRokovnik.ts`, ekran `app/(driver)/rokovnik.tsx`, modul „Rokovnik"):

- lista grupisana po datumu; vozač vidi firmske (`COMPANY`) + svoje (`PRIVATE`) + dodeljene (`ASSIGNED`);
- vozač pravi/uređuje/briše/označava **samo svoje** (`visibility === "PRIVATE"`) zapise; ostali su read-only sa oznakom „Firmski"/„Dodeljeno";
- forma: naslov, napomena, datum, kategorija (`GENERAL…OTHER`), prioritet (`LOW…URGENT`).

### Telefon u listi kontakata (za poziv/SMS/Viber)

Status: `DONE`

Backend je 2026-06-14 dodao polje `phone` u `GET /api/chat/users` (opcija A). Mobile već čita `phone` iz `ChatUser`, pa su u `Profil > Kontakti` aktivirane akcije **poziv** (`tel:`), **SMS** (`sms:`) i **Viber** (`viber://chat?number=`) za sve kolege — bez dalje mobilne izmene. `phone` može biti `null` (tad se te akcije ne prikazuju za tog kontakta).

### Telefon u listi kontakata (za poziv/SMS/Viber)

Status: `DONE`

Backend je 2026-06-14 dodao polje `phone` u `GET /api/chat/users` (opcija A). Mobile već čita `phone` iz `ChatUser`, pa su u `Profil > Kontakti` aktivirane akcije **poziv** (`tel:`), **SMS** (`sms:`) i **Viber** (`viber://chat?number=`) za sve kolege — bez dalje mobilne izmene. `phone` može biti `null` (tad se te akcije ne prikazuju za tog kontakta).

### Nedeljni i godišnji agregat za istoriju vozača

Status: `DONE`

Backend je 2026-06-14 dodao `week` i `year` bucket u `GET /api/mobile/tours/summary` (sada vraća `week`, `month`, `year`, `total`, isti oblik). Mobile je povezao:

- `useToursSummary` čita sva četiri bucket-a;
- ekran `Istorija` ima tabove `Sedmica`, `Mesec`, `Godina`, `Ukupno`;
- lista tura i dalje koristi `GET /api/tours` (`status`, `q`, `cursor`).

### Lična statistika vozača (Profil > Moja statistika)

Status: `DONE`

Backend je dodao `GET /api/mobile/me/stats` (self-scoped, bez plate). Mobile je povezao (`src/queries/useMobileStats.ts`, ekran `app/(driver)/profile/stats.tsx`, link u Profilu):

- **Vožnja:** mesečni i ukupni broj tura/km, završene ture;
- **Godišnji odmor:** preostalo/ukupno/iskorišćeno + preneto;
- **Zaposlenje:** pozicija, datum zaposlenja, staž, ugovor (tip + datum/„na neodređeno") sa upozorenjem kad `daysLeft <= 30`;
- sve sekcije se graciozno sakrivaju kada je polje/objekat `null`.

Napomena: `documents` polje iz `me/stats` se NE prikazuje na ovom ekranu jer rokovi/dokumenta imaju zaseban ekran `Profil > Rokovi i dokumenta` (izbegnuta duplikacija). Polje ostaje dostupno u API odgovoru ako kasnije zatreba.

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

Napomena: izbor teme se trajno čuva na backendu i sada je vizuelno primenjen kroz ceo UI (2026-06-14). Mobile ima `ThemeProvider`/`useTheme` koji rešava `system`/`light`/`dark` i sinhronizuje NativeWind `colorScheme`, pa se svetla i tamna tema primenjuju na sve ekrane, deljene komponente i header-e. `system` prati šemu uređaja.

### 8. Kilometraža ture za mobile dashboard

Status: `DONE`

Backend `GET /api/tours` sada vraća `distanceKm` (alias za `Tour.kilometers`) po stavci.

`normalizeTourSummary` čita kilometražu (prihvata `distanceKm`, `routeDistanceKm`, `totalDistanceKm`, `plannedDistanceKm`, `mileageKm`), a dashboard je sabira u ukupan zbir (`totalDistanceKm`). Ako kilometraža nije uneta, prikazuje `Nije uneto`.

## Najnovije mobile izmene

### 2026-07-03 - Mape Faza 2 (Leaflet u WebView-u) + moduli u biraču

Status: `DONE` (JS-only — ide preko OTA; `react-native-webview` je u build-u od početka)

Backend je 2026-07-02 isporučio `latitude`/`longitude` po stanici u `GET /api/route-stops?tourId=` + auto-geokodiranje lokacija. Mobilna strana je dodala ugrađenu mapu.

- **Ugrađena mapa rute** (`app/(driver)/tours/[id]/map.tsx`): Leaflet + OSM pločice u `react-native-webview`. Numerisani pinovi po stanicama (boja po tipu: utovar zeleno, istovar crveno, carina amber), polilinija rute, `fitBounds`, popup sa nazivom/mestom. Dugme „Navigacija (Google Mape)" otvara eksternu navigaciju sa waypoint-ima.
- **Ulaz:** dugme „Mapa rute" u `Detaljnije > Stanice`; ruta registrovana u `tours/_layout.tsx`.
- **Koordinate:** `TourStop` proširen `latitude`/`longitude` (normalizer čita top-level + nested `location`/`geocoded*`). Prednost imaju backend koordinate; ako su `null`, mobilni **geokodira adresu preko OSM Nominatim** kao rezervu (`src/lib/geocode.ts`, keš + throttle ~1 req/s).
- **Moduli (B):** backend je 2026-07-02 dodao `putni-nalog` i `rokovnik` u `availableMobileModules`, pa se sada **sami pojavljuju u biraču modula** (`Profil > Podešavanja > Navigacija`) i mogu se čuvati kroz `PATCH /api/mobile/preferences` bez odbijanja. Mobilni ih i dalje „pinuje" u „Više" krug radi zajamčene dostupnosti. `notes`→`rokovnik` preimenovanje nas ne dira (koristimo `rokovnik`).

### 2026-07-02 - Putni nalog (modul) — povezan mobilni UI

Status: `DONE` (JS-only — ide preko OTA, bez rebuild-a)

Backend je 2026-06-30/07-01 isporučio mobilne endpoint-e za putni nalog; mobilna strana ih je povezala.

- Nov modul **„Putni nalog"** (`app/(driver)/putni-nalog.tsx`, `src/queries/useTravelOrders.ts`): prečica na početnom ekranu (Brze akcije) + u „Više" krugu (klijentski, kao Rokovnik). Ruta registrovana u `_layout.tsx`.
- Lista aktivnih naloga (`GET /api/mobile/travel-orders`) — svaka kartica sklopiva: broj, relacija, status (`OPEN`→Otvoren / `ON_ROAD`→Na putu / `RETURNED`→Vraćen / `CLOSED`→Zatvoren), polazak, početna km, broj događaja + dnevnik puta.
- Dodavanje događaja (`POST /api/mobile/travel-orders/:id/events`) preko brzih dugmadi: **Granica, Utovar, Istovar, Gorivo, Kilometraža, Pauza, Beleška**. Ide kroz offline queue.
  - `BORDER`: `countryFrom`/`countryTo` biraju se iz kataloga `GET /api/countries?limit=100` (šalje se `name`).
  - `LOAD`/`UNLOAD`: obavezan `locationId` iz `GET /api/locations?limit=100` (nije slobodan tekst; validacija na klijentu + poruka backenda).
  - `FUEL`: litri + iznos + valuta (EUR/RSD/USD/CHF); `ODOMETER`: obavezno stanje km; `REST`/`NOTE`: napomena; opcioni `odometer`, `at` (datum+vreme, default sada).
- Vraćanje naloga (`POST /api/mobile/travel-orders/:id/return`) — opciono `odoEnd` + `note`, uz potvrdu. Vozač NE zatvara nalog (`CLOSED` radi dispečer).
- Otvoreno prema backendu: dodati `"putni-nalog"` u `availableMobileModules` (sad je klijentski forsiran u „Više" krug, kao `rokovnik`).

### 2026-06-28 - Login mrežna greška (URL) + srpske greške + oko za lozinku

Status: `DONE` (JS-only — ide preko OTA, bez rebuild-a), bez backend zavisnosti

- **Login „Network request failed" rešen:** `mobileLogin` (`src/services/auth.ts`) ide preko raw `fetch`-a na `config.apiUrl`, a bundle je iz `.env` ume da ugradi `localhost:3000` → na pravom telefonu mreža puca. Sad `src/lib/config.ts` u produkciji (`!__DEV__`) **forsira `https://tms.softechrs.com`** i ignoriše localhost/127.0.0.1/10.0.2.2 i kad ih bundle ugradi. Lokalni dev (Metro/emulator) i dalje koristi `.env` + 10.0.2.2 rewrite.
- **Srpske poruke grešaka:** `src/lib/api.ts` ima `ApiError` + mapiranje po statusu (401 „Sesija je istekla", 403 „Nemate dozvolu", 5xx „Greška na serveru. Pokušajte kasnije ili kontaktirajte administratora", mreža „Proverite internet vezu"). Smislena backend poruka se zadržava; generičke se prevode. `offline-queue` čita `isNetwork` flag.
- **Oko za prikaz lozinke** na login ekranu (`app/(auth)/login.tsx`): toggle `secureTextEntry`, ikonica pozicionirana inline `style`-om na desnoj ivici polja.
- Napomena za OTA: `.env.production` je uklonjen jer je menjao fingerprint runtimeVersion (OTA tad ne stiže na postojeći build). URL se sad rešava u `config.ts`, ne preko env fajla.

### 2026-06-28 - Rokovnik/carina greška: uzrok bio backend (auth + deploy)

Status: `RESOLVED` (backend), mobilna bez izmene koda

- Na telefonu je „Greška pri učitavanju rokovnika". Uzrok je bio backend: `/api/mobile/rokovnik` i `/api/mobile/customs/:id` su koristili `requireTenant()` koji nije čitao mobilni Bearer JWT → backend prebacio na `requireMobileAuth(req)` (commit `490df43`). Plus produkcija (Vercel) nije bila redeploy-ovana posle 21.06 — posle redeploy-a radi.
- Mobilna strana: dodato samo prikazivanje **stvarne poruke greške** na `Rokovnik` ekranu (lakša dijagnostika ubuduće). Nema druge izmene.
- Provera domena: aplikacija ispravno gađa `https://tms.softechrs.com` (živ, mobilni API vraća 401 bez tokena). `app.softechrs.com` ne postoji (000).

### 2026-06-21 - Rokovnik (modul) + carinske pogodnosti

Status: `DONE` (JS-only — ide preko OTA, bez rebuild-a)

- **Rokovnik** (`app/(driver)/rokovnik.tsx`, `src/queries/useRokovnik.ts`): nov modul „Rokovnik" (u „Više" krugu, izaberi ga u podešavanjima modula). Lista po datumu + dodavanje/izmena/brisanje/označavanje sopstvenih zapisa; firmski/dodeljeni su read-only. Klijentski je dostupan modul; tražen i backend `availableMobileModules` unos.
- **Carinske pogodnosti** (`src/queries/useCustomsAmenities.ts`): u proširenoj carinskoj stanici prikaz „Pogodnosti na carini" (parking/toalet/tuš/restoran/wifi/atm/gorivo/prodavnica/smeštaj) + radno vreme/napomena, preko `GET /api/mobile/customs/:id`. Normalizer stanica sad hvata `customsOfficeId`.

### 2026-06-21 - Sinhronizacija sa backend izmenama (2026-06-17)

Status: `DONE` (provera, bez koda)

- **Kontakti telefon:** backend dodao `phone` u `GET /api/chat/users` → `Profil > Kontakti` sada ima poziv/SMS/Viber za kolege; naš `NEEDS_BACKEND` zatvoren.
- **`Notification.companyId` je sada NULLABLE** (platform notifikacije za superadmina). Provereno: mobile nigde ne radi strogi `companyId` filter na notifikacijama — prikazuje samo ono što backend (company-scoped) vrati, pa nema uticaja.
- **RBAC:** server enforce-uje `checkPermission` na create/update/delete; vozač zadržava driver-scope. Mobile već čita `role`+`permissions` iz `/api/mobile/profile`; eventualni `403` na akciji je sad očekivano ponašanje dozvola.
- Otvoreno prema backendu i dalje: **lat/lng po stanici** (mape Faza 2).

### 2026-06-14 - Stanice: sklopив prikaz + Navigacija (mape Faza 1)

Status: `DONE` (bez backend zavisnosti)

- `Detaljnije > Stanice`: svaka stanica je sada **sklopiva** — zatvoreno prikazuje `redni broj · Grad, Država` + adresu + kratku napomenu; na klik se proširuje u puni prikaz (tip, vremena, kontakt, carina, akcije `Stigao`/`Krenuo`).
- Dugme **„Navigacija"** na svakoj stanici i na „Sledeća stanica" na početnoj → otvara native mape sa rutom do adrese (`https://www.google.com/maps/dir/?api=1&destination=...`), preko `src/lib/maps.ts`. Bez native biblioteke i bez backenda.
- Faza 2 (ugrađena Leaflet mapa + ruta sa pinovima) planirana — vidi „Novi zahtevi prema backendu → Koordinate po stanici".

### 2026-06-14 - Profil > Kontakti (poziv/SMS/Viber/mejl)

Status: `DONE` (mejl i sopstveni kontakt rade odmah), `NEEDS_BACKEND` (telefon kolega)

- Novi ekran `app/(driver)/profile/kontakti.tsx`: „Moj kontakt" (telefon + mejl iz driver-profile) + „Tim i kolege" iz `GET /api/chat/users`.
- Svaka kartica: ime, uloga, telefon, mejl + dugmad **Poziv** (`tel:`), **Poruka** (`sms:`), **Viber** (`viber://chat?number=`), **Mejl** (`mailto:`) preko `Linking.openURL`.
- Poziv/SMS/Viber se prikazuju samo kad postoji telefon; mejl kad postoji email.
- Pretraga po imenu/ulozi/telefonu/mejlu — podudaranje po rečima (svaka reč mora da postoji, bilo kojim redom) i bez dijakritike (npr. „dispecer nikola" pronalazi „Dispečer Nikola Nikolić").
- Hub kartica „Kontakti" dodata na Profil; `ChatUser` tip proširen opcionim `phone`.
- Otvoreno: backend da doda `phone` u `GET /api/chat/users` (ili `GET /api/mobile/contacts`) da bi poziv/SMS/Viber radili i za kolege.

### 2026-06-14 - Profil reorganizovan u hub + zaseban ekran Rokovi

Status: `DONE` (bez backend zavisnosti)

- Glavni `Profil` je sada kratak hub: header + brze kartice (`Rokovi i dokumenta`, `Moja statistika`, `Podešavanja`) + `Osnovni podaci` + odjava. Manje skrolovanja.
- Rokovi i svi detalji dokumenata (dozvola, lekarski, tahograf kartica, sertifikati, beleške) izdvojeni u novi ekran `app/(driver)/profile/rokovi.tsx` — jedan tap, odmah vidljivi rokovi.
- Kartica `Rokovi i dokumenta` na Profilu ima badge „N ističu" kad nešto ističe u narednih 30 dana (logika u `src/lib/deadlines.ts`).

### 2026-06-14 - Istorija (sedmica/godina) i Profil > Moja statistika

Status: `DONE`

- `useToursSummary` čita `week`/`month`/`year`/`total`; ekran `Istorija` dobio tabove `Sedmica` i `Godina` (backend isporučio agregate 2026-06-14).
- Novi ekran `Profil > Moja statistika` (`app/(driver)/profile/stats.tsx`, `src/queries/useMobileStats.ts`) preko `GET /api/mobile/me/stats`: vožnja, godišnji odmor, zaposlenje/ugovor, rokovi dokumenata; `null` sekcije se sakrivaju.

### 2026-06-14 - Tamna tema kroz ceo UI

Status: `DONE` (bez backend zavisnosti)

- Uveden `ThemeProvider`/`useTheme` (`src/providers/ThemeProvider.tsx`) + `DarkTheme` tokeni; rešava `settings.theme` (`system`/`light`/`dark`) prema šemi uređaja i sinhronizuje NativeWind `colorScheme`.
- Svi ekrani (početna, istorija, profil, podešavanja, ture i pod-ekrani, chat, obaveštenja, dokumenta, više, login), deljene komponente (`IOSCard`, `IOSGlassPill`) i Stack header-i koriste aktivnu temu.
- Tema se menja iz `Profil > Podešavanja > Izgled i obaveštenja` i odmah se primenjuje (preko `PATCH /api/mobile/settings`).
- Pull-to-refresh dodat na početnu i Istoriju.
- Backend ne mora ništa dodatno; `PATCH /api/mobile/settings` i `GET /api/mobile/profile` su dovoljni.

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
8. Povezana tema (čuva se na backendu; vizuelna tamna tema primenjena kroz ceo UI 2026-06-14). ✓
9. Ovaj dokument ažuriran statusom mobilne strane. ✓

Nema otvorenih stavki prema backendu. Izbor stanice u prijavi problema i puna tamna tema su takođe završeni.
