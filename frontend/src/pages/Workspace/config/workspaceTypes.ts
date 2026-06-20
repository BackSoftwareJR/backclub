import {
  Code,
  Globe,
  Share2,
  Video,
  Brain,
  type LucideIcon,
} from 'lucide-react';
import type { WorkspaceTypeCode } from '../../../types/workspace';

export interface WorkspaceTypeConfig {
  code: WorkspaceTypeCode;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  badge: string;
  isAvailable: boolean;
}

export const WORKSPACE_TYPES: WorkspaceTypeConfig[] = [
  {
    code: 'developer',
    name: 'Frontend Dev',
    description: 'Sviluppo frontend, branch, agenti AI e task su staging.',
    icon: Code,
    color: '#3B82F6',
    badge: 'Disponibile',
    isAvailable: true,
  },
  {
    code: 'organic_web',
    name: 'Organic Web',
    description: 'SEO, contenuti web, posizionamento organico e ottimizzazione siti.',
    icon: Globe,
    color: '#34C759',
    badge: 'In sviluppo',
    isAvailable: true,
  },
  {
    code: 'social_media',
    name: 'Social Media',
    description: 'Pianificazione contenuti, calendario editoriale e gestione social.',
    icon: Share2,
    color: '#FF2D55',
    badge: 'In sviluppo',
    isAvailable: true,
  },
  {
    code: 'video_grafica',
    name: 'Video e Grafica',
    description: 'Produzione video, grafica, motion design e asset multimediali.',
    icon: Video,
    color: '#FF9F0A',
    badge: 'In sviluppo',
    isAvailable: true,
  },
  {
    code: 'intelligence_marketing',
    name: 'Intelligence Marketing',
    description: 'Analisi dati, insight di mercato e strategie marketing data-driven.',
    icon: Brain,
    color: '#5856D6',
    badge: 'In sviluppo',
    isAvailable: true,
  },
];

export const WORKSPACE_TYPE_CODES = WORKSPACE_TYPES.map((t) => t.code);

export function getWorkspaceTypeConfig(code: string | null | undefined): WorkspaceTypeConfig | undefined {
  return WORKSPACE_TYPES.find((t) => t.code === code);
}

export function getWorkspaceHomePath(code: WorkspaceTypeCode): string {
  if (code === 'developer') {
    return '/workspace/developer/progetti';
  }
  return `/workspace/${code}`;
}

export function isDeveloperWorkspace(code: string | null | undefined): boolean {
  return code === 'developer';
}
