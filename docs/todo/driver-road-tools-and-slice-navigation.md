# Predlog: praktični alati za vozača i slice navigacija

## Status

Ideja za buduću implementaciju. Dokument definiše preporučene funkcije, UX smernice i faze rada.

## Cilj

Vozaču tokom ture treba omogućiti da sa što manje dodira vidi sledeću obavezu, pokrene navigaciju, kontaktira odgovornu osobu, prijavi dolazak ili problem i završi potrebnu dokumentaciju.

Interfejs mora biti praktičan za korišćenje na telefonu, sa velikim komandama i bez potrebe da vozač traži informacije kroz više ekrana.

## Glavni ekran aktivne ture

Na vrhu početnog ekrana prikazati aktivnu turu i sledeću relevantnu stanicu.

Prikazati:

- relaciju ture
- trenutni status
- sledeću stanicu
- tip stanice
- adresu
- planirano vreme dolaska
- kontakt osobu i telefon
- važnu napomenu za vozača
- dokumenta ili obaveze koje nedostaju

Glavne akcije:

- `Pokreni navigaciju`
- `Pozovi kontakt`
- `Stigao sam`
- `Prijavi problem`
- `Detaljnije`

## Slice navigacija

Slice navigacija predstavlja kružni ili polukružni selektor podeljen na segmente. Svaki segment predstavlja jednu važnu stranicu ili akciju.

Za vozača slice selektor ne treba da zameni potpuno osnovnu donju navigaciju. Treba ga koristiti kao brzi kontekstualni meni za aktivnu turu.

Predlog segmenata:

```text
Sledeća stanica
Navigacija
Status stanice
Dokumenta
Troškovi
Problem
Poruke
Detaljnije
```

Pravila:

- maksimalno 8 segmenata
- segmenti zavise od trenutnog konteksta i dostupnih podataka
- aktivni segment mora biti jasno označen
- rotacija ili prevlačenje bira segment
- dodir na segment odmah otvara stranicu ili akciju
- centralni deo kruga može prikazati naziv trenutno izabranog segmenta
- selektor mora imati vibraciju pri prelasku na sledeći segment
- mora postojati obična lista kao pristupačna alternativa
- kritične akcije ne izvršavati direktno iz slice selektora bez potvrde

Primer:

```text
Početna | [slice aktivne ture] | Profil
```

Kada nema aktivne ture, slice selektor može prikazivati opšte module:

```text
Ture
Poruke
Obaveštenja
Dokumenta
Profil vozila
```

## Akcije i statusi stanice

Za svaku stanicu omogućiti akcije prema njenom tipu:

- `Stigao sam`
- `Počeo utovar`
- `Završen utovar`
- `Počeo istovar`
- `Završen istovar`
- `Završena carina`
- `Napustio sam lokaciju`

Prilikom akcije sačuvati:

- vreme
- trenutnu GPS lokaciju
- korisnika koji je izvršio akciju
- opcionu napomenu
- opcione fotografije

Vozaču prikazati samo akcije koje su dozvoljene za trenutni status stanice.

## Navigacija i kontakti

Za stanicu omogućiti:

- otvaranje Google Maps na Android uređajima
- otvaranje Apple Maps na iOS uređajima
- izbor druge instalirane navigacione aplikacije ako je dostupna
- pozivanje kontakta jednim dodirom
- kopiranje adrese ili telefona

Pre pokretanja navigacije prikazati tačnu adresu i naziv lokacije.

## Checklist ture

Checklist treba da prikaže koje obaveze moraju biti završene pre zatvaranja ture ili stanice.

Primer stavki:

- CMR dodat
- nalog za utovar pregledan
- fotografija utovarene robe
- carinska dokumenta dodata
- potvrda istovara dodata
- svi troškovi uneti
- troškovnik predat

Stavke mogu biti:

- automatski potvrđene na osnovu postojećih podataka
- ručno potvrđene od strane vozača
- obavezne ili opcione

## Brza prijava problema

Dodati veliku akciju `Prijavi problem`.

Kategorije:

- kašnjenje
- kvar vozila
- problem sa prikolicom
- čekanje na utovar ili istovar
- čekanje na granici
- problem sa dokumentima
- odbijen utovar ili istovar
- nezgoda
- ostalo

Prijava može sadržati:

- kratku poruku
- trenutnu lokaciju
- fotografije
- procenjeno trajanje kašnjenja
- oznaku hitnosti

Nakon slanja:

- dispečer dobija obaveštenje
- događaj se vezuje za turu i stanicu
- vozač vidi status prijave

## Offline režim

Bez interneta moraju ostati dostupni:

- aktivna tura
- stanice i njihove adrese
- kontakti
- osnovna dokumenta koja su prethodno preuzeta
- checklist

Offline red treba da podrži:

