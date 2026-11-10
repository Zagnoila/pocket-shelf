import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInAnonymously, deleteUser } from 'firebase/auth';
import { getDatabase, ref, set, get, remove, goOffline } from 'firebase/database';
const config={apiKey:process.env.VITE_FIREBASE_API_KEY,authDomain:process.env.VITE_FIREBASE_AUTH_DOMAIN,projectId:process.env.VITE_FIREBASE_PROJECT_ID,databaseURL:process.env.VITE_FIREBASE_DATABASE_URL,appId:process.env.VITE_FIREBASE_APP_ID};
const apps=[initializeApp(config,'test-a'),initializeApp(config,'test-b')];
const dbs=apps.map(app => getDatabase(app));const users=[];
const timeout=setTimeout(()=>{console.error('Database check timed out');process.exit(1)},45000);
try {
  for(const app of apps) users.push((await signInAnonymously(getAuth(app))).user);
  const path=`shelves/${users[0].uid}/links/test-item`;
  const item={url:'https://example.com/',title:'Disposable database test',category:'Learn',createdAt:Date.now()};
  await set(ref(dbs[0],path),item);
  assert.equal((await get(ref(dbs[0],path))).val().title,item.title);
  console.log('PASS: owner can save and retrieve a link');
  await assert.rejects(get(ref(dbs[1],path)));
  await assert.rejects(set(ref(dbs[1],path),item));
  console.log('PASS: another visitor cannot read or modify that shelf');
  await assert.rejects(set(ref(dbs[0],path),{...item,url:'javascript:alert(1)'}));
  console.log('PASS: invalid URL rejected by database rules');
  await remove(ref(dbs[0],path));
  assert.equal((await get(ref(dbs[0],path))).exists(),false);
  console.log('PASS: owner can remove data; empty result handled');
} finally {
  for(let i=0;i<users.length;i++) {
    await remove(ref(dbs[i],`shelves/${users[i].uid}/links`)).catch(()=>{});
    await deleteUser(users[i]).catch(()=>{});
  }
  dbs.forEach(goOffline);
  await Promise.all(apps.map(deleteApp));clearTimeout(timeout);
}
