# Predlog: mobilni interfejs prema dozvolama korisnika

## Status

Delimično implementirano.

Urađeno 2026-06-05:

- mobilna aplikacija koristi `GET /api/mobile/profile` kao izvor za dostupne module i preferences
- dodat je `PATCH /api/mobile/preferences` kroz UI u Profilu
- korisnik može da izabere module, promeni redosled i uključi `sliceNavigationEnabled`
- tab navigacija koristi `selectedModules` i `moduleOrder`
- dodat je top-level `Dokumenta` ekran
- kada je uključen slice mode i ima više od 5 top-level modula, `Više` u donjoj navigaciji prikazuje wheel picker iznad tab bara

Još nije urađeno:

- pravi inertial/spin efekat wheel selector-a
- top-level ekrani za module koji još nemaju mobilnu implementaciju, npr. finansije
- dublje prilagođavanje početne strane po tipu korisnika
- inertial/spin animacija za wheel picker

## Cilj

Omogućiti da mobilnu aplikaciju koriste i korisnici koji nisu vozači, bez kopiranja kompletnog web admin interfejsa.

Nakon prijave aplikacija treba da pročita profil, ulogu i efektivne dozvole korisnika iz glavne aplikacije. Korisniku se zatim nude samo moduli za koje ima dozvolu čitanja.

Korisnik u podešavanjima profila bira koje module želi da vidi u glavnoj navigaciji.

## Osnovna pravila

- `Početna` je uvek fiksirana sa leve strane navigacije.
- `Profil` je uvek fiksiran sa desne strane navigacije.
- Korisnik može izabrati najviše 8 dodatnih ili ukupnih navigacionih stavki. Tačno pravilo treba potvrditi pre implementacije.
- Modul se može ponuditi samo ako korisnik ima potrebnu backend dozvolu.
- Izbor modula utiče samo na prikaz i navigaciju. Ne sme menjati niti zaobilaziti backend RBAC.
- Ako korisnik izgubi dozvolu, modul mora automatski nestati iz navigacije i sačuvanih podešavanja.
- Ako korisnik dobije novu dozvolu, novi modul postaje dostupan u podešavanjima, ali se ne dodaje automatski.
- Podešavanja se čuvaju po korisniku, ne po uređaju ili ulozi.

## Primer dostupnih modula

Ponuda zavisi od efektivnih dozvola korisnika:

| Modul | Potrebna dozvola |
|---|---|
| Ture | `tours:read` |
| Poruke | pristup chat-u |
| Obaveštenja | `notifications:read` |
| Finansije | odgovarajuća finansijska `read` dozvola |
| Vozila | `vehicles:read` |
| Vozači | `drivers:read` |
| Prikolice | `trailers:read` |
| Dokumenta | `documents:read` |
| Troškovnici | odgovarajuća expense `read` dozvola |
| Nalozi za utovar | `freightOrders:read` |
| Stanice ture | `routeStops:read` |
| Carina / špedicija | odgovarajuća customs/forwarder `read` dozvola |

Nazivi dozvola moraju biti potvrđeni prema stvarnim resursima u glavnoj aplikaciji.

## Podešavanja u profilu

U okviru ekrana `Profil` dodati sekciju `Podešavanje pregleda`.

Sekcija prikazuje:

- sve module koje korisnik sme da vidi
- uključeno/isključeno stanje svakog modula
- redosled izabranih modula
- broj trenutno izabranih stavki
- ograničenje od maksimalno 8 stavki

Kontrole:

- prekidač za uključivanje modula
- drag-and-drop ili strelice za menjanje redosleda
- dugme `Vrati podrazumevani raspored`

`Početna` i `Profil` se prikazuju kao fiksirane stavke koje korisnik ne može isključiti ili pomeriti.

## Navigacija do pet stavki

Kada ukupan broj prikazanih stavki odgovara standardnoj donjoj navigaciji, koristiti običan tab bar.

Primer:

```text
Početna | Ture | Poruke | Obaveštenja | Profil
```

## Navigacija sa više od pet stavki

Kada korisnik izabere više stavki nego što staje u standardni tab bar:

- `Početna` ostaje fiksirana levo
- `Profil` ostaje fiksiran desno
- u sredini se prikazuje kružno dugme
- kružno dugme je podeljeno na onoliko segmenata koliko ima izabranih promenljivih modula
- svaki segment predstavlja jedan modul
- korisnik okretanjem ili prevlačenjem kružnog selektora bira aktivni modul
- dodir na segment odmah otvara modul
- izabrani segment mora imati jasan naziv i ikonu

Primer:

```text
Početna | [kružni selektor modula] | Profil
```

Kružni selektor mora imati i pristupačnu alternativu:

- dodir otvara listu svih izabranih modula
- korisnik može izabrati modul iz obične liste
- navigacija mora biti moguća bez preciznog kružnog pokreta

## Predlog ponašanja kružnog selektora

