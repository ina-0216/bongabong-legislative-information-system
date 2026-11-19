import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Alert, Badge, Button, Input, Modal, Pagination } from './index';

describe('shared UI components', () => {
  it('disables a button while loading', () => {
    render(<Button loading>Saving</Button>);

    expect(screen.getByRole('button', { name: 'Saving' })).toBeDisabled();
  });

  it('connects an input label and error message accessibly', () => {
    render(<Input id="email" label="Email" error="Enter a valid email" />);

    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-error');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
  });

  it('renders a legislative status badge', () => {
    render(<Badge variant="status" status="approved">Approved</Badge>);

    expect(screen.getByText('Approved')).toHaveClass('bg-[var(--ibosys-status-approved-bg)]');
  });

  it('calls the dismiss handler for a dismissible alert', () => {
    const onDismiss = vi.fn();
    render(<Alert dismissible onDismiss={onDismiss} title="Saved">Changes saved</Alert>);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('changes numbered pages without submitting a surrounding form', () => {
    const onPageChange = vi.fn();
    const onSubmit = vi.fn();

    render(
      <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        <Pagination currentPage={1} totalPages={2} onPageChange={onPageChange} />
      </form>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));

    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('exposes a labeled modal and closes it on Escape', () => {
    const onClose = vi.fn();
    render(<Modal isOpen onClose={onClose} title="Confirm change">Continue?</Modal>);

    const dialog = screen.getByRole('dialog', { name: 'Confirm change' });
    expect(dialog).toHaveTextContent('Continue?');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('keeps typing focused when an inline close callback changes on each render', () => {
    const FormModal = () => {
      const [value, setValue] = useState('');

      return (
        <Modal isOpen onClose={() => {}} title="Edit record">
          <input aria-label="Record name" value={value} onChange={(event) => setValue(event.target.value)} />
        </Modal>
      );
    };

    render(<FormModal />);
    const input = screen.getByRole('textbox', { name: 'Record name' });

    expect(input).toHaveFocus();
    let typedValue = '';
    for (const character of 'Test record') {
      typedValue += character;
      fireEvent.change(input, { target: { value: typedValue } });
      expect(input).toHaveFocus();
    }

    expect(input).toHaveValue('Test record');
    expect(input).toHaveFocus();
  });
});