- promenu statusa stanice
- prijavu problema
- dodavanje napomene
- fotografije i dokumenta
- troškove

Vozaču jasno prikazati:

- šta je sačuvano lokalno
- šta čeka slanje
- šta nije uspelo da se pošalje
- kada je poslednja sinhronizacija završena

## Geofence predlog dolaska

Kada uređaj uđe u definisani radijus stanice, aplikacija može prikazati:

```text
Izgleda da ste stigli na lokaciju.
Da li želite da označite dolazak?
```

Pravila:

- status se ne menja automatski bez potvrde vozača
- radijus mora biti konfigurabilan
- izbegavati ponavljanje istog predloga
- funkcija mora poštovati dozvole lokacije i štednju baterije
- geofence koristiti samo za aktivnu ili sledeću stanicu

## Dokumenta kamerom

Poboljšati unos dokumenata:

- fotografisanje dokumenta
- automatsko isecanje ivica
- poboljšanje kontrasta i čitljivosti
- više fotografija spojeno u jedan PDF
- izbor tipa dokumenta pre slanja
- pregled pre potvrde

Podržani tipovi:

- CMR
- nalog za utovar
- potvrda utovara
- potvrda istovara
- carinski dokument
- račun
- ostalo

## SOS i hitni kontakt

Dodati dostupnu, ali zaštićenu SOS akciju:

- poziv dispečeru
- slanje trenutne lokacije
- unapred definisana hitna poruka
- mogućnost dodavanja kratkog opisa

SOS akcija mora zahtevati potvrdu da bi se sprečilo slučajno aktiviranje.

## Backend zahtevi

Potrebno je proveriti ili dodati:

- promenu statusa stanice za vozača
- evidentiranje vremena i GPS lokacije akcije
- checklist model ili izvedeni checklist odgovor
- model prijave problema
- push obaveštenje dispečeru
- povezivanje problema sa turom i stanicom
- status obrade prijavljenog problema
- geofence koordinate i radijus stanice
- označavanje obaveznih dokumenata

Predlog novih endpointa:

```text
PATCH /api/route-stops/:id/status
GET   /api/tours/:id/checklist
POST  /api/tours/:id/issues
GET   /api/tours/:id/issues
PATCH /api/tours/:id/issues/:issueId
```

## Faze implementacije

### Faza 1: sledeća stanica

- prikaz sledeće stanice na početnoj
- adresa, vreme, kontakt i napomena
- navigacija i poziv kontakta
- osnovni slice prototip

Procena: 2–4 radna dana.

### Faza 2: statusi stanice

- akcije prema tipu i statusu stanice
- vreme i GPS lokacija akcije
- ciljano osvežavanje podataka
- potvrda kritičnih promena

Procena: 3–5 radnih dana, uz spreman backend.

### Faza 3: prijava problema

- kategorije problema
- poruka, fotografija i lokacija
- push obaveštenje dispečeru
- pregled statusa prijave

Procena: 3–5 radnih dana.

### Faza 4: checklist

- prikaz obaveznih koraka
- automatske i ručne stavke
- blokiranje završetka kada nedostaje obavezna stavka

Procena: 3–5 radnih dana.

### Faza 5: napredni offline režim

- offline akcije stanice
- offline prijava problema
- red za fotografije i dokumenta
- konflikt i retry UX

Procena: 4–7 radnih dana.

### Faza 6: dokumenti kamerom i geofence

- skeniranje i spajanje u PDF
- geofence predlog dolaska
- testiranje baterije i ponašanja u pozadini

Procena: 1–2 nedelje.

## Preporučeni prvi paket

Prva korisna verzija treba da obuhvati:

```text
Sledeća stanica
Navigacija
Poziv kontakta
Status stanice
Prijava problema
Osnovni slice selektor
```

Ukupna procena: 7–12 radnih dana, ako su potrebni backend endpointi spremni.

## Otvorena pitanja

1. Da li slice selektor menja samo stranice aktivne ture ili i glavne module aplikacije?
2. Da li akcije statusa stanice menjaju i status cele ture?
3. Koje akcije vozač sme da izvrši bez potvrde dispečera?
4. Koje checklist stavke blokiraju završetak ture?
5. Koji je minimalni offline paket podataka koji mora biti dostupan?
6. Da li prijava problema zahteva odgovor dispečera?
7. Da li se geofence koristi samo za sledeću stanicu ili sve stanice aktivne ture?

## Preporuka

Slice metod koristiti za brzo menjanje stranica i akcija unutar aktivne ture. `Početna` i `Profil` treba da ostanu fiksni, dok srednji slice selektor daje brz pristup kontekstualnim funkcijama vozača.

Pre pune implementacije napraviti mali interaktivni prototip slice selektora i testirati ga sa stvarnim vozačima.
