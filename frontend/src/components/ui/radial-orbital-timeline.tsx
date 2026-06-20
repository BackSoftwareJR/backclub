import { useState, useEffect, useRef, type ElementType, type MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: number;
  title: string;
  date: string;
  content: string;
  category: string;
  icon: ElementType;
  relatedIds: number[];
  status: "completed" | "in-progress" | "pending";
  energy: number;
}

interface RadialOrbitalTimelineProps {
  timelineData: TimelineItem[];
  className?: string;
  centerLabel?: string;
  onActiveChange?: (active: boolean) => void;
}

const STATUS_LABELS: Record<TimelineItem["status"], string> = {
  completed: "consolidato",
  "in-progress": "vivo",
  pending: "aperto",
};

const STATUS_BADGE_STYLES: Record<TimelineItem["status"], string> = {
  completed: "border-[#3D5AFE] bg-[#3D5AFE]/10 text-[#2563EB]",
  "in-progress": "border-[#00C9A7] bg-[#00C9A7]/10 text-[#0D9488]",
  pending: "border-[#E879F9] bg-[#E879F9]/10 text-[#C026D3]",
};

const CARD_CLASS =
  "absolute left-1/2 top-full mt-3 -translate-x-1/2 w-[min(15rem,calc(100vw-3rem))]";

