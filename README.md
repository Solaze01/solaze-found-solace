# Solaze Found Solace

A static, mobile-friendly reading room deployed on Vercel. The browser provides the reading preferences, device-native read aloud, and story sharing. Firebase supplies anonymous replies, reactions, and approximate unique-browser counts. The old SQLite file (`solaze.db`) is retained locally and is not read or included in the deployed `public/` site.

## Deploy the site

1. Create a GitHub repository and push this project to it (`git init`, commit, then add the GitHub remote and push).
2. Import that repository in Vercel. Vercel detects the static site; set the output directory to `public` if it is not detected automatically.
3. Every push to the selected branch will publish the new site. There is no Flask server or always-on process to sleep.

The frontend works without Firebase configuration, but community features stay unavailable until Firebase is configured.

## Enable replies, reactions, and read counts

1. Create a Firebase project and register a Web app in Project settings.
2. In **Authentication → Sign-in method**, enable **Anonymous**.
3. Create a **Cloud Firestore** database.
4. Copy the Web app's `apiKey`, `authDomain`, `projectId`, and `appId` into `public/static/firebase-config.js`. These web settings are visible in the browser; Firestore security is enforced by rules.
5. Publish `firebase/firestore.rules` to the project's Firestore database. With Firebase CLI installed and authenticated, run `firebase deploy --only firestore:rules` from the project root after linking the Firebase project (`firebase use --add`).
6. Add the deployed Vercel domain to **Authentication → Settings → Authorized domains** in Firebase.
7. Redeploy the site on Vercel.

Readers are given a hidden Firebase anonymous identity; the site does not ask for names, email, or passwords. Each anonymous browser identity counts once as a reader and can leave public replies and one changeable reaction per reply. Clearing browser data or using another browser can count as another reader. Replies are shown under “Anonymous.” The rules allow replies to be created but not edited or deleted, and cap reply length at 500 characters.

## Free tier notes

Vercel serves the static site without a running web server. Firebase Spark quotas cover modest early traffic, but Firebase can limit service when free quotas are exceeded. Check the current Firebase and Vercel plan limits before a large launch. There is no cron job or keep-alive request.

## Project layout

- `public/` — complete static site deployed by Vercel.
- `firebase/firestore.rules` — access rules for audience data.
- `solaze.db`, `app.py`, `templates/`, and root `static/` — retained legacy Flask/SQLite files; the Vercel deployment does not use them.
