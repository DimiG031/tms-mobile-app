# Bezbednost, tehnologija i integracije

Ovaj dokument opisuje tehnicki okvir mobilne aplikacije i tacke koje advokat treba da razume pri pravnoj reviziji.

## 1. Tehnologija

Mobilna aplikacija koristi:

- React Native;
- Expo;
- Expo Router;
- TypeScript;
- React Query;
- NativeWind/Tailwind stilove;
- SecureStore;
- AsyncStorage;
- Expo Location;
- Expo Notifications;
- Expo Image Picker;
- Expo Document Picker;
- Expo Local Authentication;
- Expo Task Manager;
- EAS/Expo Updates.

## 2. Backend/API

Mobilna aplikacija komunicira sa backend/API sistemom preko `EXPO_PUBLIC_API_URL`.

Relevantni endpointi ukljucuju:

- `/api/auth/mobile-login`;
- `/api/auth/mobile-refresh`;
- `/api/mobile/profile`;
- `/api/mobile/driver-profile`;
- `/api/tours`;
- `/api/tours/:id`;
- `/api/route-stops`;
- `/api/documents`;
- `/api/upload/presign`;
- `/api/gps-logs`;
- `/api/notifications`;
- `/api/chat/threads`;
- `/api/users/:id/push-token`;
- buduce ili postojece endpoint-e za SOS, issues, checklist i preferences.

Pravno relevantno: domen API-ja treba posebno potvrditi, jer `softechrs.com` jeste domen firme, ali API/mobilni domen mora biti naveden tacno.

## 3. Auth i tokeni

Implementirani ili dokumentovani elementi:

- JWT access token;
- refresh token;
- rotacija refresh tokena kao preporuka;
- SecureStore cuvanje sesije;
- biometrijsko otkljucavanje lokalne sesije;
- logout i brisanje sesije;
- bearer auth na API rute.

Rizici:

- izgubljen telefon;
- deljen telefon;
- kompromitovan token;
- nedovoljno brisanje tokena na backend-u;
- nepostojanje rate limit-a;
- duga trajanja tokena.

Preporuka za pravnu i tehnicku potvrdu:

- definisati odgovornost korisnika za uredjaj;
- definisati procedure deaktivacije naloga;
- potvrditi backend opoziv refresh tokena;
- potvrditi logovanje bezbednosnih dogadjaja.

## 4. Dozvole uredjaja

Mobilna aplikacija moze traziti:

- lokaciju dok se aplikacija koristi;
- background lokaciju;
- kameru;
- pristup galeriji/slikama;
- pristup dokumentima/fajlovima;
- push notifikacije;
- biometrijsku autentifikaciju ako je dostupna.

Pravno relevantno:

- dozvole moraju imati jasnu svrhu;
- korisnik treba da razume posledicu odbijanja dozvole;
- background lokacija mora biti posebno objasnjena;
- kamera i galerija se koriste za upload poslovnih dokumenata, racuna i slika;
- push notifikacije se koriste za operativna obavestenja i chat.

## 5. GPS i background task

Tehnicki:

- GPS task salje lokaciju tokom aktivne ture;
- koristi balanced accuracy;
- interval je tehnicki konfigurisan;
- koristi background location i foreground service na Android-u;
- prikazuje sistemsku indikaciju background lokacije tamo gde platforma to podrzava;
- cuva tracking state u AsyncStorage;
- salje logove na `/api/gps-logs`;
- ako nema mreze, koristi offline queue.

Pravno relevantno:

- ovo je jedna od najvaznijih obrada za pravnu reviziju;
- treba potvrditi pravni osnov;
- treba potvrditi transparentnost prema vozacu;
- treba ograniciti svrhu na aktivne ture;
- treba definisati ko vidi lokaciju i koliko dugo.

## 6. Offline cache i local storage

Koristi se:

- React Query cache persist;
- AsyncStorage;
- offline write queue;
- queue count indikatori;
- GPS batch flush;
- reconnect sync.

Rizici:

- lokalni podaci mogu ostati na telefonu;
- podaci mogu biti zastareli;
- pending akcije mogu biti poslate kasnije;
- telefon moze biti izgubljen ili kompromitovan.

Tehnicki i pravni dokumenti treba da opisu:

- sta se cuva lokalno;
- kada se brise;
- da li se brise pri logout-u;
- sta se desava pri reinstalaciji aplikacije;
- da li klijent ima proceduru za izgubljeni uredjaj.

## 7. Upload i storage

Upload tok koristi:

- izbor kamere/galerije/PDF-a;
- presign endpoint;
- upload fajla;
- kreiranje dokument metadata zapisa;
- povezivanje sa turom.

Rizici:

- fajlovi mogu sadrzati licne podatke;
- slike mogu sadrzati lica, lokacije, registarske oznake ili poverljive dokumente;
- storage provajder moze biti podobradjivac;
- treba definisati prava pristupa, brisanje, izvoz i rok cuvanja.

## 8. Push notifikacije

Koristi se Expo Notifications:

- registracija Expo push tokena;
- platforma `ios` ili `android`;
- slanje tokena backend-u;
- token listener;
- foreground notification handler;
- deep-link route resolver.

Potencijalni podobradjivaci:

- Expo;
- Apple Push Notification service;
- Firebase Cloud Messaging / Google;
- hosting/backend servis koji salje push.

Potrebno je potvrditi tacnu listu podobradjivaca, lokacije obrade i ugovorne osnove.

## 9. Mape i navigacija

Aplikacija moze otvarati adrese ili lokacije u mapama. Ako se koriste spoljni map servisi, treba potvrditi:

- da li se podaci salju Apple/Google mapama;
- koje adrese ili koordinate se prosledjuju;
- da li je to samo otvaranje sistemske aplikacije ili integracija unutar TMS-a;
- da li mape imaju odvojene uslove koriscenja.

## 10. Bezbednosne mere za proveru

Advokat i tehnicki tim treba da potvrde:

- TLS/HTTPS za API;
- hash lozinki na backend-u;
- hash refresh tokena u bazi;
- rate limit login-a;
- driver-scope provere na backend-u;
- company-scope provere;
- audit log za osetljive akcije;
- pristup uploadovanim fajlovima;
- pravila za superadmin/support pristup;
- backup i disaster recovery;
- incident response;
- brisanje naloga i podataka;
- minimalne dozvole mobilnih korisnika.

## 11. Integracije i podobradjivaci

Lista mora biti popunjena stvarnim dobavljacima:

| Servis | Svrha | Status |
|---|---|---|
| Hosting backend-a | API i server | [POTVRDITI] |
| Baza podataka | cuvanje podataka | [POTVRDITI] |
| Storage fajlova | dokumenta i slike | [POTVRDITI] |
| Expo/EAS | build, updates, push token flow | [POTVRDITI] |
| Apple/Google push | push isporuka | [POTVRDITI] |
| Mape | navigacija/lokacije | [POTVRDITI] |
| Monitoring gresaka | stabilnost i incidenti | [POTVRDITI] |
| Email/SMS ako postoji | obavestenja i podrska | [POTVRDITI] |

Za svaki servis proveriti DPA, lokaciju obrade, prenos van Srbije/EU, mere zastite i rok cuvanja.
