/**
 * HY3N Firebase Client for Admin App
 * 
 * This module exports the firebaseClient object for the HY3N Admin app.
 * It uses Firebase (Firestore + Auth + Storage) under the hood.
 *
 * Supported methods:
 *   firebaseClient.entities.<EntityName>.list(orderBy, limit)
 *   firebaseClient.entities.<EntityName>.filter(filters, orderBy, limit)
 *   firebaseClient.entities.<EntityName>.get(id)
 *   firebaseClient.entities.<EntityName>.read(id)
 *   firebaseClient.entities.<EntityName>.create(data)
 *   firebaseClient.entities.<EntityName>.update(id, data)
 *   firebaseClient.entities.<EntityName>.delete(id)
 *   firebaseClient.entities.<EntityName>.bulkCreate(records)
 *   firebaseClient.entities.<EntityName>.subscribe(callback)
 *
 *   firebaseClient.auth.me()
 *   firebaseClient.auth.isAuthenticated()
 *   firebaseClient.auth.loginViaEmailPassword(email, password)
 *   firebaseClient.auth.loginWithProvider(provider, redirectTo)
 *   firebaseClient.auth.register({ email, password })
 *   firebaseClient.auth.verifyOtp({ email, otpCode })  -- not needed in Firebase (email verification is separate)
 *   firebaseClient.auth.resendOtp(email)
 *   firebaseClient.auth.setToken(token)
 *   firebaseClient.auth.logout(redirectTo)
 *   firebaseClient.auth.redirectToLogin(from)
 *   firebaseClient.auth.resetPasswordRequest(email)
 *   firebaseClient.auth.resetPassword({ resetToken, newPassword })
 *
 *   firebaseClient.functions.invoke(name, params)
 *   firebaseClient.integrations.Core.UploadFile({ file })
 *   firebaseClient.integrations.Core.InvokeLLM({ prompt, response_json_schema })
 *   firebaseClient.analytics.track({ eventName, properties })
 *
 *   firebaseClient.asServiceRole.entities.<EntityName>.*  -- same as firebaseClient.entities (no service role in Firebase client-side)
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  onAuthStateChanged,
  confirmPasswordReset,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

// ─── Firebase Config ─────────────────────────────────────────────────────────
// Firebase configuration — reads from VITE_ environment variables
// Falls back to hardcoded values if env vars are not set
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDYUm2xv_8er3oGwk6qVXzAT51hoS4N4dE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "hy3n26.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "hy3n26",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "hy3n26.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "362594902321",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:362594902321:web:9387b08590e7660216d010",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-WH7JZPLP0L"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Convert a Firestore document snapshot to a plain object with an `id` field.
 */
