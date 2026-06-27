# Podaci i obrada podataka

Ovaj dokument opisuje kategorije podataka koje mobilna aplikacija moze da obradjuje i pitanja koja advokat treba da regulise.

## 1. Uloge u obradi

Najverovatniji model:

- klijent/firma korisnik je rukovalac podacima koje unosi o svojim zaposlenima, vozacima, turama, vozilima, klijentima, dokumentima i operativnim procesima;
- SoftechRS je obradjivac za operativne podatke klijenta u okviru TMS sistema;
- SoftechRS moze biti samostalni rukovalac za podatke o sopstvenim korisnickim nalozima, naplati, podrsci, bezbednosti, analitici i poslovnoj komunikaciji.

Advokat treba da potvrdi ovaj model za web i mobile kanal zajedno.

## 2. Kategorije lica

Mobilna aplikacija moze obradjivati podatke o:

- vozacima;
- zaposlenima ili angazovanim licima klijenta;
- administratorima i dispecerima;
- korisnicima mobilne aplikacije;
- kontakt osobama kod partnera, speditera, carine, klijenata i dobavljaca;
- licima navedenim u dokumentima ili prilozima;
- korisnicima koji salju ili primaju poruke.

## 3. Podaci o vozacu

Podaci o vozacu mogu ukljuciti:

- ime i prezime;
- email;
- telefon;
- firma;
- `driverId`;
- korisnicki nalog;
- uloga i dozvole;
- povezane ture;
- vozilo i prikolica na turi;
- rokovi dokumenata;
- vozacka dozvola;
- lekarski pregled;
- tahograf kartica ako postoji;
- ADR/CPC sertifikati ako postoje;
- radni pregled, odmor ili radni status ako postoje;
- chat poruke;
- SOS/prijave problema;
- GPS lokacije tokom aktivne ture.

Posebno proveriti: da li sistem obradjuje JMBG, podatke o zdravlju, podatke o prekrsajima, kaznama ili druge dodatno osetljive podatke kroz web/backend.

## 4. Lokacija i GPS

GPS obrada moze ukljuciti:

- latitude;
- longitude;
- timestamp;
- vehicleId;
- brzinu ako je dostupna;
- vezu sa turom;
- vezu sa korisnikom/vozacem preko konteksta sesije;
- lokalno cuvanje pre slanja ako nema mreze.

Rizici:

- pracenje kretanja vozaca;
- pracenje zaposlenih;
- mogucnost zakljucivanja radnog statusa, pauza i navika;
- greske u lokaciji;
- neovlascen pristup lokacijskim podacima;
- predugo cuvanje GPS istorije.

Advokat treba da potvrdi:

- pravni osnov za GPS;
- da li je potrebna saglasnost, obavestenje zaposlenih ili drugi osnov;
- da li je potrebna DPIA/procena uticaja;
- ko ima pristup GPS istoriji;
- koliko dugo se GPS cuva;
- da li se GPS koristi samo tokom aktivne ture;
- da li se lokacija prikuplja u background modu.

## 5. Push tokeni i notifikacije

Podaci:

- Expo push token;
- platforma (`ios` ili `android`);
- korisnicki nalog;
- uredjaj indirektno preko tokena;
- notification payload;
- status procitanosti;
- deep-link cilj.

Rizici:

- push token je identifikator uredjaja;
- sadrzaj notifikacije moze biti vidljiv na zakljucanom ekranu;
- pogresan token ili stari token moze izazvati slanje pogresnom uredjaju;
- token treba brisati pri logout-u ili deaktivaciji naloga.

## 6. Mobilna autentifikacija i tokeni

Podaci:

- email;
- lozinka tokom login zahteva;
- access token;
- refresh token;
- korisnik;
- firma;
- role;
- `driverId`;
- SecureStore zapisana sesija;
- biometrijski rezultat za lokalno otkljucavanje postojece sesije.

Rizici:

- kompromitovan telefon;
- deljen uredjaj;
- neodjavljivanje korisnika;
- dug zivot tokena;
- nedovoljna rotacija refresh tokena;
- slab backend rate limit na login;
- nejasna pravila za izgubljeni telefon.

