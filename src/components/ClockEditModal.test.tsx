import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClockEditModal from './ClockEditModal';

describe('ClockEditModal', () => {
  it('pre-fills mm:ss from initialSeconds and returns total seconds on Set', async () => {
    const user = userEvent.setup();
    const onSet = vi.fn();
    render(<ClockEditModal initialSeconds={125} onSet={onSet} onClose={() => {}} />);

    const mins = screen.getByLabelText('Minutes') as HTMLInputElement;
    const secs = screen.getByLabelText('Seconds') as HTMLInputElement;
    expect(mins.value).toBe('2');
    expect(secs.value).toBe('5');

    await user.clear(mins);
    await user.type(mins, '12');
    await user.clear(secs);
    await user.type(secs, '30');
    await user.click(screen.getByRole('button', { name: 'Set' }));

    expect(onSet).toHaveBeenCalledWith(750);
  });

  it('clamps seconds into 0-59 and ignores negatives', async () => {
    const user = userEvent.setup();
    const onSet = vi.fn();
    render(<ClockEditModal initialSeconds={0} onSet={onSet} onClose={() => {}} />);
    await user.clear(screen.getByLabelText('Minutes'));
    await user.type(screen.getByLabelText('Minutes'), '5');
    await user.clear(screen.getByLabelText('Seconds'));
    await user.type(screen.getByLabelText('Seconds'), '90');
    await user.click(screen.getByRole('button', { name: 'Set' }));
    expect(onSet).toHaveBeenCalledWith(5 * 60 + 59);
  });
});
