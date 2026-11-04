# Hosting on the ZimaOS box

How to run the public app, with sign-in and sync, on the home server. It's served over HTTPS on
your own domain through a **Cloudflare Tunnel**. The router needs no open ports, the box makes an
outbound connection to Cloudflare, and the Cloudflare and Clerk free plans cover it.

```
browser ──HTTPS──▶ Cloudflare ──tunnel──▶ cloudflared ─┬─ /api/*  → api:4000 ── postgres:5432
                                         (on the box)  └─ /*      → web:8080   (static files)
```

Everything runs from one compose file, [`docker/compose.yml`](../docker/compose.yml):

| Service       | Image                                 | Notes                                                    |
| ------------- | ------------------------------------- | -------------------------------------------------------- |
| `web`         | `seeater-web` (root `Dockerfile`)     | Static app built with sync on, `VITE_API_BASE_URL=/api`  |
| `api`         | `seeater-api` (`apps/api/Dockerfile`) | Runs `prisma migrate deploy` on start, then the server   |
| `postgres`    | `postgres:17-alpine`                  | Data in `/DATA/AppData/seeater/pg`; no network route out |
| `cloudflared` | `cloudflare/cloudflared` (pinned)     | Connects out to Cloudflare with `TUNNEL_TOKEN`           |

Web and API share one origin (`https://<your host>`), so there's no CORS in the browser. Only
`web` publishes a port, by default bound to `127.0.0.1:8090` on the box (see `WEB_LAN_BIND`).
Every container runs read-only with all capabilities dropped (Postgres keeps the five its
entrypoint needs to hand its data folder to the `postgres` user).

The steps below are one-time setup, except **Deploy** and **Back up**. Pick the hostname first.
These steps use `seats.example.com`.

## 1. Put the domain on Cloudflare

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) → **Add a domain** → enter your
   domain → Free plan.
2. Cloudflare lists two nameservers. At your registrar, replace the domain's nameservers with
   those two. Wait until Cloudflare shows the domain as **Active** (minutes to a few hours).

If the domain already runs a website or email elsewhere, check that the DNS records Cloudflare
imported match the old ones before switching nameservers.

## 2. Create the tunnel

1. Cloudflare dashboard → **Zero Trust** (set up the free team if asked) → **Networks** →
   **Tunnels** → **Create a tunnel** → **Cloudflared** → name it `seeater`.
2. On the "Install and run a connector" screen, **don't run the command shown**. Copy the long
   token after `--token` (starts with `eyJ`). That's `TUNNEL_TOKEN`.
3. **Next** → add the routes (called **Public hostnames** or **Published application routes**,
   depending on the dashboard version). Add two routes for the same hostname, in this order:

   | #   | Subdomain | Domain        | Path    | Service type | URL        |
   | --- | --------- | ------------- | ------- | ------------ | ---------- |
   | 1   | `seats`   | `example.com` | `^/api` | HTTP         | `api:4000` |
   | 2   | `seats`   | `example.com` | (empty) | HTTP         | `web:8080` |

   Cloudflare checks the routes top to bottom, and the first match wins, so the `/api` route
   must come first. If the list shows the catch-all first, delete it and add it again. Saving
   the routes also creates the DNS record for `seats.example.com`.

   `api` and `web` are the compose service names. cloudflared reaches them on the stack's
   private network, so use `http://`, not `https://`.

## 3. Create the Clerk production instance

Sign-in uses Clerk. Development keys (`pk_test_…`) work only on localhost, so the public site
needs a production instance.

