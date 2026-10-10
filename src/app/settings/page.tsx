import { requireUser } from '@/lib/auth/server';
import { AccountForm } from '@/components/account-form';
export const dynamic = 'force-dynamic';
export default async function Settings() {
  const user = await requireUser('/settings');
  return <div className="mx-auto max-w-lg px-6 py-12"><h1 className="text-4xl">Account settings</h1><p className="my-6 text-sm text-ink/70">Signed in as {user.email}</p><AccountForm name={user.name}/></div>;
}
