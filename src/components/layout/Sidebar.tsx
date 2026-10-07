import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen, CalendarCheck, ClipboardList, Database, Gauge, HelpCircle, History, Images,
  Mail, Megaphone, Settings, Star, UserSquare2, Users, X,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { paths } from '@/routes/paths';
import { cn } from '@/utils/cn';
import { getDashboardSummary } from '@/services/dashboard';
import { Brand } from './Brand';

interface Item { to: string; label: string; icon: ComponentType<{ className?: string }>; end?: boolean; badge?: number }

/**
 * The rail: a single PCB trace runs down each group; every page is a node
 * on it and the current page is the lit node.
 */
function NavGroup({ title, items, onNavigate }: { title: string; items: Item[]; onNavigate?: () => void }) {
  return (
    <div className="mb-5">
      <div className="mb-1.5 pl-11 text-xs text-slate-400">{title}</div>
      <ul className="relative">
        <span className="absolute bottom-3 left-[23px] top-3 w-px bg-ink-line" aria-hidden />
        {items.map(({ to, label, icon: Icon, end, badge }) => (
          <li key={to}>
            <NavLink to={to} end={end} onClick={onNavigate}
              className={({ isActive }) => cn(
                'group relative flex h-10 items-center gap-3 rounded-md pl-11 pr-3 text-sm transition-colors',
                isActive ? 'bg-white/[0.06] font-medium text-white' : 'text-slate-300 hover:bg-white/[0.04] hover:text-white',
              )}>
              {({ isActive }) => (
                <>
                  <span aria-hidden className={cn(
                    'absolute left-[20px] top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full border transition-colors',
                    isActive ? 'animate-node-pulse border-trace bg-trace' : 'border-ink-line bg-ink group-hover:border-slate-400',
                  )} />
                  {isActive && <span aria-hidden className="absolute left-[27px] top-1/2 h-px w-3 bg-trace" />}
                  <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-trace' : 'text-slate-400 group-hover:text-slate-200')} />
                  <span className="flex-1 truncate">{label}</span>
                  {!!badge && <span className="rounded-full bg-trace px-1.5 text-[11px] font-semibold text-ink tabular-nums">{badge}</span>}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: getDashboardSummary, staleTime: 60_000 });

  const content = (
    <nav className="flex h-full flex-col bg-ink pcb-rail" aria-label="Main">
      <div className="flex h-16 items-center justify-between px-5">
        <Brand />
        <button className="rounded p-1 text-slate-400 hover:text-white lg:hidden" onClick={onClose} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-4">
        <NavGroup onNavigate={onClose} title="Overview" items={[{ to: paths.dashboard, label: 'Dashboard', icon: Gauge, end: true }]} />
        <NavGroup onNavigate={onClose} title="Training" items={[
          { to: paths.attendance, label: 'Take attendance', icon: CalendarCheck, end: true },
          { to: paths.students, label: 'Students', icon: Users },
          { to: paths.courses, label: 'Courses', icon: BookOpen },
          { to: paths.attendanceHistory, label: 'Attendance history', icon: ClipboardList },
        ]} />
        <NavGroup onNavigate={onClose} title="Website" items={[
          { to: paths.updates, label: 'News & notices', icon: Megaphone },
          { to: paths.gallery, label: 'Gallery', icon: Images },
          { to: paths.instructors, label: 'Instructors', icon: UserSquare2 },
          { to: paths.stories, label: 'Success stories', icon: Star },
          { to: paths.faqs, label: 'FAQs', icon: HelpCircle },
          { to: paths.messages, label: 'Messages', icon: Mail, badge: data?.unread_messages },
        ]} />
        <NavGroup onNavigate={onClose} title="System" items={[
          { to: paths.settings, label: 'Settings', icon: Settings },
          { to: paths.audit, label: 'Activity log', icon: History },
          { to: paths.backup, label: 'Backup & export', icon: Database },
        ]} />
      </div>
    </nav>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">{content}</aside>
      <div className={cn('fixed inset-0 z-40 lg:hidden', open ? 'pointer-events-auto' : 'pointer-events-none')} aria-hidden={!open}>
        <div className={cn('absolute inset-0 bg-ink/60 transition-opacity', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
        <aside className={cn('absolute inset-y-0 left-0 w-72 max-w-[85vw] transition-transform', open ? 'translate-x-0' : '-translate-x-full')}>
          {content}
        </aside>
      </div>
    </>
  );
}