## 7. Offline podaci

Mobilna aplikacija moze lokalno cuvati:

- cache prikazanih podataka;
- offline write queue;
- GPS logove koji cekaju slanje;
- metadata za troskove i dokumenta;
- pending sync statuse;
- tracking state aktivne ture.

Rizici:

- podaci ostaju na telefonu dok se ne posalju ili obrisu;
- drugi korisnik telefona moze doci do podataka ako uredjaj nije zasticen;
- offline queue moze poslati staru akciju nakon promene stanja na backend-u;
- lokalni cache moze prikazati zastarele podatke.

## 8. Dokumenta, slike i upload

Podaci:

- naziv dokumenta;
- tip dokumenta;
- fajl ili slika;
- PDF;
- fotografija iz kamere;
- slika iz galerije;
- metadata dokumenta;
- veza sa turom;
- storage URL ili identifikator;
- korisnik koji je uploadovao dokument.

Rizici:

- fajl moze sadrzati licne podatke, potpise, brojeve dokumenata, registarske oznake, robu, adresu, ugovorne podatke ili osetljive informacije;
- korisnik moze uploadovati neadekvatan ili nezakonit sadrzaj;
- treba definisati ko je odgovoran za sadrzaj koji klijent ili vozac uploaduje;
- treba definisati rok cuvanja i brisanje fajlova.

## 9. Ture, stanice i operativni podaci

Podaci:

- tura;
- status ture;
- polazna i krajnja lokacija;
- stanice;
- planirano i stvarno vreme dolaska/odlaska;
- vozilo;
- prikolica;
- spedicija;
- carina;
- napomene;
- dokumenta;
- problemi i SOS ako postoje;
- checklist stavke ako postoje.

Rizici:

- podaci mogu otkriti poslovne tokove klijenta;
- mogu sadrzati podatke trecih lica;
- mogu se koristiti za kontrolu rada vozaca;
- greske u podacima mogu izazvati poslovnu stetu.

## 10. Radni sati, tahograf i status rada

Mobilna aplikacija i siri TMS sistem mogu prikazivati ili obradjivati:

- radni pregled vozaca;
- odmor;
- status ture;
- dolazak/odlazak sa stanice;
- rokove tahograf kartice;
- tahograf podatke ako postoje u backend-u;
- radne sate ako postoje u web/TMS sistemu.

Advokat treba posebno da proveri:

- da li se mobilni podaci koriste za evidenciju radnog vremena;
- da li GPS i statusi mogu indirektno predstavljati evidenciju rada;
- da li se tahograf podaci obradjuju u web sistemu;
- koji zakonski rokovi cuvanja vaze;
- ko sme da vidi ove podatke.

## 11. Pravne osnove i rokovi cuvanja

Potrebno je popuniti po kategorijama:

| Kategorija | Moguci osnov | Rok cuvanja |
|---|---|---|
| Mobilni nalog | ugovor / legitimni interes | [UNETI] |
| Tokeni i sesije | bezbednost / ugovor | [UNETI] |
| GPS | [POTVRDITI] | [UNETI] |
| Push tokeni | saglasnost/dozvola uredjaja / legitimni interes | [UNETI] |
| Dokumenta | ugovor / zakonske obaveze klijenta | [UNETI] |
| Ture i stanice | ugovor / legitimni interes klijenta | [UNETI] |
| Troskovi | ugovor / knjigovodstveni razlozi | [UNETI] |
| Chat | ugovor / legitimni interes | [UNETI] |
| SOS/prijave | zastita interesa / ugovor / legitimni interes | [UNETI] |
| Tahograf/radni sati ako postoje | [POTVRDITI] | [UNETI] |

## 12. Zakljucak

Najvazniji rizici za pravnu reviziju su GPS, radni status vozaca, push tokeni, mobilna autentifikacija, offline podaci, upload dokumenata/slika, pristup telefonu, kamera, lokacija i dozvole uredjaja.
