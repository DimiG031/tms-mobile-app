# Finalni dokumenti za advokata - mobilna aplikacija

Ovaj folder je pripremljen kao objedinjeni paket za advokata radi izrade, dopune i revizije pravne dokumentacije za mobilnu aplikaciju u okviru **SoftechRS TMS** sistema.

Dokumenti u ovom folderu nisu finalni pravni akti i ne predstavljaju pravni savet. Oni su poslovno-tehnicki ulazni materijal koji objasnjava sta mobilna aplikacija radi, koje podatke obradjuje, koji su tehnicki tokovi i koja pitanja advokat treba da proveri pre izrade ili revizije uslova koriscenja, politike privatnosti, ugovora o obradi podataka, licence i pratecih akata.

## Vazna napomena o firmi i domenima

Radna pretpostavka je da ce pruzalac usluge najverovatnije biti **SOFTECHRS doo**, ali tacan naziv firme, PIB, maticni broj, adresa, sediste, zastupnik i kontakt podaci moraju biti provereni pre upotrebe u pravnim dokumentima.

`softechrs.com` treba tretirati kao domen firme. Posebno treba potvrditi domen web aplikacije, domen mobilne aplikacije ako postoji i API/backend domen koji mobilna aplikacija koristi.

Sva polja za podatke firme ostaju kao placeholder-i dok se ne unesu proverene vrednosti.

## Dokumenti u ovom folderu

| Dokument | Svrha |
|---|---|
| [00-podaci-firme-i-domeni.md](00-podaci-firme-i-domeni.md) | Podaci firme, domeni, kontakti i otvorena polja za kasniji unos. |
| [01-opsti-pregled-mobilne-aplikacije.md](01-opsti-pregled-mobilne-aplikacije.md) | Opsti opis mobilne aplikacije, korisnika, namene i poslovnog modela. |
| [02-kompletan-pregled-funkcija.md](02-kompletan-pregled-funkcija.md) | Pregled funkcija koje su pravno i poslovno relevantne. |
| [03-podaci-i-obrada-podataka.md](03-podaci-i-obrada-podataka.md) | Kategorije podataka, obrade, rizici, pravni osnovi i rokovi cuvanja. |
| [04-pravni-dokumenti-za-reviziju.md](04-pravni-dokumenti-za-reviziju.md) | Pravni dokumenti koje treba izraditi ili revidirati za mobilni kanal. |
| [05-bezbednost-tehnologija-integracije.md](05-bezbednost-tehnologija-integracije.md) | Tehnologija, integracije, bezbednost, dozvole uredjaja i podobrada. |
| [06-checklista-za-advokata.md](06-checklista-za-advokata.md) | Konkretna checklista odluka i provera za advokata. |
| [07-odnos-web-i-mobilne-aplikacije.md](07-odnos-web-i-mobilne-aplikacije.md) | Odnos web administracije, mobilne aplikacije i backend/API sistema. |

## Izvori koji su pregledani

Paket je pripremljen na osnovu postojece dokumentacije i koda u ovom projektu, ukljucujuci:

- `README.md`;
- `docs/TMS-mobile-app-implementation.md`;
- `docs/server-mobile-auth.md`;
- `docs/business/sr`;
- `docs/todo`;
- `app/(auth)`;
- `app/(driver)`;
- `src/services`;
- `src/lib`;
- `src/queries`;
- `app.json`;
- `package.json`.

Kao referenca je pregledana i dokumentacija web/TMS aplikacije iz `C:\Users\goran\transport-website-app\docs`, posebno postojece strukture `docs/finalni-dokumenti`, `docs/za-advokata`, `docs/legal`, poslovni opisi modula i dokumenti o podacima, bezbednosti i obradi.

## Kako koristiti paket

Preporuceni redosled za advokata:

1. procitati ovaj `README`;
2. popuniti ili oznaciti otvorena polja u `00-podaci-firme-i-domeni.md`;
3. procitati opsti pregled mobilne aplikacije;
4. proveriti kompletan pregled funkcija;
5. proveriti podatke i obrade;
6. uporediti pravne dokumente za web i mobile kanal;
7. proveriti bezbednosne, tehnicke i integracione rizike;
8. proci kroz checklistu.

## Status

Ovaj folder je spreman kao poslovno-tehnicki paket za pravnu reviziju. Pravno obavezujuce tekstove advokat treba da izradi, dopuni ili revidira pre objavljivanja korisnicima.
