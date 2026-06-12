# Detalji ture

## Pregled

Detalji ture prikazuju operativne informacije koje vozaču trebaju na putu: šta, gde, kada, kome se javlja i koja dokumenta su vezana za turu.

---

## Šta možete

* pregled osnovnih podataka ture
* pregled statusa, početka, završetka, vozila i prikolice
* pregled napomena za turu
* pregled stanica ture
* prikaz tipa stanice: utovar, istovar, carina, pauza ili ostalo
* prikaz adrese, grada, države i kontakta
* prikaz planiranog dolaska i odlaska
* akcije na stanici: `Stigao` i `Krenuo`
* pregled carine i špedicije ako postoje
* pregled dokumenata vezanih za turu
* pregled napomena za vozača, carinu, utovar ili istovar

---

## API oslonac

* `GET /api/tours/:id`
* `GET /api/route-stops?tourId=...`
* `GET /api/documents?relatedType=tour&relatedId=...`
* `POST /api/mobile/route-stops/:id/actions`

---

## Prednosti

* vozač ne mora da traži informacije kroz administrativni prikaz
* stanice i dokumenta su organizovani po praktičnim sekcijama
* akcije na stanici koriste uski mobile endpoint, ne široke admin izmene

---

## Zaključak

Detalji ture su praktičan ekran za izvršenje ture, ne kopija web admin forme.

