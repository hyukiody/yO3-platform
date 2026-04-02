/**
 * Secure key storage using IndexedDB
 * Master key never sent to server
 */

const DB_NAME = 'yo3-secure-storage';
const STORE_NAME = 'keys';
const DB_VERSION = 1;

export class KeyStorageService {
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }

  async storeMasterKey(keyData: ArrayBuffer, deviceId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put({
        id: `master-key-${deviceId}`,
        keyData: keyData,
        createdAt: Date.now(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getMasterKey(deviceId: string): Promise<ArrayBuffer | null> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(`master-key-${deviceId}`);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.keyData : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteMasterKey(deviceId: string): Promise<void> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(`master-key-${deviceId}`);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async listDevices(): Promise<string[]> {
    if (!this.db) await this.initialize();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();

      request.onsuccess = () => {
        const keys = request.result as string[];
        const deviceIds = keys
          .filter(k => k.startsWith('master-key-'))
          .map(k => k.replace('master-key-', ''));
        resolve(deviceIds);
      };
      request.onerror = () => reject(request.error);
    });
  }
}

export const keyStorage = new KeyStorageService();
