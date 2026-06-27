# Odnos web i mobilne aplikacije

Mobilna aplikacija je deo sireg **SoftechRS TMS** sistema. Ne treba je posmatrati kao odvojenu uslugu bez veze sa web aplikacijom, jer koristi iste poslovne entitete, iste klijente i isti backend/API sloj.

## 1. Web aplikacija

Web aplikacija je glavna administrativna aplikacija.

U web aplikaciji se vode ili mogu voditi:

- firme i korisnici;
- role i dozvole;
- vozaci;
- zaposleni;
- vozila;
- prikolice;
- ture;
- stanice;
- nalozi za prevoz/utovar;
- posiljke;
- dokumenta;
- troskovi;
- fakture i finansije;
- notifikacije;
- chat;
- mape/GPS;
- tahograf i radni sati ako postoje u sistemu;
- podesavanja firme;
- superadmin i support funkcije.

Web aplikacija je mesto gde administratori, dispeceri i menadzeri najcesce unose i obradjuju podatke.

## 2. Mobilna aplikacija

Mobilna aplikacija je namenjena vozacima ili terenskim korisnicima.

U mobilnoj aplikaciji korisnik moze:

- da se prijavi;
- da vidi svoj profil i povezane podatke;
- da vidi svoje ture;
- da vidi detalje tura i stanica;
- da vidi i salje dokumenta;
- da evidentira troskove;
- da primi operativna obavestenja;
- da koristi chat;
- da deli GPS tokom aktivne ture kada su uslovi ispunjeni;
- da koristi offline rad u ogranicenom obimu;
- da salje SOS/prijave ako je funkcija omogucena.

Mobilna aplikacija ne treba da zaobilazi web pravila i backend dozvole. Ona treba da prikazuje samo ono sto backend dozvoli konkretnom korisniku.

## 3. Backend/API sistem

Podaci se sinhronizuju sa backend/API sistemom.

Backend je centralni sistem koji:

- autentifikuje korisnika;
- proverava firmu, ulogu i `driverId`;
- vraca podatke za mobilne ekrane;
- prima GPS logove;
- prima dokumenta i metadata;
- prima troskove;
- prima poruke;
- salje obavestenja;
- sprovodi ogranicenja pristupa.

Za pravnu dokumentaciju je vazno da se web i mobile podaci posmatraju kao deo iste obrade, osim ako advokat izricito odluci da se neki kanal posebno opise.

## 4. Zajednicke kategorije podataka

Oba kanala mogu koristiti:

- korisnicke naloge;
- firme;
- vozace;
- vozila;
- ture;
- dokumenta;
- poruke;
- obavestenja;
- lokacije;
- rokove;
- troskove;
- audit i bezbednosne logove.

Mobilni kanal posebno dodaje:

- push tokene;
- informacije o platformi uredjaja;
- dozvole uredjaja;
- lokalni cache;
- offline queue;
- kameru/galeriju/PDF upload sa telefona;
- background GPS tok;
- biometrijsko lokalno otkljucavanje;
- moguce SOS lokacije.

## 5. Pravni dokumenti treba da pokriju oba kanala

Pravni dokumenti treba da budu uskladjeni tako da pokrivaju:

- web aplikaciju;
- mobilnu aplikaciju;
- backend/API;
- javni sajt;
- app store listing ako postoji;
- support i administrativni pristup;
- podobradu i integracije.

Ako se koristi jedan skup pravnih akata, u njima treba izricito navesti da se odnose na SoftechRS TMS sistem, ukljucujuci web aplikaciju, mobilnu aplikaciju i povezane API usluge.

Ako se koristi poseban mobilni dodatak, on mora biti uskladjen sa glavnim uslovima koriscenja, politikom privatnosti i DPA dokumentom.

## 6. Odgovornost za podatke

Tipican model:

- klijent/firma odlucuje koje podatke unosi i kome dodeljuje pristup;
- vozac koristi mobilni kanal za operativne aktivnosti;
- SoftechRS obezbedjuje tehnicku platformu;
- backend/API cuva i sinhronizuje podatke;
- podaci sa mobilne aplikacije postaju deo istog TMS sistema.

Advokat treba da potvrdi kako se ova podela opisuje u ugovoru, politici privatnosti i DPA dokumentu.

## 7. Posebna napomena o domenima

`softechrs.com` je domen firme. Domen web aplikacije, domen mobilne aplikacije ako postoji i API/backend domen moraju biti posebno potvrdjeni.

Pravni akti, app store tekstovi i tehnicka dokumentacija treba da koriste iste domene i iste nazive usluge.
