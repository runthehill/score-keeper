import initSqlJs, { Database } from 'sql.js';
import { createTables } from './schema';

const DB_KEY = 'score-keeper-db';
const DB_STORE = 'sqlitedb';

async function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_KEY, 1);
    req.onupgradeneeded = () => { req.result.createObjectStore(DB_STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIDB(): Promise<Uint8Array | null> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readonly');
    const req = tx.objectStore(DB_STORE).get('db');
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(data: Uint8Array): Promise<void> {
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).put(data, 'db');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let _db: Database | null = null;

export async function getDB(): Promise<Database> {
  if (_db) return _db;
  const SQL = await initSqlJs({ locateFile: (file: string) => `/${file}` });
  const saved = await loadFromIDB();
  _db = saved ? new SQL.Database(saved) : new SQL.Database();
  createTables(_db);
  return _db;
}

export async function persistDB(): Promise<void> {
  if (!_db) return;
  const data = _db.export();
  await saveToIDB(data);
}

export async function clearDB(): Promise<void> {
  if (_db) { _db.close(); _db = null; }
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete('db');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