1. [dashboard.clerk.com](https://dashboard.clerk.com) → your application → switch to
   **Production** (top of the page) → **Create production instance**. Choose whether to copy the
   development settings.
2. Enter the domain the app runs on (`seats.example.com`). If Clerk asks whether the app lives
   on a subdomain, answer yes.
3. **Domains** (or **Configure → Domains**) lists DNS records, mostly CNAMEs like
   `clerk.seats.example.com` and `accounts.…`, plus `clkmail` and `clk._domainkey` records for
   email. Add each one in Cloudflare → your domain → **DNS** → **Records**, and set **Proxy status
   to "DNS only"** (grey cloud). Clerk's certificates fail behind Cloudflare's proxy. Wait for
   Clerk to show every record as verified and the certificates as issued.
4. **API keys** → copy the **Publishable key** (`pk_live_…`) and the **Secret key** (`sk_live_…`).
5. If you enable Google or other social sign-in, production needs your own OAuth credentials
   for each provider (Clerk's shared dev credentials don't carry over). Clerk's page for each
   provider explains how.

## 4. Fill in `docker/.env`

On your Mac, in the repository:

```bash
cp docker/.env.example docker/.env
```

Then edit `docker/.env` (gitignored; every variable is described in the example):

- `PUBLIC_HOST`: `seats.example.com`, no `https://`.
- `TUNNEL_TOKEN`: from step 2.
- `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`: from step 3.
- `POSTGRES_PASSWORD`: letters and digits only (it goes into a URL). Generate one:

```bash
openssl rand -hex 24
```

Set the password once. Postgres saves it when it first creates its data folder, so editing it
later won't change it (that would need `ALTER USER seeater PASSWORD '…'` inside the database).

## 5. Deploy

```bash
scripts/deploy-zima.sh --stack
```

The script copies `docker/.env` to `/DATA/AppData/seeater/stack.env` on the box (mode 600), streams
the source tree, builds both images there, removes the old standalone `seeater` container,
and runs `docker compose up -d`. It waits until the API is healthy, then checks that cloudflared
stays up. The first build takes a few minutes. Later builds reuse the cached dependency layers.

Check it:

- `https://seats.example.com/api/health` → `{"status":"ok",…}` (this also checks the database).
- `https://seats.example.com` → the app, with **Sign in to sync**.

Later deploys run the same command. If `docker/.env` isn't on the Mac you deploy from, the
script uses the copy already on the box.

**Moving existing events.** Browser data belongs to one origin. Events made at the LAN address
(`http://192.168.1.194:8090`) don't appear at the new domain. In each browser that has events,
open the old address, download a backup per event (`.seating.json`), and import it on the new
site. Do this **before** deploying the stack: it takes over port 8090, and by default serves it
to the box only. To keep the LAN address open, set `WEB_LAN_BIND=0.0.0.0`. Sign-in still works
only on `PUBLIC_HOST`.

**Back to local-only:** `scripts/deploy-zima.sh` (no flag) runs the old single container on
:8090 again, after you stop the stack:

```bash
ssh josh@192.168.1.194 'cd /DATA/AppData/seeater/src && DOCKER_CONFIG=/tmp/docker-config-$(id -u) docker compose --env-file ../stack.env -f docker/compose.yml down'
```

The database folder stays in place.

## 6. Back up the database

The database holds the signed-in users' synced events (each browser also keeps its own copy).
Run this from the Mac. It writes a compressed dump in the current folder:

```bash
ssh josh@192.168.1.194 'DOCKER_CONFIG=/tmp/docker-config-$(id -u) docker exec seeater-postgres-1 pg_dump -U seeater -Fc seeater' > "seeater-$(date +%F).dump"
```

To restore a dump (this replaces what's in the database):

```bash
ssh josh@192.168.1.194 'DOCKER_CONFIG=/tmp/docker-config-$(id -u) docker exec -i seeater-postgres-1 pg_restore -U seeater -d seeater --clean --if-exists' < seeater-YYYY-MM-DD.dump
```

Prefer `pg_dump` over copying `/DATA/AppData/seeater/pg`. A copy of a running database's folder
isn't guaranteed to be consistent.

## Operating it

Run these on the box (`ssh josh@192.168.1.194`). First set `DOCKER_CONFIG` and switch to the
project folder:

```bash
export DOCKER_CONFIG=/tmp/docker-config-$(id -u); cd /DATA/AppData/seeater/src
```

Logs for one service:

```bash
docker compose --env-file ../stack.env -f docker/compose.yml logs -f --tail 50 api
```

Status of every service:

```bash
docker compose --env-file ../stack.env -f docker/compose.yml ps
```

Portainer lists the containers under the `seeater` stack too. If `docker compose` reports an
unknown command, the substitute `DOCKER_CONFIG` hides Docker's plugins: run the deploy once
after a reboot (it links them back in), or use `docker-compose` if the box has it.

- **Updating cloudflared or Postgres:** change the pinned tag in `docker/compose.yml` and
  deploy. A minor Postgres update (17.x) is just a new image. A major version (18) can't read 17's
  data folder: dump, move the folder aside, deploy the new major, then restore.
- **502 / "Bad gateway" from Cloudflare:** the tunnel is up but the route's target isn't. Check
  the route URLs (`api:4000`, `web:8080`, plain HTTP) and that `api` is healthy.
- **Sign-in works but sync fails with 403:** look in Cloudflare → Security for blocked or
  challenged `/api` requests (Bot Fight Mode can challenge them). Also check that `PUBLIC_HOST`
  exactly matches the address in the browser: the API only accepts that origin.
- **Error 1033 from Cloudflare:** no connector is running. Check the `cloudflared` logs; an
  invalid token shows up as "Provided Tunnel token is not valid".
