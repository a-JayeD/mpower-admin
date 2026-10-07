import { useQuery } from '@tanstack/react-query';
import { getSettings } from '@/services/settings';
import { PageHeader, Panel } from '@/components/ui/Panel';
import { ErrorState, Skeleton } from '@/components/ui/Feedback';
import { SiteSettingsForm } from '@/components/settings/SiteSettingsForm';
import { AdministratorsPanel } from '@/components/settings/AdministratorsPanel';
import { ChangePasswordPanel } from '@/components/settings/ChangePasswordPanel';

export default function SettingsPage() {
  const q = useQuery({ queryKey: ['settings'], queryFn: getSettings, staleTime: 5 * 60_000 });
  return (
    <>
      <PageHeader title="Settings" description="Website details, administrators and your account." />
      <div className="space-y-6">
        {q.isError ? <Panel><ErrorState error={q.error} onRetry={() => q.refetch()} /></Panel>
          : q.isPending ? <Skeleton className="h-96 w-full rounded-xl" />
          : <SiteSettingsForm settings={q.data} />}
        <AdministratorsPanel />
        <ChangePasswordPanel />
      </div>
    </>
  );
}
