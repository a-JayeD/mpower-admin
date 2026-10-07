import { useEffect, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { SiteSettings } from '@/types/database';
import { settingsSchema, type SettingsFormValues } from '@/lib/validation/schemas';
import { saveSettings } from '@/services/settings';
import { publicUrl } from '@/services/storage';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { ImagePicker } from '@/components/ui/ImagePicker';

const KEYS = Object.keys(settingsSchema.shape) as Array<keyof SettingsFormValues>;

function pick(s: SiteSettings): SettingsFormValues {
  const out = {} as Record<string, unknown>;
  for (const k of KEYS) out[k] = s[k] ?? '';
  return out as SettingsFormValues;
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-line px-4 py-5 last:border-0 sm:px-5 lg:grid-cols-3">
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">{children}</div>
    </div>
  );
}

export function SiteSettingsForm({ settings }: { settings: SiteSettings }) {
  const qc = useQueryClient();
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema), defaultValues: pick(settings),
  });
  useEffect(() => { reset(pick(settings)); setLogo(null); setRemoveLogo(false); }, [settings, reset]);

  const save = useMutation({
    mutationFn: (v: SettingsFormValues) => saveSettings(settings, v, logo, removeLogo),
    onSuccess: (s) => {
      toast.success('Settings saved');
      qc.setQueryData(['settings'], s);
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const text = (name: keyof SettingsFormValues, label: string, opts: { bn?: boolean; area?: boolean; type?: string; hint?: string; wide?: boolean } = {}) => (
    <Field label={label} error={errors[name]?.message} hint={opts.hint} lang={opts.bn ? 'bn' : undefined} className={opts.wide ? 'sm:col-span-2' : undefined}>
      {(id, d) => opts.area
        ? <Textarea id={id} aria-describedby={d} rows={2} className={opts.bn ? 'font-bn' : undefined} {...register(name)} />
        : <Input id={id} aria-describedby={d} type={opts.type ?? 'text'} className={opts.bn ? 'font-bn' : undefined} aria-invalid={!!errors[name]} {...register(name)} />}
    </Field>
  );
  const changed = isDirty || !!logo || removeLogo;

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
      <Panel>
        <PanelHeader title="Website settings" description="Shown on the public website. English and Bangla are stored separately."
          actions={<Button type="submit" icon={<Save className="h-4 w-4" />} loading={save.isPending} disabled={!changed}>Save settings</Button>} />
        <Section title="Center identity">
          {text('center_name_en', 'Center name (English)')}
          {text('center_name_bn', 'সেন্টারের নাম (বাংলা)', { bn: true })}
          <div className="sm:col-span-2">
            <ImagePicker label="Logo" shape="square" currentUrl={publicUrl(settings.logo_path)} file={logo} onFile={setLogo}
              removed={removeLogo} onRemove={setRemoveLogo} hint="Square PNG or WebP works best. Resized to 512 px." />
          </div>
        </Section>
        <Section title="Contact details">
          {text('phone', 'Phone', { type: 'tel' })}
          {text('whatsapp', 'WhatsApp number', { type: 'tel', hint: 'Include country code, e.g. 8801712345678' })}
          {text('email', 'Email', { type: 'email', wide: true })}
          {text('address_en', 'Address (English)', { area: true })}
          {text('address_bn', 'ঠিকানা (বাংলা)', { area: true, bn: true })}
          {text('opening_hours_en', 'Opening hours (English)', { area: true, hint: 'e.g. Sat–Thu, 9 am – 6 pm' })}
          {text('opening_hours_bn', 'খোলার সময় (বাংলা)', { area: true, bn: true })}
        </Section>
        <Section title="Links" description="Full links starting with https://">
          {text('facebook_url', 'Facebook page', { type: 'url' })}
          {text('messenger_url', 'Messenger link', { type: 'url' })}
          {text('youtube_url', 'YouTube channel', { type: 'url' })}
          {text('google_maps_url', 'Google Maps link', { type: 'url' })}
        </Section>
        <Section title="Home page">
          {text('hero_title_en', 'Hero title (English)')}
          {text('hero_title_bn', 'হিরো শিরোনাম (বাংলা)', { bn: true })}
          {text('hero_subtitle_en', 'Hero subtitle (English)', { area: true })}
          {text('hero_subtitle_bn', 'হিরো উপশিরোনাম (বাংলা)', { area: true, bn: true })}
          {text('footer_text_en', 'Footer text (English)', { area: true })}
          {text('footer_text_bn', 'ফুটার লেখা (বাংলা)', { area: true, bn: true })}
        </Section>
        <Section title="Course completion warnings" description="When a student has this many classes or fewer remaining, they appear on the dashboard.">
          <Field label="Warn when remaining classes are at most" error={errors.completion_warning_threshold?.message}>
            {(id) => (
              <Select id={id} {...register('completion_warning_threshold')}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            )}
          </Field>
        </Section>
        <div className="flex justify-end border-t border-line bg-slate-50/60 px-5 py-3">
          <Button type="submit" icon={<Save className="h-4 w-4" />} loading={save.isPending} disabled={!changed}>Save settings</Button>
        </div>
      </Panel>
    </form>
  );
}
