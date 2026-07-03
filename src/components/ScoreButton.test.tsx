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

  const missable: ScoringEventConfig = {
    type: 'field_goal', label: '2PT', points: 2, icon: '🏀',
    miss: { type: 'field_goal_miss', label: 'Missed 2PT' },
  };

  it('renders a miss strip and fires onMiss (not onClick) when the strip is tapped', async () => {
    const onClick = vi.fn();
    const onMiss = vi.fn();
    render(<ScoreButton event={missable} accent="#F25F1F" onClick={onClick} onMiss={onMiss} />);
    await userEvent.setup().click(screen.getByLabelText('Missed 2PT'));
    expect(onMiss).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('fires onClick when the made area is tapped', async () => {
    const onClick = vi.fn();
    const onMiss = vi.fn();
    render(<ScoreButton event={missable} accent="#F25F1F" onClick={onClick} onMiss={onMiss} />);
    await userEvent.setup().click(screen.getByText('2PT'));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onMiss).not.toHaveBeenCalled();
  });

  it('renders no miss strip when the event has no miss descriptor', () => {
    render(<ScoreButton event={event} accent="#1E63D6" onClick={() => {}} />);
    expect(screen.queryByText('✗ miss')).not.toBeInTheDocument();
  });
});
