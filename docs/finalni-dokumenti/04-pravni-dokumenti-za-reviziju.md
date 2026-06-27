# Pravni dokumenti za reviziju

Ovaj dokument navodi pravne akte koje advokat treba da izradi, dopuni ili proveri za mobilnu aplikaciju kao deo sireg SoftechRS TMS sistema.

## 1. Dokumenti koji vec postoje kao referenca u web/TMS projektu

U web/TMS projektu postoje nacrti i ulazni materijali za:

- uslove koriscenja;
- politiku privatnosti;
- opste uslove poslovanja;
- ugovor o licenciranju;
- ugovor o obradi podataka o licnosti;
- akt o proceni rizika obrade podataka;
- izjavu o intelektualnoj svojini;
- checklistu za advokata;
- detaljne module za TMS sistem.

Ovi dokumenti treba da se koriste kao referenca, ali mobilna aplikacija uvodi dodatne teme: GPS, background lokaciju, push tokene, dozvole uredjaja, lokalni cache, offline queue, kameru, galeriju i mobilnu autentifikaciju.

## 2. Uslovi koriscenja

Treba proveriti da li uslovi koriscenja pokrivaju:

- mobilnu aplikaciju kao kanal koriscenja;
- vozace i terenske korisnike;
- obaveze klijenta da obavesti svoje zaposlene/vozace;
- zabranu zloupotrebe naloga;
- odgovornost za telefon i pristup uredjaju;
- dozvole uredjaja;
- upload sadrzaja;
- chat i poruke;
- offline rad;
- ogranicenje odgovornosti za netacne podatke koje unosi klijent;
- ogranicenje odgovornosti za greske GPS-a, mape, mrezu i dostupnost mobilnog uredjaja.

## 3. Politika privatnosti

Politika privatnosti treba da pokrije:

- mobilne naloge;
- podatke vozaca;
- GPS/lokacijske podatke;
- push tokene;
- informacije o uredjaju ako se obradjuju;
- upload dokumenata;
- slike i PDF fajlove;
- chat poruke;
- offline lokalno cuvanje;
- API logove;
- bezbednosne logove;
- prava lica;
- zahteve zaposlenih/vozaca preko klijenta kao rukovaoca.

Posebno treba objasniti da korisnik kroz operativni sistem moze upravljati dozvolama za lokaciju, kameru, galeriju i notifikacije, ali da iskljucivanje dozvole moze ograniciti funkcionalnost.

## 4. Ugovor o obradi podataka o licnosti

DPA treba da ukljuci mobilni kanal:

- kategorije podataka koje mobilna aplikacija salje;
- GPS logove;
- push tokene;
- dokumenta/slike;
- offline podatke;
- chat;
- SOS/prijave;
- tehnicke dobavljace;
- podobradu za hosting, storage, push, Expo/EAS, mape i monitoring ako postoje.

Treba jasno opisati da klijent upravlja podacima svojih vozaca i zaposlenih, dok SoftechRS obradjuje podatke u skladu sa ugovorom i tehnickim potrebama sistema.

## 5. Akt o proceni rizika / DPIA

Zbog GPS-a, pracenja tokom aktivne ture, moguceg radnog statusa vozaca i obrade poslovnih/operativnih podataka, advokat treba da potvrdi da li je potrebna procena uticaja na zastitu podataka.

Posebno obraditi:

- sistematsko pracenje lokacije;
- odnos zaposlenog i poslodavca;
- mogucnost profilisanja radnog ponasanja;
- rokove cuvanja GPS istorije;
- pristup dispecera, admina i superadmina;
- tehnicke mere zastite;
- obavestenje vozaca.

## 6. Interna pravila za klijente

Za firme klijente moze biti potrebno pripremiti smernice ili dodatak ugovoru kojim se regulise:

- kako obavestavaju vozace o GPS pracenju;
- ko sme da vidi lokaciju;
- kada se GPS ukljucuje i iskljucuje;
- sta se desava van radnog vremena ili van aktivne ture;
- kako se postupa sa izgubljenim telefonom;
- kako se deaktivira nalog bivseg zaposlenog;
- kako se upravlja uploadovanim dokumentima.

## 7. App Store / Google Play tekstovi

Ako se aplikacija distribuira javno, treba proveriti:

- naziv aplikacije;
- opis aplikacije;
- privacy labels / data safety sekcije;
- link ka politici privatnosti;
- objasnjenja dozvola;
- kontakt za podrsku;
- ko je developer/publisher;
- da li se koristi Expo/EAS ili drugi servis za build/update.

## 8. Obavestenja u aplikaciji

Advokat treba da potvrdi da li su potrebna dodatna obavestenja unutar aplikacije:

- pri prvom aktiviranju GPS pracenja;
- pri trazenju background lokacije;
- pri uploadu dokumenata/slika;
- pri slanju SOS-a;
- pri ukljucivanju push notifikacija;
- pri prvom login-u vozaca.

## 9. Odnos sa web pravnim aktima

Pravni dokumenti treba da pokriju oba kanala koriscenja: web aplikaciju i mobilnu aplikaciju. Ako postoje odvojeni tekstovi, moraju biti uskladjeni i ne smeju davati razlicite informacije o firmi, pravima korisnika, obradi podataka, rokovima cuvanja i odgovornosti.
