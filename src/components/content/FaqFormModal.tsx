import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Faq } from '@/types/database';
import { faqSchema, type FaqFormValues } from '@/lib/validation/schemas';
import { saveFaq } from '@/services/content';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { LanguageTabs } from '@/components/ui/LanguageTabs';
import { ToggleRow } from './ToggleRow';

export function FaqFormModal({ open, onClose, item, nextOrder }: { open: boolean; onClose: () => void; item: Faq | null; nextOrder: number }) {
  const qc = useQueryClient();
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm<FaqFormValues>({ resolver: zodResolver(faqSchema) });

  useEffect(() => {
    if (!open) return;
    reset(item ? {
      question_en: item.question_en, question_bn: item.question_bn, answer_en: item.answer_en, answer_bn: item.answer_bn, is_published: item.is_published,
    } : { question_en: '', question_bn: '', answer_en: '', answer_bn: '', is_published: true });
  }, [open, item, reset]);

  const save = useMutation({
    mutationFn: (v: FaqFormValues) => saveFaq(item, v, nextOrder),
    onSuccess: () => { toast.success(item ? 'FAQ updated' : 'FAQ added'); qc.invalidateQueries({ queryKey: ['faqs'] }); onClose(); },
  });

  return (
    <Modal open={open} onClose={onClose} busy={save.isPending} size="lg" title={item ? 'Edit question' : 'New question'}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" form="faq-form" loading={save.isPending}>Save</Button>
      </>}>
      <form id="faq-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-5" noValidate>
        <LanguageTabs
          enHasError={Boolean(errors.question_en || errors.answer_en)} bnHasError={Boolean(errors.question_bn || errors.answer_bn)}
          en={<>
            <Field label="Question" required error={errors.question_en?.message}>
              {(id, d) => <Input id={id} aria-describedby={d} aria-invalid={!!errors.question_en} {...register('question_en')} />}
            </Field>
            <Field label="Answer" error={errors.answer_en?.message}>{(id, d) => <Textarea id={id} aria-describedby={d} rows={5} {...register('answer_en')} />}</Field>
          </>}
          bn={<>
            <Field label="প্রশ্ন" error={errors.question_bn?.message}>{(id, d) => <Input id={id} aria-describedby={d} {...register('question_bn')} />}</Field>
            <Field label="উত্তর" error={errors.answer_bn?.message}>{(id, d) => <Textarea id={id} aria-describedby={d} rows={5} {...register('answer_bn')} />}</Field>
          </>}
        />
        <ToggleRow control={control} name="is_published" label="Published" description="Shown in the FAQ section of the website." />
      </form>
    </Modal>
  );
}
