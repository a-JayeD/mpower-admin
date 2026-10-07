import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { z } from 'zod';
import { forgotPasswordSchema } from '@/lib/validation/schemas';
import { sendPasswordReset } from '@/services/auth';
import { friendlyError } from '@/utils/errors';
import { Field, Input } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { paths } from '@/routes/paths';
import { AuthShell } from './AuthShell';

type Values = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (v: Values) => {
    setError(null);
    try {
      await sendPasswordReset(v.email);
      setSent(true); // Same message whether or not the email exists.
    } catch (e) {
      setError(friendlyError(e));
    }
  };

  if (sent) {
    return (
      <AuthShell title="Check your email">
        <div className="flex gap-3 rounded-md bg-signal-soft p-3 text-sm text-signal-dark">
          <MailCheck className="h-5 w-5 shrink-0" />
          If that email belongs to an admin, a reset link is on its way. The link works once and expires after an hour.
        </div>
        <Link to={paths.login} className="mt-5 block text-center text-sm text-trace-dark hover:underline">Back to sign in</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" subtitle="Enter your admin email and we will send a reset link.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {error && <div role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Email" error={errors.email?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="email" aria-invalid={!!errors.email} {...register('email')} />}
        </Field>
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Send reset link</Button>
        <Link to={paths.login} className="block text-center text-sm text-trace-dark hover:underline">Back to sign in</Link>
      </form>
    </AuthShell>
  );
}
