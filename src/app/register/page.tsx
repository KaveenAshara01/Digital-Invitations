import { AuthForm } from '@/components/auth-form';
import { safeReturnPath } from '@/lib/auth/return-path';
export default async function Register({ searchParams }: { searchParams: Promise<{ next?: string }> }) { return <AuthForm mode="register" nextPath={safeReturnPath((await searchParams).next)}/>; }
