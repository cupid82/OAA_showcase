# SaaS Playbook

Carry-forward notes from the W.1 build. Not a description of that project —
the parts that transfer: the decisions that held up, the recipes worth copying,
and the traps that cost real hours.

`HANDBOOK.md` documents _this_ project. This documents _how I build_.

Every URL, key and ref below is a placeholder. Swap them; keep the structure.

---

# 1. Stack that worked

| Layer    | Choice                  | Why it stayed                                    |
| -------- | ----------------------- | ------------------------------------------------ |
| Frontend | React + Vite            | Instant HMR, no config to fight                  |
| Backend  | Node + Express          | Local dev only — see §5                          |
| Auth     | Supabase + Google OAuth | Free tier, hosted, no session code to write      |
| Payments | Razorpay                | INR-native, order+verify is two endpoints        |
| Hosting  | Cloudflare Workers      | Static assets + API in one deploy, no cold start |

The shape that mattered: **one repo, two independent apps** (`frontend/`,
`backend/`), each with its own `package.json`, talking over HTTP. They never
import from each other. That's what made it possible to throw the Express
server away in production without touching the frontend.

---

# 2. Skeleton

```
project/
├── frontend/                 # React + Vite SPA
│   ├── src/
│   │   ├── pages/            # one file per full-screen view
│   │   ├── services/api.js   # the ONLY place fetch() talks to the backend
│   │   └── index.css         # global base + one clearly-marked section per page
│   ├── public/               # anything served byte-for-byte, untouched by Vite
│   └── vite.config.js
├── backend/                  # Express — local dev only
│   └── src/{app,server}.js, routes/, controllers/
├── worker/index.js           # production server: assets + the few real API routes
├── wrangler.jsonc
├── package.json              # root: ONLY a build script, for the host to run
└── PLAYBOOK.md
```

`src/config/`, `src/models/`, `src/utils/` and friends are scaffold folders.
Create them when something goes in them, not before. Empty dirs with `.gitkeep`
are clutter that survives for months.

## Pin the dev port

```js
// vite.config.js
server: {
  host: true,        // listen on 0.0.0.0 → phone on the same Wi-Fi can reach it
  port: 5173,
  strictPort: true,  // fail loudly instead of drifting to 5174
  proxy: { '/api': 'http://localhost:5000' },
  allowedHosts: ['.trycloudflare.com'],
}
```

**`strictPort: true` is not optional.** The port ends up baked into three
places you won't remember: the OAuth redirect allowlist, the provider config,
and the backend's CORS check. Drift to 5174 and sign-in breaks _silently_ —
no error, just a flow that never completes.

## Call the API through the proxy, never by host

```js
// src/services/api.js
const API_URL = import.meta.env.VITE_API_URL || '/api';
```

Relative `/api` on the same origin the page loaded from. The browser only ever
talks to the Vite server, which is what makes the site work unchanged from
localhost, from a phone on the LAN, and through a public tunnel. Hard-coding
`http://localhost:5000` breaks the moment anything but your own machine loads
the page.

Leave `VITE_API_URL` **commented out** in `.env`. It exists as an escape hatch;
setting it defeats the whole arrangement.

## CORS that survives a tunnel

Match origins by pattern, not by literal string — the tunnel subdomain is
random and the LAN IP changes:

```js
const lanOrigin =
  /^https?:\/\/(localhost|127\.0\.0\.1|(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d+\.\d+):5173$/;
const tunnelOrigin = /^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/;
```

Allow requests with **no** Origin header (curl, health checks) or you lock
yourself out of your own debugging.

---

# 3. Auth — Supabase + Google

The single biggest source of lost time. Understand the chain and it stops
being mysterious.

```
your page → Supabase → Google → Supabase → wherever you said redirectTo
```

**Google only ever talks to Supabase. It never talks to your app.** That one
fact explains every configuration rule below.

## Two settings, two different values

The confusion is that both are called "redirect".

