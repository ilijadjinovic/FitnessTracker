import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyCAVA6i2JRdsF0xkYJFcXc9bTtJ70Awv3M",
  authDomain:        "fitnes-tracker-1fd87.firebaseapp.com",
  projectId:         "fitnes-tracker-1fd87",
  storageBucket:     "fitnes-tracker-1fd87.firebasestorage.app",
  messagingSenderId: "911937091739",
  appId:             "1:911937091739:web:b08f090afc68081accee3e",
  measurementId:     "G-09546DL5G7"
};

const fbApp  = initializeApp(firebaseConfig);
const auth   = getAuth(fbApp);
const db     = getFirestore(fbApp);
const provider = new GoogleAuthProvider();

window.fbUser = null;
// fbJustLoggedIn = true samo kada korisnik klikne na dugme za prijavu
window.fbJustLoggedIn = false;

// ── Debounce za auto-snimanje u cloud (3s) ──────────────────────────────────
let _fbSaveTimer = null;

window.fbAutoSave = function () {
  if (!window.fbUser) return;
  clearTimeout(_fbSaveTimer);
  _fbSaveTimer = setTimeout(async function () {
    try {
      var clean = JSON.parse(JSON.stringify(window.S));
      await setDoc(doc(db, 'users', window.fbUser.uid), {
        data:      JSON.stringify(clean),
        updatedAt: new Date().toISOString()
      });
      // tiho snimanje — bez toast poruke
    } catch (e) {
      console.warn('fbAutoSave greška:', e.message);
    }
  }, 3000);
};

window.fbSave = async function () {
  if (!window.fbUser) { alert('Nisi prijavljen!'); return; }
  clearTimeout(_fbSaveTimer); // poništi eventualni auto-save koji čeka
  try {
    var clean = JSON.parse(JSON.stringify(window.S));
    await setDoc(doc(db, 'users', window.fbUser.uid), {
      data:      JSON.stringify(clean),
      updatedAt: new Date().toISOString()
    });
    window.toast('✓ Snimljeno u cloud!');
  } catch (e) {
    alert('Greška pri snimanju: ' + e.message);
  }
};

window.fbLoad = async function () {
  if (!window.fbUser) { alert('Nisi prijavljen!'); return; }
  try {
    const snap = await getDoc(doc(db, 'users', window.fbUser.uid));
    if (!snap.exists()) { alert('Nema podataka u cloudu.'); return; }
    const imp = JSON.parse(snap.data().data);
    if (!confirm('Učitati podatke iz clouda?\n\nOvo će zameniti lokalne podatke.')) return;
    window.S = imp;
    if (!window.S.nutrition) window.S.nutrition = {};
    if (!window.S.profile)   window.S.profile   = { name:'', age:'', height:'', weight:'' };
    window.save();
    window.go(window.curTab);
    window.toast('✓ Podaci učitani iz clouda!');
  } catch (e) {
    alert('Greška pri učitavanju: ' + e.message);
  }
};

window.fbLogin = async function () {
  try {
    window.fbJustLoggedIn = true;
    const result = await signInWithPopup(auth, provider);
    window.fbUser = result.user;
  } catch (e) {
    window.fbJustLoggedIn = false;
    alert('Greška pri prijavi: ' + e.message);
  }
};

window.fbLogout = async function () {
  await signOut(auth);
  window.fbUser = null;
  window.rProf();
  window.toast('Odjavljen!');
};

onAuthStateChanged(auth, async function (user) {
  window.fbUser = user || null;
  if (user && window.fbJustLoggedIn) {
    window.fbJustLoggedIn = false;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const imp = JSON.parse(snap.data().data);
        if (imp && imp.workouts) {
          let hasLocal = false;
          try {
            const loc = localStorage.getItem('tpwa5');
            if (loc) { const ls = JSON.parse(loc); hasLocal = ls && ls.workouts && ls.workouts.length > 0; }
          } catch (ex) {}
          if (hasLocal) {
            if (!confirm('Pronađeni su podaci u cloudu.\n\nDa li želiš da ih učitaš?\n\n⚠️ Lokalni podaci će biti prepisani.')) {
              if (typeof window.rProf === 'function') window.rProf();
              return;
            }
          }
          window.S = imp;
          if (!window.S.nutrition) window.S.nutrition = {};
          if (!window.S.profile)   window.S.profile   = { name:'', age:'', height:'', weight:'' };
          if (typeof window.save === 'function') window.save();
          if (typeof window.go   === 'function') window.go(window.curTab || 'home');
          if (typeof window.toast === 'function') window.toast('☁️ Podaci učitani iz clouda!');
        }
      }
    } catch (e) {}
  }
  if (typeof window.rProf === 'function') window.rProf();
});
