# SofTechRS TMS mobile — projektna uputstva

Komunikacija na srpskom. Ovo je mobilni repo; web/backend je DimiG031/transport-website-app. main je glavna grana oba.

Jedina evidencija završne provere obe aplikacije je [centralni web folder](https://github.com/DimiG031/transport-website-app/blob/main/docs/glavnipregledprojekta/README.md). Počni od [POCETAK_RAZGOVORA.md](https://github.com/DimiG031/transport-website-app/blob/main/docs/glavnipregledprojekta/POCETAK_RAZGOVORA.md); učitaj i važeći AGENTS.md i CLAUDE.md web repozitorijuma. Ne kopirati statuse/plan u ovaj repo. Prvi put pročitati ceo centralni folder, kasnije aktuelni pregled, plan, nalaze, odluke, aktivni TEST/dokaz i povezane kartice.

Pre izmena proveri oba main SHA i lokalni git status. Redosled SEC/tenant → RBAC/identitet → VOZ; nastavi aktivni kriterijum. Testiraj obe strane UI/query/service/API/auth/baza/cache/offline toka i razlikuj izabrani/aktivni Driver, posadu, firmu i arhivu. Čuvanje lokalnog zahteva, server upis i isporuka obaveštenja su različiti ishodi.

Stek: TypeScript, React Native/Expo, NativeWind, postojeći query/native moduli. Koristi postojeće npm skripte i lockfile mobilnog repoa; web koristi pnpm. API uključuje /api/mobile/* i zajedničke autorizovane rute. Bez novih jezika/ORM-a/pravila po pretpostavci.

docs/forcodexagent/todo.md se samo čita; istorijski auditi i predlozi nisu drugi aktivni plan. Novi nalazi, sanacije, odluke i test rezultati idu centralno u web repo uz obe verzije. Ne ponavljaj potvrđen ručni test bez relevantne promene. Ne briši emulator, čekajuće zahteve, fajlove ili bazu; ne menjaj produkciona prava/pakete radi probe. Koristi sintetičke naloge/izolovanu bazu i ne izlaži tajne.

Razlikuj source pregled, simulirane adaptere, PostgreSQL/HTTP, GitHub CI i ručni uređaj. Ne tvrdi objavu/prolaz bez dokaza i ne računaj procenat dok obuhvat nije prihvaćen. Kraj razgovora: kriterijum, oba SHA, objavljeno/neobjavljeno, testovi, blokeri i sledeće.
