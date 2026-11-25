# Setting up the web editor, contact form and database

This is a one-time setup. It connects three free services:

- **Cloudflare**: runs the sign-in helper and the contact-form API, and hosts the database (D1).
- **GitHub**: you sign in with your GitHub account, and edits are saved to this repo.
- **Resend**: sends you an email when someone uses the contact form.

Do the parts in order. Each part says what you should have written down at the end. Keep those notes private: two of them (the **client secret** and the **Resend API key**) are passwords for machines. Never put them in a file in this repo.

You'll fill in this list as you go:

```
Login helper URL:        https://sveltia-cms-auth.______.workers.dev
GitHub App client ID:    ______
GitHub App client secret: (private) ______
Turnstile site key:      ______
Turnstile secret key:    (private) ______
Resend API key:          (private) ______
API URL:                 https://longestjune-api.______.workers.dev
```

---

## Part 1. Publish the new code

Commit and push everything with GitHub Desktop, as usual. The site keeps working: the contact form still asks people to email you until Part 7 is done.

## Part 2. Create a Cloudflare account

1. Go to https://dash.cloudflare.com/sign-up and sign up (free).
2. Confirm your email.

## Part 3. Deploy the sign-in helper

1. Open https://deploy.workers.cloudflare.com/?url=https://github.com/sveltia/sveltia-cms-auth
2. Follow the steps. It may ask you to connect GitHub so it can copy the helper's code into your account; that's expected.
3. When it finishes, open **Workers & Pages** in the Cloudflare dashboard and click the new **sveltia-cms-auth** worker. Its address looks like `https://sveltia-cms-auth.<your-name>.workers.dev`.

Write down: **Login helper URL**.

## Part 4. Create the GitHub App (lets the editor save to your repo)

1. Open this link (it fills in most of the form):
   https://github.com/settings/apps/new?name=longest+june+editor&url=https://longestjune.com&webhook_active=false&contents=write
2. Check the form:
   - **GitHub App name**: `longest june editor` (add a word if the name is taken).
   - **Homepage URL**: `https://longestjune.com`
   - **Callback URL**: your login helper URL followed by `/callback`, e.g. `https://sveltia-cms-auth.<your-name>.workers.dev/callback`
   - **Webhook**: unticked (Active off).
   - **Repository permissions → Contents**: Read and write. (Metadata: Read-only is added automatically.)
   - **Where can this GitHub App be installed?**: Only on this account.
3. Click **Create GitHub App**.
4. On the next page, copy the **Client ID**. Then click **Generate a new client secret** and copy it straight away (GitHub shows it only once).
5. In the left menu click **Install App** → **Install** next to your account → choose **Only select repositories** → pick `longestjun-web` → **Install**.

Write down: **GitHub App client ID** and **GitHub App client secret**.

## Part 5. Give the sign-in helper its settings

1. In Cloudflare, open **Workers & Pages → sveltia-cms-auth → Settings → Variables and secrets**.
2. Add these, then click **Deploy** (or **Save**):

| Name | Type | Value |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | Text | the client ID from Part 4 |
| `GITHUB_CLIENT_SECRET` | **Secret** | the client secret from Part 4 |
| `ALLOWED_DOMAINS` | Text | `longestjune.com, www.longestjune.com` |

## Part 6. Turn on the spam check (Turnstile)

1. In Cloudflare, open **Turnstile** in the left menu → **Add widget**.
2. Name: `longest june contact`. Hostnames: add `longestjune.com` and `www.longestjune.com`. Widget mode: **Managed**.
3. Click **Create**.

Write down: **Turnstile site key** and **Turnstile secret key**.

## Part 7. Email alerts (Resend)

1. Go to https://resend.com/signup and sign up **with longestjune@gmail.com** (until you verify your own domain, Resend can only send to the address you signed up with).
2. Open **API Keys → Create API Key**. Name it `longest june`, permission **Sending access**. Copy the key (shown once).

Write down: **Resend API key**.

## Part 8. Create the database and deploy the API

This part uses Terminal. Run each command on its own, and wait for it to finish before the next one.

1. Go to the worker folder:
   ```bash
   cd worker
   ```
2. Sign in to Cloudflare (a browser window opens; click **Allow**):
   ```bash
   npx wrangler@4 login
   ```
3. Create the database:
   ```bash
   npx wrangler@4 d1 create longestjune
   ```
   It prints a `database_id` (a long code). Open `worker/wrangler.toml` and replace `REPLACE_WITH_DATABASE_ID` with that code. Save the file.
4. Create the tables:
   ```bash
   npx wrangler@4 d1 execute longestjune --remote --file=schema.sql
   ```
5. Store the two private keys in Cloudflare. Each command asks you to paste the value; it isn't shown on screen, and it never goes into a file:
   ```bash
   npx wrangler@4 secret put TURNSTILE_SECRET
   ```
   ```bash
   npx wrangler@4 secret put RESEND_API_KEY
   ```
   (If it asks to create the worker first, answer **Y**.)
6. Deploy:
   ```bash
   npx wrangler@4 deploy
   ```
   It prints the address, like `https://longestjune-api.<your-name>.workers.dev`.

Write down: **API URL**.

## Part 9. Connect the site

Open `src/data/services.json` and fill in the three public values (keep the quotes):

```json
{
  "apiUrl": "https://longestjune-api.<your-name>.workers.dev",
  "authUrl": "https://sveltia-cms-auth.<your-name>.workers.dev",
  "turnstileSiteKey": "the Turnstile site key"
}
```

Commit and push. After Hostinger rebuilds (a minute or two):

- https://longestjune.com/admin → **Sign in with GitHub** → you should see Notes and Site content.
- https://longestjune.com/contact → send yourself a test message. You should get an email, and it should appear at https://longestjune.com/admin/messages.
- Within an hour, the first backup appears on the messages page.

## Letting other people edit

On github.com: this repo → **Settings → Collaborators → Add people**. Once they accept, they can sign in at `/admin` and `/admin/messages` with their own GitHub account. Remove them there to take access away.

## If something goes wrong

- **"Sign in with GitHub" closes and nothing happens**: check Part 5 (the three settings, and that `ALLOWED_DOMAINS` matches the address you're on) and that the GitHub App's callback URL ends in `/callback`.
- **The editor signs in but can't save**: the GitHub App isn't installed on `longestjun-web` (Part 4, step 5), or Contents isn't set to Read and write.
- **The contact form says the spam check didn't pass**: check the Turnstile hostnames (Part 6) and that `TURNSTILE_SECRET` matches the secret key.
- **No email arrives**: check the Resend dashboard's **Emails** list, and that you signed up to Resend with longestjune@gmail.com. The message is still saved and visible on the messages page.
- **Lost a GitHub password**: use GitHub's "Forgot password?" link; that's also how you get back into the editor.
