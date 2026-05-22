import React, { createContext, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from './AuthContext';

export interface CrmDepartmentInfo {
  id: number;
  code: string;
  name: string;
  color: string;
  icon: string;
}

interface FreelanceCrmContextValue {
  /** Codice del CRM quando si è in una vista dedicata /freelance/crm/:code */
  crmDepartmentCode: string | null;
  /** Dati del CRM assegnato (se disponibili dall'utente) */
  crmDepartment: CrmDepartmentInfo | null;
  /** True se la vista corrente è filtrata per un singolo CRM */
  isCrmScoped: boolean;
}

const FreelanceCrmContext = createContext<FreelanceCrmContextValue>({
  crmDepartmentCode: null,
  crmDepartment: null,
  isCrmScoped: false,
});

export const FreelanceCrmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();

  const value = useMemo(() => {
    const crmDepartmentCode = code && code.trim() !== '' ? code : null;
    const assigned = (user?.crm_departments || []).find(
      (c) => c.code === crmDepartmentCode
    ) ?? null;
    return {
      crmDepartmentCode,
      crmDepartment: assigned,
      isCrmScoped: Boolean(crmDepartmentCode),
    };
  }, [code, user?.crm_departments]);

  return (
    <FreelanceCrmContext.Provider value={value}>
      {children}
    </FreelanceCrmContext.Provider>
  );
};

export function useFreelanceCrm(): FreelanceCrmContextValue {
  const ctx = useContext(FreelanceCrmContext);
  return ctx;
}

function getItemCrmCode(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const top = o.crmDepartment as { code?: string } | undefined;
  if (top?.code) return top.code;
  const proj = o.project as { crmDepartment?: { code?: string } } | undefined;
  return proj?.crmDepartment?.code ?? null;
}

/** Filtra per codice CRM: supporta sia item.crmDepartment (progetti) sia item.project.crmDepartment (task). */
export function filterByCrmCode<T>(items: T[], crmCode: string | null): T[] {
  if (!crmCode) return items;
  return items.filter((item) => getItemCrmCode(item) === crmCode);
}
