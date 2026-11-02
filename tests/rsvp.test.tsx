// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RsvpForm } from '../src/components/rsvp-form';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
test('a guest can decline, receives confirmation and can retry a failed update', async () => {
  const request = vi.fn().mockResolvedValueOnce(Response.json({ data: { response: 'DECLINED', attending: 0 } })).mockResolvedValueOnce(Response.json({ error: { message: 'Please wait a minute.' } }, { status: 429 }));
  vi.stubGlobal('fetch', request); const user = userEvent.setup();
  render(<RsvpForm token="secret" name="Guest" partySize={3} initialResponse="PENDING" initialAttending={0} initialNote=""/>);
  await user.selectOptions(screen.getByRole('combobox'), 'DECLINED');
  expect(screen.queryByRole('spinbutton')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Save RSVP' }));
  await waitFor(() => expect(screen.getByRole('status').textContent).toContain('saved'));
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ response: 'DECLINED', attending: 0, note: '' });
  await user.selectOptions(screen.getByRole('combobox'), 'ACCEPTED');
  expect(screen.queryByRole('status')).toBeNull();
  await user.click(screen.getByRole('button', { name: 'Save RSVP' }));
  await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Please wait a minute.'));
  expect((screen.getByRole('button', { name: 'Save RSVP' }) as HTMLButtonElement).disabled).toBe(false);
});
