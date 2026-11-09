import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo:
        auth.currentUser?.providerData?.map((p) => ({
          providerId: p.providerId,
          email: p.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Removes undefined fields deeply so Firestore setDoc does not throw errors.
 */
export function cleanForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (val !== undefined) {
        cleaned[key] = cleanForFirestore(val);
      }
    }
    return cleaned as unknown as T;
  }
  return obj;
}

/**
 * Subscribes to real-time updates for a collection in Firestore.
 * Always forwards the full snapshot array (including empty `[]`) so deletions
 * are immediately reflected across all connected clients.
 */
export function subscribeToCollection<T extends { id: string }>(
  collectionName: string,
  onData: (items: T[]) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const colRef = collection(db, collectionName);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((d) => {
        const item = { ...d.data(), id: d.id } as T;
        items.push(item);
      });
      onData(items);
    },
    (error) => {
      console.warn(`Firestore subscription info on ${collectionName}:`, error);
      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * Subscribes to a single document in Firestore.
 */
export function subscribeToDoc<T>(
  collectionName: string,
  docId: string,
  onData: (data: T | null) => void,
  onError?: (error: unknown) => void
): Unsubscribe {
  const docRef = doc(db, collectionName, docId);
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as T);
      } else {
        onData(null);
      }
    },
    (error) => {
      console.warn(`Firestore subscription info on ${collectionName}/${docId}:`, error);
      if (onError) {
        onError(error);
      }
    }
  );
}

/**
 * Persist or update an item to Firestore.
 */
export async function syncItemToFirestore(
  collectionName: string,
  id: string,
  data: Record<string, unknown>
): Promise<void> {
  const cleanData = cleanForFirestore({ ...data, id });
  try {
    await setDoc(doc(db, collectionName, id), cleanData, { merge: true });
  } catch (error) {
    console.warn(`Error syncing item ${id} to ${collectionName}:`, error);
    try {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${id}`);
    } catch {
      // Handled cleanly to avoid unhandled rejection in background sync
    }
  }
}

/**
 * Permanently delete an item from Firestore.
 */
export async function deleteItemFromFirestore(
  collectionName: string,
  id: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.warn(`Error deleting item ${id} from ${collectionName}:`, error);
    try {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
    } catch {
      // Handled cleanly to avoid unhandled rejection in background deletion
    }
  }
}

/**
 * Checks if the store has already been initialized in Firestore.
 * If this document exists or if local storage marks it initialized,
 * NO demo data will ever be seeded again, ensuring that any item deleted
 * by the user stays permanently deleted across all reloads.
 */
export async function isStoreInitialized(): Promise<boolean> {
  // 1. Check local storage cache flag first
  if (typeof window !== 'undefined' && localStorage.getItem('sparkle_app_system_initialized') === 'true') {
    return true;
  }

  try {
    const snap = await getDoc(doc(db, 'settings', 'systemState'));
    if (snap.exists() && snap.data()?.isInitialized === true) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sparkle_app_system_initialized', 'true');
      }
      return true;
    }
    const storeSettingsSnap = await getDoc(doc(db, 'settings', 'storeSettings'));
    if (storeSettingsSnap.exists()) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sparkle_app_system_initialized', 'true');
      }
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Could not verify systemState from Firestore (operating in offline/safe mode):', error);
    // CRITICAL: On network or offline errors, assume TRUE so we NEVER accidentally re-seed
    // or resurrect deleted items when connection takes time or operates offline!
    return true;
  }
}

/**
 * Seeds initial demo data ONCE and only if the system has never been initialized.
 * Once initialized, this function is a permanent no-op so deleted items never reload.
 */
export async function initializeStoreOnceIfNeeded(initialSeedBundle: {
  products: Array<{ id: string; [key: string]: any }>;
  categories: Array<{ id: string; [key: string]: any }>;
  materials: Array<{ id: string; [key: string]: any }>;
  invisibleCosts: Array<{ id: string; [key: string]: any }>;
  orders: Array<{ id: string; [key: string]: any }>;
  transactions: Array<{ id: string; [key: string]: any }>;
  clients: Array<{ id: string; [key: string]: any }>;
  suppliers: Array<{ id: string; [key: string]: any }>;
  settingsMap: Record<string, any>;
}): Promise<boolean> {
  try {
    const isInit = await isStoreInitialized();
    if (isInit) {
      // Store was already initialized. Do NOT re-seed anything!
      return false;
    }

    // First time ever: perform initial seed in batch
    const batch = writeBatch(db);

    for (const p of initialSeedBundle.products) {
      batch.set(doc(db, 'products', p.id), cleanForFirestore(p));
    }
    for (const c of initialSeedBundle.categories) {
      batch.set(doc(db, 'categories', c.id), cleanForFirestore(c));
    }
    for (const m of initialSeedBundle.materials) {
      batch.set(doc(db, 'materials', m.id), cleanForFirestore(m));
    }
    for (const ic of initialSeedBundle.invisibleCosts) {
      batch.set(doc(db, 'invisibleCosts', ic.id), cleanForFirestore(ic));
    }
    for (const o of initialSeedBundle.orders) {
      batch.set(doc(db, 'orders', o.id), cleanForFirestore(o));
    }
    for (const t of initialSeedBundle.transactions) {
      batch.set(doc(db, 'transactions', t.id), cleanForFirestore(t));
    }
    for (const cl of initialSeedBundle.clients) {
      batch.set(doc(db, 'clients', cl.id), cleanForFirestore(cl));
    }
    for (const s of initialSeedBundle.suppliers) {
      batch.set(doc(db, 'suppliers', s.id), cleanForFirestore(s));
    }

    // Initial settings
    batch.set(doc(db, 'settings', 'storeSettings'), cleanForFirestore(initialSeedBundle.settingsMap), { merge: true });

    // Mark system as permanently initialized
    batch.set(doc(db, 'settings', 'systemState'), {
      isInitialized: true,
      initializedAt: new Date().toISOString(),
      version: '2.0.0',
    });

    await batch.commit();

    if (typeof window !== 'undefined') {
      localStorage.setItem('sparkle_app_system_initialized', 'true');
    }

    console.log('Store initialized in Firestore cloud for the first time.');
    return true;
  } catch (error) {
    console.warn('initializeStoreOnceIfNeeded encountered an error:', error);
    return false;
  }
}

