# Obaveštenja

## Pregled

Mobilni ekran obaveštenja prikazuje operativna obaveštenja koja nisu chat poruke.

---

## Šta možete

* pregled operativnih obaveštenja
* prikaz broja nepročitanih obaveštenja
* označavanje pojedinačnog obaveštenja kao pročitanog
* označavanje svih obaveštenja kao pročitanih
* otvaranje ciljne stranice iz obaveštenja
* povratak nazad na obaveštenja kada je ekran otvoren iz obaveštenja

---

## API oslonac

* `GET /api/notifications`
* `PATCH /api/notifications/:id`
* `POST /api/notifications/mark-all-read`

---

## Pravila

* chat poruke se ne prikazuju u operativnim obaveštenjima
* `Označi sve kao pročitano` ne šalje query parametre
* posle uspeha osvežava se lista i badge
* klik na operativno obaveštenje vodi na konkretan cilj, ne na generički ekran

---

## Zaključak

Obaveštenja su namenjena operativnim događajima: ture, dokumenta, rokovi i slične informacije.

