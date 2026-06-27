# Kompletan pregled funkcija

Ovaj dokument navodi glavne funkcije mobilne aplikacije i njihovu pravno relevantnu svrhu.

## 1. Autentifikacija i sesija

Mobilna aplikacija koristi poseban mobilni login:

- `POST /api/auth/mobile-login`;
- `POST /api/auth/mobile-refresh`;
- access token;
- refresh token;
- cuvanje sesije u SecureStore;
- moguce biometrijsko otkljucavanje postojece sesije;
- logout i brisanje lokalne sesije.

Pravno relevantno:

- obradjuju se email, lozinka, tokeni, identitet korisnika, uloga, firma i `driverId`;
- treba definisati odgovornost korisnika za cuvanje pristupa telefonu;
- treba definisati postupak za izgubljen ili kompromitovan telefon;
- treba definisati pravila deaktivacije naloga i opoziva tokena.

## 2. Mobilni profil i dozvole

Mobilni profil je izvor istine za:

- korisnika;
- firmu;
- ulogu;
- povezani profil vozaca;
- dostupne mobilne module;
- preferences i podesavanja;
- buduce role-based konfiguracije.

Pravno relevantno:

- backend treba da ogranicava pristup po firmi, ulozi i `driverId`;
- vozac ne sme da vidi podatke drugih vozaca ili tura koje mu ne pripadaju;
- finalni pravni dokumenti treba da opisu da klijent upravlja nalogom svojih zaposlenih ili angazovanih vozaca.

## 3. Pocetna strana i dashboard

Pocetna strana prikazuje operativni pregled za mobilnog korisnika:

- aktivne ture;
- obavestenja;
- osnovni status;
- precice ka vaznim funkcijama;
- moguce rokove i podsetnike.

Pravno relevantno:

- prikaz je informativan i zavisi od tacnosti podataka koje unosi klijent ili backend;
- upozorenja i podsetnici ne smeju biti opisani kao garancija pravne ili transportne uskladjenosti.

## 4. Ture

Modul tura prikazuje:

- liste dodeljenih tura;
- detalje ture;
- relaciju;
- status;
- vozilo i prikolicu;
- datume;
- stanice;
- dokumenta ture;
- speditere, carinske tacke i napomene kada postoje;
- akcije vezane za status ture.

Pravno relevantno:

- ture mogu sadrzati podatke o vozacu, vozilu, lokacijama, klijentima, robi, dokumentima i vremenu rada;
- backend mora sprovesti driver-scope ogranicenje;
- treba definisati odgovornost za tacnost podataka o turi.

## 5. GPS pracenje

GPS pracenje je vezano za aktivnu turu i koristi se da dispecer vidi poziciju vozila tokom operativne potrebe.

Tehnicki elementi:

- foreground i background location dozvole;
- `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`;
- background task;
- slanje na `/api/gps-logs`;
- payload sa `vehicleId`, vremenom, latitude, longitude i brzinom ako je dostupna;
- lokalni red za slanje ako mreza nije dostupna.

Pravno relevantno:

- GPS je visoko rizicna obrada i moze predstavljati pracenje zaposlenih ili angazovanih lica;
- treba definisati svrhu, pravni osnov, rok cuvanja, pristup podacima i transparentno obavestavanje vozaca;
- treba objasniti da pracenje postoji tokom aktivne ture, a ne kao opsti nadzor van operativne potrebe;
- treba potvrditi da li je potrebna procena uticaja na zastitu podataka.

## 6. Dokumenta, slike i PDF

Mobilna aplikacija omogucava:

- pregled dokumenata;
- pregled dokumenata vezanih za turu;
- slikanje dokumenta kamerom;
- izbor slike iz galerije;
- izbor PDF fajla;
- upload fajla;
- unos naziva i tipa dokumenta;
- povezivanje dokumenta sa turom.

Pravno relevantno:

