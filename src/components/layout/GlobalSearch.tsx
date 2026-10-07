import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpen, Search, User } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { quickSearchStudents } from '@/services/students';
import { listCourses } from '@/services/courses';
import { paths } from '@/routes/paths';
import { cn } from '@/utils/cn';

/** Find a student (name / phone) or course from anywhere. Press "/" to focus. */
export function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const term = useDebounce(q.trim(), 250);
  const nav = useNavigate();
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const students = useQuery({ queryKey: ['gsearch-students', term], queryFn: () => quickSearchStudents(term), enabled: term.length >= 2 });
  const courses = useQuery({ queryKey: ['gsearch-courses', term], queryFn: () => listCourses({ search: term }), enabled: term.length >= 2 });

  const results = [
    ...(students.data ?? []).map((s) => ({ key: `s${s.id}`, icon: User, label: s.full_name, sub: s.phone, go: () => nav(paths.student(s.id)) })),
    ...(courses.data ?? []).slice(0, 4).map((c) => ({ key: `c${c.id}`, icon: BookOpen, label: c.course_name_en, sub: 'Course', go: () => nav(`${paths.courses}?q=${encodeURIComponent(c.course_name_en)}`) })),
  ];

  useEffect(() => {
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) { e.preventDefault(); inputRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => setCursor(0), [term]);

  const choose = (i: number) => {
    results[i]?.go();
    setOpen(false);
    setQ('');
    inputRef.current?.blur();
  };

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
          if (e.key === 'Enter') choose(cursor);
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Find a student or course" aria-label="Find a student or course" role="combobox" aria-expanded={open && term.length >= 2}
        className="h-10 w-full rounded-md border border-line bg-canvas pl-9 pr-10 text-sm focus:border-trace focus:bg-white focus:outline-none focus:ring-2 focus:ring-trace/25" />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line bg-white px-1.5 text-[11px] text-slate-400 sm:block">/</kbd>
      {open && term.length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-40 overflow-hidden rounded-lg border border-line bg-white shadow-lift" role="listbox">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-500">{students.isFetching || courses.isFetching ? 'Searching…' : `No matches for “${term}”`}</p>
          ) : results.map((r, i) => (
            <button key={r.key} type="button" role="option" aria-selected={i === cursor} onMouseEnter={() => setCursor(i)} onClick={() => choose(i)}
              className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm', i === cursor && 'bg-trace-soft')}>
              <r.icon className="h-4 w-4 text-slate-400" />
              <span className="flex-1 truncate font-medium text-ink">{r.label}</span>
              <span className="text-xs text-slate-500">{r.sub}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
