# Checklista za advokata

Ova checklista sluzi za pravnu reviziju mobilne aplikacije kao dela SoftechRS TMS sistema.

## 1. Podaci firme

- [ ] Potvrditi tacan naziv firme prema registru.
- [ ] Potvrditi da li je naziv **SOFTECHRS doo** tacan.
- [ ] Uneti PIB.
- [ ] Uneti maticni broj.
- [ ] Uneti adresu i sediste.
- [ ] Uneti zastupnika.
- [ ] Potvrditi email za pravna pitanja.
- [ ] Potvrditi email za privatnost.
- [ ] Potvrditi email za podrsku.
- [ ] Potvrditi da je `softechrs.com` domen firme.
- [ ] Potvrditi domen web aplikacije.
- [ ] Potvrditi domen API/backend sistema.
- [ ] Potvrditi da li postoji poseban domen za mobilnu aplikaciju.

## 2. Odnos web i mobile kanala

- [ ] Potvrditi da je mobilna aplikacija deo sireg SoftechRS TMS sistema.
- [ ] Potvrditi da je web aplikacija glavna administrativna aplikacija.
- [ ] Potvrditi da je mobilna aplikacija namenjena vozacima ili terenskim korisnicima.
- [ ] Proveriti da pravni dokumenti pokrivaju oba kanala.
- [ ] Proveriti da se ista pravila privatnosti primenjuju na web i mobile podatke.
- [ ] Proveriti da klijent razume svoju ulogu rukovaoca za podatke vozaca.

## 3. Mobilna autentifikacija

- [ ] Proveriti login tok i refresh token tok.
- [ ] Definisati trajanje access tokena.
- [ ] Definisati trajanje refresh tokena.
- [ ] Proveriti rotaciju refresh tokena.
- [ ] Proveriti cuvanje tokena u SecureStore.
- [ ] Definisati pravila za izgubljen telefon.
- [ ] Definisati deaktivaciju naloga bivseg vozaca.
- [ ] Definisati odgovornost korisnika za cuvanje pristupa uredjaju.
- [ ] Proveriti da li je biometrija samo lokalno otkljucavanje, a ne novi pravni identitet.

## 4. GPS i lokacija

- [ ] Potvrditi pravni osnov za GPS pracenje.
- [ ] Potvrditi da li GPS radi samo tokom aktivne ture.
- [ ] Potvrditi da li se koristi background lokacija.
- [ ] Definisati rok cuvanja GPS logova.
- [ ] Definisati ko sme da vidi GPS podatke.
- [ ] Definisati da li vozac dobija posebno obavestenje o pracenju.
- [ ] Proveriti da li je potrebna DPIA/procena uticaja.
- [ ] Proveriti odnos GPS-a i evidencije radnog vremena.
- [ ] Proveriti kako se postupa kada korisnik odbije lokaciju.

## 5. Radni status, tahograf i rokovi

- [ ] Proveriti da li mobilna aplikacija obradjuje radne sate.
- [ ] Proveriti da li status ture moze biti evidencija rada.
- [ ] Proveriti da li backend/web sistem obradjuje tahograf podatke.
- [ ] Proveriti da li mobilni profil prikazuje tahograf karticu.
- [ ] Definisati rokove cuvanja tahograf i radnih podataka ako postoje.
- [ ] Proveriti podatke o lekarskom pregledu, ADR/CPC i vozackoj dozvoli.
- [ ] Proveriti da li postoje podaci o kaznama ili prekrsajima vozaca.

## 6. Push tokeni i notifikacije

- [ ] Proveriti da li je Expo podobradjivac.
- [ ] Proveriti ulogu Apple/Google push servisa.
- [ ] Definisati svrhu push notifikacija.
- [ ] Definisati sadrzaj koji sme da se prikaze na lock screen-u.
- [ ] Definisati brisanje push tokena pri logout-u.
- [ ] Definisati brisanje tokena pri deaktivaciji naloga.
- [ ] Proveriti da li korisnik moze odbiti notifikacije bez gubitka osnovne usluge.

## 7. Offline podaci

- [ ] Popisati sta se cuva lokalno na telefonu.
- [ ] Proveriti da li se cache brise pri logout-u.
- [ ] Proveriti da li se offline queue brise pri logout-u.
- [ ] Definisati sta se desava sa pending akcijama.
- [ ] Proveriti rizik izgubljenog telefona.
- [ ] Definisati proceduru za kompromitovan uredjaj.
- [ ] Proveriti da li lokalni podaci sadrze GPS, dokumenta, troskove ili poruke.

## 8. Dokumenta, kamera i fajlovi

- [ ] Definisati dozvoljene tipove dokumenata.
- [ ] Definisati zabranjeni sadrzaj.
- [ ] Definisati odgovornost klijenta za upload.
- [ ] Definisati rok cuvanja dokumenata.
- [ ] Definisati brisanje dokumenata.
- [ ] Proveriti storage provajdera.
- [ ] Proveriti pristup dokumentima po ulozi.
- [ ] Proveriti dozvole kamere.
- [ ] Proveriti dozvole galerije/slika.
- [ ] Proveriti PDF i druge fajlove.

## 9. Chat, SOS i prijave problema

- [ ] Definisati pravila prihvatljivog koriscenja chat-a.
- [ ] Definisati rok cuvanja poruka.
- [ ] Definisati ko sme da cita poruke.
- [ ] Definisati izvoz i brisanje poruka.
- [ ] Definisati sta SOS funkcija jeste, a sta nije.
- [ ] Proveriti da SOS ne obecava javnu hitnu intervenciju.
- [ ] Definisati obradu GPS lokacije u SOS prijavi.
- [ ] Definisati rok cuvanja incidenta/prijave problema.

## 10. Podobradjivaci i transferi

- [ ] Popuniti hosting provajdera.
- [ ] Popuniti database provajdera.
- [ ] Popuniti storage provajdera.
- [ ] Popuniti Expo/EAS.
- [ ] Popuniti push servise.
- [ ] Popuniti mape.
- [ ] Popuniti monitoring gresaka.
- [ ] Proveriti lokacije obrade.
- [ ] Proveriti DPA za svakog dobavljaca.
- [ ] Proveriti prenos van Srbije/EU ako postoji.

## 11. Finalna objava

- [ ] Uskladiti web i mobile pravne tekstove.
- [ ] Objaviti link ka politici privatnosti za app store.
- [ ] Objaviti link ka uslovima koriscenja ako je potrebno.
- [ ] Uskladiti onboarding i login ekran sa finalnim aktima.
- [ ] Uskladiti permission tekstove sa politikom privatnosti.
- [ ] Upisati verziju i datum stupanja na snagu.
- [ ] Sacuvati finalne verzije pravnih akata.
