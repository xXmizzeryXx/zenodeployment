import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDMeftyyacYoo-EvEg_L_Oq9R3Ge8iVzCE',
  authDomain: 'zenodeployment-99112371-4e3f3.firebaseapp.com',
  projectId: 'zenodeployment-99112371-4e3f3',
  storageBucket: 'zenodeployment-99112371-4e3f3.firebasestorage.app',
  messagingSenderId: '124413653258',
  appId: '1:124413653258:web:079e0d95d00fb8c7468af3',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let authMode = 'signin';
const byId = (id) => document.getElementById(id);

function toast(message, isError = false) {
  if (typeof window.showToast === 'function') window.showToast(message, isError);
  else console[isError ? 'error' : 'log'](message);
}

function ensureAuthModal() {
  if (document.getElementById('authModal')) return;
  const style = document.createElement('style');
  style.textContent = `
    .auth-modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.88);backdrop-filter:blur(16px);z-index:5000;align-items:center;justify-content:center;padding:18px}
    .auth-modal-overlay.open{display:flex}
    .auth-modal{background:var(--bg2);border:1px solid rgba(0,245,255,.18);border-radius:50px;padding:32px;width:400px;max-width:95vw;box-shadow:0 0 60px rgba(0,245,255,.06)}
    .auth-modal-title{font-family:var(--font-display,'Orbitron',monospace);font-size:13px;letter-spacing:4px;color:var(--accent,#00f5ff);margin-bottom:4px}
    .auth-modal-sub{font-size:12px;color:var(--muted);margin-bottom:24px}
    .auth-tabs{display:flex;gap:4px;margin-bottom:20px;background:rgba(255,255,255,.03);border-radius:50px;padding:3px}
    .auth-tab{flex:1;font-family:var(--font-display,'Orbitron',monospace);font-size:8px;letter-spacing:2px;padding:8px;border:none;background:transparent;color:var(--muted);cursor:pointer;border-radius:50px}
    .auth-tab.active{background:rgba(0,245,255,.1);color:var(--accent,#00f5ff);border:1px solid rgba(0,245,255,.2)}
    .auth-field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
    .auth-field label{font-family:var(--font-display,'Orbitron',monospace);font-size:7px;letter-spacing:2px;color:var(--muted)}
    .auth-field input{background:rgba(0,245,255,.03);border:1px solid rgba(0,245,255,.15);border-radius:50px;padding:10px 14px;color:var(--text);font-family:var(--font-body,'Rajdhani',sans-serif);font-size:14px;outline:none}
    .auth-field input:focus{border-color:rgba(0,245,255,.45)}
    .auth-submit,.auth-google-btn,.auth-signout{width:100%;display:flex;align-items:center;justify-content:center;gap:9px;font-family:var(--font-display,'Orbitron',monospace);font-size:8px;letter-spacing:2px;padding:12px;border-radius:50px;cursor:pointer;transition:all .2s}
    .auth-submit{border:1px solid rgba(0,245,255,.3);background:linear-gradient(135deg,rgba(0,245,255,.12),rgba(191,0,255,.08));color:var(--accent,#00f5ff)}
    .auth-google-btn{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:var(--text);margin-bottom:12px}
    .auth-signout{border:1px solid rgba(255,0,110,.25);background:rgba(255,0,110,.06);color:var(--accent2,#ff006e);margin-top:14px}
    .auth-submit:disabled,.auth-google-btn:disabled{opacity:.4;cursor:not-allowed}
    .auth-divider{display:flex;align-items:center;gap:9px;margin-bottom:12px;font-family:var(--font-display,'Orbitron',monospace);font-size:7px;letter-spacing:2px;color:var(--muted)}
    .auth-divider::before,.auth-divider::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.06)}
    .auth-error{font-size:11px;color:var(--accent2,#ff006e);margin-top:8px;text-align:center;min-height:14px}
    .auth-close{float:right;margin-top:-4px;background:none;border:1px solid rgba(0,245,255,.12);border-radius:50px;color:var(--muted);width:30px;height:30px;cursor:pointer}
    .auth-user-info{font-size:12px;color:var(--muted);text-align:center}.auth-user-info span{color:var(--accent,#00f5ff)}
  `;
  document.head.appendChild(style);
  const modal = document.createElement('div');
  modal.className = 'auth-modal-overlay';
  modal.id = 'authModal';
  modal.innerHTML = `
    <div class="auth-modal">
      <button class="auth-close" type="button" onclick="closeAuthModal()"><i class="fa-solid fa-xmark"></i></button>
      <div class="auth-modal-title" id="authModalTitle">SIGN IN</div>
      <div class="auth-modal-sub" id="authModalSub">Sync your Zeno account across the site</div>
      <button class="auth-google-btn" id="authGoogleBtn" type="button" onclick="handleGoogleSignIn()">
        <svg width="14" height="14" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/></svg>
        CONTINUE WITH GOOGLE
      </button>
      <div class="auth-divider">OR</div>
      <div class="auth-tabs">
        <button class="auth-tab active" id="tabSignIn" type="button" onclick="switchAuthTab('signin')">SIGN IN</button>
        <button class="auth-tab" id="tabSignUp" type="button" onclick="switchAuthTab('signup')">CREATE ACCOUNT</button>
      </div>
      <div id="authFormWrap">
        <div class="auth-field"><label>EMAIL</label><input type="email" id="authEmail" placeholder="your@email.com" autocomplete="email"></div>
        <div class="auth-field"><label>PASSWORD</label><input type="password" id="authPassword" placeholder="Password" autocomplete="current-password"></div>
        <div class="auth-field" id="authDisplayNameField" style="display:none"><label>DISPLAY NAME</label><input type="text" id="authDisplayName" placeholder="Your name..." maxlength="24"></div>
        <button class="auth-submit" id="authSubmitBtn" type="button" onclick="handleAuthSubmit()"><i class="fa-solid fa-bolt"></i> SIGN IN</button>
        <div class="auth-error" id="authError"></div>
      </div>
      <div id="authSignedInWrap" style="display:none">
        <div class="auth-user-info">Signed in as <span id="authUserEmail"></span></div>
        <button class="auth-signout" type="button" onclick="handleSignOut()"><i class="fa-solid fa-right-from-bracket"></i> SIGN OUT</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) window.closeAuthModal(); });
}

function setUsernameFromUser(user) {
  const name = user?.displayName || user?.email?.split('@')[0];
  if (!name) return;
  localStorage.setItem('zeno_username', name);
  localStorage.setItem('zeno-username', name);
  window.ZenoStore?.set?.('zeno_username', name);
  window.updateGreeting?.();
  document.querySelectorAll('.zeno-nav-greet strong').forEach((el) => {
    el.textContent = name.toUpperCase();
  });
}

const ONBOARDING_KEYS = [
  'zeno_v2_setup_complete',
  'zeno_username',
  'zeno-username',
  'zeno_avatar',
  'zeno_theme',
  'zeno_accent',
  'zeno_games_import_mode',
  'zeno_wallpaper_type',
  'zeno_wallpaper_url',
  'zeno_wallpaper',
  'zeno_pin_hash',
  'zeno_grid_enabled',
  'zeno_scanlines_enabled',
  'zeno_blur_intensity',
  'zeno_animation_speed',
  'zeno_show_clock',
  'zeno_clock_format',
  'zeno_clock_date_first',
  'zeno_preferred_service',
  'zeno_startup_app',
  'zeno_recent_games',
];

function collectOnboardingState() {
  const values = {};
  for (const key of ONBOARDING_KEYS) {
    const value = localStorage.getItem(key);
    if (value != null) values[key] = value;
  }
  return {
    setupComplete: localStorage.getItem('zeno_v2_setup_complete') === 'true',
    updatedAt: Date.now(),
    values,
  };
}

function applyOnboardingState(profile) {
  const values = profile?.values || {};
  Object.entries(values).forEach(([key, value]) => {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  });
  if (profile?.setupComplete) localStorage.setItem('zeno_v2_setup_complete', 'true');
  window.applyTheme?.(localStorage.getItem('zeno_theme') || undefined, localStorage.getItem('zeno_accent') || undefined);
  window.applyWallpaper?.();
  window.updateGreeting?.();
}

async function syncOnboardingWithCloud(user) {
  if (!user) return;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    const cloud = snap.exists() ? snap.data()?.onboarding : null;
    const local = collectOnboardingState();
    if (cloud?.setupComplete) {
      applyOnboardingState(cloud);
      if (location.pathname.endsWith('/onboarding.html') || location.pathname.endsWith('onboarding.html')) {
        toast('ONBOARDING RESTORED');
        setTimeout(() => location.replace('index.html'), 500);
      }
      return;
    }
    if (local.setupComplete) {
      await setDoc(ref, { onboarding: local }, { merge: true });
    }
  } catch (e) {
    console.error('Onboarding sync failed:', e);
  }
}

window._fbSyncOnboarding = async function () {
  if (!currentUser) return;
  await setDoc(doc(db, 'users', currentUser.uid), { onboarding: collectOnboardingState() }, { merge: true }).catch(console.error);
};

window.openAuthModal = function () {
  ensureAuthModal();
  const modal = byId('authModal');
  const tabs = document.querySelector('#authModal .auth-tabs');
  const divider = document.querySelector('#authModal .auth-divider');
  const title = byId('authModalTitle');
  const subtitle = byId('authModalSub');
  const formWrap = byId('authFormWrap');
  const signedInWrap = byId('authSignedInWrap');
  const googleBtn = byId('authGoogleBtn');
  const emailInput = byId('authEmail');
  const userEmail = byId('authUserEmail');
  if (currentUser) {
    title.textContent = 'ACCOUNT';
    subtitle.textContent = 'Your Zeno account is active';
    tabs.style.display = 'none';
    formWrap.style.display = 'none';
    signedInWrap.style.display = 'block';
    googleBtn.style.display = 'none';
    divider.style.display = 'none';
    userEmail.textContent = currentUser.email || currentUser.displayName || currentUser.uid;
  } else {
    title.textContent = 'SIGN IN';
    subtitle.textContent = 'Sync your Zeno account across the site';
    tabs.style.display = 'flex';
    formWrap.style.display = 'block';
    signedInWrap.style.display = 'none';
    googleBtn.style.display = 'flex';
    divider.style.display = 'flex';
    window.switchAuthTab('signin');
  }
  modal.classList.add('open');
  setTimeout(() => emailInput?.focus(), 100);
};

window.closeAuthModal = function () {
  byId('authModal')?.classList.remove('open');
  const error = byId('authError');
  if (error) error.textContent = '';
};

window.switchAuthTab = function (mode) {
  authMode = mode;
  byId('tabSignIn')?.classList.toggle('active', mode === 'signin');
  byId('tabSignUp')?.classList.toggle('active', mode === 'signup');
  const submitBtn = byId('authSubmitBtn');
  if (submitBtn) submitBtn.innerHTML = mode === 'signin' ? '<i class="fa-solid fa-bolt"></i> SIGN IN' : '<i class="fa-solid fa-user-plus"></i> CREATE ACCOUNT';
  const displayNameField = byId('authDisplayNameField');
  if (displayNameField) displayNameField.style.display = mode === 'signup' ? 'flex' : 'none';
  const error = byId('authError');
  if (error) error.textContent = '';
};

window.handleAuthSubmit = async function () {
  const emailInput = byId('authEmail');
  const passwordInput = byId('authPassword');
  const displayNameInput = byId('authDisplayName');
  const submitBtn = byId('authSubmitBtn');
  const error = byId('authError');
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) { error.textContent = 'Please fill in all fields'; return; }
  submitBtn.disabled = true;
  error.textContent = '';
  try {
    if (authMode === 'signup') {
      const displayName = displayNameInput.value.trim() || email.split('@')[0];
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName });
      setUsernameFromUser(cred.user);
      toast('ACCOUNT CREATED');
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      toast('SIGNED IN');
    }
    window.closeAuthModal();
  } catch (e) {
    const msgs = {
      'auth/email-already-in-use': 'Email already in use',
      'auth/invalid-email': 'Invalid email',
      'auth/weak-password': 'Password must be 6+ characters',
      'auth/user-not-found': 'No account with that email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-credential': 'Incorrect email or password',
    };
    error.textContent = msgs[e.code] || e.message;
  }
  submitBtn.disabled = false;
};

window.handleGoogleSignIn = async function () {
  const googleBtn = byId('authGoogleBtn');
  const error = byId('authError');
  googleBtn.disabled = true;
  try {
    const cred = await signInWithPopup(auth, new GoogleAuthProvider());
    setUsernameFromUser(cred.user);
    toast('SIGNED IN WITH GOOGLE');
    window.closeAuthModal();
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') error.textContent = e.message;
  }
  googleBtn.disabled = false;
};

window.handleSignOut = async function () {
  await signOut(auth);
  window.closeAuthModal();
  toast('SIGNED OUT');
};

async function syncGamesToCloud(user) {
  if (!user || !window.games) return;
  for (const g of window.games) await window._fbSyncGame(g);
}

async function loadGamesFromCloud(user) {
  if (!user || !window.games) return;
  try {
    const snap = await getDocs(collection(db, 'users', user.uid, 'games'));
    const localIds = new Set(window.games.map(g => g.id));
    let added = 0;
    for (const d of snap.docs) {
      const cg = d.data();
      if (!cg?.id || localIds.has(cg.id)) continue;
      if ((cg.r2 || cg.zenoapp) && cg.entryPath) {
        const ep = cg.zenoapp && window.normalizeZenoAppPath ? window.normalizeZenoAppPath(cg.entryPath) : cg.entryPath;
        const entry = { id: cg.id, name: cg.name, icon: cg.icon, r2: !!cg.r2, zenoapp: !!cg.zenoapp, entryPath: ep, fileCount: cg.fileCount || 0, fileRecords: cg.zenoapp ? null : [] };
        window.games.push(entry);
        window.saveGameToDB?.(entry);
        added++;
      }
    }
    if (added) {
      window.renderGrid?.();
      toast(`${added} GAME${added > 1 ? 'S' : ''} RESTORED FROM CLOUD`);
    }
  } catch (e) {
    console.error('Cloud sync failed:', e);
  }
}

window._fbSyncGame = async function (gameEntry) {
  if (!currentUser || !gameEntry?.id) return;
  await setDoc(doc(db, 'users', currentUser.uid, 'games', gameEntry.id), {
    id: gameEntry.id,
    name: gameEntry.name,
    icon: gameEntry.icon || null,
    fileCount: gameEntry.fileCount || 0,
    r2: !!gameEntry.r2,
    zenoapp: !!gameEntry.zenoapp,
    entryPath: gameEntry.entryPath || null,
    updatedAt: Date.now(),
  }).catch(console.error);
};

window._fbDeleteGame = async function (gameId) {
  if (!currentUser || !gameId) return;
  await deleteDoc(doc(db, 'users', currentUser.uid, 'games', gameId)).catch(console.error);
};

function updateAuthButtons(user) {
  const label = user ? (user.displayName || user.email?.split('@')[0] || 'ACCOUNT') : 'SIGN IN';
  document.querySelectorAll('[data-auth-label]').forEach(el => { el.textContent = label.toUpperCase(); });
  const overflowAuthBtn = document.getElementById('authOverflowBtn');
  if (overflowAuthBtn) overflowAuthBtn.innerHTML = user
    ? '<i class="fa-solid fa-user-check"></i> ' + label.toUpperCase()
    : '<i class="fa-solid fa-user"></i> SIGN IN';
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  window.ZenoAuth = { auth, db, user, openAuthModal: window.openAuthModal, syncOnboarding: window._fbSyncOnboarding };
  updateAuthButtons(user);
  if (user) {
    setUsernameFromUser(user);
    await syncOnboardingWithCloud(user);
    await loadGamesFromCloud(user);
    setTimeout(() => syncGamesToCloud(user), 2000);
  }
});

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureAuthModal);
else ensureAuthModal();
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.getElementById('authModal')?.classList.contains('open')) window.handleAuthSubmit?.();
});
