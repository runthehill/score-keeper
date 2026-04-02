import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Database } from 'sql.js';
import { getDB, persistDB } from '../db/init';

interface DBContextValue {
  db: Database | null;
  ready: boolean;
  persist: () => Promise<void>;
}

const DBContext = createContext<DBContextValue>({ db: null, ready: false, persist: async () => {} });

export function DBProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getDB().then((database) => {
      setDb(database);
      setReady(true);
    });
  }, []);

  const persist = useCallback(async () => {
    await persistDB();
  }, []);

  return (
    <DBContext.Provider value={{ db, ready, persist }}>
      {children}
    </DBContext.Provider>
  );
}

export function useDB() {
  const ctx = useContext(DBContext);
  if (!ctx.ready) throw new Error('Database not ready');
  return { db: ctx.db!, persist: ctx.persist };
}

export function useDBReady() {
  return useContext(DBContext).ready;
}