function LiquidGlassCard({
  item,
  timelineData,
  onSelectRelated,
}: {
  item: TimelineItem;
  timelineData: TimelineItem[];
  onSelectRelated: (id: number) => void;
}) {
  return (
    <div
      className="relative w-full"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Arrow pointing up to the pill */}
      <div className="absolute -top-[7px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 rounded-tl-[3px] bg-white border-l border-t border-black/[0.06] shadow-[-2px_-2px_4px_rgba(0,0,0,0.04)] z-10" />

      <div className="relative rounded-[18px] border border-black/[0.07] bg-white overflow-hidden shadow-[0_8px_28px_rgba(0,0,0,0.14),0_2px_6px_rgba(0,0,0,0.06)]">
        {/* Subtle top inner glow */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white to-transparent" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-[3px] text-[10px] font-semibold lowercase border",
                STATUS_BADGE_STYLES[item.status],
              )}
            >
              {STATUS_LABELS[item.status]}
            </span>
            <span className="text-[10px] text-slate-400 lowercase">{item.date}</span>
          </div>

          {/* Title */}
          <h3 className="text-[15px] font-semibold tracking-[-0.03em] lowercase leading-tight text-center bg-gradient-to-r from-[#2979FF] via-[#7C4DFF] to-[#E879F9] bg-clip-text text-transparent">
            {item.title}
          </h3>

          {/* Content */}
          <p className="mt-2.5 text-[12px] leading-[1.65] text-slate-500 line-clamp-3">
            {item.content}
          </p>

          {/* Energy bar */}
          <div className="mt-3.5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-medium text-slate-400 lowercase">intensità</span>
              <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
                {item.energy}%
              </span>
            </div>
            <div className="h-[5px] rounded-full bg-slate-100 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#2979FF] via-[#00B4D8] to-[#FFD166]"
                initial={{ width: 0 }}
                animate={{ width: `${item.energy}%` }}
                transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
              />
            </div>
          </div>

          {/* Related pills */}
          {item.relatedIds.length > 0 && (
            <div className="mt-3.5">
              <p className="text-[10px] font-medium text-slate-400 lowercase mb-2">
                collegamenti
              </p>
              <div className="flex flex-wrap gap-1.5">
                {item.relatedIds.map((relatedId) => {
                  const relatedItem = timelineData.find((i) => i.id === relatedId);
                  const RelIcon = relatedItem?.icon;
                  return (
                    <button
                      key={relatedId}
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-[11px] font-medium lowercase text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 active:scale-95 transition-all duration-150"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectRelated(relatedId);
                      }}
                    >
                      {RelIcon && <RelIcon size={11} strokeWidth={2} className="text-[#E879F9]" />}
                      {relatedItem?.title}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RadialOrbitalTimeline({
  timelineData,
  className,
  centerLabel = "BC",
  onActiveChange,
}: RadialOrbitalTimelineProps) {
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [centerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
  const [orbitRadius, setOrbitRadius] = useState(200);
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const activeItem =
    activeNodeId != null
      ? timelineData.find((item) => item.id === activeNodeId)
      : undefined;

  useEffect(() => {
    onActiveChange?.(activeNodeId != null);
  }, [activeNodeId, onActiveChange]);

  const handleContainerClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current || e.target === orbitRef.current) {
      setExpandedItems({});
      setActiveNodeId(null);
      setAutoRotate(true);
    }
  };

  const activateItem = (id: number) => {
    setExpandedItems(() => {
      const newState: Record<number, boolean> = {};
      newState[id] = true;
      return newState;
    });

    setActiveNodeId(id);
    setAutoRotate(false);

    centerViewOnNode(id);
  };

  const toggleItem = (id: number) => {
    if (activeNodeId === id) {
      setExpandedItems({});
      setActiveNodeId(null);
      setAutoRotate(true);
      return;
    }
    activateItem(id);
  };

  useEffect(() => {
    let rotationTimer: ReturnType<typeof setInterval>;

    if (autoRotate) {
      rotationTimer = setInterval(() => {
        setRotationAngle((prev) => {
          const newAngle = (prev + 0.25) % 360;
          return Number(newAngle.toFixed(3));
        });
      }, 50);
    }

    return () => {
      if (rotationTimer) clearInterval(rotationTimer);
    };
  }, [autoRotate]);

  useEffect(() => {
    const updateRadius = () => {
      const width = window.innerWidth;
      if (width < 480) setOrbitRadius(100);
      else if (width < 768) setOrbitRadius(135);
      else setOrbitRadius(185);
    };

    updateRadius();
    window.addEventListener("resize", updateRadius);
    return () => window.removeEventListener("resize", updateRadius);
  }, []);

  const centerViewOnNode = (nodeId: number) => {
    if (!nodeRefs.current[nodeId]) return;

    const nodeIndex = timelineData.findIndex((item) => item.id === nodeId);
    const totalNodes = timelineData.length;
    const targetAngle = (nodeIndex / totalNodes) * 360;

    setRotationAngle(270 - targetAngle);
  };

  const calculateNodePosition = (index: number, total: number) => {
    const angle = ((index / total) * 360 + rotationAngle) % 360;
    const radius = orbitRadius;
    const radian = (angle * Math.PI) / 180;

    const x = radius * Math.cos(radian) + centerOffset.x;
    const y = radius * Math.sin(radian) + centerOffset.y;

    const zIndex = Math.round(100 + 50 * Math.cos(radian));
    const opacity = Math.max(
      0.45,
      Math.min(1, 0.45 + 0.55 * ((1 + Math.sin(radian)) / 2)),
    );

    return { x, y, zIndex, opacity };
  };

  const getRelatedItems = (itemId: number): number[] => {
    const currentItem = timelineData.find((item) => item.id === itemId);
    return currentItem ? currentItem.relatedIds : [];
  };

  const isRelatedToActive = (itemId: number): boolean => {
    if (!activeNodeId) return false;
    return getRelatedItems(activeNodeId).includes(itemId);
  };

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center overflow-visible",
        className ?? "h-screen bg-black",
      )}
      ref={containerRef}
      onClick={handleContainerClick}
    >
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center px-2 sm:px-4 overflow-visible">
        <div
          className="absolute w-full h-full flex items-center justify-center overflow-visible"
          ref={orbitRef}
          style={{
            perspective: "1000px",
            transform: `translate(${centerOffset.x}px, ${centerOffset.y}px)`,
          }}
        >
          <div className="absolute z-20 flex items-center justify-center">
            <div
              className="absolute rounded-full border border-white/10 bg-white/[0.04]"
              style={{
                width: `${orbitRadius * 2 + 32}px`,
                height: `${orbitRadius * 2 + 32}px`,
              }}
            />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/12 backdrop-blur-xl shadow-[0_0_48px_rgba(255,255,255,0.08),inset_0_1px_0_rgba(255,255,255,0.22)]">
              <span className="text-[15px] font-semibold tracking-[-0.04em] text-white/95">
                {centerLabel}
              </span>
            </div>
          </div>

          {timelineData.map((item, index) => {
            const position = calculateNodePosition(index, timelineData.length);
            const isExpanded = expandedItems[item.id];
            const isRelated = isRelatedToActive(item.id);
            const Icon = item.icon;

            const nodeStyle = {
              transform: `translate(${position.x}px, ${position.y}px)`,
              zIndex: isExpanded ? 300 : position.zIndex,
              opacity: activeItem && !isExpanded && !isRelated ? 0.35 : position.opacity,
            };

            return (
              <div
                key={item.id}
                ref={(el) => {
                  nodeRefs.current[item.id] = el;
                }}
                className="absolute transition-all duration-700 ease-out cursor-pointer"
                style={nodeStyle}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItem(item.id);
                }}
              >
                <div className="relative flex flex-col items-center">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300",
                      isExpanded
                        ? "scale-110 border-white/60 bg-white/92 text-[#2979FF]"
                        : isRelated
                          ? "border-[#E879F9]/45 bg-white/16 text-white"
                          : "border-white/22 bg-white/10 text-white/85 hover:bg-white/16 hover:border-white/35",
                    )}
                  >
                    <Icon size={15} strokeWidth={1.75} />
                  </div>

                  <span
                    className={cn(
                      "mt-2.5 text-[11px] font-medium tracking-[-0.02em] lowercase transition-all duration-300",
                      isExpanded
                        ? "text-white font-semibold"
                        : isRelated
                          ? "text-[#F0ABFC]"
                          : "text-white/55",
                    )}
                  >
                    {item.title}
                  </span>
                </div>

                <AnimatePresence mode="wait">
                  {isExpanded && (
                    <motion.div
                      key={`card-${item.id}`}
                      initial={{ opacity: 0, y: -6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.97 }}
                      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                      className={cn(CARD_CLASS, "pointer-events-auto")}
                    >
                      <LiquidGlassCard
                        item={item}
                        timelineData={timelineData}
                        onSelectRelated={activateItem}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
