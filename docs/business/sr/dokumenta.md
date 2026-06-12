# Dokumenta

## Pregled

Mobilni modul dokumenata omogućava pregled dokumenata dostupnih korisniku i dodavanje dokumenata direktno na turu.

---

## Šta možete

* pregled dokumenata dostupnih mobilnom korisniku
* otvaranje dokumenta kroz link ili sistemski pregled
* pregled dokumenata vezanih za konkretnu turu
* slikanje dokumenta kamerom
* izbor slike iz galerije
* izbor PDF dokumenta
* upload fajla i povezivanje sa turom
* unos naziva i tipa dokumenta

---

## API oslonac

* `GET /api/documents?limit=100`
* `GET /api/documents?relatedType=tour&relatedId=...`
* `POST /api/documents`

---

## Prednosti

* vozač može brzo da pošalje CMR, nalog za utovar ili drugi dokument
* dokument ostaje vezan za turu
* smanjuje se slanje dokumenata kroz neformalne kanale

---

## Zaključak

Dokumenta u mobilnoj aplikaciji služe da vozač brzo pregleda i dostavi ono što je potrebno za konkretnu turu.

