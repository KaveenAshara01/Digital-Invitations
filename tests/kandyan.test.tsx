// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { InvitationRenderer } from '../src/components/templates/invitation-renderer';
import { freshConfiguration, getTemplate } from '../src/lib/templates/registry';

afterEach(cleanup);

test('Kandyan invitations keep Sinhala names editable and display uploaded gallery photos', () => {
  const template = getTemplate('kandyan-vows')!;
  const configuration = freshConfiguration(template);
  configuration.hosts = 'අමායා සහ කවින්';
  render(<InvitationRenderer template={template} configuration={configuration} media={[
    { id: 'one', name: 'Our engagement', mime: 'image/jpeg', url: 'https://example.com/one.jpg' },
    { id: 'two', name: 'Our celebration', mime: 'image/webp', url: 'https://example.com/two.webp' },
  ]}/>);
  expect(screen.getByRole('heading', { name: configuration.hosts })).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Our gallery' })).toBeTruthy();
  expect(screen.getByAltText('Our engagement').getAttribute('src')).toBe('https://example.com/one.jpg');
  expect(screen.getByAltText('Our celebration').getAttribute('loading')).toBe('lazy');
  expect(screen.queryByLabelText('Photo placeholders')).toBeNull();
});
