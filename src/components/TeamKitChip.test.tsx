import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamKitChip from './TeamKitChip';

describe('TeamKitChip', () => {
  it('renders the chip with a secondary slash overlay', () => {
    render(<TeamKitChip primary="#E03131" secondary="#FFFFFF" />);
    expect(screen.getByTestId('team-kit-chip')).toBeInTheDocument();
    const slash = screen.getByTestId('team-kit-slash');
    expect(slash).toHaveStyle({ clipPath: 'polygon(100% 0, 100% 100%, 38% 100%)' });
  });
});
