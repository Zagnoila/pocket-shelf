import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref } from 'firebase/database';

// Vite replaces these environment variables when it builds the website.
// Firebase web configuration is public; database rules protect each shelf.
export async function connectShelf() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  if (Object.values(config).some(value => !value)) throw new Error('Missing Firebase configuration.');
  const app = initializeApp(config);
  const auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence);
  await auth.authStateReady();
  const user = auth.currentUser || (await signInAnonymously(auth)).user;
  const database = getDatabase(app);
  return { shelfRef: ref(database, `shelves/${user.uid}/links`), connectionRef: ref(database, '.info/connected') };
}