| Where                               | Setting                      | Value                                                                       |
| ----------------------------------- | ---------------------------- | --------------------------------------------------------------------------- |
| Google Cloud → Credentials          | Authorized **redirect URIs** | `https://<ref>.supabase.co/auth/v1/callback` — this, forever, never changes |
| Supabase → Auth → URL Configuration | **Site URL**                 | your primary production origin                                              |
| Supabase → Auth → URL Configuration | **Redirect URLs**            | every origin the app is ever served from                                    |

Google Cloud's "Authorized JavaScript origins" is unused by this flow. Leave it.

Set `redirectTo` to `location.origin` so sign-in returns the user to whichever
origin they started on — then **every one of those origins needs its own entry**
in Supabase's Redirect URLs.

## The trap that will get you

> A redirect URL that is not allowlisted **does not error**. Supabase silently
> substitutes the Site URL.

Symptom: `ERR_CONNECTION_REFUSED` on a dead port immediately after choosing a
Google account. That is not a Google problem, not a code problem, and no amount
of rebuilding or redeploying touches it — your server isn't in the OAuth chain
at all.

Worse: **Supabase implicitly permits localhost redirects.** So an empty
allowlist works perfectly in local dev and fails only in production. If it
works on localhost but not on the live site, this is the bug — look here first,
not at the deploy.

Set the Site URL to something real on day one. GoTrue's default is
`http://localhost:3000`, where nothing has ever listened. Getting it off that
turns every future misconfiguration from a dead port into a landing on your
live site.

## Two more that cost an afternoon each

- `uri_allow_list` is one **comma-separated string**, not an array.
- `/**` does **not** match a bare origin. `location.origin` has no trailing
  slash, so list both: `https://site.com` _and_ `https://site.com/**`.

## Consent screen

While it's in **Testing**, every account that signs in must be listed under
Test users, or Google answers "Access blocked". Not a code bug.

## Verify without a browser

Is the key live and Google enabled?

```bash
curl -s -H "apikey: <anon-key>" https://<ref>.supabase.co/auth/v1/settings
```

Look for `"google": true`, `"disable_signup": false`.

**Is this origin actually allowlisted?** The allowlist isn't exposed by any API,
but `/auth/v1/verify` validates `redirect_to` exactly like the OAuth callback
does, so the `Location` header answers it in one request:

```bash
curl -si "https://<ref>.supabase.co/auth/v1/verify?token=probe&type=signup&redirect_to=<url>" | grep -i ^location
```

Comes back as `<url>` → allowlisted. Comes back as the Site URL → rejected.

Use this to confirm a dashboard change took, instead of signing in and guessing.
It cannot be done from the browser: the chain is cross-origin, CORS hides the
response, and the page genuinely cannot tell the two outcomes apart. Any
"warn the user before sending them to Google" guard is therefore impossible —
it was tried, it fails identically on allowed and rejected origins.

## Changing config from the CLI

Needs a personal access token (`sbp_…`, full-account — generate at Account →
Access Tokens, revoke when done). Never stored in the repo.

```bash
curl -X PATCH -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  https://api.supabase.com/v1/projects/<ref>/config/auth \
  -d '{"site_url":"…","uri_allow_list":"…"}'
```

`GET` first and **merge** — a blind write drops existing entries. Print only
`site_url` and `uri_allow_list`; the full response contains the provider client
secret.

## Keys

The **anon key is public**. It ships in every browser client, it is safe to
commit, and putting it in a `.env` accomplishes nothing. The `service_role`
key, the DB password and the OAuth client secret never touch the repo — they
live in the dashboards only.

## Client code, worth copying verbatim

Google returns 403 rather than render inside a frame. If any page that starts
sign-in is ever framed, take the URL and navigate the **top** window:

```js
const { data } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: location.origin, skipBrowserRedirect: true },
});
window.top.location.href = data.url; // in an unframed page, top === window
```

On the landing side, `getSession()` is what _completes_ the handshake — coming
back from the provider the credentials are still sitting in the URL:

```js
const {
  data: { session },
} = await client.auth.getSession();
if (session) {
  history.replaceState(null, '', location.pathname); // clean URL survives a refresh
  setUser(session.user);
}
```

Google's avatar host answers **403 when a referrer is sent**:

```jsx
<img src={meta.avatar_url} alt="" referrerPolicy="no-referrer" />
```

