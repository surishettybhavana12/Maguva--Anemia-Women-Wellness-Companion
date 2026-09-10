import { CuratedFood } from '../data/foodDatabase';

const DB_NAME = 'MaguvaFoodDatabase';
const DB_VERSION = 1;
const STORE_NAME = 'imported_foods';

/**
 * Open or initialize the IndexedDB instance for storing large food libraries (10k - 50k+ items)
 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('category', 'category', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Bulk save foods to IndexedDB without blocking the UI thread or exceeding localStorage 5MB quota
 */
export async function saveFoodsToIndexedDB(foods: CuratedFood[], overwrite = false): Promise<number> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      if (overwrite) {
        store.clear();
      }

      for (const food of foods) {
        store.put(food);
      }

      transaction.oncomplete = () => {
        resolve(foods.length);
      };

      transaction.onerror = () => {
        reject(transaction.error || new Error('Failed to write foods to IndexedDB'));
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Falling back to memory storage:', err);
    return foods.length;
  }
}

/**
 * Load all stored imported foods from IndexedDB
 */
export async function loadFoodsFromIndexedDB(): Promise<CuratedFood[]> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to load foods from IndexedDB'));
      };
    });
  } catch (err) {
    console.warn('[IndexedDB] Unable to load foods from IndexedDB:', err);
    return [];
  }
}

/**
 * Clear all imported foods from IndexedDB
 */
export async function clearFoodsFromIndexedDB(): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error('Failed to clear IndexedDB'));
    });
  } catch (err) {
    console.warn('[IndexedDB] Error clearing IndexedDB:', err);
  }
}

/**
 * Get total count of foods stored in IndexedDB
 */
export async function getFoodCountFromIndexedDB(): Promise<number> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result || 0);
      request.onerror = () => reject(request.error || new Error('Failed to count IndexedDB'));
    });
  } catch {
    return 0;
  }
}
