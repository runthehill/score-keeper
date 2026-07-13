import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ShareCard from './ShareCard';
import { getSportConfig } from '../sports/configs';
import type { Game } from '../types';

const game: Game = {
  id: 'g1', sport: 'hurling', home_team: 'Redbacks', away_team: 'Ballyhale',
  home_score: 5, away_score: 1, status: 'completed',
  started_at: '2026-07-13T12:00:00.000Z', ended_at: null, notes: '',
  home_primary: '#7A1F3D', home_secondary: '#E0A92E', away_primary: '#1E63D6', away_secondary: '#FFFFFF',
};

describe('ShareCard export safety', () => {
  // html-to-image copies each element's computed width onto the clone; without
  // nowrap, re-rendered text wraps (the "1-/02", "FULL/TIME" bug). A poster
  // max-width keeps it from stretching edge-to-edge on desktop and squeezing.
  it('constrains width and forbids text wrapping so the export renders as a poster', () => {
    const { container } = render(
      <ShareCard game={game} events={[]} sport={getSportConfig('hurling')} variant="final" />
    );
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveStyle({ whiteSpace: 'nowrap', maxWidth: '440px' });
  });

  // With the card-wide nowrap, a long team name in the caption must ellipsise
  // rather than overflow and get clipped by the card's overflow:hidden.
  it('lets the footer caption shrink to an ellipsis for long labels', () => {
    render(
      <ShareCard
        game={{ ...game, home_team: 'Ballinascreen Wolfe Tones Hurling Club' }}
        events={[]}
        sport={getSportConfig('hurling')}
        variant="final"
      />
    );
    const caption = screen.getByText(/by 4$/);
    expect(caption).toHaveStyle({ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '0px' });
  });
});
