import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../select';

describe('Select', () => {
  it('renders options and calls onChange when selecting', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();

    render(
      <Select id="fruit" onChange={handleChange} defaultValue="">
        <option value="">Select a fruit</option>
        <option value="apple">Apple</option>
        <option value="banana">Banana</option>
      </Select>
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('Select a fruit');

    await user.click(trigger);
    const appleOption = await screen.findByRole('option', { name: 'Apple' });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(appleOption).not.toHaveAttribute('title');

    await user.click(screen.getByRole('option', { name: 'Banana' }));

    expect(handleChange).toHaveBeenCalledTimes(1);
    const changeEvent = handleChange.mock.calls[0][0];
    expect(changeEvent.target.value).toBe('banana');
    expect(trigger).toHaveTextContent('Banana');
  });

  it('closes when clicking outside', async () => {
    const user = userEvent.setup();

    render(
      <div>
        <Select id="city">
          <option value="">Select a city</option>
          <option value="paris">Paris</option>
        </Select>
        <button type="button">Outside</button>
      </div>
    );

    const trigger = screen.getByRole('combobox');
    await user.click(trigger);
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

});
