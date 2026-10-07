import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

const control =
  'w-full rounded-md border border-line bg-white px-3 text-sm text-ink placeholder:text-slate-400 ' +
  'transition-colors focus:border-trace focus:outline-none focus:ring-2 focus:ring-trace/25 ' +
  'disabled:bg-slate-50 disabled:text-slate-500 aria-[invalid=true]:border-red-400';

interface FieldProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
  lang?: string;
}

export function Field({ label, error, hint, required, className, children, lang }: FieldProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('space-y-1.5', className)} lang={lang}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden>*</span>}
      </label>
      {children(id, describedBy)}
      {error ? (
        <p id={`${id}-err`} className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest }, ref,
) {
  return <input ref={ref} className={cn(control, 'h-10', className)} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 4, ...rest }, ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(control, 'py-2 leading-relaxed', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest }, ref,
) {
  return (
    <select ref={ref} className={cn(control, 'h-10 pr-8', className)} {...rest}>
      {children}
    </select>
  );
});

export function Checkbox({ label, description, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; description?: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-white p-3 hover:border-slate-300">
      <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-trace focus:ring-trace" {...rest} />
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
    </label>
  );
}
