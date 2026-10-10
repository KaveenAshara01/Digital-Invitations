import { AuthForm } from '@/components/auth-form';
import { safeReturnPath } from '@/lib/auth/return-path';
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) { return <AuthForm mode="login" nextPath={safeReturnPath((await searchParams).next)}/>; }
