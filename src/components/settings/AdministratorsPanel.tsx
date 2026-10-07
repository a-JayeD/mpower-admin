import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { Admin, AdminRole } from '@/types/database';
import { grantAdminSchema, type GrantAdminValues } from '@/lib/validation/schemas';
import { grantAdmin, listAdmins, updateAdmin } from '@/services/settings';
import { useAdmin } from '@/hooks/useAuth';
import { useConfirm } from '@/hooks/useConfirm';
import { formatDate } from '@/utils/format';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { Toggle } from '@/components/ui/Toggle';
import { ErrorState, TableSkeleton } from '@/components/ui/Feedback';

export function AdministratorsPanel() {
  const me = useAdmin();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [granting, setGranting] = useState(false);
  const isSuper = me.role === 'super_admin';
  const q = useQuery({ queryKey: ['admins'], queryFn: listAdmins });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: { is_active?: boolean; role?: AdminRole } }) => updateAdmin(id, patch),
    onSuccess: () => { toast.success('Administrator updated'); qc.invalidateQueries({ queryKey: ['admins'] }); },
  });

  const onActive = async (a: Admin, v: boolean) => {
    if (!v && !(await confirm({
      title: `Remove access for ${a.full_name || a.email}?`,
      message: 'They will be signed out of the dashboard and cannot read any private data. You can turn access back on later.',
      confirmLabel: 'Remove access', tone: 'danger',
    }))) return;
    update.mutate({ id: a.id, patch: { is_active: v } });
  };

  return (
    <Panel>
      <PanelHeader title="Administrators" description="Only people listed and active here can open the dashboard."
        actions={isSuper && <Button size="sm" variant="secondary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setGranting(true)}>Add administrator</Button>} />
      {q.isError ? <ErrorState error={q.error} onRetry={() => q.refetch()} />
        : q.isPending ? <TableSkeleton rows={2} cols={2} />
        : (
          <ul className="divide-y divide-line">
            {q.data.map((a) => {
              const self = a.id === me.id;
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-ink">{a.full_name || a.email}</span>
                      {self && <Badge tone="trace">You</Badge>}
                      {!a.is_active && <Badge tone="neutral">No access</Badge>}
                    </div>
                    <div className="truncate text-sm text-slate-500">{a.email} · added {formatDate(a.created_at)}</div>
                  </div>
                  {isSuper && !self ? (
                    <div className="flex items-center gap-3">
                      <Select aria-label="Role" value={a.role} className="h-9 w-36" onChange={(e) => update.mutate({ id: a.id, patch: { role: e.target.value as AdminRole } })}>
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super admin</option>
                      </Select>
                      <Toggle checked={a.is_active} label="Access" onChange={(v) => onActive(a, v)} />
                    </div>
                  ) : (
                    <Badge tone={a.role === 'super_admin' ? 'ink' : 'neutral'}>
                      {a.role === 'super_admin' && <ShieldCheck className="h-3 w-3" />}{a.role === 'super_admin' ? 'Super admin' : 'Admin'}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      <p className="border-t border-line px-4 py-3 text-xs text-slate-500 sm:px-5">
        {isSuper
          ? 'To add someone: first create their login in Supabase → Authentication → Users (“Add user”), then add them here with the same email.'
          : 'Only a super admin can add or remove administrators.'}
      </p>
      <GrantAdminModal open={granting} onClose={() => setGranting(false)} />
    </Panel>
  );
}

function GrantAdminModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<GrantAdminValues>({ resolver: zodResolver(grantAdminSchema) });
  useEffect(() => { if (open) reset({ email: '', full_name: '', role: 'admin' }); }, [open, reset]);
  const save = useMutation({
    mutationFn: grantAdmin,
    onSuccess: (a) => { toast.success(`${a.email} can now sign in to the dashboard`); qc.invalidateQueries({ queryKey: ['admins'] }); onClose(); },
  });
  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} title="Add administrator" size="sm"
      description="The person must already have a login created in Supabase Authentication."
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" form="grant-form" loading={save.isPending}>Give access</Button>
      </>}>
      <form id="grant-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
        <Field label="Email" required error={errors.email?.message}>
          {(id, d) => <Input id={id} aria-describedby={d} type="email" autoComplete="off" aria-invalid={!!errors.email} {...register('email')} />}
        </Field>
        <Field label="Full name" error={errors.full_name?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...register('full_name')} />}</Field>
        <Field label="Role" hint="Super admins can manage other administrators.">
          {(id, d) => (
            <Select id={id} aria-describedby={d} {...register('role')}>
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </Select>
          )}
        </Field>
      </form>
    </Modal>
  );
}
