# Opsti pregled mobilne aplikacije

Mobilna aplikacija je React Native / Expo aplikacija namenjena vozacima i drugim buducim terenskim korisnicima u okviru SoftechRS TMS sistema.

Web aplikacija ostaje glavna administrativna aplikacija. Mobilna aplikacija sluzi kao operativni kanal za korisnike na terenu, posebno za vozace koji treba da vide svoje ture, dokumenta, poruke, obavestenja, troskove, rokove i relevantne radne podatke.

## 1. Namena

Mobilna aplikacija omogucava:

- prijavu mobilnog korisnika;
- cuvanje mobilne sesije;
- prikaz vozacevog profila i povezanih podataka;
- pregled aktivnih i buducih tura;
- prikaz detalja ture, stanica, dokumenata i operativnih napomena;
- promenu statusa ture i pojedinih operativnih elemenata kada backend to dozvoli;
- slanje GPS logova tokom aktivne ture;
- pregled i upload dokumenata;
- evidenciju troskova ture;
- prijem push obavestenja;
- chat/poruke;
- rad u uslovima slabog interneta preko lokalnog cache-a i offline reda;
- SOS/prijavu hitnog dogadjaja kada je funkcija omogucena.

## 2. Ciljni korisnici

Primarni korisnik je vozac koji je povezan sa firmom klijentom i konkretnim `driverId` nalogom u backend sistemu.

Buduci korisnici mogu biti:

- terenski radnici;
- dispeceri sa ogranicenim mobilnim pristupom;
- menadzeri koji zele mobilni pregled;
- drugi korisnici kojima backend dodeli mobilne module i dozvole.

Pravni dokumenti treba da jasno razlikuju:

- firmu klijenta kao ugovornog korisnika;
- administratora ili dispecera u web aplikaciji;
- vozaca ili terenskog korisnika u mobilnoj aplikaciji;
- SoftechRS kao pruzaoca tehnicke usluge.

## 3. Osnovni poslovni tok

Tipican tok rada:

1. Klijent u web aplikaciji vodi firme, vozace, vozila, ture, dokumenta i operativne podatke.
2. Vozac se prijavljuje u mobilnu aplikaciju email adresom i lozinkom.
3. Backend vraca mobilnu sesiju, korisnika, firmu, ulogu i `driverId`.
4. Mobilna aplikacija prikazuje samo podatke i module koje korisnik sme da vidi.
5. Vozac vidi svoje ture, detalje puta, stanice, dokumenta i obavestenja.
6. Tokom aktivne ture moze se slati GPS lokacija ako su ispunjeni uslovi i ako je dozvola data.
7. Vozac moze dodati dokument, sliku, PDF, trosak, poruku ili prijavu problema.
8. Podaci se sinhronizuju sa backend/API sistemom.
9. Web korisnici koriste administrativni deo sistema za pregled, obradu i dalje poslovne odluke.

## 4. Tehnicki okvir

Mobilna aplikacija koristi:

- React Native;
- Expo;
- Expo Router;
- TypeScript;
- React Query;
- SecureStore za auth sesiju;
- AsyncStorage za cache i offline queue;
- Expo Location za GPS;
- Expo Notifications za push;
- Expo Image Picker i Document Picker za slike, kameru, galeriju i PDF;
- API konfigurisan preko `EXPO_PUBLIC_API_URL`.

## 5. Status funkcija

Prema postojecoj dokumentaciji i kodu, implementirani su:

- mobilni login i refresh token tok;
- cuvanje sesije;
- biometrijsko otkljucavanje ako uredjaj podrzava;
- osnovna driver navigacija;
- ture i detalji ture;
- troskovnik;
- dokumenta i upload;
- push token registracija;
- obavestenja;
- chat;
- GPS tracking tokom aktivne ture;
- offline queue za odredjene write operacije;
- EAS konfiguracija;
- profil, rokovi i pojedini vozacki pregledi.

## 6. Pravna priroda ovog dokumenta

Ovaj dokument opisuje poslovno-tehnicku funkcionalnost. Advokat treba da iz njega izvede finalne pravne formulacije, posebno za odgovornost, privatnost, dozvole uredjaja, obradu lokacije, obradu podataka vozaca i odnos web/mobile kanala.