Always ship an initial-letter fallback — plenty of accounts have no picture.

Never leave a gated page stuck invisible if the auth client fails to load.
`catch` → send them to sign-in, don't leave a blank screen.

---

# 4. Payments — Razorpay

Two endpoints. The whole security model is one sentence:

> **The server owns the price. The browser only ever names a plan.**

Put the price table on the server. If the amount comes from the page, someone
edits it in devtools and pays ₹1 for your top tier.

```js
const PLANS = {
  pro: { name: 'Pro', monthly: 1499 },
  ultimate: { name: 'Ultimate', monthly: 3999 },
  singularity: { name: 'Singularity', monthly: 9999 },
};
const priceOf = (plan, cycle) => (cycle === 'annual' ? plan.monthly * 10 : plan.monthly);
```

**Create order** — Basic auth, and Razorpay counts in **paise** (`× 100`):

```js
await fetch('https://api.razorpay.com/v1/orders', {
  method: 'POST',
  headers: {
    Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: priceOf(plan, cycle) * 100,
    currency: 'INR',
    notes: { plan, cycle },
  }),
});
```

Hand back `keyId` with the order — the key id is public by design, the secret
never leaves the server.

**Verify** — the browser's success callback proves nothing on its own. Razorpay
signs `"<order_id>|<payment_id>"` with the key secret; recomputing it is the
only thing that makes the callback trustworthy. Compare in constant time.

Node:

```js
const expected = crypto
  .createHmac('sha256', keySecret)
  .update(`${razorpay_order_id}|${razorpay_payment_id}`)
  .digest('hex');
crypto.timingSafeEqual(Buffer.from(razorpay_signature), Buffer.from(expected));
```

Workers (no `node:crypto` — use Web Crypto):

