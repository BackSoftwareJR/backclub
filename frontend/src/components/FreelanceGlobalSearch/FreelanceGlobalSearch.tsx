import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Home,
  FolderKanban,
  ListTodo,
  MessageSquare,
  Calendar,
  HelpCircle,
  Bell,
  ClipboardList,
  ChevronRight,
} from 'lucide-react';
import { freelanceApi } from '../../api/freelance';
import type { FreelanceProject, FreelanceTask } from '../../types/freelance';
import './FreelanceGlobalSearch.css';

const MAX_RESULTS_PER_SECTION = 5;
const DEBOUNCE_MS = 300;

export type SearchResultPage = {
  type: 'page';
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export type SearchResultProject = {
  type: 'project';
  id: number;
  label: string;
  subtitle?: string;
  path: string;
};

export type SearchResultTask = {
  type: 'task';
  id: number;
  label: string;
  subtitle?: string;
  path: string;
};

export type FreelanceSearchResultItem =
  | SearchResultPage
  | SearchResultProject
  | SearchResultTask;

const PAGE_KEYWORDS: Array<{
  path: string;
  label: string;
  keywords: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { path: '/freelance', label: 'Dashboard', keywords: ['dashboard', 'home', 'panoramica', 'riepilogo'], icon: Home },
  { path: '/freelance/progetti', label: 'Progetti', keywords: ['progetti', 'progetto', 'project'], icon: FolderKanban },
  { path: '/freelance/task', label: 'Task', keywords: ['task', 'attività', 'incarichi', 'lavoro'], icon: ListTodo },
  { path: '/freelance/richieste', label: 'Richieste', keywords: ['richieste', 'reschedule', 'eliminazione', 'spostamento'], icon: ClipboardList },
  { path: '/freelance/chat', label: 'Chat', keywords: ['chat', 'messaggi', 'conversazioni'], icon: MessageSquare },
  { path: '/freelance/calendario', label: 'Calendario', keywords: ['calendario', 'agenda', 'appuntamenti', 'date'], icon: Calendar },
  { path: '/freelance/supporto', label: 'Supporto', keywords: ['supporto', 'assistenza', 'help', 'ticket', 'telefono'], icon: HelpCircle },
  { path: '/freelance/notifiche', label: 'Notifiche', keywords: ['notifiche', 'avvisi', 'alert'], icon: Bell },
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function matchPage(query: string): SearchResultPage[] {
  const q = normalize(query);
  if (!q) return [];
  return PAGE_KEYWORDS.filter((p) =>
    p.keywords.some((k) => k.includes(q) || q.includes(k))
  ).map((p) => ({
    type: 'page' as const,
    id: p.path,
    label: p.label,
    path: p.path,
    icon: p.icon,
  }));
}

interface FreelanceGlobalSearchProps {
  className?: string;
  placeholder?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  /** Quando true, mette il focus sull'input al mount (es. overlay mobile) */
  autoFocus?: boolean;
  /** Se fornito, i risultati vengono renderizzati in questo contenitore (es. in cima alla pagina) */
  resultsPortalRef?: React.RefObject<HTMLDivElement | null>;
}

const FreelanceGlobalSearch: React.FC<FreelanceGlobalSearchProps> = ({
  className = '',
  placeholder = 'Cerca qui...',
  onBlur,
  onFocus,
  autoFocus = false,
  resultsPortalRef,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FreelanceSearchResultItem[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    const pageResults = matchPage(trimmed);
    const all: FreelanceSearchResultItem[] = [...pageResults];

    if (trimmed.length < 2) {
      setResults(all);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [projectsRes, tasksRes] = await Promise.allSettled([
        freelanceApi.getFreelancerProjects({ search: trimmed, per_page: MAX_RESULTS_PER_SECTION }),
        freelanceApi.getFreelancerTasks({ search: trimmed, per_page: MAX_RESULTS_PER_SECTION }),
      ]);

      const projects: FreelanceProject[] = projectsRes.status === 'fulfilled' ? projectsRes.value : [];
      const tasks: FreelanceTask[] = tasksRes.status === 'fulfilled' ? tasksRes.value : [];

      const projectResults: SearchResultProject[] = projects.slice(0, MAX_RESULTS_PER_SECTION).map((p) => ({
        type: 'project',
        id: p.id,
        label: p.name || 'Senza nome',
        subtitle: (p as any).client?.company_name || (p as any).crmDepartment?.name,
        path: p.is_project_manager ? `/freelance/progetti/${p.id}/gestione` : `/freelance/progetti/${p.id}`,
      }));

      const taskResults: SearchResultTask[] = tasks.slice(0, MAX_RESULTS_PER_SECTION).map((t) => ({
        type: 'task',
        id: t.id,
        label: t.title || 'Task',
        subtitle: (t as any).project?.name,
        path: `/freelance/task/${t.id}`,
      }));

      setResults([...all, ...projectResults, ...taskResults]);
    } catch (e) {
      console.error('Freelance global search error:', e);
      setResults(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults(matchPage(query));
      setLoading(false);
      setHighlightIndex(-1);
      return;
    }
    setResults(matchPage(query));
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      runSearch(query);
      debounceRef.current = null;
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const flatResults = useMemo(() => results, [results]);
  const hasResults = flatResults.length > 0;
  const showDropdown = isOpen && (query.length > 0 || hasResults);

  const handleSelect = useCallback(
    (item: FreelanceSearchResultItem) => {
      navigate(item.path);
      setQuery('');
      setIsOpen(false);
      setHighlightIndex(-1);
      inputRef.current?.blur();
    },
    [navigate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showDropdown || flatResults.length === 0) {
        if (e.key === 'Escape') {
          setIsOpen(false);
          setHighlightIndex(-1);
        }
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((i) => (i < flatResults.length - 1 ? i + 1 : 0));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((i) => (i > 0 ? i - 1 : flatResults.length - 1));
        return;
      }
      if (e.key === 'Enter' && highlightIndex >= 0 && flatResults[highlightIndex]) {
        e.preventDefault();
        handleSelect(flatResults[highlightIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setHighlightIndex(-1);
      }
    },
    [showDropdown, flatResults, highlightIndex, handleSelect]
  );

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current?.contains(target) ||
        inputRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropdownContent = (
    <div
      id="freelance-global-search-dropdown"
      ref={dropdownRef}
      className={`freelance-global-search-dropdown${resultsPortalRef ? ' freelance-global-search-dropdown--top-portal' : ''}`}
      role="listbox"
    >
      {loading && flatResults.length <= matchPage(query).length && (
        <div className="freelance-global-search-loading">
          Ricerca in corso...
        </div>
      )}
      {!loading && flatResults.length === 0 && (
        <div className="freelance-global-search-empty">
          Nessun risultato per "{query}"
        </div>
      )}
      {flatResults.length > 0 && (
        <ul className="freelance-global-search-list" role="listbox">
          {flatResults.map((item, index) => {
            const isHighlighted = index === highlightIndex;
            if (item.type === 'page') {
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`freelance-global-search-item freelance-global-search-item-page ${isHighlighted ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <Icon size={18} className="freelance-global-search-item-icon" />
                  <span className="freelance-global-search-item-label">{item.label}</span>
                  <span className="freelance-global-search-item-meta">Pagina</span>
                  <ChevronRight size={14} className="freelance-global-search-item-chevron" />
                </li>
              );
            }
            if (item.type === 'project') {
              return (
                <li
                  key={`project-${item.id}`}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`freelance-global-search-item ${isHighlighted ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <FolderKanban size={18} className="freelance-global-search-item-icon" />
                  <div className="freelance-global-search-item-text">
                    <span className="freelance-global-search-item-label">{item.label}</span>
                    {item.subtitle && (
                      <span className="freelance-global-search-item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                  <span className="freelance-global-search-item-meta">Progetto</span>
                  <ChevronRight size={14} className="freelance-global-search-item-chevron" />
                </li>
              );
            }
            if (item.type === 'task') {
              return (
                <li
                  key={`task-${item.id}`}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`freelance-global-search-item ${isHighlighted ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <ListTodo size={18} className="freelance-global-search-item-icon" />
                  <div className="freelance-global-search-item-text">
                    <span className="freelance-global-search-item-label">{item.label}</span>
                    {item.subtitle && (
                      <span className="freelance-global-search-item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                  <span className="freelance-global-search-item-meta">Task</span>
                  <ChevronRight size={14} className="freelance-global-search-item-chevron" />
                </li>
              );
            }
            return null;
          })}
        </ul>
      )}
    </div>
  );

  const usePortal = Boolean(resultsPortalRef?.current && showDropdown);
  const renderInline = showDropdown && !resultsPortalRef;

  return (
    <div className={`freelance-global-search ${className}`}>
      <div
        className="freelance-global-search-bar"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search size={16} className="freelance-global-search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="freelance-global-search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsOpen(true);
            onFocus?.();
          }}
          onBlur={() => onBlur?.()}
          onKeyDown={handleKeyDown}
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="freelance-global-search-dropdown"
        />
      </div>

      {usePortal && createPortal(dropdownContent, resultsPortalRef!.current!)}
      {renderInline && dropdownContent}
    </div>
  );
};

export default FreelanceGlobalSearch;
