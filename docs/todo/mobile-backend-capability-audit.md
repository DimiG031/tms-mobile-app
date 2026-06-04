# Backend audit za mobilne funkcije

Datum: 2026-06-04

Ovaj dokument beleži šta mobilna aplikacija može da implementira sa postojećim backend API-jem, a gde treba dopuna backenda. Fokus je na:

- role-based konfigurabilnom mobilnom interfejsu
- vozačkim alatima za put
- slice/circle navigaciji kada ima više od 5 stavki
- API dozvolama i sigurnosti za mobilni pristup

## Kratak zaključak

Veliki deo vozačkog ekrana može da se implementira odmah: detalj ture, stanice, dokumenta, status stanice, otvaranje adrese u navigaciji, kontakt podaci ako postoje, chat push i osnovni refresh bez stalnog polling-a.

Role-based interfejs za ostale korisnike je delimično spreman: backend već ima `role`, `permissions`, `/api/profile` i `/api/user-settings`, ali mobilni login trenutno ne vraća efektivne dozvole i aplikacija je praktično zaključana oko vozačkog toka. Za čist multi-role mobilni interfejs treba dodati mobilni profil/dozvole i mobile layout preferences.

## Postojeći backend koji možemo koristiti

### Autentifikacija i korisnik

Postoji:

- `POST /api/auth/mobile-login`
- vraća `token`, `refreshToken` i `user`
- `user` trenutno sadrži `id`, `name`, `email`, `role`, `companyId`, `driverId`
- `GET /api/profile`
- `GET /api/user-settings`
- `PATCH /api/user-settings`
- `User.permissions` postoji u bazi kao JSON
- `UserSettings.extra` postoji u bazi kao JSON

Može odmah:

- razlikovati korisnika po `role`
- razlikovati vozača po `driverId`
- čuvati deo mobilnih podešavanja u korisničkim podešavanjima, ako backend proširi `user-settings` payload

Nedostaje za multi-role mobilni interfejs:

- backend ne vraća efektivne permissions u `mobile-login`
- `/api/profile` ne vraća `driverId` ni permissions
- `/api/user-settings` trenutno ne izlaže `extra` za mobilne module
- mobilna aplikacija trenutno tretira aplikaciju primarno kao vozačku

Predlog dopune:

- dodati `permissions` u `mobile-login` ili napraviti `GET /api/auth/mobile-profile`
- vratiti `driverId`, `role`, `companyId`, `permissions`, `modules`
- proširiti `user-settings` sa `mobilePreferences`, na primer:

```json
{
  "mobilePreferences": {
    "selectedModules": ["home", "tours", "chat", "notifications", "profile"],
    "moduleOrder": ["home", "tours", "chat", "notifications", "profile"],
    "sliceNavigationEnabled": true
  }
}
```

### Ture i detalji ture

Postoji:

- `GET /api/tours/:id`
- `GET /api/route-stops?tourId=...`
- `GET /api/documents?relatedType=tour&relatedId=...`
- `GET /api/gps-logs`
- `PATCH /api/route-stops/:id`

Može odmah:

- ekran "Detaljnije" za turu
- osnovni podaci ture
- stanice ture preko `/api/route-stops?tourId=...`
- dokumenta ture preko `/api/documents`
- status stanice
- planirani dolazak/odlazak
- stvarni dolazak/odlazak kroz `PATCH /api/route-stops/:id`
- otvaranje adrese u Google/Apple mapama
- prikaz špeditera, carine, partnera i lokacije kada postoje u route stop odgovoru

Ograničenja:

- `GET /api/tours/:id` ne vraća pune `routeStops`, puna dokumenta ni pune freight order podatke
- `GET /api/freight-orders` trenutno nema direktan `tourId` filter
- kontakt osoba/telefon zavise od toga da li su uneseni i vraćeni kroz povezane entitete
- koordinate nisu garantovane na svakoj stanici

Predlog dopune:

- proširiti mobile tour detail endpoint ili napraviti `GET /api/mobile/tours/:id`
- u jednom odgovoru vratiti:
  - tour
  - routeStops
  - documents
  - freightOrders / naloge za utovar
  - customs office / forwarder
  - partner/location podatke
  - notes

## Driver road tools

### Sledeća stanica

Status: može se implementirati sada.

Potrebno:

- učitati `/api/route-stops?tourId=...`
- sortirati po `sequence`
- pronaći prvu stanicu koja nije završena/otkazana
- prikazati "šta, gde, kada, kome se javlja"

### Navigacija i kontakt

Status: uglavnom može sada.

Može:

- otvoriti mapu iz adrese, grada i države
- pozvati telefon ako postoji
- prikazati partnera, špeditera ili carinu ako postoje

Treba dopuniti ako želimo preciznije:

- garantovati latitude/longitude u route stop odgovoru
- dodati standardizovana polja `contactName` i `contactPhone` po stanici

### Akcije na stanici

Status: delimično može sada.

Postoji `PATCH /api/route-stops/:id`, pa vozač može da menja:

- `status`
- `arrivalTime`
- `departureTime`
- `notes`

Važno ograničenje:

- endpoint trenutno prima i administrativna polja kao `locationId`, `sequence`, planirana vremena i slično
- za mobilnog vozača treba ograničiti dozvoljena polja na bezbedan skup

Predlog dopune:

- dodati poseban endpoint:

```text
POST /api/mobile/route-stops/:id/actions
```

Primer payload-a:

```json
{
  "action": "ARRIVED",
  "timestamp": "2026-06-04T12:00:00.000Z",
  "latitude": 44.8125,
  "longitude": 20.4612,
  "note": "Stigao na rampu 3"
}
```

Time backend može da vodi istoriju događaja, ne samo poslednje stanje stanice.

### Checklist

Status: nema pravi backend.

Može privremeno:

- mobilna aplikacija može lokalno da prikaže generičku checklistu
- može da proveri da li postoje dokumenta, troškovi i stanice

Za ozbiljnu upotrebu treba:

- model za checklist template
- model za checklist completion po turi/vozaču
- endpointi:
  - `GET /api/mobile/tours/:id/checklist`
  - `PATCH /api/mobile/tours/:id/checklist/:itemId`

### Prijava problema

Status: nema namenski backend.

Može privremeno:

- zapisati napomenu na stanicu ili turu, ali to nije dovoljno dobro za operativni rad

Treba dodati:

- model za driver issue / incident
- endpoint:

```text
POST /api/mobile/tours/:id/issues
```

Primer:

```json
{
  "type": "DELAY",
  "title": "Kašnjenje na utovaru",
  "description": "Čekam rampu više od sat vremena",
  "stopId": "route-stop-id",
  "severity": "NORMAL"
}
```

Poželjno:

- slanje push/web obaveštenja dispečeru
- status rešavanja
- povezivanje sa dokumentima/slikama

### Offline rad

Status: delimično moguće.

Mobilna aplikacija već može da kešira podatke i šalje queue za neke stvari. Backend može da primi postojeće PATCH/POST pozive kada mreža dođe.

Za pouzdano offline slanje treba:

- stabilni mobilni action endpointi
- idempotency key po akciji
- jasno pravilo šta se dešava ako je stanica u međuvremenu promenjena na webu

### Kamera, dokumenta i PDF

Status: uglavnom može sada.

Postoji upload/presign i documents API. Mobilna strana može da doda:

- slikanje dokumenta
- upload
- povezivanje sa turom
- prikaz dokumenata

Za bolji UX:

- jasno definisati dozvoljene `documentType` vrednosti za vozača
- dodati validaciju obaveznih dokumenata po tipu ture

### Geofence

Status: delimično.

Može privremeno:

- mobilna aplikacija može da koristi koordinate lokacije ako ih dobije
- ako nema koordinata, može koristiti adresu samo za navigaciju

Treba dopuniti:

- route stop odgovor treba da garantuje koordinate kada postoje
- dodati `geofenceRadiusMeters`
- dodati backend event za automatski dolazak/odlazak ako se to želi pratiti

### SOS / hitna pomoć

Status: nema namenski backend.

Može lokalno:

- dugme može da pozove unapred definisan broj

Za operativni sistem treba:

- endpoint:

```text
POST /api/mobile/sos
```

Treba čuvati:

- korisnika/vozača
- turu
- GPS lokaciju
- vreme
- opis
- status

I treba obavestiti dispečera push/web notifikacijom.

## Role-based configurable mobile interface

### Šta može odmah

Može se napraviti frontend struktura:

- `Home`
- `Profile`
- konfigurabilni moduli između njih
- maksimalno 8 izabranih stavki
- kada ima više od 5 stavki, srednji slice/circle selector
- prikaz modula po ulozi kao početno pravilo

Primer modula koji već imaju ili mogu brzo dobiti API osnovu:

- Ture
- Poruke
- Obaveštenja
- Dokumenta
- Vozila
- Prikolice
- Vozači
- Partneri
- Finansije, samo ako backend permissions dozvole i ako se izabere konkretan skup API-ja

### Šta treba pre ozbiljne implementacije

Backend treba da pošalje efektivne permissions za korisnika. Ne treba samo gledati `role`, jer realna prava mogu biti uža ili šira od role.

Predlog:

```text
GET /api/mobile/profile
```

Odgovor:

```json
{
  "user": {
    "id": "user-id",
    "name": "Ime Prezime",
    "role": "USER",
    "driverId": "driver-id",
    "companyId": "company-id"
  },
  "permissions": {
    "tours": ["read"],
    "documents": ["read"],
    "finance": []
  },
  "availableMobileModules": [
    "tours",
    "chat",
    "notifications",
    "documents"
  ],
  "preferences": {
    "selectedModules": ["tours", "chat", "notifications"],
    "moduleOrder": ["tours", "chat", "notifications"]
  }
}
```

Backend tako ostaje izvor istine, a mobilna aplikacija samo prikazuje ono što korisnik sme da vidi.

## Chat i notifikacije

Postoji:

- backend šalje Expo push za chat poruku
- payload sadrži:

```json
{
  "type": "CHAT_MESSAGE",
  "threadId": "...",
  "messageId": "...",
  "senderId": "..."
}
```

Može odmah:

- prikazati sistemsku push notifikaciju na telefonu
- povećati badge u aplikaciji ako mobilna aplikacija invalidira thread listu
- na klik otvoriti konkretan chat thread
- izbeći stalni polling

Napomena:

- backend i dalje kreira DB Notification za chat poruku
- mobilna aplikacija sada ne treba da prikazuje chat DB notifikacije u ekranu "Obaveštenja", jer za to već postoji "Poruke"

## Obaveštenja i mark all read

Postoji:

- `PATCH /api/notifications/:id` za pojedinačno označavanje kao pročitano
- `POST /api/notifications/mark-all-read`

Problem:

- `POST /api/notifications/mark-all-read` traži `notifications:update`
- običan `USER` ima samo `notifications:read`
- zato mobilna aplikacija dobija `Forbidden`

Trenutno rešenje u mobilnoj aplikaciji:

- "Označi sve pročitano" ide preko pojedinačnih PATCH poziva za nepročitane non-chat notifikacije

Predlog backend dopune:

- dozvoliti korisniku self-service bulk read za sopstvene notifikacije
- endpoint ne treba da traži globalni `notifications:update` ako menja samo `isRead` za sopstvene notifikacije

## Važna sigurnosna napomena

Za mobilnu aplikaciju nije dovoljno da endpoint proveri samo company scope. Za običnog vozača backend treba dodatno da ograniči podatke na njegove ture i njegove stanice.

Proveriti posebno:

- `GET /api/tours/:id`
- `GET /api/route-stops?tourId=...`
- `PATCH /api/route-stops/:id`
- `GET /api/documents?relatedType=tour&relatedId=...`

Rizik:

- ako korisnik zna ID tuđe ture ili stanice u istoj firmi, može potencijalno da vidi ili izmeni više nego što treba

Predlog:

- za `USER` sa `driverId`, dozvoliti samo ture gde je `tour.driverId == user.driverId`
- za route stop update dozvoliti samo status/arrival/departure/driver note
- za admin/manager ostaviti šira prava po postojećim permissions pravilima

## Preporučeni redosled implementacije

1. Završiti vozački "Detaljnije" ekran sa postojećim endpointima.
2. Dodati "Sledeća stanica" i akcije dolazak/odlazak preko postojećeg `PATCH /api/route-stops/:id`, uz backend ograničenje polja za vozača.
3. Dodati backend mobile profile sa permissions i available modules.
4. Dodati mobile preferences za izabrane module i redosled.
5. Implementirati configurable navigation i slice selector.
6. Dodati posebne backend modele za checklist, prijavu problema, SOS i event log stanice.