```js
const key = await crypto.subtle.importKey(
  'raw',
  enc.encode(keySecret),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign'],
);
const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${orderId}|${paymentId}`));
const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
```

Guard the length before `timingSafeEqual` — it throws on a mismatch.

Client-side niceties that made it feel finished: `modal.ondismiss` → "nothing
was charged", `rzp.on('payment.failed', …)`, and a distinct message for
_paid but verification failed_ — that state is real and it is not the same as
a failure.

If the listed price includes GST, work the base back out (`total / 1.18`) so the
breakdown adds up to the number on the button.

---

# 5. Deploy — Cloudflare Workers

One deploy ships two things: the built frontend as static assets, and a small
Worker for the API. Anything matching a built file is served straight from
assets; everything else falls through to the Worker.

```jsonc
{
  "name": "<worker-name>",
  "main": "worker/index.js",
  "compatibility_date": "YYYY-MM-DD",
  "assets": { "directory": "frontend/dist", "binding": "ASSETS" },
}
```

```js
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') return Response.json({ status: 'ok' });
    // …your handful of real routes…
    if (url.pathname.startsWith('/api/'))
      return Response.json({ error: 'No such API route' }, { status: 404 });
    return env.ASSETS.fetch(request);
  },
};
```

That `/api/*` 404 matters: without it an unmatched API path returns your
`index.html`, and the caller blows up trying to `JSON.parse` a page of HTML.
Debugging that from the error message alone is miserable.

## The blank-page trap

`frontend/dist` is gitignored, so **the host has to run the build itself**.
That is the entire reason a root `package.json` exists:

```json
{ "scripts": { "build": "npm --prefix frontend install && npm --prefix frontend run build" } }
```

> **Leaving the build command empty in the dashboard ships raw unbuilt source
> and serves a blank page.** It looks exactly like a broken app. Set root
> directory `/`, build `npm run build`, deploy `npx wrangler deploy`.

## Express doesn't run on Workers

Accept it early. Keep `backend/` as the local dev server and **reimplement the
few endpoints the frontend actually calls** in the Worker. In practice that was
three. Duplicating the price table across both is the correct trade — a shared
module would have to be bundled into an environment with a different crypto
API anyway.

Workers are **stateless**: no writes without D1 or KV. Decide up front whether
something must persist, or accept that it lives in `localStorage`.

## Secrets and credentials

```bash
npx wrangler secret put RAZORPAY_KEY_SECRET   # production
# .dev.vars for local `wrangler dev` — gitignored, same keys
```

Check what you already have before asking anyone for anything:

```bash
npx wrangler whoami
echo $CLOUDFLARE_API_TOKEN
```

`wrangler login` **cannot be run as a detached background process on Windows** —
the OAuth callback server dies with a libuv assertion. It has to be run in a
real terminal, or set `CLOUDFLARE_API_TOKEN` with `setx` so a fresh shell
inherits it without the value landing in a log.

Never write a raw token into a file that gets read back into an AI context.

## One-time and irreversible

The `workers.dev` subdomain is set **once per account** and the API refuses to
change it (`10036: Account already has an associated subdomain`). Moving off it
means buying a custom domain. Choose it deliberately.

---

# 6. Frontend patterns that earned their place

## Heavy visual pages stay static

Pages carrying their own runtime — GSAP, WebGL, a big inline `<style>` — go in
`public/` and get served byte-for-byte. **Don't port them into components.**
Rewriting a working 700-line scroll experience as JSX buys nothing and costs
every animation.

Host one full-screen in an iframe as the front door:

```jsx
<iframe className="landing-frame" src="/experiences/landing.html" title="…" />
```

```css
.landing-frame {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  background: #000;
} /* background = no white flash */
```

## Sharing one auth client between the app and the static pages

Both must read the **same stored session**, so there can only be one client
instance — which means the app has to import the module out of `public/`.

Vite blocks the obvious way. Written as a literal string it refuses:
_"this file is in /public … should not be imported from source code"_. Only a
specifier it cannot statically analyse gets through:

```js
const CLIENT_URL = `${location.origin}/experiences/supabase-client.js`; // built at runtime
const { getSupabase } = await import(/* @vite-ignore */ CLIENT_URL);
```

The static pages load the same file with a plain relative import. One client,
one session, no second copy in the bundle.

## Onboarding once per account

Key on the user id, not a boolean:

```js
const onboardingKey = (user) => `onboarding:${user.id}`;
```

Wrap the read in `try/catch` — an old session may hold a shape that no longer
parses, and a bad read should mean "no answers yet", not a crash.

Define the steps as **one exported array** and let both the flow and the
profile page read it. Adding a question then touches one place.

Send the server only what the server needs. Four of five answers stayed on the
machine, and that was the right default.

## CSS

One global `index.css`, split by clearly-commented page sections, each page its
own self-contained world. No utility framework was needed at this size.

Type system that carried the whole site: **a serif for questions and values,
a mono for labels, kickers and buttons.** Uppercase + wide letter-spacing on
the mono, `clamp()` on the serif. That contrast alone did most of the work.

---

# 7. Design taste

Rules that came from things being rejected on sight. They generalise.

**A flat blurred gradient glow as the entire background is out.** It reads as
generic AI-made design instantly. This is the single fastest way to make good
work look cheap.

**The resolution:** keep the colour field dark and slow-moving, and always put
crisp high-frequency structure _on top of it_ — a dot lattice, a drafting grid,
particles, hairlines.

Pure black with nothing on it is also wrong — it's just boring. So:

> The answer to "this is boring" is almost always **more structure, not more
> saturation.**

Rules over boxes. Ruled rows with a hairline read as designed; bordered
rectangles read as a form. A 1px rule that fills as you advance beats a
progress bar.

One accent colour, used sparingly and consistently, beats three.

Ask before going big on background colour on a page that already works.

---

# 8. Coding rules

**The best solution is the smallest correct solution. Every line must justify
its existence. If a line can be removed without affecting correctness, remove
it.**

**Solve only the requested problem.** Fix Bug A → fix only Bug A. No unrelated
refactors, renames, reformatting, or rewriting working logic.

**Never introduce new bugs.** Preserving existing behavior is the first
priority.

**Minimal, surgical edits.** Change the three lines that need changing. Don't
rewrite the file.

**No filler.** No decorative code, no "just in case" code, no placeholders, no
future-proofing nobody asked for.

**No unnecessary abstractions.** No helpers, wrappers, utility classes,
interfaces or configs unless actually required.

**No dead code.** No unused variables or imports, no unreachable branches, no
commented-out blocks, no debug leftovers, no unrequested TODOs.

**Never guess.** Unclear API, function name, schema or library behaviour → stop
and ask. Don't invent it.

**Preserve existing style.** Match the project's naming, formatting and
patterns. Don't rewrite code because another style is preferable.

**Verify before finishing.** Does it compile? Brackets closed, imports and names
right? Does the logic actually work? Could it regress something? Is there a
simpler solution?

**Comments explain _why_, never _what_.** The good ones in this codebase all
record a reason that isn't visible in the code — a 403, a silent fallback, a
platform limitation. Those are worth their lines. `// set the name` is not.

