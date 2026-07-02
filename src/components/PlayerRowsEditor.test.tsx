import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayerRowsEditor from './PlayerRowsEditor';

const rows = [
  { name: 'Aoife', number: '7' },
  { name: 'Niamh', number: '9' },
];

describe('PlayerRowsEditor', () => {
  it('renders existing rows as editable inputs', () => {
    render(<PlayerRowsEditor players={rows} onChange={() => {}} />);
    expect(screen.getByDisplayValue('Aoife')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Niamh')).toBeInTheDocument();
  });

  it('editing a name calls onChange with the updated row', async () => {
    const onChange = vi.fn();
    render(<PlayerRowsEditor players={rows} onChange={onChange} />);
    await userEvent.setup().type(screen.getByDisplayValue('Aoife'), 'X');
    expect(onChange).toHaveBeenLastCalledWith([{ name: 'AoifeX', number: '7' }, { name: 'Niamh', number: '9' }]);
  });

  it('adds a new row', async () => {
    const onChange = vi.fn();
    render(<PlayerRowsEditor players={rows} onChange={onChange} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('New player name'), 'Roisin');
    await user.type(screen.getByLabelText('New player number'), '12');
    await user.click(screen.getByText('Add'));
    expect(onChange).toHaveBeenLastCalledWith([...rows, { name: 'Roisin', number: '12' }]);
  });

  it('moves a row down', async () => {
    const onChange = vi.fn();
    render(<PlayerRowsEditor players={rows} onChange={onChange} />);
    await userEvent.setup().click(screen.getByLabelText('Move Aoife down'));
    expect(onChange).toHaveBeenLastCalledWith([{ name: 'Niamh', number: '9' }, { name: 'Aoife', number: '7' }]);
  });

  it('disables move-up on the first row and move-down on the last', () => {
    render(<PlayerRowsEditor players={rows} onChange={() => {}} />);
    expect(screen.getByLabelText('Move Aoife up')).toBeDisabled();
    expect(screen.getByLabelText('Move Niamh down')).toBeDisabled();
  });

  it('removes a row', async () => {
    const onChange = vi.fn();
    render(<PlayerRowsEditor players={rows} onChange={onChange} />);
    await userEvent.setup().click(screen.getByLabelText('Remove Aoife'));
    expect(onChange).toHaveBeenLastCalledWith([{ name: 'Niamh', number: '9' }]);
  });

  it('hides remove buttons when allowRemove is false', () => {
    render(<PlayerRowsEditor players={rows} onChange={() => {}} allowRemove={false} />);
    expect(screen.queryByLabelText('Remove Aoife')).not.toBeInTheDocument();
  });

  it('preserves extra fields (e.g. id) when reordering', async () => {
    const onChange = vi.fn();
    const withIds = [{ id: 'a', name: 'Aoife', number: '7' }, { id: 'b', name: 'Niamh', number: '9' }];
    render(<PlayerRowsEditor players={withIds} onChange={onChange} createRow={(name, number) => ({ id: '', name, number })} />);
    await userEvent.setup().click(screen.getByLabelText('Move Aoife down'));
    expect(onChange).toHaveBeenLastCalledWith([{ id: 'b', name: 'Niamh', number: '9' }, { id: 'a', name: 'Aoife', number: '7' }]);
  });
});
