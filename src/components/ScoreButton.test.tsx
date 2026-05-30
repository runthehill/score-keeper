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
});