---

# 9. Working agreement

**Hand back a running site.** After a change, run it and give the URL. Don't
describe a change without showing it.

**Verify interactions for real.** With no test infra and heavy GSAP/3D, a bug
can be invisible in code review — hover works, click dead. Before claiming an
interaction works, drive it with `puppeteer-core` against the installed Chrome,
script a real click, and check that `page.url()` or state actually changed. An
`elementFromPoint` grid sweep across the viewport exposes broken hit areas on
transformed elements in seconds.

**Ask before anything touches the remote.** Every time, however trivial: push,
force-push, branches, tags, `gh`, remotes, repo settings, PRs, issues. Local
work — editing, `add`, `commit`, reading `log`/`diff`/`status` — needs no
permission. The boundary is the remote. Git via Windows Credential Manager
authenticates _silently_ as you: it is not read-only access.

**Don't push until it's confirmed good.** Finish, verify, say what's ready and
where to look — then stop. The browser check happens before anything lands.

**Push straight to `main`.** No feature branch, no PR. GitHub's contribution
graph only counts the default branch, so a branch-first workflow hides the work.

**Never override the configured git identity.** Commits authored with the wrong
email don't count on the contribution graph.

**Don't re-ask for credentials.** Check `wrangler whoami`, the env var, the
client file, this doc — before asking.

---

# 10. Scars

Generalised. Each one cost hours.

**Unclickable 3D cards.** Hover fired, clicks didn't. A _shared_ `perspective`

- `preserve-3d` on the container broke Chrome's hit-testing — visual position
  and hit area diverged. Fix: give each card its own perspective instead of one
  on the parent. Found by a grid sweep, not by reading the code.

**Blank page after deploy.** Empty build command → the host shipped unbuilt
source. §5.

**Sign-in landing on a dead port.** Origin not in the redirect allowlist, so it
fell back to the Site URL. §3. Recognise it by _works on localhost, fails in
production_.

**"Access blocked" from Google.** Consent screen in Testing, account not a Test
user. §3.

**`wrangler login` hanging.** Can't run detached on Windows. §5.

**Blue autofill boxes.** Chrome repaints autofilled inputs solid blue and
ignores your `background`. Only this works:

```css
input:-webkit-autofill {
  -webkit-text-fill-color: #f5f5f0;
  box-shadow: 0 0 0 100px #0b0a08 inset;
}
```

---

# 11. Day-one checklist

- [ ] `frontend/` + `backend/`, own `package.json` each, no cross-imports
- [ ] `strictPort: true`, `host: true`, `/api` proxy in `vite.config.js`
- [ ] `api.js` uses relative `/api`; `VITE_API_URL` commented out
- [ ] CORS matches LAN + tunnel by regex, allows no-Origin
- [ ] `.gitignore`: `node_modules/`, `.env`, `.dev.vars`, `dist/`, `.wrangler/`
- [ ] `.env.example` committed for both apps, real `.env` never
- [ ] Supabase **Site URL set to something real** before the first deploy
- [ ] Redirect URLs list every origin, each as bare origin **and** `/**`
- [ ] Own account added to Google Test users
- [ ] Root `package.json` build script + build command set in the host dashboard
- [ ] `/api/*` returns JSON 404, not `index.html`
- [ ] Price table on the server; payment verified server-side before anything unlocks
- [ ] Deploy once on day one, while there's nothing to lose
