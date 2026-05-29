import { useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Database } from 'sql.js';
import { getDB, persistDB } from '../db/init';
import { DBContext } from './useDB';

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
