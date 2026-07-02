import { useState } from 'react';

export interface PlayerRowBase {
  name: string;
  number: string;
}

interface Props<T extends PlayerRowBase> {
  players: T[];
  onChange: (next: T[]) => void;
  allowRemove?: boolean;
  createRow?: (name: string, number: string) => T;
}

export default function PlayerRowsEditor<T extends PlayerRowBase>({
  players, onChange, allowRemove = true, createRow,
}: Props<T>) {
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');

  const add = () => {
    if (!newName.trim()) return;
    const row = createRow ? createRow(newName.trim(), newNumber) : ({ name: newName.trim(), number: newNumber } as T);
    onChange([...players, row]);
    setNewName('');
    setNewNumber('');
  };

  const editRow = (i: number, patch: Partial<PlayerRowBase>) =>
    onChange(players.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const remove = (i: number) => onChange(players.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= players.length) return;
    const next = [...players];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const numInput = 'w-12 shrink-0 bg-surface-2 border border-line rounded-lg px-1.5 py-2 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3';
  const nameInput = 'min-w-0 flex-1 bg-surface-2 border border-line rounded-lg px-3 py-2 text-txt placeholder-txt-3 focus:outline-none focus:border-txt-3';
  const iconBtn = 'shrink-0 w-8 h-8 grid place-items-center rounded-lg bg-surface-2 border border-line text-txt-2 text-xs press disabled:opacity-30';

  return (
    <div className="space-y-2">
      {players.length > 0 && (
        <div className="space-y-1.5">
          {players.map((p, i) => {
            const who = p.name || `player ${i + 1}`;
            return (
              <div key={i} className="flex items-center gap-1.5">
                <input
                  type="number"
                  inputMode="numeric"
                  value={p.number}
                  onChange={(e) => editRow(i, { number: e.target.value })}
                  placeholder="#"
                  aria-label={`${who} number`}
                  className={numInput}
                />
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => editRow(i, { name: e.target.value })}
                  placeholder="Player name"
                  aria-label={`${who} name`}
                  className={nameInput}
                />
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${who} up`} className={iconBtn}>▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === players.length - 1} aria-label={`Move ${who} down`} className={iconBtn}>▼</button>
                {allowRemove && (
                  <button type="button" onClick={() => remove(i)} aria-label={`Remove ${who}`} className={iconBtn}>✕</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Player name"
          aria-label="New player name"
          className="min-w-0 flex-1 bg-surface-2 border border-line rounded-xl px-4 py-3 text-txt placeholder-txt-3 focus:outline-none focus:border-txt-3"
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <input
          type="number"
          inputMode="numeric"
          value={newNumber}
          onChange={(e) => setNewNumber(e.target.value)}
          placeholder="#"
          aria-label="New player number"
          className="w-16 shrink-0 bg-surface-2 border border-line rounded-xl px-2 py-3 text-txt text-center placeholder-txt-3 focus:outline-none focus:border-txt-3"
          onKeyDown={(e) => e.key === 'Enter' && add()}
        />
        <button type="button" onClick={add} className="shrink-0 bg-txt text-bg rounded-xl px-4 font-semibold press">Add</button>
      </div>
    </div>
  );
}
