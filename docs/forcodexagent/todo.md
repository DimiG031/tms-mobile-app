# Coordination TODO za Codex agente

Ovaj dokument služi kao ručni most između mobilnog projekta i backend projekta.

Mobilni projekat:

```text
C:\Users\goran\Documents\TMS-mobile-app
```

Backend projekat:

```text
C:\Users\goran\transport-website-app
```

Ideja:

- Codex u mobilnom projektu upisuje šta mu treba od backenda.
- Codex u backend projektu pročita zadatke, implementira šta može i upiše šta je urađeno.
- Codex u mobilnom projektu zatim pročita odgovor i nastavi mobilnu implementaciju.
- Dokument treba održavati kratko, konkretno i ažurno.

## Pravila za oba agenta

1. Koristiti srpsku latinicu bez mojibake.
2. Ne brisati istoriju odluka ako nije zastarela; bolje dodati status i datum.
3. Za svaku stavku napisati status:
   - `TODO`
   - `IN_PROGRESS`
   - `DONE`
   - `BLOCKED`
   - `NEEDS_MOBILE`
   - `NEEDS_BACKEND`
4. Kada je nešto implementirano, navesti:
   - endpoint ili fajl
   - očekivani payload
   - kratak opis ponašanja
   - šta mobilna aplikacija treba da promeni
5. Ako API nije moguće uraditi odmah, napisati najmanju korisnu alternativu.

## Trenutni izvor detaljnog audita

Mobilni audit dokument:

```text
C:\Users\goran\Documents\TMS-mobile-app\docs\todo\mobile-backend-capability-audit.md
```

Backend agent treba prvo da pročita taj dokument.

## Zadaci za backend agenta

### 1. Mobile profile i permissions

Status: `TODO`

Potrebno:

- Dodati ili proširiti endpoint koji mobilnoj aplikaciji vraća:
  - `user.id`
  - `user.name`
  - `user.email`
  - `user.role`
  - `user.companyId`
  - `user.driverId`
  - efektivne permissions
  - listu dozvoljenih mobilnih modula
  - mobilna podešavanja za izabrane module

Predlog endpointa:

```text
GET /api/mobile/profile
```

Primer odgovora:

```json
{
  "user": {
    "id": "user-id",
    "name": "Ime Prezime",
    "email": "user@example.com",
    "role": "USER",
    "companyId": "company-id",
    "driverId": "driver-id"
  },
  "permissions": {
    "tours": ["read"],
    "documents": ["read"],
    "notifications": ["read"]
  },
  "availableMobileModules": ["tours", "chat", "notifications", "documents"],
  "preferences": {
    "selectedModules": ["tours", "chat", "notifications"],
    "moduleOrder": ["tours", "chat", "notifications"],
    "sliceNavigationEnabled": true
  }
}
```

Kada backend završi:

- upisati tačan endpoint
- upisati tačan response shape
- navesti da li mobile treba da koristi novi endpoint ili postojeći `mobile-login` / `profile`

### 2. Mobile preferences za konfigurabilni interfejs

Status: `TODO`

Potrebno:

- Omogućiti čuvanje izbora mobilnih modula:
  - `selectedModules`
  - `moduleOrder`
  - `sliceNavigationEnabled`

Moguće opcije:

- proširiti postojeći `/api/user-settings`
- ili dodati poseban endpoint:

```text
PATCH /api/mobile/preferences
```

Važno:

- backend treba da validira da korisnik bira samo module za koje ima dozvolu
- maksimalno 8 izabranih modula
- `home` i `profile` su fiksni u mobilnoj aplikaciji i ne moraju biti deo izbora

### 3. Ograničenje podataka za vozača

Status: `TODO`

Potrebno:

- Za običnog vozača ne sme biti dovoljno da je podatak u istoj firmi.
- Vozač treba da vidi i menja samo svoje ture i svoje stanice.

Proveriti i po potrebi ograničiti:

```text
GET /api/tours/:id
GET /api/route-stops?tourId=...
PATCH /api/route-stops/:id
GET /api/documents?relatedType=tour&relatedId=...
```

Pravilo:

- ako je korisnik `USER` i ima `driverId`, dozvoliti samo ture gde je `tour.driverId == user.driverId`
- admin/manager zadržavaju šira prava po postojećem permissions sistemu

