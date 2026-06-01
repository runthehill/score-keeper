import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoreButton from './ScoreButton';
import type { ScoringEventConfig } from '../types';

const event: ScoringEventConfig = { type: 'try', label: 'Try', points: 5, icon: '🏉' };

describe('ScoreButton', () => {
  it('renders the label and +points and fires onClick', async () => {
    const onClick = vi.fn();
    render(<ScoreButton event={event} accent="#1E63D6" onClick={onClick} />);
    expect(screen.getByText('Try')).toBeInTheDocument();
    expect(screen.getByText('+5')).toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('renders a 0-point event as a label-only tally (no +N)', () => {
    const wide: ScoringEventConfig = { type: 'wide', label: 'Wide', points: 0, icon: '🚩' };
    const onClick = vi.fn();
    render(<ScoreButton event={wide} accent="#1E63D6" onClick={onClick} />);
    expect(screen.getByText('Wide')).toBeInTheDocument();
    expect(screen.queryByText('+0')).not.toBeInTheDocument();
  });
});
