import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Home,
  Package,
  FileText,
  Briefcase,
  UserCircle,
  DollarSign,
  Phone,
  Calendar,
  HelpCircle,
  Settings,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getClients } from '../../api/clients';
import type { Client } from '../../api/clients';
import { contractsApi } from '../../api/contracts';
import { quotesApi } from '../../api/quotes';
import { leadsApi } from '../../api/leads';
import { priceListApi } from '../../api/priceList';
import type { Contract } from '../../types/sellers';
import type { Quote } from '../../types/sellers';
import type { Lead } from '../../types/sellers';
import type { PriceListItem } from '../../types/sellers';
import './SellerGlobalSearch.css';

const MAX_RESULTS_PER_SECTION = 5;
const DEBOUNCE_MS = 300;

export type SearchResultPage = {
  type: 'page';
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

export type SearchResultClient = {
  type: 'client';
  id: number;
  label: string;
  subtitle?: string;
  path: string;
};

export type SearchResultContract = {
  type: 'contract';
  id: number;
  label: string;
  subtitle?: string;
  path: string;
};

export type SearchResultQuote = {
  type: 'quote';
  id: number;
  label: string;
  subtitle?: string;
  path: string;
};

export type SearchResultLead = {
  type: 'lead';
  id: number;
  label: string;
  subtitle?: string;
  path: string;
};

export type SearchResultPriceItem = {
  type: 'price_item';
  id: number;
  label: string;
  subtitle?: string;
  path: string;
};

export type SearchResultItem =
  | SearchResultPage
  | SearchResultClient
  | SearchResultContract
  | SearchResultQuote
  | SearchResultLead
  | SearchResultPriceItem;

const PAGE_KEYWORDS: Array<{
  path: string;
  label: string;
  keywords: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  { path: '/seller', label: 'Dashboard', keywords: ['dashboard', 'home', 'panoramica', 'riepilogo'], icon: Home },
  { path: '/seller/listini', label: 'Listini', keywords: ['listini', 'listino', 'prezzi', 'prezzo', 'prodotti', 'servizi', 'catalogo'], icon: Package },
  { path: '/seller/preventivi', label: 'Preventivi', keywords: ['preventivi', 'preventivo', 'offerte', 'quote'], icon: FileText },
  { path: '/seller/contratti', label: 'Contratti', keywords: ['contratti', 'contratto'], icon: Briefcase },
  { path: '/seller/clienti', label: 'Clienti', keywords: ['clienti', 'cliente', 'anagrafica', 'aziende'], icon: UserCircle },
  { path: '/seller/commissioni', label: 'Commissioni', keywords: ['commissioni', 'commissione', 'provvigioni', 'fee'], icon: DollarSign },
  { path: '/seller/contatti', label: 'Contatti', keywords: ['contatti', 'contatto', 'leads', 'lead'], icon: Phone },
  { path: '/seller/agenda', label: 'Agenda', keywords: ['agenda', 'calendario', 'appuntamenti'], icon: Calendar },
  { path: '/seller/supporto', label: 'Supporto', keywords: ['supporto', 'assistenza', 'help', 'ticket', 'telefono'], icon: HelpCircle },
  { path: '/seller/impostazioni', label: 'Impostazioni', keywords: ['impostazioni', 'settings', 'configurazione', 'profilo'], icon: Settings },
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

const TYPE_LABEL: Record<string, string> = {
  page: 'Pagina',
  client: 'Cliente',
  contract: 'Contratto',
  quote: 'Preventivo',
  lead: 'Contatto',
  price_item: 'Listino',
};

interface SellerGlobalSearchProps {
  className?: string;
  placeholder?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  autoFocus?: boolean;
  /** @deprecated kept for backward compat */
  resultsPortalRef?: React.RefObject<HTMLDivElement | null>;
}

const SellerGlobalSearch: React.FC<SellerGlobalSearchProps> = ({
  className = '',
  placeholder = 'Cerca...',
  onBlur,
  onFocus,
  autoFocus = false,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sellerId = user?.seller_id;

  const openSpotlight = useCallback(() => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const closeSpotlight = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setHighlightIndex(-1);
    onBlur?.();
  }, [onBlur]);

  /* ⌘K global shortcut */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          closeSpotlight();
        } else {
          openSpotlight();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, openSpotlight, closeSpotlight]);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    const pageResults = matchPage(trimmed);
    const all: SearchResultItem[] = [...pageResults];

    if (trimmed.length < 2 || !sellerId) {
      setResults(all);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [clientsRes, contractsRes, quotesRes, leadsRes, priceRes] = await Promise.allSettled([
        getClients({ seller_id: sellerId, search: trimmed }),
        contractsApi.getAll({ seller_id: sellerId, search: trimmed, per_page: MAX_RESULTS_PER_SECTION }),
        quotesApi.getAll({ seller_id: sellerId, search: trimmed, per_page: MAX_RESULTS_PER_SECTION }),
        leadsApi.getAll({ seller_id: sellerId, search: trimmed, per_page: MAX_RESULTS_PER_SECTION }),
        priceListApi.getAll({ search: trimmed, per_page: MAX_RESULTS_PER_SECTION }),
      ]);

      const clients: Client[] = clientsRes.status === 'fulfilled' ? clientsRes.value : [];
      const contracts: Contract[] = contractsRes.status === 'fulfilled' && contractsRes.value?.data ? contractsRes.value.data : [];
      const quotes: Quote[] = quotesRes.status === 'fulfilled' && quotesRes.value?.data ? quotesRes.value.data : [];
      const leads: Lead[] = leadsRes.status === 'fulfilled' && leadsRes.value?.data ? leadsRes.value.data : [];
      const priceItems: PriceListItem[] = priceRes.status === 'fulfilled' && priceRes.value?.data ? priceRes.value.data : [];

      const clientResults: SearchResultClient[] = (Array.isArray(clients) ? clients : []).slice(0, MAX_RESULTS_PER_SECTION).map((c) => ({
        type: 'client',
        id: c.id,
        label: c.company_name || 'Senza nome',
        subtitle: c.ragione_sociale || c.email || undefined,
        path: `/seller/clienti/${c.id}`,
      }));

      const contractResults: SearchResultContract[] = contracts.slice(0, MAX_RESULTS_PER_SECTION).map((c) => ({
        type: 'contract',
        id: c.id,
        label: c.contract_number || c.title || 'Contratto',
        subtitle: (c.client as any)?.company_name,
        path: `/seller/contratti/${c.id}`,
      }));

      const quoteResults: SearchResultQuote[] = quotes.slice(0, MAX_RESULTS_PER_SECTION).map((q) => ({
        type: 'quote',
        id: q.id,
        label: q.quote_number || q.title || 'Preventivo',
        subtitle: (q.client as any)?.company_name,
        path: `/seller/preventivi/${q.id}`,
      }));

      const leadResults: SearchResultLead[] = leads.slice(0, MAX_RESULTS_PER_SECTION).map((l) => ({
        type: 'lead',
        id: l.id,
        label: l.company_name || 'Contatto',
        subtitle: l.contact_person || undefined,
        path: `/seller/contatti/${l.id}`,
      }));

      const priceItemResults: SearchResultPriceItem[] = priceItems.slice(0, MAX_RESULTS_PER_SECTION).map((p) => ({
        type: 'price_item',
        id: p.id,
        label: p.name,
        subtitle: p.department?.name,
        path: `/seller/listini/${p.id}`,
      }));

      setResults([...all, ...clientResults, ...contractResults, ...quoteResults, ...leadResults, ...priceItemResults]);
    } catch (e) {
      console.error('Seller global search error:', e);
      setResults(all);
    } finally {
      setLoading(false);
    }
  }, [sellerId]);

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

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      navigate(item.path);
      closeSpotlight();
    },
    [navigate, closeSpotlight]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeSpotlight();
        return;
      }
      if (flatResults.length === 0) return;
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
      }
    },
    [flatResults, highlightIndex, handleSelect, closeSpotlight]
  );

  useEffect(() => {
    setHighlightIndex(-1);
  }, [query]);

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => openSpotlight(), 100);
      return () => clearTimeout(t);
    }
  }, [autoFocus, openSpotlight]);

  /* Scroll highlighted item into view */
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex]);

  const getIcon = (item: SearchResultItem) => {
    if (item.type === 'page') {
      const Icon = item.icon;
      return <Icon size={17} />;
    }
    const icons: Record<string, React.ReactNode> = {
      client:     <UserCircle size={17} />,
      contract:   <Briefcase size={17} />,
      quote:      <FileText size={17} />,
      lead:       <Phone size={17} />,
      price_item: <Package size={17} />,
    };
    return icons[item.type] ?? <Search size={17} />;
  };

  const trigger = (
    <div
      className={`seller-global-search-trigger ${className}`}
      onClick={openSpotlight}
      role="button"
      tabIndex={0}
      onFocus={() => { onFocus?.(); }}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openSpotlight(); }}
      aria-label="Apri ricerca (⌘K)"
    >
      <Search size={15} className="seller-global-search-trigger-icon" />
      <span className="seller-global-search-trigger-placeholder">{placeholder}</span>
      <kbd className="seller-global-search-trigger-kbd">⌘K</kbd>
    </div>
  );

  const overlay = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="sgs-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onMouseDown={(e) => { if (e.target === e.currentTarget) closeSpotlight(); }}
        >
          <motion.div
            className="sgs-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Ricerca globale"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] as const }}
          >
            {/* Search input bar */}
            <div className="sgs-input-row">
              <Search size={20} className="sgs-input-icon" />
              <input
                ref={inputRef}
                type="text"
                className="sgs-input"
                placeholder="Cerca in tutto il portale..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-autocomplete="list"
                aria-expanded={flatResults.length > 0}
                aria-controls="sgs-results-list"
                autoComplete="off"
                spellCheck={false}
              />
              {query && (
                <button
                  className="sgs-clear-btn"
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  tabIndex={-1}
                  aria-label="Cancella ricerca"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Results */}
            <div className="sgs-results">
              {loading && flatResults.length === 0 && (
                <div className="sgs-state">
                  <span className="sgs-state-text">Ricerca in corso...</span>
                </div>
              )}

              {!loading && query.trim() && flatResults.length === 0 && (
                <div className="sgs-state">
                  <Search size={28} className="sgs-state-icon" />
                  <span className="sgs-state-text">Nessun risultato per "{query}"</span>
                </div>
              )}

              {!query.trim() && (
                <div className="sgs-state">
                  <Search size={28} className="sgs-state-icon" />
                  <span className="sgs-state-text">Digita per cercare clienti, contratti, preventivi…</span>
                </div>
              )}

              {flatResults.length > 0 && (
                <ul
                  id="sgs-results-list"
                  ref={listRef}
                  className="sgs-list"
                  role="listbox"
                >
                  {flatResults.map((item, index) => {
                    const isHighlighted = index === highlightIndex;
                    const key = item.type === 'page' ? item.id : `${item.type}-${item.id}`;
                    return (
                      <li
                        key={key}
                        role="option"
                        aria-selected={isHighlighted}
                        className={`sgs-item${isHighlighted ? ' sgs-item--active' : ''}${item.type === 'page' ? ' sgs-item--page' : ''}`}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setHighlightIndex(index)}
                      >
                        <span className="sgs-item-icon">{getIcon(item)}</span>
                        <span className="sgs-item-body">
                          <span className="sgs-item-label">{item.label}</span>
                          {item.type !== 'page' && (item as any).subtitle && (
                            <span className="sgs-item-sub">{(item as any).subtitle}</span>
                          )}
                        </span>
                        <span className="sgs-item-type">{TYPE_LABEL[item.type]}</span>
                        <ChevronRight size={14} className="sgs-item-chevron" />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer hint */}
            <div className="sgs-footer">
              <span className="sgs-footer-hint"><kbd>↑↓</kbd> naviga</span>
              <span className="sgs-footer-hint"><kbd>↵</kbd> apri</span>
              <span className="sgs-footer-hint"><kbd>Esc</kbd> chiudi</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {trigger}
      {createPortal(overlay, document.body)}
    </>
  );
};

export default SellerGlobalSearch;
