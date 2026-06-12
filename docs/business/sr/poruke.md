# Poruke

## Pregled

Poruke omogućavaju komunikaciju između vozača i tima bez oslanjanja na stalni polling.

---

## Šta možete

* pregled liste razgovora
* otvaranje konkretnog razgovora
* slanje i prijem poruka
* prikaz badge-a za nepročitane poruke
* prijem Expo push notifikacije za novu chat poruku
* otvaranje tačnog razgovora klikom na push
* osvežavanje samo konkretnih poruka za `threadId`

---

## API i push oslonac

* postojeći chat API za threads i messages
* push payload tipa `CHAT_MESSAGE`

Primer push payload-a:

```json
{
  "type": "CHAT_MESSAGE",
  "threadId": "thread-id",
  "messageId": "message-id",
  "senderId": "sender-user-id"
}
```

---

## Prednosti

* nema stalnog pozivanja API-ja u pozadini
* chat notifikacije ne zatrpavaju ekran operativnih obaveštenja
* klik na push vodi direktno na pravi razgovor

---

## Zaključak

Poruke su poseban komunikacioni kanal i treba ih držati odvojeno od operativnih obaveštenja.

