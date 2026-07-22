# Chatwoot ⇄ Evolution Go Bridge

A small Node/TypeScript service that connects **[Evolution Go](https://github.com/evolution-foundation/evolution-go)** (WhatsApp, whatsmeow-based) with **[Chatwoot](https://github.com/chatwoot/chatwoot)** using webhooks in both directions.

Evolution Go — unlike the Node "Evolution API" — does **not** ship a native
Chatwoot module. It exposes generic Webhook/WebSocket/queue events plus a REST
send API. This bridge fills that gap: it maps the two payload formats and keeps
a conversation flowing between an agent in Chatwoot and a contact on WhatsApp.

```
WhatsApp ⇄ Evolution Go ──(webhookUrl)──▶ BRIDGE ──(Chatwoot app API)──▶ Chatwoot
                         ◀──(/send/*)──── BRIDGE ◀──(API inbox webhook)── Chatwoot
```

## How it works

- **Inbound (WhatsApp → Chatwoot):** Evolution Go POSTs message events to
  `/webhooks/evolution`. The bridge finds/creates the contact, finds/creates a
  conversation in the API-channel inbox, and appends an `incoming` message.
- **Outbound (Chatwoot → WhatsApp):** the API-channel inbox POSTs
  `message_created` events to `/webhooks/chatwoot`. The bridge forwards public,
  outgoing agent messages to Evolution Go's `/send/text` (or `/send/media`).
- **Loop prevention:** inbound `fromMe` echoes and Chatwoot `incoming` messages
  are ignored by direction; a short TTL set drops duplicate deliveries by id.
- **BR numbers:** optional normalization inserts the 9th mobile digit so the
  same person is not split into two Chatwoot contacts.

## Endpoints exposed by the bridge

| Method | Path                    | Purpose                              |
|--------|-------------------------|--------------------------------------|
| GET    | `/health`               | Liveness probe                       |
| POST   | `/webhooks/evolution`   | Receives Evolution Go message events |
| POST   | `/webhooks/chatwoot`    | Receives Chatwoot inbox webhooks     |

If `BRIDGE_WEBHOOK_TOKEN` is set, both webhook routes require it via the
`x-bridge-token` header or a `?token=` query param.

## Setup

### 1. Install & configure

```bash
cd chatwoot-evolution-bridge
npm install
cp .env.example .env   # then fill in the values
```

### 2. Chatwoot side

1. Create an **API** channel inbox: *Settings → Inboxes → Add Inbox → API*.
2. Set its **Webhook URL** to `https://YOUR_BRIDGE/webhooks/chatwoot`
   (append `?token=...` if you set `BRIDGE_WEBHOOK_TOKEN`).
3. Note the **inbox id** (`CHATWOOT_INBOX_ID`) and create an agent **Access
   Token** (*Profile → Access Token* → `CHATWOOT_API_TOKEN`).

### 3. Evolution Go side

Point the instance's webhook at the bridge when connecting
(fields verified in `evolution-go` `swagger.yaml`):

```bash
curl -X POST "$EVOLUTION_URL/instance/connect" \
  -H "apikey: $EVOLUTION_API_KEY" \
  -H "token: $EVOLUTION_INSTANCE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999998888",
    "webhookUrl": "https://YOUR_BRIDGE/webhooks/evolution",
    "subscribe": ["Message"]
  }'
```

> The exact event name(s) in `subscribe[]` and the webhook payload shape are not
> documented in the OpenAPI spec. The bridge logs the raw inbound body and
> extracts fields defensively (`src/mapping.ts` → `normalizeEvolutionInbound`).
> Send yourself one WhatsApp message, check the logs, and adjust the field paths
> if your build differs.

### 4. Run

```bash
npm run dev     # watch mode (tsx)
# or
npm run build && npm start
```

## Configuration

See [`.env.example`](./.env.example). Key variables:

| Variable | Description |
|---|---|
| `CHATWOOT_URL` / `CHATWOOT_ACCOUNT_ID` / `CHATWOOT_API_TOKEN` / `CHATWOOT_INBOX_ID` | Chatwoot application API target |
| `EVOLUTION_URL` / `EVOLUTION_API_KEY` / `EVOLUTION_INSTANCE_TOKEN` | Evolution Go target + auth |
| `EVOLUTION_API_KEY_HEADER` / `EVOLUTION_INSTANCE_TOKEN_HEADER` | Override header names if your build differs (defaults `apikey` / `token`) |
| `NORMALIZE_BR_NUMBERS` | Insert the 9th mobile digit for BR numbers (default `true`) |
| `DEDUPE_TTL_MS` | Duplicate/echo suppression window (default 5 min) |
| `BRIDGE_WEBHOOK_TOKEN` | Optional shared secret for the webhook routes |

## Tests

```bash
npm test
```

Covers phone normalization, dedupe TTL logic, and payload mapping/guards.

## Known limitations / next steps

- **Media inbound (WhatsApp → Chatwoot)** is logged and skipped. Completing it
  needs Evolution Go's `/message/downloadmedia` plus a Chatwoot multipart
  attachment upload.
- **Auth to Evolution Go** is not documented in the spec; header names are
  configurable. Verify against your instance.
- Dedupe/state is in-memory. For horizontal scaling, back `TtlSet` with Redis.
