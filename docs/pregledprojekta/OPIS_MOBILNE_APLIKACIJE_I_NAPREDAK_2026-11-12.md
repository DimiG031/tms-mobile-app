> Istorijski pregled ili predlog, bez aktivnog statusa završavanja. Važeći plan, kriterijumi i rezultati su isključivo u [centralnoj evidenciji web repozitorijuma](https://github.com/DimiG031/transport-website-app/blob/main/docs/glavnipregledprojekta/POCETAK_RAZGOVORA.md). Sačuvani tekst nije odobrenje buduće implementacije niti novi dokaz ručnog prijema.

# SofTechRS Transport Mobile — opis aplikacije i procena napretka

**Datum: 12. novembar 2026.**  
**Projekat:** `DimiG031/tms-mobile-app`.  
**Procenjena verzija:** `c113a0fb71600be9fe049bd65ba2bec34e001b48`.

## Sažetak

SofTechRS Transport Mobile je mobilni deo SofTechRS Transport/TMS platforme. Namenjen je prvenstveno vozačima i terenskom radu: omogućava pristup turama, dokumentima, porukama, zadacima i ličnim podacima, uz slanje događaja sa puta i povezivanje sa operativom kompanije.

Mobilna aplikacija koristi zajednički backend sa web sistemom. Web deo služi za šire upravljanje kompanijom i planiranje, dok mobilni deo približava vozaču podatke i radnje potrebne tokom putovanja. Nije zaseban kompletan poslovni sistem koji zamenjuje sve web module.

**Okvirna funkcionalna implementacija postojećeg vozačkog obuhvata procenjuje se na oko 80% (raspon 75–85%). Ukupna završenost prema stabilnom produkcionom mobilnom izdanju procenjuje se na oko 65% (raspon 60–70%).** Procena uključuje preostali posao na pouzdanosti offline rada, izolaciji lokalnih podataka, integracionim proverenama i radu na stvarnim uređajima. Procenti su inženjerska ocena, a ne rezultat formalnog prijema ili izmeren procenat pokrivenosti testovima.

## Namena i vrednost

Cilj mobilnog dela je da vozač dobije pregled svog angažovanja i mogućnost beleženja događaja bez oslanjanja isključivo na telefonske pozive, papir i nepovezane aplikacije. Operativa dobija strukturisane podatke koji mogu da se povežu sa turama, putnim nalozima, dokumentima i obračunima.

Korisnički interfejs je pretežno na srpskom jeziku. Osnovna navigacija obuhvata početnu stranu, izbor dodatnih modula i profil. Postoje podešavanja izbora i redosleda modula na osnovu mobilnog profila sa servera. Sadašnji skup ekrana dominantno je vozački; potpuno razvijen mobilni rad za sve administrativne uloge nije potvrđen ovim pregledom.

## Funkcionalne celine

### Prijava i korisnički nalog

Postoje prijava, čuvanje sesije u sistemskom bezbednom skladištu, obnavljanje pristupnog tokena i opcija biometrijskog otključavanja. Aplikacija obrađuje neaktivan nalog i omogućava ponovnu proveru aktivacije. Korisnik ima profil, podešavanja i promenu lozinke. Biometrija postoji kao opcija; sadašnji kod je ne nameće pri svakom otvaranju sa sačuvanom sesijom.

### Početni pregled i ture

Početni ekran objedinjuje operativne informacije, ture i obaveštenja. Korisnik može da pregleda ture i istoriju, detalje puta, dodeljeno vozilo i povezane podatke. Postoje promene statusa kroz faze polaska, puta i završetka.

Dvojna posada i aktivni vozač uključeni su u model pristupa. Interfejs razlikuje mogućnost unosa prema aktivnoj smeni i podržava promenu vozača kroz odgovarajuće poslovne akcije. Serverska autorizacija ostaje konačni izvor dozvole.

### Stanice, lokacije i navigacija

Prikazuju se stanice ture i povezane informacije. Postoje akcije dolaska, odlaska, otkazivanja i beleške, kao i snimanje koordinata stanice. Aplikacija podržava otvaranje navigacije i prikaz lokacijskih podataka kada su dostupni.

Posebna mapa mesta obuhvata lokacije korisne vozačima, poput parkinga i pumpi. Postoje unos i izmena mesta, fotografije, potvrđivanje, prijave i glasanje o sadržajima. Prikaz i funkcionalnost zavise od dostupnih koordinata i serverskih podataka.

### Putni nalozi i događaji sa puta

Vozač može da pristupa putnim nalozima, događajima i putnom listu. Evidentiraju se poslovni događaji kao što su granica, utovar, istovar, gorivo, kilometraža, odmor i napomena. Postoje vraćanje naloga, rad sa stavkama i zahtevi za izmenu, povezani sa backend pravilima.

### Troškovi i obračunski list

Mobilni tok obuhvata troškovnik ture, stavke i njihovu izmenu, brisanje i potvrdu prema dozvoljenom statusu. Time se troškovi sa terena povezuju sa administrativnim obračunom. Završne provere moraju obuhvatiti offline ponavljanje, zaključane obračune i ponašanje kod promene posade.

### Dokumenti i fotografije

Postoje pregled dokumenata, dokumentacija ture i otpremanje lokalnog fajla uz povezivanje sa poslovnim zapisom. Integracija koristi serversko pripremanje otpremanja i podržava direktno skladištenje ili lokalni upload tok. Uključene su biblioteke za izbor dokumenata i slika, prikaz PDF sadržaja, štampu i deljenje tamo gde konkretan ekran to koristi.

### Poruke i obaveštenja

Chat obuhvata listu razgovora, poruke, kreiranje razgovora i označavanje čitanja. Push obaveštenja povezuju sistemski događaj sa odgovarajućim ekranom. Postoji zaseban pregled operativnih obaveštenja i njihovo označavanje kao pročitanih.

### Zadaci, rokovnik, problemi i SOS

Vozač može da prati zadatke i njihove statuse. Rokovnik podržava lične podsetnike i unose. Checklist ture i prijava problema povezuju terensku kontrolu sa operativnim podacima. SOS tok omogućava slanje prijave sa pratećim informacijama i lokacijom kada je dostupna. Kada nema mreže, lokalno sačuvana SOS prijava još nije potvrđena isporuka operativi.

### Lični podaci i obračuni

Profil sadrži lične i vozačke podatke, kontakte, rokove, statistiku, obračune zarade i dnevnice. U ovoj oblasti postoji preostalo usklađivanje razrade dnevnica između sačuvanog serverskog formata i mobilnog prikaza.

### GPS i rad bez mreže

Implementirano je pozadinsko GPS praćenje povezano sa aktivnom turom, uz sistemske dozvole. Aplikacija ima trajni keš odgovora i red za odloženo slanje odabranih izmena. To omogućava delimičan rad bez mreže, ali ne znači da sve funkcije rade offline.

Pouzdanost reda trenutno zahteva doradu: ciljane provere pokazale su gubitak stavki u konkurentnim situacijama i ponovljeno izvršavanje pri paralelnom slanju. Zato offline režim treba opisivati kao implementiranu funkcionalnost u fazi stabilizacije.

## Tehnička osnova

Aplikacija koristi Expo 54, React Native 0.81.5, React 19.1 i TypeScript 5.9. Navigacija je zasnovana na Expo Router-u, a učitavanje i keširanje na TanStack Query-ju. NativeWind/Tailwind podržava izgled interfejsa.

Expo SecureStore čuva sesiju, dok AsyncStorage služi za keš i offline red. Integracije obuhvataju lokaciju i background zadatke, push obaveštenja, biometriju, dokumente, slike, PDF/štampu i deljenje. Mobilni API koristi HTTPS produkcioni backend `tms.softechrs.com`.

Postoje EAS konfiguracije za development, preview i production, kao i konfiguracija OTA ažuriranja. Podešeni su Android package i iOS bundle identifikator. Postojanje konfiguracije ne potvrđuje uspešan build, objavljivanje u prodavnicama niti završeno testiranje oba operativna sistema.

## Zatečeni obim i provera

| Pokazatelj | Rezultat pregleda |
|---|---:|
| TypeScript `.ts` fajlovi, uključujući deklaracije | 50 |
| `.tsx` fajlovi | 52 |
| Query fajlovi | 27 |
| Ekranski fajlovi, bez layout-a | 32 |
| Izvori koji su sintaksno transpilirani | 99 |
| Sintaksne greške u toj proveri | 0 |
| Usmereni izvršni scenariji | 8 |

Provereno je postojanje odgovarajućih backend putanja za API reference iz mobilnog izvora. Čitani su i pojedini stvarni ugovori odgovora, naročito za sesiju i dnevnice. Postojanje putanje ne dokazuje ispravnost svih metoda, dozvola i oblika podataka.

U pregledanom repozitorijumu nisu pronađeni test fajlovi i GitHub CI workflow definicije; GitHub Actions nije vratio izvršavanja. Postoji skripta za proveru tipova, ali puna provera tipova i native build nisu izvršeni u ovom pregledu. Usmerene kontrole koriste originalne funkcije sa kontrolisanim zamenama skladišta, servera i native servisa; nisu zamena za testiranje na telefonu.

## Procena završenosti

| Oblast | Okvirna procena | Obrazloženje |
|---|---|---|
| Postojeći vozački funkcionalni obuhvat | Oko 80% | Glavni ekrani i brojne API veze postoje; ostaju usklađivanja tokova, podataka i ponašanja u izuzecima. |
| Ukupno do stabilnog produkcionog mobilnog izdanja | Oko 65% | Potrebni su pouzdan offline rad, izolacija naloga, regresioni testovi, integracioni prijem i validacija na uređajima. |

Ne postoji odobren ponderisan spisak svih mobilnih zahteva sa kriterijumima prihvatanja. Zbog toga procente treba koristiti za okvirno predstavljanje faze razvoja, a ne kao ugovorni dokaz ili vremensku prognozu. Procena se odnosi na sadašnji vozački obuhvat i ne uključuje buduće kompletno administrativno upravljanje sa mobilnog uređaja.

## Preostali koraci

1. Izolovati lokalni keš i offline red po korisniku i firmi, sa bezbednim prelaskom između naloga.
2. Obezbediti serijalizovano čuvanje reda, jedinstveno slanje i serversku zaštitu od ponovljenih poslovnih komandi.
3. Uskladiti status ture sa GPS dozvolama, vreme GPS merenja, stanje sesije i jasne poruke o čekanju na slanje.
4. Dovršiti usklađivanje podataka, posebno razrade dnevnica, i obezbediti kompletne liste kroz paginaciju.
5. Uvesti automatsku proveru tipova i regresione testove u CI.
6. Na Android i iOS uređajima proveriti background rad, dozvole, prekid i povratak mreže, restart aplikacije, odjavu, promenu posade, dokumente i push navigaciju.
7. Potvrditi celovite poslovne tokove sa testnim backendom, pripremiti stabilan build i sprovesti pilot sa vozačima i operativom.

## Granice izveštaja

Ovo je poslovno-tehnički opis zasnovan na izvornom kodu i ciljanoj proveri. Ne potvrđuje broj aktivnih korisnika, objavljivanje u prodavnicama, dostupnost servisa niti uspeh svih produkcionih integracija. Mobilna spremnost zavisi i od ispravnosti zajedničkog backend sistema.

Detaljni interni nalazi nalaze se u **`MOBILE_AUDIT_2026-11-12_001_Pregled_stanja_i_integracija.md`** u istom folderu. Tokom ove provere aplikacioni kod nije menjan.
