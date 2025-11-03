import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useFocusTrap, useEscapeKey } from '../useAccessibility';

const FocusTrapHarness: React.FC<{ open: boolean }> = ({ open }) => {
  const trapRef = useFocusTrap(open);
  return (
    <div>
      <button data-testid="before">Before</button>
      {open && (
        <div ref={trapRef} data-testid="dialog">
          <button>First</button>
          <button>Last</button>
        </div>
      )}
      <button data-testid="after">After</button>
    </div>
  );
};

const EscapeHarness: React.FC<{ onEscape: () => void; enabled?: boolean }> = ({
  onEscape,
  enabled = true,
}) => {
  useEscapeKey(onEscape, enabled);
  return <div>escape target</div>;
};

describe('useAccessibility hooks', () => {
  afterEach(() => {
    cleanup();
  });

  describe('useFocusTrap', () => {
    it('focuses the first element when dialog opens and restores previous focus on close', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<FocusTrapHarness open={false} />);

      const beforeButton = screen.getByTestId('before');
      await user.click(beforeButton);
      expect(beforeButton).toHaveFocus();

      rerender(<FocusTrapHarness open />);
      const firstButton = screen.getByText('First');
      await screen.findByText('First');
      expect(firstButton).toHaveFocus();

      await user.keyboard('{Tab}');
      const lastButton = screen.getByText('Last');
      expect(lastButton).toHaveFocus();

      await user.keyboard('{Tab}');
      expect(firstButton).toHaveFocus();

      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(lastButton).toHaveFocus();

      rerender(<FocusTrapHarness open={false} />);
      expect(beforeButton).toHaveFocus();
    });
  });

  describe('useEscapeKey', () => {
    beforeEach(() => {
      cleanup();
    });

    it('invokes callback when Escape is pressed', async () => {
      const user = userEvent.setup();
      const onEscape = vi.fn();

      render(<EscapeHarness onEscape={onEscape} />);

      await user.keyboard('{Escape}');
      expect(onEscape).toHaveBeenCalledTimes(1);
    });

    it('does not fire when disabled', async () => {
      const user = userEvent.setup();
      const onEscape = vi.fn();

      render(<EscapeHarness onEscape={onEscape} enabled={false} />);

      await user.keyboard('{Escape}');
      expect(onEscape).not.toHaveBeenCalled();
    });
  });
});
