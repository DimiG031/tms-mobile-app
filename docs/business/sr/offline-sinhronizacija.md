# Offline rad i sinhronizacija

## Pregled

Mobilna aplikacija mora da bude upotrebljiva i kada je mreža slaba ili privremeno nedostupna.

---

## Šta možete

* prikaz upozorenja kada nema mreže
* čuvanje pojedinih akcija u lokalnom redu
* ponovno slanje akcija kada se mreža vrati
* rad sa troškovima i dokumentima uz proveru uspešnog slanja
* osvežavanje podataka na focus, app resume ili ručni refresh

---

## Pravila

* ne koristiti stalni polling u pozadini
* ne pozivati chat API na svake 2 do 5 sekundi
* koristiti push za chat poruke
* koristiti ručno osvežavanje kada korisnik želi svež prikaz

---

## Prednosti

* manja potrošnja baterije
* manje nepotrebnih API poziva
* aplikacija ostaje korisna u realnim uslovima na putu

---

## Zaključak

Offline logika treba da podrži terenski rad vozača bez agresivnog osvežavanja podataka.

