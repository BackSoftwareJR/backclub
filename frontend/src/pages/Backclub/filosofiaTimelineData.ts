import {
  Gem,
  HeartHandshake,
  Network,
  PenLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { TimelineItem } from "@/components/ui/radial-orbital-timeline";

type FilosofiaTimelineItem = Omit<TimelineItem, "icon"> & { icon: LucideIcon };

export const filosofiaTimelineData: FilosofiaTimelineItem[] = [
  {
    id: 1,
    title: "sintonia",
    date: "radici",
    content:
      "Non semplici connessioni, ma radici comuni. Ogni progetto digitale nasce dall'armonia tra chi concepisce e chi realizza: competenza tecnica senza sintonia umana non basta.",
    category: "fondamento",
    icon: HeartHandshake,
    relatedIds: [2, 5],
    status: "completed",
    energy: 100,
  },
  {
    id: 2,
    title: "ecosistema",
    date: "metodo",
    content:
      "Backclub non è una piattaforma. È un ecosistema curato dove progetti e persone crescono con la stessa attenzione, senza la fretta che svuota il significato del lavoro.",
    category: "metodo",
    icon: Network,
    relatedIds: [1, 3],
    status: "completed",
    energy: 92,
  },
  {
    id: 3,
    title: "artigianato",
    date: "cura",
    content:
      "La qualità nasce dalla dedizione, non dalla velocità. Artigiani digitali che sanno che ogni riga di codice, ogni pixel e ogni interazione ha un peso preciso.",
    category: "cura",
    icon: PenLine,
    relatedIds: [2, 4],
    status: "in-progress",
    energy: 78,
  },
  {
    id: 4,
    title: "selezione",
    date: "criterio",
    content:
      "Non accettiamo qualsiasi richiesta. Accettiamo solo ciò che può diventare straordinario, perché il tempo di tutti — imprenditori e talenti — è prezioso.",
    category: "criterio",
    icon: Gem,
    relatedIds: [3, 5],
    status: "in-progress",
    energy: 65,
  },
  {
    id: 5,
    title: "visione",
    date: "essenza",
    content:
      "Dove i migliori talenti incontrano imprenditori visionari. Un luogo per progetti unici, curati con dedizione sartoriale fino a diventare opere.",
    category: "essenza",
    icon: Sparkles,
    relatedIds: [1, 4],
    status: "pending",
    energy: 88,
  },
];
