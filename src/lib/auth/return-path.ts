// Only known workspace routes are valid post-login destinations.
export function safeReturnPath(value?: string): string {
  if (!value || value.length > 1000 || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/dashboard';
  try {
    const url = new URL(value, 'https://local.invalid');
    if (url.origin !== 'https://local.invalid' || !/^\/(?:dashboard|settings|invitations\/(?:new|[a-zA-Z0-9_-]+\/edit))$/.test(url.pathname)) return '/dashboard';
    return url.pathname + url.search;
  } catch { return '/dashboard'; }
}
