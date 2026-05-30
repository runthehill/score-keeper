import { useEffect, useMemo, useRef, useState } from 'react';
import type { Game, GameEvent, SportConfig } from '../types';
import { buildShareModel, type ShareVariant } from '../utils/shareCard';
import { renderScoreCard, cardToBlob, type ShareFormat } from '../utils/renderScoreCard';
import { shareImage } from '../utils/shareImage';
import { downloadFile } from '../utils/export';

interface Props {
  game: Game;
  events: GameEvent[];
  sport: SportConfig;
  variant: ShareVariant;
  periodLabel?: string;
  onClose: () => void;
}

export default function ShareSheet({ game, events, sport, variant, periodLabel, onClose }: Props) {
  const [format, setFormat] = useState<ShareFormat>('square');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const model = useMemo(
    () => buildShareModel(game, events, sport, { variant, periodLabel }),
    [game, events, sport, variant, periodLabel]
  );

  useEffect(() => {
    if (canvasRef.current) renderScoreCard(canvasRef.current, model, format);
  }, [model, format]);

  const filename = `${game.home_team}-v-${game.away_team}.png`.replace(/\s+/g, '-');

  const handleShare = async () => {
    if (!canvasRef.current) return;
    setBusy(true);
    try {
      const blob = await cardToBlob(canvasRef.current);
      const outcome = await shareImage(blob, filename, {
        title: `${game.home_team} v ${game.away_team}`,
        text: `${model.home.name} ${model.home.score} – ${model.away.name} ${model.away.score}`,
      });
      if (outcome === 'error') setToast("Couldn't share image");
      else if (outcome === 'downloaded') setToast('Image saved');
      else if (outcome === 'shared') setToast('Shared');
      if (outcome === 'shared' || outcome === 'downloaded') setTimeout(onClose, 800);
    } catch {
      setToast("Couldn't create image");
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async () => {
    if (!canvasRef.current) return;
    setBusy(true);
    try {
      const blob = await cardToBlob(canvasRef.current);
      downloadFile(blob, filename, 'image/png');
      setToast('Image saved');
      setTimeout(onClose, 800);
    } catch {
      setToast("Couldn't create image");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-h-[92vh] overflow-y-auto bg-surface-800 rounded-t-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm font-semibold text-gray-400 mb-3">
          Share {variant === 'final' ? 'result' : 'current score'}
        </p>

        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            className="rounded-xl border border-surface-600"
            style={{ display: 'block', width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '50vh' }}
          />
        </div>

        <div className="flex gap-2 mb-3">
          {(['square', 'story'] as ShareFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border ${
                format === f ? 'bg-accent border-accent text-white' : 'bg-surface-700 border-surface-600 text-gray-400'
              }`}
            >
              {f === 'square' ? 'Square' : 'Story'}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={handleShare} disabled={busy} className="flex-1 py-3 bg-accent rounded-lg text-sm font-bold disabled:opacity-50">
            {busy ? '…' : 'Share'}
          </button>
          <button onClick={handleSave} disabled={busy} className="flex-1 py-3 bg-surface-700 border border-surface-600 rounded-lg text-sm font-semibold disabled:opacity-50">
            Save image
          </button>
        </div>

        {toast && <p className="text-center text-xs text-gray-400 mt-3">{toast}</p>}
        <button onClick={onClose} className="w-full mt-2 py-3 text-center text-sm text-gray-500">Close</button>
      </div>
    </div>
  );
}
