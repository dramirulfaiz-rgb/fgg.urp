# FGG UKM Research Proposal Portal

Student research proposal drafting, autosave, signed topic forms, PDF/DOCX exports, coordinator review and submission email notices.

This repository is a standalone Cloudflare deployment of the portal. GitHub stores source code; Cloudflare Workers runs the website, D1 stores records and R2 stores uploaded files. GitHub Pages cannot run the database and upload APIs.

## Deploy to a new address

1. Create or sign in to your Cloudflare account at https://dash.cloudflare.com. Enable Workers and R2. R2 activation may require billing details; review Cloudflare pricing and account limits.
2. Install Node.js 22.13 or newer and Git on your computer. Open PowerShell or Terminal.
3. Download this repository and install dependencies:

```sh
git clone https://github.com/dramirulfaiz-rgb/fgg.urp.git
cd fgg.urp
npm install
npx wrangler login
```

4. Create the storage resources:

```sh
npx wrangler d1 create fgg-urp-db
npx wrangler r2 bucket create fgg-urp-files
```

5. Open `wrangler.jsonc`. Replace the placeholder `database_id` with the ID printed by the D1 create command. Keep the binding names `DB` and `BUCKET`.
6. Create the database tables and deploy:

```sh
npm run db:migrate
npm run deploy
```

7. Wrangler prints the actual live URL. It will normally be `https://fgg-urp.<your-cloudflare-subdomain>.workers.dev`. The subdomain belongs to your Cloudflare account; this repository does not reserve it.
8. Set the coordinator password securely. Do not commit passwords to GitHub:

```sh
npx wrangler secret put ADMIN_PASSWORD --config dist/server/wrangler.json
```

Enter your chosen admin password when prompted. For later changes to this password, reconnect/recreate the email sender, because its stored secret is encrypted using this password.
9. Set `vars.PORTAL_URL` in `wrangler.jsonc` to the exact live URL, without a trailing slash, then run `npm run deploy` again. Submission email links will use this address.
10. Test a student draft, autosave, signed form upload, PDF/DOCX export and admin login. In Admin, open Email setup and follow the instructions to deploy/connect the Google Apps Script sender. Until connected, notifications are queued. Recipients are the students, supervisor/co-supervisors and dramirulfaiz@ukm.edu.my.

## Optional custom domain

If you own a domain, add it to your Cloudflare account. Open Workers & Pages → fgg-urp → Settings → Domains & Routes → Add → Custom Domain. Set PORTAL_URL to the custom domain and redeploy. Domain registration is separate from hosting.

## Existing submissions and files

Deployment creates a fresh database and bucket. Student records, sessions, submitted snapshots, email settings and uploaded forms from the original portal are not included in GitHub and do not migrate automatically. Keep the existing portal available until its D1 data and R2 files have been exported, imported into this account and verified. Do not delete the original portal while that migration is pending.

## Updating the website

Pull the latest source and run `npm install`, `npm run db:migrate` and `npm run deploy`. Migrations are additive and tracked by Wrangler. Keep runtime secrets outside source control.
