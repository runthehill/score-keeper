import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ColorKitPicker from './ColorKitPicker';

const value = { primary: '#15171C', secondary: '#FFFFFF' };

describe('ColorKitPicker', () => {
  it('shows the team kit title', () => {
    render(<ColorKitPicker team="Sligo RFC" value={value} onChange={() => {}} onClose={() => {}} />);
    expect(screen.getByText('Sligo RFC kit')).toBeInTheDocument();
  });

  it('selecting a quick kit calls onChange with that kit', async () => {
    const onChange = vi.fn();
    render(<ColorKitPicker team="A" value={value} onChange={onChange} onClose={() => {}} />);
    await userEvent.setup().click(screen.getByText('Crimson'));
    expect(onChange).toHaveBeenCalledWith({ primary: '#E03131', secondary: '#FFFFFF' });
  });

  it('selecting a primary swatch calls onChange with the new primary', async () => {
    const onChange = vi.fn();
    render(<ColorKitPicker team="A" value={value} onChange={onChange} onClose={() => {}} />);
    await userEvent.setup().click(screen.getAllByLabelText('#1E63D6')[0]);
    expect(onChange).toHaveBeenCalledWith({ primary: '#1E63D6', secondary: '#FFFFFF' });
  });

  it('Done calls onClose', async () => {
    const onClose = vi.fn();
    render(<ColorKitPicker team="A" value={value} onChange={() => {}} onClose={onClose} />);
    await userEvent.setup().click(screen.getByText('Done'));
    expect(onClose).toHaveBeenCalled();
  });
});