function docToObj(docSnap) {
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

/**
 * Convert a Firestore query snapshot to an array of plain objects.
 */
function snapshotToArray(querySnap) {
  return querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Convert an orderBy string (e.g. "-created_date") to Firestore
 * orderBy parameters.  A leading "-" means descending.
 */
function parseOrderBy(orderByStr) {
  if (!orderByStr) return null;
  if (orderByStr.startsWith('-')) {
    return { field: orderByStr.slice(1), direction: 'desc' };
  }
  return { field: orderByStr, direction: 'asc' };
}

/**
 * Build a Firestore query from filters, optional orderBy string, and optional limit.
 * `filters` is a plain object of { field: value } equality constraints.
 */
function buildQuery(collectionName, filters = {}, orderByStr, limitNum) {
  const colRef = collection(db, collectionName);
  const constraints = [];

  // Equality filters
  for (const [field, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      constraints.push(where(field, '==', value));
    }
  }

  // OrderBy
  const order = parseOrderBy(orderByStr);
  if (order) {
    constraints.push(orderBy(order.field, order.direction));
  } else {
    // Default: order by created_date descending so newest first
    constraints.push(orderBy('created_date', 'desc'));
  }

  // Limit
  if (limitNum && limitNum > 0) {
    constraints.push(firestoreLimit(limitNum));
  }

  return query(colRef, ...constraints);
}

// ─── Entity Factory ───────────────────────────────────────────────────────────

/**
 * Create an entity API object for a given Firestore collection name.
 * The collection name is the snake_case version of the entity name.
 */
function createEntityAPI(collectionName) {
  return {
    /**
     * List all documents, optionally ordered and limited.
     * Signature: list(orderBy?, limit?)
     */
    async list(orderByStr, limitNum) {
      try {
        const q = buildQuery(collectionName, {}, orderByStr, limitNum);
        const snap = await getDocs(q);
        return snapshotToArray(snap);
      } catch (err) {
        // If orderBy field doesn't exist yet, fall back to unordered query
        console.warn(`[Firebase] list(${collectionName}) error:`, err.message);
        const snap = await getDocs(collection(db, collectionName));
        return snapshotToArray(snap);
      }
    },

    /**
     * Filter documents by equality constraints.
     * Signature: filter(filters, orderBy?, limit?)
     */
    async filter(filters = {}, orderByStr, limitNum) {
      try {
        const q = buildQuery(collectionName, filters, orderByStr, limitNum);
        const snap = await getDocs(q);
        return snapshotToArray(snap);
      } catch (err) {
        // Fallback: fetch all and filter in memory (handles missing index)
        console.warn(`[Firebase] filter(${collectionName}) error, falling back to in-memory filter:`, err.message);
        const snap = await getDocs(collection(db, collectionName));
        let results = snapshotToArray(snap);
        for (const [field, value] of Object.entries(filters)) {
          if (value !== undefined && value !== null) {
            results = results.filter(doc => doc[field] === value);
          }
        }
        return results;
      }
    },

    /**
     * Get a single document by ID.
     * Signature: get(id)
     */
    async get(id) {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      return docToObj(docSnap);
    },

    /**
     * Read a single document by ID (alias for get).
     * Signature: read(id)
     */
    async read(id) {
      return this.get(id);
    },

    /**
     * Create a new document.
     * Signature: create(data) → returns created object with id
     */
    async create(data) {
      const payload = {
        ...data,
        created_date: data.created_date || new Date().toISOString(),
        updated_date: new Date().toISOString(),
      };
      const colRef = collection(db, collectionName);
      const docRef = await addDoc(colRef, payload);
      return { id: docRef.id, ...payload };
    },

    /**
     * Update an existing document by ID.
     * Signature: update(id, data) → returns updated object
     */
    async update(id, data) {
      const docRef = doc(db, collectionName, id);
      const payload = {
        ...data,
        updated_date: new Date().toISOString(),
      };
      await updateDoc(docRef, payload);
      return { id, ...payload };
    },

    /**
     * Delete a document by ID.
     * Signature: delete(id)
     */
    async delete(id) {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      return { id };
    },

    /**
     * Bulk create multiple documents.
     * Signature: bulkCreate(records[])
     */
    async bulkCreate(records) {
      const batch = writeBatch(db);
      const colRef = collection(db, collectionName);
      const created = [];
      for (const data of records) {
        const newDocRef = doc(colRef);
        const payload = {
          ...data,
          created_date: data.created_date || new Date().toISOString(),
          updated_date: new Date().toISOString(),
        };
        batch.set(newDocRef, payload);
        created.push({ id: newDocRef.id, ...payload });
      }
      await batch.commit();
      return created;
    },

    /**
     * Subscribe to real-time changes on a collection.
     * Signature: subscribe(callback) → returns unsubscribe function
     *
     * The callback receives events in the format:
     *   { type: "create" | "update" | "delete", id, data }
     *
     * This is a simplified version — it fires on any change to the collection.
     */
    subscribe(callback) {
      const colRef = collection(db, collectionName);
      const unsubscribe = onSnapshot(colRef, (snap) => {
        snap.docChanges().forEach((change) => {
          const data = { id: change.doc.id, ...change.doc.data() };
          let type;
          if (change.type === 'added') type = 'create';
          else if (change.type === 'modified') type = 'update';
          else if (change.type === 'removed') type = 'delete';
          callback({ type, id: change.doc.id, data });
        });
      }, (err) => {
        console.error(`[Firebase] subscribe(${collectionName}) error:`, err);
      });
      return unsubscribe;
    },
  };
}

// ─── Entity Name → Collection Name Mapping ───────────────────────────────────
// Maps PascalCase entity names to snake_case Firestore collection names.

const ENTITY_COLLECTIONS = {
  AdminAccess: 'admin_access',
  AppConfig: 'app_config',
  BiometricKey: 'biometric_keys',
  Commission: 'commissions',
  CommissionRecord: 'commission_records',
  DailyCommission: 'daily_commissions',
  DriverProfile: 'driver_profiles',
  Earning: 'earnings',
  FareConfig: 'fare_configs',
  LoyaltyPoints: 'loyalty_points',
  LoyaltyRedemption: 'loyalty_redemptions',
  Payment: 'payments',
  Payout: 'payouts',
  PromoCode: 'promo_codes',
  PushSubscription: 'push_subscriptions',
  Referral: 'referrals',
  Ride: 'rides',
  RideMessage: 'ride_messages',
  RideReport: 'ride_reports',
  RiderProfile: 'rider_profiles',
  PushNotification: 'push_notifications',
  NotificationDelivery: 'notification_deliveries',
  SafetyAlert: 'safety_alerts',
  Schedule: 'schedules',
  ScheduledRide: 'scheduled_rides',
  Shift: 'shifts',
  SosIncident: 'sos_incidents',
  SupportTicket: 'support_tickets',
  Task: 'tasks',
  Wallet: 'wallets',
  WalletTransaction: 'wallet_transactions',
  Withdrawal: 'withdrawals',
};

// Build the entities proxy
const entities = {};
for (const [entityName, collectionName] of Object.entries(ENTITY_COLLECTIONS)) {
  entities[entityName] = createEntityAPI(collectionName);
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

/**
 * Get the current Firebase Auth user object.
 * User fields: id, email, full_name, role
 */
async function getCurrentUser() {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    full_name: firebaseUser.displayName || '',
    role: 'user', // Default role; apps override this via DriverProfile/AdminAccess checks
  };
}

const authAPI = {
  /**
   * Returns the current user object or throws if not authenticated.
   */
  async me() {
    const user = await getCurrentUser();
    if (!user) throw new Error('Not authenticated');
    return user;
  },

  /**
   * Returns true if a user is currently signed in.
   */
  async isAuthenticated() {
    return auth.currentUser !== null;
  },

  /**
   * Sign in with email and password.
   */
  async loginViaEmailPassword(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    return {
      id: cred.user.uid,
      email: cred.user.email,
      full_name: cred.user.displayName || '',
    };
  },

  /**
   * Sign in with a provider (currently supports "google").
   * Uses popup flow (works better on mobile PWA).
   */
  async loginWithProvider(provider, redirectTo = '/') {
    if (provider === 'google') {
      const googleProvider = new GoogleAuthProvider();
      googleProvider.addScope('email');
      googleProvider.addScope('profile');
      try {
        // Try popup first (better UX on mobile)
        const result = await signInWithPopup(auth, googleProvider);
        if (result.user) {
          window.location.href = redirectTo;
        }
      } catch (popupErr) {
        // Fallback to redirect if popup is blocked
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/popup-closed-by-user') {
          sessionStorage.setItem('auth_redirect', redirectTo);
          signInWithRedirect(auth, googleProvider);
        } else {
          throw popupErr;
        }
      }
    } else {
      throw new Error(`Provider "${provider}" is not supported`);
    }
  },

  /**
   * Register a new user with email and password.
   * Firebase sends a verification email automatically if configured.
   * Creates the Firebase Auth account directly.
   */
  async register({ email, password }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Send email verification
    try {
      const { sendEmailVerification } = await import('firebase/auth');
      await sendEmailVerification(cred.user);
    } catch (e) {
      // Non-fatal
    }
    return {
      id: cred.user.uid,
      email: cred.user.email,
    };
  },

  /**
   * Verify OTP — in Firebase, email verification is handled via a link
   * sent by Firebase, not a 6-digit code. This is a no-op stub that
   * simulates success so the UI flow continues.
   *
   * NOTE: The apps call verifyOtp after register. Since Firebase handles
   * email verification separately, we just return a success response here.
   * The user is already signed in after createUserWithEmailAndPassword.
   */
  async verifyOtp({ email, otpCode }) {
    // User is already signed in; just return a fake token
    const user = auth.currentUser;
    if (!user) throw new Error('No user signed in');
    const token = await user.getIdToken();
    return { access_token: token };
  },

  /**
   * Resend OTP — stub (Firebase sends email verification links, not codes).
   */
  async resendOtp(email) {
    const user = auth.currentUser;
    if (user) {
      try {
        const { sendEmailVerification } = await import('firebase/auth');
        await sendEmailVerification(user);
      } catch (e) {
        // Non-fatal
      }
    }
    return { success: true };
  },

  /**
   * Set a token — no-op in Firebase (tokens are managed internally).
   */
  setToken(token) {
    // No-op: Firebase manages tokens internally
  },

  /**
   * Sign out and optionally redirect.
   */
  async logout(redirectTo) {
    await signOut(auth);
    if (redirectTo && typeof redirectTo === 'string') {
      window.location.href = redirectTo;
    }
  },

  /**
   * Redirect to login page.
   */
  redirectToLogin(from) {
    window.location.href = '/login';
  },

  /**
   * Send a password reset email.
   */
  async resetPasswordRequest(email) {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  },

  /**
   * Confirm a password reset using the Firebase oobCode (reset token).
   * The resetToken from the URL is the Firebase oobCode parameter.
   */
  async resetPassword({ resetToken, newPassword }) {
    await confirmPasswordReset(auth, resetToken, newPassword);
    return { success: true };
  },
};

// ─── Functions API ────────────────────────────────────────────────────────────
// firebaseClient.functions.invoke(name, params) → calls a deployed Firebase Cloud Function
const FUNCTIONS_BASE_URL = 'https://us-central1-hy3n26.cloudfunctions.net';

// Local overrides for functions that don't need a backend call
const FUNCTIONS_LOCAL = {
  getGoogleMapsKey: async () => ({ data: { key: import.meta.env.VITE_GOOGLE_MAPS_KEY || '' } }),
  generateInviteCode: async () => ({ data: { code: Math.random().toString(36).slice(2, 8).toUpperCase() } }),
};

const functionsAPI = {
  async invoke(name, params = {}) {
    // Use local override if defined
    if (FUNCTIONS_LOCAL[name]) {
      return FUNCTIONS_LOCAL[name](params);
    }
    // Call the deployed Firebase Cloud Function
    try {
      const user = auth.currentUser;
      const headers = { 'Content-Type': 'application/json' };
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await fetch(`${FUNCTIONS_BASE_URL}/${name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Firebase] Function ${name} returned ${response.status}:`, errText);
        return { data: null, error: errText };
      }
      const data = await response.json();
      return { data };
    } catch (err) {
      console.error(`[Firebase] functions.invoke("${name}") error:`, err);
      return { data: null, error: err.message };
    }
  },
};