- Maksimalno 6 promenljivih segmenata ako su `Početna` i `Profil` deo ukupnog ograničenja od 8.
- Svaki segment koristi poznatu ikonu i kratku oznaku.
- Trenutno aktivan modul je vizuelno naglašen.
- Rotacija ima blago pozicioniranje na najbliži segment.
- Ne koristiti kružni selektor dok korisnik ima pet ili manje ukupnih stavki.
- Na manjim ekranima prikazati samo ikone unutar kruga, a naziv aktivnog modula iznad navigacije.

Pre implementacije potrebno je napraviti interaktivni prototip i proveriti ergonomiju na telefonu.

## Backend zahtevi

Mobilna aplikacija mora dobiti efektivne dozvole korisnika, ne samo naziv uloge.

Predlog endpointa:

```text
GET /api/auth/mobile-profile
```

Predlog odgovora:

```json
{
  "ok": true,
  "data": {
    "user": {
      "id": "user-id",
      "name": "Ime korisnika",
      "email": "korisnik@example.com",
      "role": "MANAGER",
      "companyId": "company-id",
      "driverId": null
    },
    "permissions": {
      "tours": ["read", "update"],
      "vehicles": ["read"],
      "drivers": ["read"],
      "notifications": ["read"],
      "freightOrders": ["read"],
      "finance": ["read"]
    },
    "mobilePreferences": {
      "selectedModules": ["tours", "vehicles", "notifications", "finance"],
      "moduleOrder": ["tours", "vehicles", "notifications", "finance"]
    }
  }
}
```

Za čuvanje podešavanja može se koristiti:

```text
PATCH /api/auth/mobile-profile/preferences
```

Primer tela:

```json
{
  "selectedModules": ["tours", "vehicles", "notifications", "finance"],
  "moduleOrder": ["tours", "vehicles", "notifications", "finance"]
}
```

Backend mora ponovo validirati da korisnik ima dozvolu za svaki sačuvani modul.

## Bezbednost

- Skrivanje modula u mobilnoj aplikaciji nije bezbednosna kontrola.
- Svaki API endpoint mora nastaviti da proverava efektivne dozvole.
- Mobile preference endpoint ne sme dozvoliti čuvanje modula za koji korisnik nema `read` dozvolu.
- Promena uloge ili dozvola mora invalidirati mobile profil i navigaciju.
- Kompanijski i korisnički scope moraju se proveravati na svakom endpointu.

## Predlog arhitekture mobilne aplikacije

```text
app/(driver)/...
app/(workspace)/...
```

- Postojeći vozački interfejs ostaje optimizovan za vozača.
- Novi `(workspace)` interfejs koristi permission-driven navigaciju za ostale korisnike.
- Zajednički moduli poput chata, profila i obaveštenja koriste iste query-je i servise.
- Posle prijave aplikacija bira odgovarajući interfejs na osnovu profila i efektivnih dozvola.

Alternativa je jedan zajednički interfejs za sve korisnike, ali to nosi veći rizik da vozački tok postane previše složen.

## Faze implementacije

### Faza 1: profil i dozvole

- Dodati mobile profile endpoint.
- Vratiti efektivne dozvole korisnika.
- Ukloniti trenutno automatsko odjavljivanje ADMIN/MANAGER korisnika bez `driverId`.
- Uvesti usmeravanje prema odgovarajućem interfejsu.

### Faza 2: podešavanje navigacije

- Dodati `Podešavanje pregleda` u Profil.
- Omogućiti izbor i redosled modula.
- Čuvati preference po korisniku.
- Validirati maksimalan broj stavki.

### Faza 3: standardna permission-driven navigacija

- Napraviti običan tab bar za do pet stavki.
- Implementirati prve module za ADMIN/MANAGER:
  - Početna
  - Ture
  - Poruke
  - Obaveštenja
  - Profil

### Faza 4: kružni selektor

- Napraviti prototip kružne navigacije.
- Testirati na Android i iOS uređajima.
- Dodati pristupačnu listu kao alternativu.
- Aktivirati samo kada standardni tab bar nije dovoljan.

### Faza 5: dodatni moduli

- Finansije
- Vozila
- Vozači
- Nalozi za utovar
- Dokumenta
- Carina i špedicija

## Otvorena pitanja

1. Da li ograničenje od 8 uključuje fiksne stavke `Početna` i `Profil`?
2. Da li se preference čuvaju na backendu ili samo lokalno?
3. Koji finansijski moduli su dovoljno bezbedni i praktični za telefon?
4. Da li SUPERADMIN treba da koristi mobilni workspace ili ostaje samo na web aplikaciji?
5. Da li ADMIN/MANAGER mogu menjati podatke ili je prva verzija read-only?
6. Da li kružni selektor treba da podržava samo rotaciju ili i običan dodir na segment?
7. Koji moduli treba da budu podrazumevano uključeni prema ulozi?

## Preporuka

Prvu verziju napraviti za ADMIN/MANAGER kao read-only operativni pregled sa običnom navigacijom. Permission-driven podešavanja dodati odmah, a kružni selektor tek nakon testiranja prototipa sa stvarnim korisnicima.
