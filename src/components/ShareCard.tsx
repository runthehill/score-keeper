import { forwardRef } from 'react';
import type { Game, GameEvent, SportConfig } from '../types';
import { buildShareModel, type ShareVariant } from '../utils/shareCard';
import { teamAccent, rgba } from '../utils/teamColors';
import TeamKitChip from './TeamKitChip';

interface Props {
  game: Game;
  events: GameEvent[];
  sport: SportConfig;
  variant: ShareVariant;
  periodLabel?: string;
}

const LOGO_DOTS = ['#2b9ad5', '#ea493c', '#f4c720', '#47b26c'];

// The shareable score artifact. Always dark (it's exported as an image), so it
// uses literal colours rather than theme tokens.
const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard(
  { game, events, sport, variant, periodLabel },
  ref
) {
  const model = buildShareModel(game, events, sport, { variant, periodLabel });
  const isSplit = sport.scoreDisplay === 'split';

  const side = (which: 'home' | 'away') => {
    const isHome = which === 'home';
    const team = isHome ? model.home : model.away;
    const primary = isHome ? game.home_primary : game.away_primary;
    const secondary = isHome ? game.home_secondary : game.away_secondary;
    const accent = teamAccent({ primary, secondary }, true);
    // Accent the leader's score (live or final); when scores are level, accent both.
    const highlight = model.leader === which || model.leader === null;
    const total = isHome ? game.home_score : game.away_score;
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: isHome ? 'flex-start' : 'flex-end' }}>
        <TeamKitChip primary={primary} secondary={secondary} size={34} radius={10} />
        <div className="font-sans" style={{ marginTop: 9, width: '100%', textAlign: isHome ? 'left' : 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 800, fontSize: 13.5, color: '#fff', letterSpacing: '-0.01em' }}>{team.name}</div>
        <div className="font-sans" style={{ marginTop: 2, fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{isHome ? 'Home' : 'Away'}{team.isWinner && !model.isDraw ? ' · Win' : ''}</div>
        <div className="font-score" style={{ marginTop: 8, fontWeight: 700, fontSize: isSplit ? 46 : 62, lineHeight: 0.9, color: highlight ? accent : 'rgba(255,255,255,0.45)', fontVariantNumeric: 'tabular-nums', letterSpacing: isSplit ? 0 : '-0.02em' }}>{team.score}</div>
        {isSplit && <div className="font-sans" style={{ marginTop: 4, fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>{total} pts</div>}
      </div>
    );
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', maxWidth: 440, marginInline: 'auto', borderRadius: 22, overflow: 'hidden', background: '#0A0C10', boxShadow: '0 18px 50px rgba(0,0,0,0.5)', padding: '18px 18px 16px', whiteSpace: 'nowrap' }}>
      <div style={{ position: 'absolute', top: -60, left: -40, width: 200, height: 200, borderRadius: 999, background: rgba(game.home_primary, 0.4), filter: 'blur(60px)' }} />
      <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 999, background: rgba(game.away_primary, 0.4), filter: 'blur(60px)' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <span className="font-sans" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontWeight: 800, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff' }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: model.isLive ? '#FF5A5A' : '#47b26c' }} />
            {model.statusLabel}
          </span>
          <span className="font-sans" style={{ fontWeight: 600, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{model.sport} · {model.dateLabel}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {side('home')}
          <div className="font-score" style={{ fontWeight: 600, fontSize: 22, color: 'rgba(255,255,255,0.3)', alignSelf: 'center', paddingTop: 30 }}>–</div>
          {side('away')}
        </div>
        <div style={{ height: 1, background: 'rgba(255,255,255,0.1)', margin: '16px 0 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ display: 'flex', gap: 2.5 }}>{LOGO_DOTS.map((c) => <span key={c} style={{ width: 5, height: 5, borderRadius: 999, background: c }} />)}</span>
            <span className="font-sans" style={{ fontWeight: 700, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Score Keeper</span>
          </span>
          {/* Shrinkable so a long team name in the caption ellipsises instead of overflowing the nowrap card. */}
          <span className="font-sans" style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right', fontWeight: 600, fontSize: 11.5, color: 'rgba(255,255,255,0.6)' }}>
            {model.resultLabel}
          </span>
        </div>
      </div>
    </div>
  );
});

export default ShareCard;
