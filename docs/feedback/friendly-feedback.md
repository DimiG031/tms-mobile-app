# Friendly feedback

Zbirka povratnih informacija (od korisnika/testera/kolega). Novije stavke na vrhu.

---

## 2026-08-17 — Web landing page (sajt)

> Odnosi se na **web landing page** (repo `transport-website-app`), ne na mobilnu aplikaciju.

### Glavni utisak (jedna ideja)
Landing pokušava da bude **homepage + dokumentacija + feature katalog + demo prezentacija odjednom**. Trenutno sajt pokušava da dokaže *koliko TMS ima stvari*. Bolja verzija treba za **20–30 sekundi** da objasni **koji haos u transportnoj firmi rešava**, pokaže proizvod i navede čoveka da klikne **Demo**.

### Kratke stavke (prvobitni feedback)
1. **Početna je predugačka, previše skrolovanja** → svesti na kraću prezentaciju ključnih funkcionalnosti, kroz nekoliko kratkih sekcija, uz linkove ka detaljnijim objašnjenjima.
2. **Nedostaju OG/meta podaci za deljenje** → na Viberu se prikazuje samo title. Dodati opis od jedne rečenice + OG sliku/logo za bolji preview.
3. **Tekstovi na početnoj deluju „AI-napisano"** → prepisati prirodnijim, ljudskijim tonom.

### Šta bih prvo promenio
1. **Izbaciti „development copy" sa produkcionog landing-a.** Postoje rečenice tipa „Landing treba da pokaže realan tok rada…" i „Kada ubacimo screenshotove iz produkta…" — zvuči kao interna beleška dizajnera/developera koja je slučajno ostala javno. Isto važi za „Mobilna aplikacija… uskoro" u ovakvoj formi.
2. **Homepage svesti na 5–6 blokova max**, npr.: Hero → Kako pomaže firmi → 4 ključna modula → screenshot proizvoda → mobilna aplikacija → CTA/demo. Trenutno se prolazi kroz desetine pojedinačnih funkcija (ture, tahograf, PP aparati, RBAC, audit log, akademija…) — odličan sadržaj za `/features` ili `/modules`, ali previše za početnu.
3. **Prodavati REZULTAT, pa tek onda funkcionalnosti.** Sada messaging ide u smeru „imamo vozače, vozila, prikolice, ture, dokumente…". Bolje:
   - Naslov: **„Sve što transportna firma mora da prati, na jednom mestu."**
   - Ispod 3 konkretna outcome-a:
     - ne propuštate registracije, dozvole i rokove
     - dispečer vidi ture i vozila na jednom mestu
     - vlasnik vidi troškove i profitabilnost bez Excel fajlova

### Hero može značajno jače
Trenutni naslov „Kompletno rešenje za upravljanje transportnom kompanijom" je korektan ali generičan. Predlog:
- Naslov: **„Transportna firma pod kontrolom, bez tabela, papira i propuštenih rokova."**
- Podnaslov: „Ture, vozači, vozila, dokumenti, tahografi, fakture i rokovi u jednom TMS sistemu."
- CTA: **Isprobaj demo** · sekundarno: **Pogledaj kako radi**
- **„Preuzmi Android aplikaciju" NE držati kao ravnopravan treći CTA** u hero sekciji — korisniku koji tek upoznaje proizvod to nije sledeći logičan korak.

### Demo flow je nepotrebno komplikovano objašnjen
Demo stranica odmah priča o „automatskom login-u", „posebnom demo email-u", generisanju podataka posle prve prijave… To je tehnička implementacija koju korisnik ne mora da razume unapred. Bolje:
- **„Isprobajte kompletan TMS 7 dana besplatno. Unesite email i poslaćemo vam pristup demo kompaniji sa pripremljenim podacima."**
- Detalji eventualno sitnim tekstom ispod. Demo treba da izgleda kao lak ulazak, a ne kao procedura.

### Contact i About deluju nedovršeno (verovatno drugi najveći problem posle homepage-a)
- `/contact` praktično sadrži samo naslov i Gmail adresu.
- `/about` ima samo jednu generičnu rečenicu.
- Obara poverenje baš kad neko krene dublje da proverava ko stoji iza proizvoda.
- **Kontakt** napraviti kao malu prodajnu stranicu: Zakaži demo / email / telefon / kompanija / eventualno forma.
- **About** (ne mora roman): ko je SofTechRS, za koga je TMS napravljen, zašto postoji, eventualno gde je kompanija.

### Nedostaje „trust layer"
Landing govori šta sistem ume, ali skoro ništa ne odgovara na: „Zašto bih ovoj firmi dao podatke o vozačima, vozilima, dokumentima i finansijama?" Dodati mali blok:
- podaci izolovani po kompanijama
- role-based access (RBAC)
- audit log
- backup
- hosting / bezbednost
- podrška
- gde se podaci čuvaju (ako je relevantno)
- GDPR / privacy dokumentacija

RBAC i audit log već postoje kao funkcionalnosti, ali su zakopani među 40 modula. Za B2B SaaS ih predstaviti kao **razlog za poverenje**, ne kao još dve stavke feature liste.

### Brojevi „40+ modula / 1.4k rokova / 24/7" su sumnjivi kao social proof
Ako je 1.4k rokova realan produkcioni broj — super, ali kontekstualizovati. Ako je demo broj — ne koristiti kao kompanijski KPI (deluje izmišljeno). Mnogo jači social proof (kasnije, samo ako su stvarni podaci): **„12 transportnih firmi · 280 vozila · 1.400+ aktivnih rokova"**.

