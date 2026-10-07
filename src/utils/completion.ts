import type { Tone } from '@/components/ui/Badge';

/**
 * Remaining-class wording from the spec:
 *   >threshold normal · 3 "Course ending soon" · 2 "Only 2 classes remaining"
 *   1 "Final class remaining" · 0 "Course completed"
 */
export function remainingStatus(remaining: number, threshold = 3): { label: string; tone: Tone; level: 'normal' | 'soon' | 'urgent' | 'done' } {
  if (remaining <= 0) return { label: 'Course completed', tone: 'trace', level: 'done' };
  if (remaining === 1) return { label: 'Final class remaining', tone: 'red', level: 'urgent' };
  if (remaining === 2) return { label: 'Only 2 classes remaining', tone: 'amber', level: 'urgent' };
  if (remaining <= threshold) return { label: 'Course ending soon', tone: 'amber', level: 'soon' };
  return { label: `${remaining} classes remaining`, tone: 'neutral', level: 'normal' };
}
