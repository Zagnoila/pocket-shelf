# Pocket Shelf

A little home for links worth keeping. Built by Ian Rosenthal for **Scrimba Learn JavaScript, Module 8: Build a Mobile App**.

## Features

- Save website links with an optional title and collection: Learn, Make, Grow, or Everyday.
- Firebase Realtime Database saves changes and updates the shelf with `onValue`.
- Anonymous Firebase Authentication gives each browser its own shelf. Database rules deny access to other visitors' data.
- Search, collection filters, individual removal with Undo, and confirmed bulk removal.
- Export saved links as JSON.
- Responsive layout, app manifest, home-screen icons, and a service worker that caches the app shell.

Each browser has a separate anonymous identity. This version does **not** synchronize a personal shelf across different devices. Clearing browser data can lose access to the anonymous identity; export a backup first. Internet access is required to load saved links and make changes. The app shell may be available offline, but the saved-link database is not an offline database.

## Design

The heading font is **Special Gothic Expanded One**, chosen from Ian's downloaded fonts. Body text uses Arial for readability. The palette combines warm cream (`#F8F3E9`), dark pine (`#243A35`), muted rust (`#B83E29`), and lime (`#CBDC87`). The locally hosted font's SIL Open Font License is included in `public/fonts/OFL.txt`.

## Run locally

Requires Node.js 22.12+.

```sh
npm install
cp .env.example .env
# Fill in your own Firebase web app configuration in .env.
npm run dev
```

Create a Firebase project on the Spark plan, register a web app, enable **Realtime Database** and **Anonymous Authentication**, then publish `database.rules.json` in the database Rules tab. Use your database's exact URL in `.env`.

Firebase's web configuration identifies the app and is included in the browser build. It is not a service-account credential. The access restrictions are enforced by the database rules. Never put private service-account keys or admin credentials in a Vite environment variable.

## Build and deploy

```sh
npm run build
```

Upload the **contents of `dist`** to Netlify, or connect this repository and set the variables listed in `.env.example` in the Netlify project environment. The included `netlify.toml` specifies the build command and output folder. The current deployment was built locally and uploaded through Netlify Drop.

On iPhone, open the live site in Safari → Share → Add to Home Screen. On Android, open it in Chrome → menu → Add to Home screen / Install app. Home-screen storage may differ from browser storage on some platforms.

## Verify

```sh
npm test
node --env-file=.env scripts/verify-database.mjs
```

The database check creates two temporary anonymous test users and disposable records, checks owner access, rejects cross-user reads/writes and invalid URLs, then removes its records and test users. It targets the Firebase project in your `.env`.

Browser checks cover save, reload persistence, removal/undo, bulk removal confirmation, search, collection filtering, and a 390px mobile viewport. The production build is also checked before deployment.

## Module concepts

`initializeApp` and `getDatabase` connect the project; `ref` locates a shelf; `push` saves a link with an ID; `onValue` receives snapshots; `Object.entries` converts saved objects into an array while retaining IDs; `remove` deletes records. A null snapshot becomes an empty list. The HTML includes labels, placeholders, a viewport meta tag, favicon, touch icons, and a web app manifest.

Learning source: [Scrimba — Learn JavaScript](https://scrimba.com/learn-javascript-c0v).
