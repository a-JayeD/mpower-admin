import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { resetPasswordSchema } from '@/lib/validation/schemas';
import { updatePassword } from '@/services/auth';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';

type Values = { password: string; confirm: string };

export function ChangePasswordPanel() {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Values>({ resolver: zodResolver(resetPasswordSchema) });
  const save = useMutation({
    mutationFn: (v: Values) => updatePassword(v.password),
    onSuccess: () => { toast.success('Password changed'); reset({ password: '', confirm: '' }); },
  });
  return (
    <Panel>
      <PanelHeader title="Your password" description="At least 10 characters with a letter and a number." />
      <form onSubmit={handleSubmit((v) => save.mutate(v))} className="grid gap-4 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-5" noValidate>
        <Field label="New password" error={errors.password?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" {...register('password')} />}
        </Field>
        <Field label="Confirm new password" error={errors.confirm?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="password" autoComplete="new-password" {...register('confirm')} />}
        </Field>
        <Button type="submit" variant="secondary" icon={<KeyRound className="h-4 w-4" />} loading={save.isPending}>Change password</Button>
      </form>
    </Panel>
  );
}
