import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScoreButton from './ScoreButton';
import type { ScoringEventConfig } from '../types';

const twoPointer: ScoringEventConfig = {
  type: 'two_pointer',
  label: 'Two-Pointer',
  points: 2,
  icon: '🟠',
  color: '#f97316',
};

describe('ScoreButton', () => {
  it('renders the label and points', () => {
    render(<ScoreButton event={twoPointer} team="home" onClick={() => {}} />);
    expect(screen.getByText('Two-Pointer')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('renders a flag-coloured dot when the event has a colour', () => {
    render(<ScoreButton event={twoPointer} team="home" onClick={() => {}} />);
    const dot = screen.getByText('●');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveStyle({ color: '#f97316' });
  });

  it('renders no dot when the event has no colour', () => {
    const noColour: ScoringEventConfig = {
      type: 'try',
      label: 'Try',
      points: 5,
      icon: '🏉',
    };
    render(<ScoreButton event={noColour} team="away" onClick={() => {}} />);
    expect(screen.queryByText('●')).not.toBeInTheDocument();
  });

  it('calls onClick when pressed', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ScoreButton event={twoPointer} team="home" onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
