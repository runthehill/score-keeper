import { createContext, useContext } from 'react';
import type { Database } from 'sql.js';

export interface DBContextValue {
  db: Database | null;
  ready: boolean;
  persist: () => Promise<void>;
}

export const DBContext = createContext<DBContextValue>({ db: null, ready: false, persist: async () => {} });

export function useDB() {
  const ctx = useContext(DBContext);
  if (!ctx.ready) throw new Error('Database not ready');
  return { db: ctx.db!, persist: ctx.persist };
}

export function useDBReady() {
  return useContext(DBContext).ready;
}
