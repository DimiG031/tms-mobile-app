# Mobilna navigacija

## Pregled

Mobilna navigacija koristi module koje backend dozvoli korisniku. Početna i Profil ostaju fiksni, dok se ostali moduli biraju kroz podešavanja.

---

## Šta možete

* prikaz modula na osnovu `availableMobileModules`
* izbor najviše osam modula
* čuvanje izabranih modula
* čuvanje redosleda modula
* klasična donja navigacija kada ima do pet modula
* slice navigacija kada ima više modula
* izbor modula okretanjem točka
* otvaranje modula tek kada korisnik potvrdi izbor

---

## API oslonac

* `GET /api/mobile/profile`
* `PATCH /api/mobile/preferences`

---

## UX pravila

* ne otvarati ekran automatski dok korisnik samo okreće točak
* ne duplirati module koji već postoje kao fiksni tabovi
* labela je prikazana za fokusirani modul
* bočne opcije mogu biti prikazane sa manjom neprozirnošću

---

## Zaključak

Navigacija treba da ostane brza i jasna, čak i kada korisnik ima više od pet dostupnih mobilnih modula.

