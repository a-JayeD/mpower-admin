import { supabase } from '@/lib/supabase';
import type { DashboardSummary } from '@/types/database';
import { todayISO } from '@/utils/format';
import { unwrap } from './base';

/** One RPC call returns everything the dashboard needs. */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return unwrap(await supabase.rpc('dashboard_summary', { p_today: todayISO() })) as DashboardSummary;
}
