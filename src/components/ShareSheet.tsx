import { useRef, useState } from 'react';
import type { Game, GameEvent, SportConfig } from '../types';
import { buildShareModel, shareFilename, type ShareVariant } from '../utils/shareCard';
import { exportShareCard } from '../utils/exportShareCard';
import ShareCard from './ShareCard';

interface Props {
  game: Game;
  events: GameEvent[];
  sport: SportConfig;
  variant: ShareVariant;
  periodLabel?: string;
  onClose: () => void;
}

export default function ShareSheet({ game, events, sport, variant, periodLabel, onClose }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  const model = buildShareModel(game, events, sport, { variant, periodLabel });
  const filename = shareFilename(game.home_team, game.away_team);

  const handleShare = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    setToast('');
    try {
      const outcome = await exportShareCard(cardRef.current, filename, {
        title: `${game.home_team} v ${game.away_team}`,
        text: `${model.home.name} ${model.home.score} – ${model.away.name} ${model.away.score}`,
      });
      if (outcome === 'error') setToast("Couldn't create image");
      else if (outcome === 'downloaded') setToast('Image saved');
      else if (outcome === 'shared') setToast('Shared');
      if (outcome === 'shared' || outcome === 'downloaded') setTimeout(onClose, 800);
    } catch {
      setToast("Couldn't create image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-h-[92vh] overflow-y-auto bg-surface rounded-t-2xl border-t border-line p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-txt-3 mb-3">
          Share {variant === 'final' ? 'result' : 'current score'}
        </p>
        <div className="mb-4">
          <ShareCard ref={cardRef} game={game} events={events} sport={sport} variant={variant} periodLabel={periodLabel} />
        </div>
        <button type="button" onClick={handleShare} disabled={busy} className="w-full py-3 bg-txt text-bg rounded-xl text-sm font-bold disabled:opacity-50 press">
          {busy ? 'Preparing…' : 'Share image'}
        </button>
        {toast && <p className="text-center text-xs text-txt-3 mt-3">{toast}</p>}
        <button type="button" onClick={onClose} className="w-full mt-2 py-3 text-center text-sm text-txt-3">Close</button>
      </div>
    </div>
  );
}
