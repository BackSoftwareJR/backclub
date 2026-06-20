import { useState } from "react";
import { motion } from "framer-motion";
import AnimatedGradientBackground from "@/components/ui/animated-gradient-background";
import RadialOrbitalTimeline from "@/components/ui/radial-orbital-timeline";
import { filosofiaTimelineData } from "./filosofiaTimelineData";
import { cn } from "@/lib/utils";

const Filosofia = () => {
  const [cardOpen, setCardOpen] = useState(false);

  return (
    <div className="relative min-h-screen text-white antialiased overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <AnimatedGradientBackground Breathing startingGap={125} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
        <div
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-700",
            cardOpen
              ? "opacity-100 bg-[radial-gradient(ellipse_80%_60%_at_50%_45%,rgba(41,121,255,0.22),transparent_55%),radial-gradient(ellipse_60%_50%_at_30%_70%,rgba(232,121,249,0.18),transparent_50%),radial-gradient(ellipse_50%_40%_at_70%_75%,rgba(255,209,102,0.12),transparent_45%)]"
              : "opacity-0",
          )}
        />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <header className="px-6 pt-[calc(44px+1.25rem)] pb-4 text-center shrink-0">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-4xl sm:text-5xl font-semibold tracking-[-0.04em] lowercase text-white/90"
          >
            filosofia
          </motion.h1>
        </header>

        <RadialOrbitalTimeline
          timelineData={filosofiaTimelineData}
          centerLabel="BC"
          onActiveChange={setCardOpen}
          className="flex-1 min-h-0 h-[calc(100vh-6.5rem)] pb-6 bg-transparent"
        />
      </div>
    </div>
  );
};

export default Filosofia;