### Screenshot proizvoda kao centralni vizuelni element
Galerija pravih ekrana je zamišljena ali nije popunjena — podići je visoko. Za ovakav proizvod najbolji prodavac je screenshot dashboarda. Hero može desno imati **browser mockup** sa: aktivnim turama, upozorenjima, flotom, rokovima. Zatim 3–4 dodatna screenshota kroz stranicu. Kroz jedan dobar dashboard čovek odmah vidi: „ovo mi zamenjuje tri Excela i pet Viber grupa."

### Informaciona arhitektura (predlog strukture)
- **Homepage** — kratka prodajna prezentacija
- **/features** ili **/modules** — cela sadašnja lista funkcionalnosti
- **/fleet** — vozači, vozila, prikolice, servisi, dokumenti
- **/operations** — ture, nalozi, pošiljke, GPS
- **/compliance** — tahograf, dozvole, rokovi
- **/finance** — fakture, SEF, troškovi, plate
- **/driver-app** — mobilna aplikacija

Na homepage-u onda samo 4 kartice sa linkom „Saznaj više →". Tako sajt dobija dubinu umesto beskonačnog scroll-a.

### Sitnije stvari
- **Terminologija:** ima mešanja srpskog i product/dev jezika („Enterprise SaaS", „Product story", „compliance", „audit log", „RBAC") uz ostatak na srpskom — prevesti u poslovni jezik za transportnu firmu.
- **Email:** kontakt strana koristi `transport.logistic.app@gmail.com`, a footer `info@softechrs.com` / `support@softechrs.com` → koristiti **brendirani domen** (ozbiljnije).
- **FAQ:** skratiti na 3 najvažnija pitanja ili prebaciti na zasebnu stranicu (sad samo produžava homepage).

### Prioriteti (landing/UX)
- **P0:** skratiti homepage; ukloniti interne/dev tekstove; dodati OG title/description/image; srediti Contact/About.
- **P1:** pravi screenshotovi; bolji hero copy; outcome-based messaging; izdvojiti module na zasebne stranice.
- **P2:** trust/security sekcija; testimonials/reference firme; bolji demo onboarding; SEO landing stranice po funkcionalnostima.

### SEO — struktura po temama i search intent-u
Najveći problem: sajt nema jasnu SEO strukturu. Homepage pokušava da kaže sve; Google mnogo lakše razume proizvod ako postoje posebne stranice koje ciljaju konkretne pojmove.

**Posebne stranice (ne samo UX — omogućavaju targetiranje upita):**
- `/tms-softver`
- `/upravljanje-voznim-parkom`
- `/upravljanje-turama`
- `/tahograf-i-rokovi`
- `/transportna-dokumentacija`
- `/troskovi-i-profitabilnost`
- `/aplikacija-za-vozace`

Ciljni upiti: „TMS softver Srbija", „program za transportnu firmu", „softver za vozni park", „evidencija vozača i vozila"…

**Homepage optimizovati za jedan primarni pojam:** *TMS softver za transportne kompanije*.
- Title: `TMS softver za transportne kompanije | SofTechRS`
- Description: `Upravljajte turama, vozačima, vozilima, dokumentima, rokovima i troškovima transportne kompanije iz jednog TMS sistema.`
- (bolje i za Google i za Viber/WhatsApp preview)

**H1/H2 hijerarhija:** jedan glavni H1 jasno kaže šta proizvod jeste; H2 nose **stvarne pojmove**, ne samo marketinške naslove. Bolje „Upravljanje voznim parkom" nego „Sve što vam treba na jednom mestu" (drugo lepo zvuči čoveku, ali Google-u ne daje semantiku).

**Sadržaj (evergreen, ne generički blog):**
- Kako voditi evidenciju tahografskih rokova
- Koju dokumentaciju mora da prati transportna firma
- Kako pratiti trošak po vozilu i turi
- TMS vs Excel za transportnu kompaniju
- Kako organizovati servisne rokove voznog parka

Iz svakog teksta voditi korisnika ka odgovarajućem TMS modulu (long-tail saobraćaj).

**Tehnički SEO (proveriti):** canonical URL-ovi, `robots.txt`, `sitemap.xml`, indexability svih javnih stranica, JSON-LD structured data, alt tekstovi slika, Core Web Vitals, **Google Search Console**. Search trenutno praktično ne vraća relevantno indeksirane stranice domena → proveriti da li je sajt uopšte pravilno otkriven i indeksiran.

**Schema markup (minimum):** `SoftwareApplication`/`WebApplication`, `Organization`, `FAQPage` (gde stvarno postoji FAQ), `BreadcrumbList` na dubljim stranicama.

**SEO prioritet:** prvo metadata + indexiranje + sitemap/robots + jedan jasan H1 → zatim posebne landing stranice po modulima → tek onda blog/content SEO.

**Fokus na lokalne upite:** gađati srpske/Balkan B2B upite („TMS softver Srbija", „program za transportnu firmu", „softver za prevoznike"), ne globalnu bitku „transport management system" protiv svetskih TMS kompanija.

### Performanse
- Sajt se **učitava malo sporo** (primećeno i na optičkom internetu) → vezano za **Core Web Vitals** iznad; vredi izmeriti i optimizovati (slike, bundle, lazy-load).

> Napomena recenzenta: „deluje kompleksno i da je pokriveno sve što treba" (recenzent nije iz transporta/logistike, ali su primedbe konkretne i primenljive).