// ─── Integrations API ─────────────────────────────────────────────────────────

const integrationsAPI = {
  Core: {
    /**
     * Upload a file to Firebase Storage and return its public URL.
     * Signature: UploadFile({ file }) → { file_url }
     */
    async UploadFile({ file }) {
      try {
        const user = auth.currentUser;
        const userId = user ? user.uid : 'anonymous';
        const timestamp = Date.now();
        const fileName = `uploads/${userId}/${timestamp}_${file.name}`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, file);
        const file_url = await getDownloadURL(storageRef);
        return { file_url };
      } catch (err) {
        // Firebase Storage requires Blaze plan. Gracefully degrade on Spark plan.
        const msg = err?.message || '';
        if (err?.code === 'storage/unknown' || msg.includes('billing') || msg.includes('quota')) {
          console.warn('[Firebase] Storage requires Blaze plan upgrade. File upload skipped.');
          return { file_url: null };
        }
        throw err;
      }
    },

    /**
     * Invoke an LLM via OpenAI API (using the sandbox's pre-configured key).
     * Signature: InvokeLLM({ prompt, response_json_schema }) → result
     */
    async InvokeLLM({ prompt, response_json_schema }) {
      try {
        const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
        if (!apiKey) {
          console.warn('[Firebase] InvokeLLM: VITE_OPENAI_API_KEY not set');
          return null;
        }
        const messages = [{ role: 'user', content: prompt }];
        const body = {
          model: 'gpt-4o-mini',
          messages,
        };
        if (response_json_schema) {
          body.response_format = { type: 'json_object' };
          body.messages[0].content += '\n\nRespond with valid JSON only.';
        }
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (response_json_schema && content) {
          return JSON.parse(content);
        }
        return content;
      } catch (err) {
        console.error('[Firebase] InvokeLLM error:', err);
        return null;
      }
    },
  },
};

// ─── Analytics API ────────────────────────────────────────────────────────────

const analyticsAPI = {
  track({ eventName, properties }) {
    // No-op stub — replace with Firebase Analytics or a custom analytics solution
    // console.debug('[Analytics]', eventName, properties);
  },
};

// ─── Auth State Listener ──────────────────────────────────────────────────────
// Expose a way to listen to auth state changes (used by AuthContext)

export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export const firebaseClient = {
  entities,
  auth: authAPI,
  functions: functionsAPI,
  integrations: integrationsAPI,
  analytics: analyticsAPI,
  asServiceRole: {
    entities,
  },
};

// Also export Firebase instances for direct use
export { app, auth, db, storage };
