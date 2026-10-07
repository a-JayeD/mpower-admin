import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { Toggle } from '@/components/ui/Toggle';

/** Labelled switch bound to a boolean form field. */
export function ToggleRow<T extends FieldValues>({ control, name, label, description }: {
  control: Control<T>; name: Path<T>; label: string; description?: string;
}) {
  return (
    <Controller control={control} name={name} render={({ field }) => (
      <div className="flex items-start justify-between gap-3 rounded-md border border-line p-3">
        <div>
          <div className="text-sm font-medium text-ink">{label}</div>
          {description && <div className="text-xs text-slate-500">{description}</div>}
        </div>
        <Toggle checked={Boolean(field.value)} onChange={field.onChange} label={label} />
      </div>
    )} />
  );
}