### 4. Akcije na stanici za mobilnog vozača

Status: `TODO`

Postojeći `PATCH /api/route-stops/:id` može privremeno da radi, ali prima previše administrativnih polja.

Predlog:

```text
POST /api/mobile/route-stops/:id/actions
```

Primer payload-a:

```json
{
  "action": "ARRIVED",
  "timestamp": "2026-06-05T10:30:00.000Z",
  "latitude": 44.8125,
  "longitude": 20.4612,
  "note": "Stigao na utovar"
}
```

Podržane akcije:

- `ARRIVED`
- `DEPARTED`
- `CANCELED`
- `NOTE`

Backend treba da:

- proveri da stanica pripada turi dodeljenoj vozaču
- ažurira status i vreme
- po mogućnosti upiše event istoriju

Ako event istorija trenutno ne postoji, napisati da je urađen samo status update.

### 5. SOS za mobilnu aplikaciju

Status: `TODO`

Potrebno:

```text
POST /api/mobile/sos
```

Primer payload-a:

```json
{
  "tourId": "tour-id",
  "latitude": 44.8125,
  "longitude": 20.4612,
  "message": "Hitna pomoć potrebna",
  "timestamp": "2026-06-05T10:30:00.000Z"
}
```

Backend treba da sačuva:

- korisnika/vozača
- turu ako postoji
- GPS lokaciju ako postoji
- poruku
- vreme
- status

Poželjno:

- obavestiti dispečera/admina kroz DB Notification
- ako postoji push sistem za web/mobile, poslati hitnu notifikaciju odgovornima

### 6. Prijava problema sa ture

Status: `TODO`

Predlog:

```text
POST /api/mobile/tours/:id/issues
```

Primer payload-a:

```json
{
  "type": "DELAY",
  "title": "Kašnjenje na utovaru",
  "description": "Čekam rampu više od sat vremena",
  "stopId": "route-stop-id",
  "severity": "NORMAL"
}
```

Tipovi mogu biti:

- `DELAY`
- `ACCIDENT`
- `DOCUMENT_PROBLEM`
- `VEHICLE_PROBLEM`
- `CUSTOMS_PROBLEM`
- `OTHER`

Backend treba da vrati ID prijave i status.

### 7. Checklist za vozača

Status: `TODO`

Predlog endpointa:

```text
GET /api/mobile/tours/:id/checklist
PATCH /api/mobile/tours/:id/checklist/:itemId
```

Koristi se za:

- dokumenta spremna
- vozilo provereno
- prikolica proverena
- CMR
- nalog za utovar
- carinska dokumenta
- potvrda završetka stanice

Ako backend ne može odmah da doda checklist model, mobilna aplikacija može privremeno da ima lokalnu/generičku checklistu.

### 8. Mark all notifications read za korisnika

Status: `TODO`

Problem:

- `POST /api/notifications/mark-all-read` trenutno vraća `Forbidden` za običnog `USER`
- razlog je što traži globalni `notifications:update`
- mobilna aplikacija trenutno obilazi problem pojedinačnim `PATCH /api/notifications/:id`

Predlog:

- dozvoliti self-service bulk read za sopstvene notifikacije
- endpoint treba da menja samo notifikacije ulogovanog korisnika

## Odgovor backend agenta

Backend agent treba da popuni ovaj deo kada nešto uradi.

### Implementirano

Nema još upisa.

### Blokirano

Nema još upisa.

### Preporuke backend agenta za mobilnu aplikaciju

Nema još upisa.

## Zadaci za mobilnog agenta posle backend odgovora

Status: `WAITING_FOR_BACKEND`

Kada backend agent upiše šta je implementirano:

1. Pročitati tačne endpoint-e i response shape.
2. Dodati API metode u mobilnoj aplikaciji.
3. Povezati mobile profile sa navigacijom i dozvoljenim modulima.
4. Povezati mobile preferences sa profile settings ekranom.
5. Povezati route stop actions sa dugmadima na turi.
6. Dodati SOS i prijavu problema kada backend endpointi budu dostupni.
7. Ažurirati ovaj dokument statusom šta je urađeno na mobilnoj strani.

