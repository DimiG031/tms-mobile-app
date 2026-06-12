# Autentifikacija i mobilni profil

## Pregled

Mobilna aplikacija koristi poseban login tok i centralni mobilni profil kao izvor istine za korisnika, dozvole, firmu, vozača i dostupne module.

---

## Šta možete

* prijava korisnika preko email adrese i lozinke
* čuvanje access tokena i refresh tokena u sigurnom storage-u
* učitavanje centralnog profila posle login-a
* prikaz korisnika, firme i povezanog vozača
* određivanje dostupnih mobilnih modula na osnovu backend dozvola
* registracija Expo push tokena za mobilna obaveštenja
* brisanje tokena i sesije pri odjavi

---

## API oslonac

* `POST /api/auth/mobile-login`
* `GET /api/mobile/profile`
* `POST /api/users/:id/push-token`
* `DELETE /api/users/:id/push-token`

---

## Prednosti

* mobilna aplikacija ne mora da pogađa ulogu korisnika lokalno
* backend odlučuje koje module korisnik sme da vidi
* isti login tok može da podrži vozača i buduće administrativne mobilne korisnike

---

## Zaključak

Mobilni profil je glavni ugovor između backend-a i mobilne aplikacije za identitet, dozvole i konfiguraciju interfejsa.

