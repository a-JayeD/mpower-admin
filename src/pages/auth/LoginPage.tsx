import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import { loginSchema } from '@/lib/validation/schemas';
import { signIn } from '@/services/auth';
import { friendlyError } from '@/utils/errors';
import { Field, Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { paths } from '@/routes/paths';
import { AuthShell } from './AuthShell';

type Values = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      await signIn(v.email, v.password);
      // AuthProvider + PublicOnlyRoute handle the redirect.
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Use the email and password given to you by the center owner.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Email" error={errors.email?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="username" inputMode="email" aria-invalid={!!errors.email} {...register('email')} />}
        </Field>
        <Field label="Password" error={errors.password?.message}>
          {(id, d) => (
            <div className="relative">
              <Input id={id} aria-describedby={d} type={show ? 'text' : 'password'} autoComplete="current-password" className="pr-10" aria-invalid={!!errors.password} {...register('password')} />
              <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-ink">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Sign in</Button>
        <div className="text-center">
          <Link to={paths.forgotPassword} className="text-sm text-trace-dark hover:underline">Forgot password?</Link>
        </div>
      </form>
    </AuthShell>
  );
}
