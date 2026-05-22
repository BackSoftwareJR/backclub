import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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

const PAGE_KEYWORDS: Array<{ path: string; label: string; keywords: string[]; icon: React.ComponentType<{ size?: number; className?: string }> }> = [
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

interface SellerGlobalSearchProps {
  className?: string;
  placeholder?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  /** Quando true, mette il focus sull'input al mount (es. overlay mobile) */
  autoFocus?: boolean;
  /** Se fornito, i risultati vengono renderizzati in questo contenitore (es. in cima alla pagina) */
  resultsPortalRef?: React.RefObject<HTMLDivElement | null>;
}

const SellerGlobalSearch: React.FC<SellerGlobalSearchProps> = ({
  className = '',
  placeholder = 'Cerca qui...',
  onBlur,
  onFocus,
  autoFocus = false,
  resultsPortalRef,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sellerId = user?.seller_id;

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

      setResults([
        ...all,
        ...clientResults,
        ...contractResults,
        ...quoteResults,
        ...leadResults,
        ...priceItemResults,
      ]);
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
  const hasResults = flatResults.length > 0;
  const showDropdown = isOpen && (query.length > 0 || hasResults);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
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
      id="seller-global-search-dropdown"
      ref={dropdownRef}
      className={`seller-global-search-dropdown${resultsPortalRef ? ' seller-global-search-dropdown--top-portal' : ''}`}
      role="listbox"
    >
      {loading && flatResults.length <= matchPage(query).length && (
        <div className="seller-global-search-loading">
          Ricerca in corso...
        </div>
      )}
      {!loading && flatResults.length === 0 && (
        <div className="seller-global-search-empty">
          Nessun risultato per "{query}"
        </div>
      )}
      {flatResults.length > 0 && (
        <ul className="seller-global-search-list" role="listbox">
          {flatResults.map((item, index) => {
            const isHighlighted = index === highlightIndex;
            if (item.type === 'page') {
              const Icon = item.icon;
              return (
                <li
                  key={item.id}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`seller-global-search-item seller-global-search-item-page ${isHighlighted ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <Icon size={18} className="seller-global-search-item-icon" />
                  <span className="seller-global-search-item-label">{item.label}</span>
                  <span className="seller-global-search-item-meta">Pagina</span>
                  <ChevronRight size={14} className="seller-global-search-item-chevron" />
                </li>
              );
            }
            if (item.type === 'client') {
              return (
                <li
                  key={`client-${item.id}`}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`seller-global-search-item ${isHighlighted ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <UserCircle size={18} className="seller-global-search-item-icon" />
                  <div className="seller-global-search-item-text">
                    <span className="seller-global-search-item-label">{item.label}</span>
                    {item.subtitle && (
                      <span className="seller-global-search-item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                  <span className="seller-global-search-item-meta">Cliente</span>
                  <ChevronRight size={14} className="seller-global-search-item-chevron" />
                </li>
              );
            }
            if (item.type === 'contract') {
              return (
                <li
                  key={`contract-${item.id}`}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`seller-global-search-item ${isHighlighted ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <Briefcase size={18} className="seller-global-search-item-icon" />
                  <div className="seller-global-search-item-text">
                    <span className="seller-global-search-item-label">{item.label}</span>
                    {item.subtitle && (
                      <span className="seller-global-search-item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                  <span className="seller-global-search-item-meta">Contratto</span>
                  <ChevronRight size={14} className="seller-global-search-item-chevron" />
                </li>
              );
            }
            if (item.type === 'quote') {
              return (
                <li
                  key={`quote-${item.id}`}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`seller-global-search-item ${isHighlighted ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <FileText size={18} className="seller-global-search-item-icon" />
                  <div className="seller-global-search-item-text">
                    <span className="seller-global-search-item-label">{item.label}</span>
                    {item.subtitle && (
                      <span className="seller-global-search-item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                  <span className="seller-global-search-item-meta">Preventivo</span>
                  <ChevronRight size={14} className="seller-global-search-item-chevron" />
                </li>
              );
            }
            if (item.type === 'lead') {
              return (
                <li
                  key={`lead-${item.id}`}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`seller-global-search-item ${isHighlighted ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <Phone size={18} className="seller-global-search-item-icon" />
                  <div className="seller-global-search-item-text">
                    <span className="seller-global-search-item-label">{item.label}</span>
                    {item.subtitle && (
                      <span className="seller-global-search-item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                  <span className="seller-global-search-item-meta">Contatto</span>
                  <ChevronRight size={14} className="seller-global-search-item-chevron" />
                </li>
              );
            }
            if (item.type === 'price_item') {
              return (
                <li
                  key={`price-${item.id}`}
                  role="option"
                  aria-selected={isHighlighted}
                  className={`seller-global-search-item ${isHighlighted ? 'highlighted' : ''}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <Package size={18} className="seller-global-search-item-icon" />
                  <div className="seller-global-search-item-text">
                    <span className="seller-global-search-item-label">{item.label}</span>
                    {item.subtitle && (
                      <span className="seller-global-search-item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                  <span className="seller-global-search-item-meta">Listino</span>
                  <ChevronRight size={14} className="seller-global-search-item-chevron" />
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
    <div className={`seller-global-search ${className}`}>
      <div
        className="seller-global-search-bar"
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <Search size={16} className="seller-global-search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="seller-global-search-input"
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
          aria-controls="seller-global-search-dropdown"
        />
      </div>

      {usePortal && createPortal(dropdownContent, resultsPortalRef!.current!)}
      {renderInline && dropdownContent}
    </div>
  );
};

export default SellerGlobalSearch;
