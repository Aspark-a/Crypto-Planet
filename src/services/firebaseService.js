import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, collection,
  addDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

// ── Admin credentials ────────────────────────────────────────────────────
// IMPORTANT: the admin MUST be a real Firebase Auth user, or every
// Firestore read/write will be rejected by security rules (request.auth
// will be null). We auto-create this account on first login if it
// doesn't exist yet, then sign in normally every time after that.
const ADMIN_EMAIL    = 'peterphat1710@gmail.com';
const ADMIN_PASSWORD = 'Cocoadmin123';

async function ensureAdminAccount() {
  try {
    // Try logging in first — if it works, the account already exists
    const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    return cred.user;
  } catch (err) {
    if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
      // First time — create the admin account
      const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      await updateProfile(cred.user, { displayName: 'Peter Phat' });
      await setDoc(doc(db, 'users', cred.user.uid), {
        uid: cred.user.uid,
        name: 'Peter Phat',
        email: ADMIN_EMAIL,
        role: 'admin',
        status: 'active',
        balance: 0,
        joined: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      });
      return cred.user;
    }
    throw err;
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────

export async function registerUser(name, email, password, role = 'trader') {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid:       cred.user.uid,
      name,
      email,
      role,
      status:    'active',
      balance:   0,
      joined:    new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    });
    return cred.user;
  } catch (err) {
    console.error('Register error:', err.code, err.message);
    throw new Error(friendlyError(err));
  }
}

// Turns cryptic Firebase/Firestore error codes into messages the user can
// actually act on, instead of "client is offline" or raw auth/* codes.
function friendlyError(err) {
  const code = err?.code || '';
  const msg  = err?.message || '';

  if (msg.includes('client is offline') || code === 'unavailable') {
    return 'Could not reach the database. This usually means Firestore hasn\'t been created yet for this project (Firebase Console → Build → Firestore Database → Create database), or your network/firewall is blocking the connection.';
  }
  if (code === 'permission-denied') {
    return 'Access denied by Firestore security rules. Make sure your rules have been published in the Firebase Console.';
  }
  if (code === 'auth/user-not-found' || code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Incorrect email or password.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many failed attempts. Please wait a moment and try again.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error reaching Firebase Authentication. Check your internet connection.';
  }
  return msg || 'Something went wrong. Please try again.';
}

export async function loginUser(email, password) {
  let firebaseUser;

  try {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
      firebaseUser = await ensureAdminAccount();
    } else {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      firebaseUser = cred.user;
    }
  } catch (err) {
    console.error('Auth error:', err.code, err.message);
    throw new Error(friendlyError(err));
  }

  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(userRef);

    // Profile exists — return it merged with the auth user
    if (snap.exists()) {
      return { ...firebaseUser, ...snap.data() };
    }

    // Profile missing — this happens when:
    //  a) Firestore was just created (existing Auth accounts have no profile doc)
    //  b) Admin account was created before Firestore existed
    // Auto-create it so login succeeds instead of throwing.
    const isAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const profile = {
      uid:       firebaseUser.uid,
      name:      firebaseUser.displayName || (isAdmin ? 'Peter Phat' : email.split('@')[0]),
      email:     firebaseUser.email,
      role:      isAdmin ? 'admin' : 'trader',
      status:    'active',
      balance:   0,
      joined:    new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp(),
    };
    await setDoc(userRef, profile);
    return { ...firebaseUser, ...profile };

  } catch (err) {
    console.error('Firestore error:', err.code, err.message);
    throw new Error(friendlyError(err));
  }
}

export async function logoutUser() {
  if (auth.currentUser) await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          callback({ ...user, ...snap.data() });
        } else {
          // Profile missing — auto-create it (same logic as loginUser)
          const isAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
          const profile = {
            uid:       user.uid,
            name:      user.displayName || (isAdmin ? 'Peter Phat' : user.email?.split('@')[0]),
            email:     user.email,
            role:      isAdmin ? 'admin' : 'trader',
            status:    'active',
            balance:   0,
            joined:    new Date().toISOString().split('T')[0],
            createdAt: serverTimestamp(),
          };
          await setDoc(userRef, profile);
          callback({ ...user, ...profile });
        }
      } catch (e) {
        console.error('Failed to load/create user profile:', e);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

// ── User Profile ──────────────────────────────────────────────────────────

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function updateUserProfile(uid, data) {
  await updateDoc(doc(db, 'users', uid), data);
}

export async function updateUserBalance(uid, delta) {
  if (!uid) return null;

  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  const currentBalance = Number(snap.exists() ? snap.data()?.balance || 0 : 0);
  const nextBalance = Math.max(0, currentBalance + Number(delta || 0));

  await updateDoc(userRef, { balance: nextBalance });
  return nextBalance;
}

function getBalanceDelta(txn) {
  if (!txn || txn.status !== 'completed') return 0;

  const amount = Number(txn.total || 0);
  switch (txn.type) {
    case 'deposit': return amount;
    case 'buy': return -amount;
    case 'sell': return amount;
    default: return 0;
  }
}

export async function syncUserBalanceFromTransaction(uid, txn) {
  const delta = getBalanceDelta(txn);
  if (!uid || delta === 0) return null;
  return updateUserBalance(uid, delta);
}

// ── Admin: fetch all users ────────────────────────────────────────────────

export async function getAllUsers() {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map(d => d.data());
}

// ── Transactions ──────────────────────────────────────────────────────────

export async function saveTransaction(uid, txn) {
  const ref = await addDoc(collection(db, 'transactions'), {
    ...txn,
    uid,
    createdAt: serverTimestamp(),
  });

  const balance = await syncUserBalanceFromTransaction(uid, txn);
  return { id: ref.id, balance };
}

// NOTE: deliberately NOT using orderBy() combined with where() here.
// where + orderBy on different fields requires a Firestore composite
// index to be created manually in the console — without it, this query
// throws "FAILED_PRECONDITION" and silently breaks the page. We sort
// client-side instead so it works out of the box with zero Firestore
// console configuration.
export async function getUserTransactions(uid) {
  const q = query(collection(db, 'transactions'), where('uid', '==', uid));
  const snap = await getDocs(q);
  const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return txns.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
}

export async function getAllTransactions() {
  const snap = await getDocs(collection(db, 'transactions'));
  const txns = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return txns.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
}

// ── Price Alerts ──────────────────────────────────────────────────────────

export async function saveAlert(uid, alert) {
  const ref = await addDoc(collection(db, 'alerts'), {
    ...alert,
    uid,
    status:    'active',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function getUserAlerts(uid) {
  const q = query(collection(db, 'alerts'), where('uid', '==', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deleteAlert(alertId) {
  await deleteDoc(doc(db, 'alerts', alertId));
}

// ── Support Tickets ───────────────────────────────────────────────────────

export async function saveTicket(uid, ticket) {
  await addDoc(collection(db, 'tickets'), {
    ...ticket,
    uid,
    status:    'open',
    createdAt: serverTimestamp(),
  });
}

export async function getAllTickets() {
  const snap = await getDocs(collection(db, 'tickets'));
  const tickets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return tickets.sort((a, b) => {
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
}
