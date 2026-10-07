import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import { ACCEPT_ATTR, validateImageFile } from '@/utils/image';
import { cn } from '@/utils/cn';
import { toast } from 'sonner';

interface Props {
  label: string;
  currentUrl: string | null;
  file: File | null;
  onFile: (f: File | null) => void;
  removed: boolean;
  onRemove: (removed: boolean) => void;
  shape?: 'wide' | 'square' | 'round';
  hint?: string;
}

/** Pick an image; compression happens in the service at save time. */
export function ImagePicker({ label, currentUrl, file, onFile, removed, onRemove, shape = 'wide', hint }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? (removed ? null : currentUrl);
  const box = { wide: 'aspect-[16/9] w-full max-w-sm rounded-lg', square: 'aspect-square w-32 rounded-lg', round: 'aspect-square w-28 rounded-full' }[shape];

  const pick = async (f: File | undefined) => {
    if (!f) return;
    try {
      await validateImageFile(f);
      onFile(f);
      onRemove(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
    if (input.current) input.current.value = '';
  };

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-end gap-3">
        <button type="button" onClick={() => input.current?.click()}
          className={cn('group relative flex items-center justify-center overflow-hidden border border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-trace hover:text-trace-dark', box)}>
          {shown ? <img src={shown} alt="" className="h-full w-full object-cover" /> : (
            <span className="flex flex-col items-center gap-1 text-xs"><ImagePlus className="h-6 w-6" />Choose image</span>
          )}
          {shown && <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1 text-center text-xs text-white opacity-0 group-hover:opacity-100">Change</span>}
        </button>
        {shown && (
          <button type="button" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600"
            onClick={() => { onFile(null); onRemove(true); }}>
            <Trash2 className="h-4 w-4" /> Remove
          </button>
        )}
      </div>
      <input ref={input} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <p className="text-xs text-slate-500">{hint ?? 'JPG, PNG or WebP. Resized and compressed automatically before upload.'}</p>
    </div>
  );
}
