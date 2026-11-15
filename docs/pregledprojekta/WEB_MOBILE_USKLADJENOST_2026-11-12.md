> Istorijski pregled ili predlog, bez aktivnog statusa završavanja. Važeći plan, kriterijumi i rezultati su isključivo u [centralnoj evidenciji web repozitorijuma](https://github.com/DimiG031/transport-website-app/blob/main/docs/glavnipregledprojekta/POCETAK_RAZGOVORA.md). Sačuvani tekst nije odobrenje buduće implementacije niti novi dokaz ručnog prijema.

# Usklađenost web sistema i mobilne aplikacije

**Datum:** 12.11.2026.  
**Zaključak:** web i mobilna aplikacija dele backend i veliki deo poslovnog modela, ali **nisu potpuno usklađeni**. Postojanje API putanja je dobro usklađeno; ostaju konkretni problemi u dozvolama, dokumentima, posadi, prikazu podataka i pouzdanosti sinhronizacije.

## Verzije i granice provere

| Repozitorijum | Pregledana main verzija | Aplikacioni kod |
|---|---|---|
| `DimiG031/transport-website-app` | `3f6540bd7b0c426b025c4ce14547b71959d32289` | Kao u `d5557318b808658220a32b488624178955141960`; naredne izmene su dokumentacija. |
| `DimiG031/tms-mobile-app` | `919c847cb7370a8d014e93c3dff4e2f3d7088724` | Kao u `c113a0fb71600be9fe049bd65ba2bec34e001b48`; naredne izmene su dokumentacija. |

Pripadnost lokalnih izvora ovim verzijama dodatno je proverena Git blob SHA poređenjem. Sva 102 mobilna TypeScript fajla odgovaraju repozitorijumu; dostupni backend TS/TSX/Prisma fajlovi takođe odgovaraju. Nedostajući lokalni `tailwind.config.ts` nije deo analiziranih API ugovora.

Provera obuhvata ugovore i tokove izvornog koda, a ne dokaz o stanju instaliranog APK-a, OTA ažuriranja, produkcionog deploy-a ili produkcione baze. Nisu slati poslovni zahtevi u produkciju, menjani podaci ili pristupano stvarnim privatnim fajlovima. Aplikacioni kod nije menjan.

## Šta je provereno

- AST inventar pronašao je **80 mesta poziva kroz mobilni `api` objekat**, odnosno **70 različitih kombinacija HTTP metode i normalizovanog šablona putanje**, u **57 backend route fajlova**.
- Za svih 80 postoji odgovarajuća putanja i izvezena HTTP metoda. Pri mapiranju statične putanje imaju prednost nad dinamičkim: npr. `places/nearby` nije `places/[id]`.
- Zasebno su čitani direktni login/refresh/upload pozivi, privatno preuzimanje i navigacija iz obaveštenja. Njih ne treba mešati sa brojem 80, koji se odnosi samo na pozive kroz `api` objekat.
- **12 reprezentativnih tela zahteva iz originalnih mobilnih hook-ova** prihvaćeno je originalnim serverskim Zod šemama: podešavanja, lozinka, preference, dolazak i napomena na stanici, problem, SOS, rokovnik, gorivo kao putni događaj, stavke putnog lista, radni zadatak i potvrda troškovnika.
- Izvedeno je **35 usmerenih scenarija**, uključujući ponovljene ranije mobilne kontrole. To su 14 kontrola dozvola/opsega/keša, 12 kontrola tela zahteva, jedna kontrola kanonskog URL-a fajla i osam kontrola offline reda/GPS-a/dnevnica.

Ove provere koriste originalne funkcije i handlere uz kontrolisane zamene autentikacije, baze i native servisa. Pri validaciji tela zahteva nisu potvrđivani svi uslovi autorizacije i stanje baze. Uspeh šeme nije uspeh celog poslovnog toka. Nisu pokretani telefoni, browser E2E ili stvarne konkurentne PostgreSQL transakcije.

Prateći fajl **`WEB_MOBILE_API_MATRICA_2026-11-12.csv`** daje svaki poziv, mobilni fajl i red, metodu, normalizovanu putanju i odgovarajući backend fajl. Placeholder `X` označava dinamički segment, a ne stvarni ID. Matrica potvrđuje postojanje metoda, ne potpunu funkcionalnu ispravnost.

## Pregled poslovnih veza

| Celina | Usklađen deo | Preostalo / ograničenje |
|---|---|---|
| Login i refresh | Oblici `data.token`, `refreshToken`, `user` i refresh odgovora odgovaraju mobilnim tipovima. | Lokalno stanje pri isteku i promeni naloga nije potpuno usklađeno. |
| Mobilni profil i preference | Zajednički serverski katalog, oblik preference zahteva i odgovor postoje. | Efektivne dozvole profila i shared-route zaštite se razlikuju. |
| Ture i stanice | Putanje/metode postoje, statusi ture i akcije stanice koriste iste vrednosti. | Podrazumevane dozvole blokiraju deo mobilnih tokova; GPS i status mogu dati delimičan uspeh. |
| Dvojna posada | Prenose se `driverId`, `coDriverId` i `activeDriverId`; postoje obe switch rute. | Switch naloga i switch ture ne menjaju isti skup entiteta i keša. |
| Putni list | Mobilni PUT šalje `{lines}` bez lokalnog ID-ja; šema i GET omotač su usklađeni. | Puna zamena liste zahteva proveru istovremenog uređivanja; čitanje nije dokaz zaštite od konflikta. |
| Troškovnik | `CONFIRM/REJECT`, statusi i osnovni payload imaju serversku podršku. | Uloga, aktivni vozač, offline ponavljanje i naknadni upisi zahtevaju integracionu proveru. |
| Dokumenti i upload | POST/presign struktura postoji. | Relativni/puni URL, autentikacija pri otvaranju i keš nisu dosledni. |
| Dnevnice | Ukupan iznos stiže kroz postojeći endpoint. | Razrada forme nije normalizovana kao u PDF-u. |
| Zarade i statistika | Namenske mobile/me putanje postoje. | Nije potvrđen svaki obračunski scenario; statistika može ostati u kešu. |
| Zadaci i rokovnik | Metode i reprezentativne šeme odgovaraju. | Granice listi, offline slanje i UI osvežavanje ostaju relevantni. |
| Poruke i obaveštenja | Chat putanje, push tokeni i navigacija za chat/turu postoje. | Push ne osvežava automatski sve poslovne query-je. |
| SOS, problem, checklist | Namenske rute postoje, reprezentativni zahtevi prolaze šeme. | „Sačuvano offline” nije „operativa je obaveštena”. |
| Mapa mesta | Mobilne putanje, uključujući nearby i fotografije, imaju serverske metode. | Nisu izvršeni svi slučajevi vidljivosti, glasanja i realnog skladištenja. |
| GPS | Payload ima serversku putanju. | Podrazumevana dozvola create nedostaje, a vreme i nepoznata brzina zahtevaju usklađivanje. |

## Konkretna odstupanja

Prioritet P1: rešiti pre šireg prihvatanja. P2: važna doslednost i funkcionalnost. Identifikatori SYNC ne menjaju postojeće A i M nalaze; gde se isti problem ponavlja, to je navedeno.

### SYNC01 — P1: mobilni profil nudi funkcije koje shared API odbija

**Backend:** `src/lib/mobile/modules.ts`, `src/constants/Permissions.ts`, `src/lib/permissions.ts`, `src/lib/auth.ts`, rute `tours`, `documents`, `gps-logs`.  
**Mobile:** `useTours.ts`, `useTourDetails.ts`, `useDocuments.ts`, `useTourDocuments.ts`, `gpsTracking.ts`.

Mobilni profil gradi dozvole iz osnovne matrice i nudi USER vozaču ture i dokumente. Međutim, mobilni klijent deo poziva šalje na zajedničke `/api/tours`, `/api/documents` i `/api/gps-logs` rute. One koriste `checkPermission`, koji primenjuje novu web allowlist-u i na Bearer zahtev. Komentar da mobilni deo ne koristi tu matricu zato nije tačan za ove pozive.

Sa originalnom matricom, bez per-user override-a, originalni handleri vraćaju **403** za GET ture, PATCH ture, GET dokumente, POST dokument i POST GPS zapis. Izvršno je potvrđeno i da eksplicitni tours override menja rezultat same provere dozvole. Zato ne tvrdi se da je svaki postojeći nalog već pogođen: individualni override-i mogu prikriti problem.

**Potrebno:** odvojeno definisati dozvoljene vozačke akcije i dosledno ih sprovoditi na serveru. Ne rešavati širokim davanjem opšteg update/create prava, jer zajedničke administrativne rute moraju dodatno ograničiti vlasništvo i dozvoljena polja.

### SYNC02 — P1: interni URL fajla nema jedinstven kanonski oblik

**Mobile:** `src/services/upload.ts`, `src/lib/urls.ts`, `src/queries/useTourDocuments.ts`.  
**Backend:** `src/lib/storage.ts`, `/api/documents`, `/api/files/[...key]`.

Storage vraća `/api/files/...`. Mobilni upload vraća pun `https://.../api/files/...` URL, koji POST dokumenta prihvata i čuva bez kanonizacije. Privatni file handler traži dokument po tačno relativnoj putanji. Kod punog URL-a ne pronalazi zapis i ne ulazi u proveru `documentReadableByDriver`.

U kontrolisanom scenariju postoji dokument sa punim URL-om, korisnik je drugi vozač iste firme, a provera konkretnog dokumenta bi odbila pristup. Handler je ipak vratio **302** ka sintetičkom storage URL-u i nije pozvao tu proveru. Firma se i dalje proverava; ovaj scenario nije dokaz pristupa preko granice kompanija.

**Potrebno:** čuvati stabilni storage ključ/kanonsku referencu i autorizovati po njoj; obraditi već sačuvane pune i relativne oblike. Ovaj nalaz proširuje problem pristupa fajlu, ne zatvara raniji A06.

### SYNC03 — P2: prikaz dokumenta nije isto što i autentifikovano preuzimanje

**Mobile:** `app/(driver)/documents.tsx`, `app/(driver)/tours/[id]/documents.tsx`, query-ji dokumenata.  
**Backend:** `/api/files/[...key]`.

Opšta lista zadržava relativni `fileUrl`, dok ekran pokušava `Linking.openURL` bez pretvaranja u pun URL. Za pun privatni URL otvaranje spoljašnjeg browser-a ne prenosi mobilni Authorization header. Originalni handler za browser zahtev bez web sesije ili Bearer tokena daje **401**. Web sesija već prijavljena u browser-u može promeniti ishod, pa se ne tvrdi da svaki link uvek pada.

**Potrebno:** autentifikovano preuzimanje u aplikaciji ili namenski kratkotrajan link posle provere prava; ne stavljati dugotrajni token u URL.

### SYNC04 — P2: izbor vozača nije isti u svim API porodicama

`requireMobileAuth` i pojedine `/api/mobile/*` rute koriste potvrđeni `auth.driverId`. `requireTenant` Bearer grana ne prenosi taj izbor, a shared rute tura, stanica i dokumenata pozivaju driver-scope helper bez `selectedDriverId`.

Izvršna kontrola originalnog helper-a pokazuje razliku: potvrđeni izbor d2 daje opseg d2, a fallback opseg d1. Problem je relevantan kada nalog ima više aktivnih driver zapisa; ne predstavlja dokaz da svaki nalog ima takvo stanje.

**Potrebno:** jedinstveno razrešavanje članstva i istog identiteta vozača kroz shared i mobile putanje. Povezano sa web A119.

### SYNC05 — P2: smena na nalogu i turi može razdvojiti aktivnog vozača

**Backend:** `/api/mobile/travel-orders/[id]/switch-driver` i `/api/mobile/tours/[id]/switch-driver`.  
**Mobile:** `src/queries/useCrew.ts`.

Switch naloga menja samo `TravelOrder.activeDriverId`; switch ture menja turu i podobne aktivne naloge. Kontrola na povezanom paru daje tour=d1/order=d2 posle switch-a naloga, naspram tour=d2/order=d2 posle switch-a ture. Mobilni hook naloga invalidira samo putne naloge i stavke, dok prava na drugim ekranima čitaju turu.

Ako je odvojena smena naloga namerna, prikaz i pravila moraju to jasno razlikovati. Ako treba jedinstvena smena povezane ture, oba ulaza moraju sprovesti istu promenu. Nevezani putni nalog mora ostati podržan.

### SYNC06 — P2: PDF ispravka dnevnica nije ispravka mobilnog JSON prikaza

Backend `/api/mobile/me/per-diem` prosleđuje sirovi `breakdown`; mobilni `useMobilePayslips.ts` očekuje ravne redove. Sačuvani oblik `{number, lines:[{country, fullDays, halfDays, amount}]}` daje null za nalog, zemlju, dane i iznos u mobilnom normalizatoru. PDF putanje koriste novi zajednički normalizator.

**Potrebno:** isti normalizovani ugovor za web prikaz, mobile JSON i PDF. Ovo je isti konkretni problem kao mobilni M08; A121 ne treba tumačiti kao zatvaranje svih tih prikaza.

### SYNC07 — P2: upisana promena ne osvežava sve povezane prikaze

Izvršne kontrole originalnih hook-ova potvrđuju:

- Kreiranje dokumenta osvežava `tour-documents` i `notifications`, ali ne opšti `documents` query.
- Switch putnog naloga ne osvežava `tour-details`, `tours` ili `dashboard`.

Čitanje izvora dodatno pokazuje da završetak offline flush-a nema događaj kojim invalidira pogođene query-je. Push bridge za non-chat obaveštenje osvežava notifications/dashboard, ne i sve detalje ture, stanice i troškove. Povratak aplikacije u foreground posebno osvežava chat listu, ne sve poslovne ekrane.

**Posledica:** server i lokalni prikaz mogu privremeno ili duže da se razlikuju. `staleTime` nije periodični polling i sam po sebi ne garantuje osvežavanje otvorenog ekrana.

**Potrebno:** mapa poslovnih događaja i pogođenih keševa, osvežavanje posle stvarne isporuke i dogovoreni način osvežavanja web/mobilnih otvorenih ekrana. Zajednička baza ne znači automatski trenutni prikaz.

### SYNC08 — P1: offline sinhronizacija nije pouzdana niti odvojena po nalogu

Raniji M01–M05 ostaju relevantni: zajednički keš/red nisu vezani za identitet korisnika; odjava ih ne prazni ili izoluje. Zahtev starog korisnika može biti ponovljen sa sesijom novog.

Ponovljene izvršne kontrole pokazuju: dva istovremena upisa ostavljaju jednu stavku; nov upis tokom flush-a nestaje; dva paralelna flush-a šalju jednu stavku dva puta. ID reda se ne prenosi kao serverski idempotency ključ.

**Potrebno:** identitetski opseg, serijalizovane lokalne mutacije, zajednički flush lock i idempotentne serverske komande. Retry sam nije dovoljna garancija sinhronizacije.

### SYNC09 — P2: GPS i poslovni status nemaju jedinstven ishod

Pored nedostajuće create dozvole iz SYNC01, originalni tok najpre menja status na serveru pa pokreće GPS. Odbijena dozvola ostavlja server `IN_TRANSIT`, a mutaciju u grešci. GPS koristi vreme slanja umesto vremena uzorka i nepoznatu brzinu -1 prenosi kao -3.6 km/h. Izvršno provereno; raniji M06/M07.

**Potrebno:** odvojena potvrda poslovnog statusa i praćenja, mogućnost oporavka GPS-a i tačan ugovor vremena/brzine.

### SYNC10 — P2: liste mogu izgledati neusaglašeno zbog paginacije

Mobilni query-ji dokumenata, tura, lokacija i stanica na više mesta uzimaju samo prvu stranu. Kontrola query-ja dokumenata potvrđuje da se vraća niz bez `nextCursor`, i kada je server poslao sledeću stranu. Dashboard bira aktivnu turu i računa deo statistike iz ograničenog uzorka od 30 tura, dok zaseban summary koristi agregaciju nad bazom.

**Potrebno:** paginacija/namenski active endpoint i jasno razlikovanje zbirne statistike od uzorka. Ovo ne dokazuje gubitak podataka u bazi, nego nepotpun mobilni prikaz. Povezano sa M10.

### SYNC11 — P2: sesija nije jedinstveno upravljana kroz storage, memoriju i server

Web reset lozinke postavlja `mobileTokensValidFrom`; auth/refresh proveravaju opoziv. To je pozitivna veza. Mobilni API na neuspešan refresh briše SecureStore, ali ne ažurira odmah AuthProvider memoriju. Svaki neuspešan refresh HTTP status tretira kao razlog brisanja, iako 5xx može biti privremen kvar.

Zasebna promena lozinke kroz `/api/mobile/account/password` ne postavlja isti opoziv marker kao reset. Da li mora odjaviti druge sesije zahteva poslovnu bezbednosnu odluku; ovde se beleži razlika, ne proglašava samostalno zabranjenim ponašanjem.

**Potrebno:** jedinstvena politika isteka/opoziva i događaj kojim API obaveštava UI. Povezano sa M12.

### SYNC12 — P2: mobilni ekran zaboravljene lozinke nije povezan sa web tokom

`app/(auth)/forgot-password.tsx` je informativni placeholder sa tekstom da ga treba povezati sa postojećim reset-flow endpointom. Web ima reset tok, ali mobilni ekran ga ne koristi.

**Potrebno:** povezati zahtev i povratnu navigaciju sa postojećim bezbednim tokom ili jasno voditi korisnika na web oporavak. Ovo je pregled izvora, ne test isporuke email-a.

## Šta ne treba pogrešno zaključiti

- Broj 80/80 potvrđuje putanje i metode, **ne 100% usklađenost**.
- Validan payload može dobiti 403 zbog dozvole, 409 zbog statusa ili neuspeh zbog stanja povezane evidencije.
- Web i mobile ne moraju imati iste ekrane ili iste mogućnosti. Backend može ponuditi administrativne module za koje mobile nema ekran; to je granica proizvoda, a ne automatski sinhronizacioni bug.
- Poruka „sačuvano” i završetak lokalne mutacije nisu dokaz isporuke. Mobilni M09 već dokumentuje pogrešnu potvrdu da je operativa obaveštena o offline prijavi.
- Nije potvrđeno da su poslednji backend deploy i instalirani mobilni build upravo ove verzije. Izvorna usklađenost i usklađenost objavljenih verzija proveravaju se odvojeno.

## Redosled sanacije i prihvatanja

1. **Backend + mobile:** SYNC01–03 — dozvole, kanonska referenca fajla i autentifikovano otvaranje. Sačuvati tenant i own-driver ograničenja.
2. **Mobile + backend:** SYNC08 — pouzdan red i zaštita ponavljanja; zatim SYNC07 događaji osvežavanja.
3. **Backend:** SYNC04–06 — isti vozač, jedinstveno pravilo smene i isti format dnevnica.
4. **Mobile:** GPS oporavak, potpune liste i sesija; usaglasiti reset/promenu lozinke i povezati oporavak naloga.
5. Testnim nalogom bez override-a proći ture/dokumente/GPS, pa istu matricu ponoviti sa ograničenim i proširenim dozvolama.
6. Sa dve sesije/uređaja proveriti: web izmena → mobile osvežavanje i mobile izmena → web osvežavanje; promena aktivnog vozača; zaključavanje obračuna; offline prekid; restart; promena korisnika; ponovno slanje iste akcije.
7. Potvrditi tačan backend commit, migracije i instalirani build/OTA verziju pre produkcionog prijema.

## Završno stanje

Ovaj pregled izvora i ciljanih scenarija je završen. Odgovor na pitanje da li je sve sinhronizovano je **ne**: osnovni API raspored je usklađen, ali navedene funkcionalne i bezbednosne granice nisu. Potpuna operativna potvrda zahteva sanaciju i integracioni prijem na testnom backendu sa stvarnim mobilnim build-om.

Isti dokument i matrica dodaju se u `docs/pregledprojekta/` oba repozitorijuma radi zajedničkog referentnog stanja. Aplikacioni kod i postojeći koordinacioni TODO fajlovi nisu menjani.

## Izvori za proveru

- [Web/backend kod pregledane verzije](https://github.com/DimiG031/transport-website-app/tree/3f6540bd7b0c426b025c4ce14547b71959d32289/src).
- [Mobilni kod pregledane verzije](https://github.com/DimiG031/tms-mobile-app/tree/919c847cb7370a8d014e93c3dff4e2f3d7088724/src).
- [Web provera napretka — 247. prolaz](https://github.com/DimiG031/transport-website-app/blob/3f6540bd7b0c426b025c4ce14547b71959d32289/docs/pregledprojekta/TMS_Audit_2026-11-12_247_Dvesta_cetrdeset_sedmi_prolaz.md).
- [Mobilni pregled — 001](https://github.com/DimiG031/tms-mobile-app/blob/919c847cb7370a8d014e93c3dff4e2f3d7088724/docs/pregledprojekta/MOBILE_AUDIT_2026-11-12_001_Pregled_stanja_i_integracija.md).
