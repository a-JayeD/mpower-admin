import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { resetPasswordSchema } from '@/lib/validation/schemas';
import { updatePassword } from '@/services/auth';
import { useAuth } from '@/hooks/useAuth';
import { friendlyError } from '@/utils/errors';
import { Field, Input } from '@/components/ui/Field';
import { Button, buttonStyles } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Feedback';
import { paths } from '@/routes/paths';
import { AuthShell } from './AuthShell';

type Values = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const { state, refresh } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(resetPasswordSchema) });

  if (state.status === 'loading') return <div className="tech-grid min-h-screen"><Spinner label="Verifying link" /></div>;

  if (state.status === 'signed-out') {
    return (
      <AuthShell title="Link expired" subtitle="This reset link is invalid or has already been used.">
        <Link to={paths.forgotPassword} className={buttonStyles('primary', 'md', 'w-full')}>Request a new link</Link>
      </AuthShell>
    );
  }

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      await updatePassword(v.password);
      toast.success('Password updated');
      await refresh();
      nav(paths.dashboard, { replace: true });
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  return (
    <AuthShell title="Choose a new password" subtitle="At least 10 characters, with letters and numbers.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="New password" error={errors.password?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" aria-invalid={!!errors.password} {...register('password')} />}
        </Field>
        <Field label="Repeat new password" error={errors.confirm?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" aria-invalid={!!errors.confirm} {...register('confirm')} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Save new password</Button>
      </form>
    </AuthShell>
  );
}