- uploadovani fajlovi mogu sadrzati licne podatke vozaca, zaposlenih, klijenata, primalaca, posiljalaca ili trecih lica;
- dokumenti mogu sadrzati CMR, naloge za utovar, carinska dokumenta, dozvole, racune, fotografije, stetu ili osetljive napomene;
- treba definisati dozvoljeni sadrzaj, zabranjeni sadrzaj, odgovornost klijenta za upload i rokove cuvanja;
- kamera, galerija i fajl sistem zahtevaju jasne dozvole uredjaja.

## 7. Troskovi ture

Modul troskova omogucava:

- pregled troskovnika;
- dodavanje troska;
- iznos, opis, datum i kategoriju kada postoji;
- eventualnu sliku racuna;
- slanje u offline redu;
- zakljucavanje troskovnika u odredjenom lifecycle-u.

Pravno relevantno:

- troskovi mogu biti poslovno-finansijski podaci;
- racuni i prilozi mogu sadrzati licne podatke;
- treba definisati da li mobilni unos ima knjigovodstveni znacaj ili je pomocna evidencija.

## 8. Obavestenja i push tokeni

Mobilna aplikacija koristi:

- Expo push token;
- registraciju tokena na backend;
- sinhronizaciju tokena;
- brisanje tokena pri logout-u;
- push payload za chat i operativne dogadjaje;
- deep-link otvaranje ciljnog ekrana.

Pravno relevantno:

- push token je tehnicki identifikator uredjaja;
- moze biti povezan sa korisnikom, platformom i uredjajem;
- treba opisati svrhu push notifikacija i mogucnost upravljanja dozvolama na telefonu;
- treba voditi racuna o sadrzaju poruka prikazanih na zakljucanom ekranu.

## 9. Chat i poruke

Chat omogucava:

- listu razgovora;
- poruke po thread-u;
- slanje poruka;
- citanje iz cache-a;
- push za novu chat poruku;
- otvaranje direktno u thread.

Pravno relevantno:

- poruke mogu sadrzati poslovne i licne podatke;
- treba definisati pravila prihvatljivog koriscenja;
- treba definisati cuvanje, pristup, izvoz i brisanje poruka;
- treba odvojiti operativna obavestenja od chat poruka.

## 10. Offline rad i sinhronizacija

Mobilna aplikacija koristi lokalni cache i offline queue:

- React Query persist;
- AsyncStorage;
- red za write operacije;
- periodican flush;
- reconnect flush;
- posebna batch obrada GPS logova;
- indikator offline/pending sync stanja.

Pravno relevantno:

- deo podataka privremeno ostaje na telefonu;
- treba definisati rizike ako je telefon izgubljen, deljen ili kompromitovan;
- treba definisati sta se desava sa lokalnim podacima pri logout-u, brisanju naloga i prestanku radnog odnosa;
- treba jasno objasniti da offline queue moze kasnije poslati podatke kada se mreza vrati.

## 11. Profil, rokovi i podsetnici

Profil moze prikazati:

- korisnicke podatke;
- firmu;
- povezani vozacki profil;
- kontakte;
- vozacku dozvolu;
- lekarski pregled;
- tahograf karticu;
- ADR/CPC sertifikate;
- rokove i podsetnike.

Pravno relevantno:

- podaci o vozacu i dokumentima vozaca mogu biti licni podaci;
- lekarski pregled moze imati dodatnu osetljivost zavisno od obima podataka;
- tahograf i radni status vozaca treba posebno pravno proveriti ako se obradjuju.

## 12. SOS, problemi i incidenti

Postoji ili je planirana funkcija za SOS/prijavu problema:

- poruka vozaca;
- trenutna GPS lokacija ako je dozvoljena;
- povezivanje sa turom;
- slanje dispeceru;
- moguci offline queue.

Pravno relevantno:

- SOS podaci mogu biti urgentni, lokacijski i operativno osetljivi;
- treba definisati svrhu, pristup, eskalaciju i rok cuvanja;
- treba paziti da aplikacija ne obecava hitnu medicinsku, policijsku ili drugu javnu intervenciju ako to nije ugovoreno.
