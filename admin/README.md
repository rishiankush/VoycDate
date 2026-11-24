# VOYC Admin

Web dashboard for verification, reports, users and content settings.

## Setup

1. Enable **Email/Password** in Firebase Auth.
2. Create an admin user (Auth console → Add user).
3. Grant access:

```bash
cd functions && node scripts/make-admin.mjs admin@example.com
```

4. Run locally:

```bash
cd admin && npm install && npm run dev
```

5. Deploy hosting:

```bash
cd admin && npm run build
firebase deploy --only hosting
```
