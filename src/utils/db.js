/**
 * Lightweight IndexedDB manager to store encrypted receipt files (since LocalStorage is limited to 5MB).
 */

const DB_NAME = 'wealth_manager_db';
const DB_VERSION = 1;
const STORE_NAME = 'documents_vault';

/**
 * Opens connection to IndexedDB database.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (e) => {
      resolve(e.target.result);
    };
    
    request.onerror = (e) => {
      reject(e.target.error);
    };
  });
}

/**
 * Saves or updates an encrypted base64 payload in IndexedDB.
 * @param {string} id 
 * @param {string} encryptedBase64 
 * @returns {Promise<void>}
 */
export async function saveEncryptedFile(id, encryptedBase64) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ id, encryptedData: encryptedBase64 });
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves the encrypted base64 string from IndexedDB by id.
 * @param {string} id 
 * @returns {Promise<string|null>}
 */
export async function getEncryptedFile(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    
    request.onsuccess = (e) => {
      resolve(e.target.result?.encryptedData || null);
    };
    
    request.onerror = () => reject(request.error);
  });
}

/**
 * Deletes the encrypted file by id.
 * @param {string} id 
 * @returns {Promise<void>}
 */
export async function deleteFileFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
