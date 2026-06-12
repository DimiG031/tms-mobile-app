# Ture

## Pregled

Modul tura prikazuje ture koje su dostupne mobilnom korisniku. Za vozača backend filtrira samo ture koje su njemu dodeljene.

---

## Šta možete

* pregled aktivnih i predstojećih tura
* otvaranje detalja konkretne ture
* prikaz relacije, statusa, vozila, prikolice i datuma
* pregled troškova ture
* pregled i dodavanje dokumenata ture
* ulaz u sekciju Detaljnije sa operativnim podacima
* osvežavanje liste pri otvaranju ekrana ili ručno

---

## API oslonac

* `GET /api/tours`
* `GET /api/tours/:id`

---

## Prednosti

* vozač vidi samo svoje ture
* nema slanja `driverId` kao sigurnosnog filtera iz aplikacije
* statusi su prikazani na srpskoj latinici

---

## Zaključak

Mobilni modul tura je ulazna tačka za sve što vozač treba da zna i uradi tokom puta.

