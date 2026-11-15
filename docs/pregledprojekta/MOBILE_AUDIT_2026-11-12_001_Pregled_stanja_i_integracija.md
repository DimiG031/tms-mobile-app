> Istorijski pregled ili predlog, bez aktivnog statusa završavanja. Važeći plan, kriterijumi i rezultati su isključivo u [centralnoj evidenciji web repozitorijuma](https://github.com/DimiG031/transport-website-app/blob/main/docs/glavnipregledprojekta/POCETAK_RAZGOVORA.md). Sačuvani tekst nije odobrenje buduće implementacije niti novi dokaz ručnog prijema.

# Mobilna aplikacija — 001. pregled stanja i integracija

Datum: 12.11.2026. Repozitorijum: `DimiG031/tms-mobile-app`.

## Zaključak i obuhvat

Postoji razvijen mobilni klijent za vozače sa stvarnim API integracijama, ne samo prototip ekrana. Glavne prepreke pouzdanom izdanju jesu izolacija lokalnih podataka pri promeni korisnika, pouzdanost offline reda, usklađenost prikaza sa backend odgovorima i završna provera na uređajima.

Pregled je vezan za mobilni commit **`c113a0fb71600be9fe049bd65ba2bec34e001b48`**. Backend je poređen sa aplikacionim kodom **`d5557318b808658220a32b488624178955141960`**; dva naredna commita na web projektu dodaju samo izveštaje. Nalazi M01–M12 pripadaju ovom mobilnom pregledu i nisu nastavak web numeracije A01–A163.

Preuzeto je 135 tekstualnih fajlova, uključujući sve TypeScript izvore i relevantnu dokumentaciju. Inventar: 50 `.ts` i 52 `.tsx` fajla, 27 query fajlova i 32 ekranska fajla bez layout-a. Proverena je sintaksna transpilacija 99 izvora bez deklaracionih fajlova: bez sintaksnih grešaka. To nije puna TypeScript provera tipova niti Expo/native build.

Izvedeno je osam usmerenih izvršnih scenarija nad originalnim funkcijama, uz memorijski AsyncStorage, kontrolisane API odgovore i zamene native servisa. Nije korišćena stvarna baza, GPS uređaj niti produkcioni korisnički nalog. U stablu nema test fajlova ni GitHub workflow definicija; GitHub Actions API vratio je nula izvršavanja. `package.json` ima `typecheck`, ali nema test skriptu. EAS izvršavanja nisu proveravana.

## Registar nalaza

Prioritet P1 znači rešiti pre šireg produkcionog prihvatanja; P2 znači važan funkcionalni problem. Nalazi iz čitanja izvora jasno su odvojeni od izvršnih dokaza.

### M01 — P1: lokalni keš nije izolovan po korisniku

**Izvor:** `src/providers/QueryProvider.tsx`, `src/providers/AuthProvider.tsx`, `src/services/auth.ts`, query ključevi u `src/queries/`.

Persistencija koristi zajednički ključ `tms-query-cache` i maksimalnu starost 24 sata. Query ključevi poput `tours`, `documents`, `payslips` i `mobile-profile` nisu vezani za identitet korisnika/firme. QueryProvider obuhvata AuthProvider i opstaje kroz odjavu. Odjava briše sesiju, ali ne poziva čišćenje QueryClient-a ili persister-a.

Pri prelasku sa korisnika A na B na istom uređaju stari keš može biti prikazan pre novog odgovora, posebno bez mreže. Ovo je zaključak iz životnog ciklusa i ključeva; nije izveden React/native prikaz sa dva naloga.

**Potrebno:** identitetski opseg keša, prekid starih zahteva, čišćenje memorije i persistencije pri promeni identiteta. Proveriti online, offline i restart uređaja.

### M02 — P1: offline zahtev nema vlasnika

**Izvor:** `src/lib/offline-queue.ts`, `src/lib/api.ts`, `src/providers/AuthProvider.tsx`, `app/_layout.tsx`.

Svi korisnici koriste `tms_offline_write_queue_v1`. Stavka sadrži metodu, putanju i telo, bez korisnika/firme. Odjava ne poziva postojeći `clearOfflineWriteQueue`. Sinhronizacija koristi trenutno sačuvan token. Prijava korisnika B pokreće slanje preostalih zahteva korisnika A sa identitetom B.

Backend može odbiti deo takvih zahteva, ali to ne rešava pogrešnu pripadnost lokalnog reda; konačna posledica zavisi od putanje i serverskih pravila. Potrebna je karantinska obrada po vlasniku, a ne automatsko odbacivanje neisporučenog rada.

### M03 — P1: konkurentni upisi gube offline stavke

**Izvor:** `enqueueOfflineWrite` u `src/lib/offline-queue.ts`.

Read–modify–write nije serijalizovan. Izvršna kontrola sa dva istovremena poziva sačuvala je **jednu od dve** stavke. Korisnički unosi i GPS mogu deliti isti red.

**Potrebno:** serijalizovati mutacije reda ili koristiti transakciono lokalno skladište. Testirati paralelne upise.

### M04 — P1: završetak sinhronizacije briše nov upis

**Izvor:** `flushOfflineWriteQueue` i `setOfflineWriteQueue` u istom fajlu.

Flush uzima početni snapshot, a na kraju ga zamenjuje preostalim stavkama. U izvršnom scenariju tokom izvršavanja stare stavke dodat je novi zahtev; završni red bio je prazan. Novi zahtev nikada nije poslat.

**Potrebno:** uklanjati samo uspešno obrađene ID-jeve uz zajedničku kontrolu konkurencije sa enqueue operacijama.

### M05 — P1: paralelni flush šalje isti zahtev dva puta

**Izvor:** `src/lib/api.ts`, `src/services/gpsTracking.ts`, `app/_layout.tsx`.

`queueFlushInFlight` štiti samo automatski `scheduleQueueFlush`. Javni `api.flushOfflineWrites` zaobilazi tu zaštitu. Poziva se pri prijavi, iz intervala i NetInfo događaja. Kontrola dva paralelna flush-a izvršila je **dva poziva za jednu stavku**.

Dodatno, mrežna greška posle prihvatanja POST zahteva ostavlja mogućnost ponavljanja. ID stavke nije poslat kao serverski idempotency ključ. Dupli poslovni efekat zavisi od serverske putanje.

**Potrebno:** jedan zajednički mehanizam sinhronizacije i end-to-end idempotentnost poslovnih komandi.

### M06 — P2: promena statusa ture i GPS daju delimičan uspeh

**Izvor:** `src/queries/useTourDetails.ts`.

Najpre se šalje PATCH statusa, a tek zatim traži pokretanje GPS-a. Kontrola sa odbijenom GPS dozvolom ostavila je serverski status `IN_TRANSIT`, dok je mutacija završila greškom. `onSuccess` invalidacije tada se ne izvršavaju.

**Potrebno:** odvojiti poslovni rezultat od lokalnog GPS rezultata, osvežiti podatke i jasno ponuditi ponovni pokušaj pokretanja praćenja. Proveriti i neuspeh zaustavljanja posle završetka ture.

### M07 — P2: GPS vreme i nepoznata brzina pogrešno se prenose

**Izvor:** `src/background/gpsTask.ts`, `src/services/gpsTracking.ts`.

`sendGpsLog` koristi vreme slanja umesto `location.timestamp`. Izvršna kontrola sa starijim GPS uzorkom potvrdila je zamenu vremena. Brzina `-1`, koja može označavati nepoznatu brzinu, preneta je kao `-3.6 km/h`. Ovo može iskriviti istoriju ili izazvati serversko odbijanje.

**Potrebno:** vreme merenja iz uzorka, nepoznatu/negativnu brzinu pretvoriti u null i proveriti konačan serverski ugovor. Background task trenutno uzima samo poslednji uzorak iz batch-a; to treba uskladiti sa zahtevom za gustinu istorije.

### M08 — P2: mobilna razrada dnevnica nije usklađena sa formatom forme

**Izvor:** `src/queries/useMobilePayslips.ts`; backend `src/app/api/mobile/me/per-diem/route.ts` i zajednički normalizator PDF razrade.

Backend list endpoint prosleđuje sačuvani `breakdown` bez normalizacije. Mobilni kod očekuje ravan niz. Na sačuvanom obliku `{number, lines:[{country, fullDays, halfDays, amount}]}` izvršna kontrola daje red sa null vrednostima za nalog, zemlju, dane i iznos.

Web ispravka A121 normalizuje PDF putanje, ali sama po sebi ne normalizuje ovaj JSON odgovor. Zato PDF i ekran mogu prikazivati različit nivo detalja.

**Potrebno:** zajednički API ugovor i normalizacija na serverskoj granici, uz test oba istorijska oblika.

### M09 — P2: čuvanje offline prijave predstavljeno je kao isporučena prijava

**Izvor:** `src/queries/useTourIssue.ts`, `app/(driver)/tours/[id]/issues.tsx`.

Hook odbacuje informaciju `queued`, a ekran u `onSuccess` prikazuje „Prijava poslata” i „Operativni tim je obavešten o problemu”. Bez mreže potvrđeno je samo lokalno čuvanje. Ovo je nalaz čitanja originalnog toka, bez pokretanja native ekrana.

**Potrebno:** prikazati „čeka slanje” i posebno potvrditi stvarnu isporuku. SOS hook već vraća `queued`, što je dobar obrazac za doslednu primenu.

### M10 — P2: deo listi ostaje na prvoj stranici

**Izvor:** `useTours.ts`, `useDocuments.ts`, `useTourDocuments.ts`, `useTourStops.ts`, `useTravelOrders.ts`.

Liste imaju fiksne limite 20/50/100/200 bez nastavka preko `nextCursor`. Npr. dokumenti i lokacije mogu biti nepotpuni, a `limit=200` sam po sebi ne prevazilazi serverski maksimum. Ne tvrdi se da svi korisnici već imaju dovoljno zapisa da osete problem. `useToursHistory` i istorija radnih zadataka pokazuju da podrška za paginaciju postoji u drugim delovima klijenta.

**Potrebno:** cursor paginacija ili eksplicitno označena ograničena lista, prema nameni ekrana.

### M11 — P2: odjava zavisi od uspeha native GPS servisa

**Izvor:** `src/providers/AuthProvider.tsx`.

`await stopGpsTracking()` dolazi pre brisanja sesije i nema lokalnu obradu greške. Ako native poziv baci grešku, odjava prekida pre `mobileLogout`. Ovo je izvorno utvrđena grana, bez testiranja konkretnog uređaja.

**Potrebno:** garantovati lokalnu odjavu i definisati bezbedan oporavak GPS servisa, nezavisno od uspeha odjave push tokena i GPS poziva.

### M12 — P2: istek/brisanje sesije u API sloju nije usklađen sa AuthProvider-om

**Izvor:** `src/lib/api.ts`, `src/providers/AuthProvider.tsx`, `src/services/auth.ts`.

Neuspešan refresh briše SecureStore, ali ne obaveštava AuthProvider da ukloni sesiju iz memorije. Refresh tretira svaki neuspešan HTTP status kao razlog brisanja, uključujući privremenu serversku grešku. Hydration automatski učitava postojeću sesiju; ponuđena biometrija zato nije obavezna zaštita otvaranja aplikacije.

**Potrebno:** jedinstveni događaj isteka sesije, razlikovanje privremenog kvara od odbijenog tokena i eksplicitna odluka da li je biometrija opciona prečica ili obavezna zaštita. Ne predstavlja se kao zaobilaženje obavezne biometrije, jer takav zahtev nije potvrđen.

## Provera backend veza

Pregledano je 81 pojavljivanje API putanja u TS izvorima. Automatsko poređenje šablona putanja sa backend `route.ts` fajlovima pronašlo je odgovarajuće putanje za 80 referenci; preostala dinamička interpolacija `/api/mobile/places` ručno je razrešena i putanja postoji. To proverava postojanje putanje, ne HTTP metod, sva prava, kompletan response shape ili produkcionu dostupnost.

Dodatno su čitani ugovori za auth refresh i dnevnice, kao i tokovi tura, stanica, troškova, checkliste, problema, SOS-a, putnih naloga, posade, zadataka, dokumenata i poruka. Potvrđeno je da stari dokument `docs/todo/mobile-backend-capability-audit.md` iz juna navodi kao nedostajuće neke API funkcije koje sada postoje i koriste se. Taj dokument treba označiti kao istorijski; nije izvor trenutnog statusa implementacije.

Postojanje backend rute nije dokaz završene integracije. M08 je konkretan primer da putanja postoji, a format podataka nije usklađen. Nalazi o backend autorizaciji iz web izveštaja 247 ostaju relevantni i ne zatvaraju se promenom mobilnog interfejsa.

## Pozitivno potvrđeno

- Uspešno obrađena offline stavka uklanja se iz reda; mrežno neuspešna ostaje u redu — izvršno provereno.
- Tokeni se čuvaju kroz Expo SecureStore; obični query keš i offline red koriste AsyncStorage.
- Postoji objedinjeni API sloj, objedinjavanje paralelnih refresh zahteva i lokalizovane poruke greške.
- Postoje normalizatori odgovora, paginirana istorija, UI razlikovanje aktivnog člana posade i konkretne putanje za mobilne poslovne akcije.
- SOS i snimanje koordinata već razlikuju lokalno čekanje od stvarnog odgovora.
- EAS profili razdvajaju development, preview i production; produkcioni API je HTTPS. Sama konfiguracija ne potvrđuje uspešan build ili isporuku preko prodavnica.

## Preporučeni redosled

1. M01–M05: izolacija identiteta i pouzdanost reda; dodati regresione scenarije pre implementacije popravke.
2. M06–M09 i M12: uskladiti serverski i lokalni rezultat, dnevnice, sesiju i poruke o isporuci.
3. M10–M11: potpunost listi i robusnost odjave; razjasniti biometrijsku politiku.
4. Uvesti CI sa punim typecheck-om i testovima. Ova provera sintakse nije zamena za to.
5. Na Android i iOS uređajima proveriti odbijene dozvole, background rad, restart/gašenje aplikacije, promenu korisnika, offline rad i ponovljene zahteve.
6. Izvesti integracioni prijem sa testnim backendom i potvrditi EAS build/OTA/distribuciju.

## Završno stanje

Završen je ovaj početni pregled mobilne aplikacije i sastavljen poseban poslovno-tehnički opis. Nije potvrđeno zatvaranje svih mogućih grešaka, puna bezbednosna revizija niti spremnost za produkcioni prijem. U repozitorijum se dodaje samo dokumentacija; aplikacioni kod nije menjan.
