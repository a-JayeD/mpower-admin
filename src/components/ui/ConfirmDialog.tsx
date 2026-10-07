import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { ConfirmOptions } from '@/hooks/useConfirm';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Field';

export function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', tone = 'default', typeToConfirm, onCancel, onConfirm,
}: ConfirmOptions & { onCancel: () => void; onConfirm: () => void }) {
  const [typed, setTyped] = useState('');
  const blocked = Boolean(typeToConfirm) && typed.trim().toUpperCase() !== typeToConfirm!.toUpperCase();
  return (
    <Modal
      open
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} disabled={blocked}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        {tone === 'danger' && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
        )}
        <div className="space-y-3 text-sm text-slate-600">
          <div>{message}</div>
          {typeToConfirm && (
            <label className="block space-y-1.5">
              <span>Type <strong className="text-ink">{typeToConfirm}</strong> to confirm.</span>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </label>
          )}
        </div>
      </div>
    </Modal>
  );
}
