import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const principles = [
  {
    title: 'Risposta personale',
    description: 'Ogni messaggio viene letto con attenzione. Nessun bot, nessuna risposta automatica.',
  },
  {
    title: 'Selezione per valori',
    description: 'Se la tua storia rispecchia i nostri valori, ti contatteremo personalmente.',
  },
  {
    title: 'Raccontaci chi sei',
    description: 'Condividi la tua storia o come pensi di contribuire all\u2019ecosistema.',
  },
  {
    title: 'Privacy e discrezione',
    description: 'I tuoi dati sono trattati con massima riservatezza e rispetto.',
  },
  {
    title: 'Tempi di risposta',
    description: 'Valutiamo ogni richiesta con cura. Non dimentichiamo nessuno.',
  },
  {
    title: 'Community esclusiva',
    description: 'Una rete di persone selezionate, ambiziose e allineate ai nostri valori.',
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.25, 0.1, 0.25, 1] as const },
});

const ContattiBackground = () => (
  <div className="fixed inset-0 z-0 bg-black">
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_0%,rgba(88,28,135,0.18),transparent_55%)]" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_100%_100%,rgba(37,99,235,0.10),transparent_50%)]" />
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_45%_35%_at_0%_70%,rgba(139,92,246,0.07),transparent_45%)]" />
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />

    <motion.div
      aria-hidden
      className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-violet-600/[0.07] blur-[120px]"
      animate={{ opacity: [0.4, 0.65, 0.4], scale: [1, 1.06, 1] }}
      transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      aria-hidden
      className="pointer-events-none absolute bottom-0 right-0 h-[320px] w-[320px] translate-x-1/4 translate-y-1/4 rounded-full bg-indigo-500/[0.06] blur-[100px]"
      animate={{ opacity: [0.3, 0.5, 0.3] }}
      transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
    />
  </div>
);

const Contatti = () => {
  return (
    <div className="relative min-h-screen text-white antialiased overflow-x-hidden">
      <ContattiBackground />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-xl flex-col px-6 pb-16 pt-[calc(44px+2.5rem)] sm:px-8">

        <motion.header {...fadeUp(0)} className="mb-10 sm:mb-12 text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-[-0.04em] lowercase text-white/90">
            contatti
          </h1>
          <div className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
        </motion.header>

        {/* CTA — typographic, no icon box */}
        <motion.section {...fadeUp(0.06)} className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">
            scrivici
          </p>

          <a
            href="mailto:info@backclub.it"
            className="mt-3 inline-block text-[1.35rem] sm:text-2xl font-light tracking-[-0.03em] text-white/90 transition-colors hover:text-violet-200"
          >
            info@backclub.it
          </a>

          <p className="mx-auto mt-5 max-w-sm text-[13px] leading-relaxed text-white/45">
            Raccontaci la tua storia o come pensi di contribuire all&rsquo;ecosistema{' '}
            <span className="text-white/65">BackClub</span>.
            Ogni messaggio viene letto con attenzione — non siamo aperti a tutti.
          </p>

          <a
            href="mailto:info@backclub.it"
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-violet-600/90 px-5 py-2.5 text-[13px] font-medium text-white transition-all duration-200 hover:bg-violet-500 hover:gap-2.5 active:scale-[0.98] shadow-[0_0_0_1px_rgba(139,92,246,0.3),0_4px_16px_rgba(139,92,246,0.2)]"
          >
            Scrivici ora
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.5} />
          </a>
        </motion.section>

        <div className="mx-auto my-12 sm:my-14 h-px w-full max-w-[200px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Principles — iOS grouped list, editorial index */}
        <motion.section {...fadeUp(0.12)}>
          <p className="mb-5 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">
            come lavoriamo
          </p>

          <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            {principles.map((item, i) => (
              <motion.article
                key={item.title}
                {...fadeUp(0.16 + i * 0.04)}
                className="group relative px-6 py-5 transition-colors hover:bg-white/[0.025] sm:px-7"
              >
                {i > 0 && (
                  <div
                    aria-hidden
                    className="absolute inset-x-6 top-0 h-px bg-white/[0.06] sm:inset-x-7"
                  />
                )}

                <div className="flex items-start gap-5">
                  <span
                    aria-hidden
                    className="w-6 shrink-0 pt-px tabular-nums text-[11px] font-medium tracking-wide text-white/20 transition-colors group-hover:text-violet-400/50"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-[13px] font-medium tracking-[-0.01em] text-white/80">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-[12px] leading-[1.65] text-white/38">
                      {item.description}
                    </p>
                  </div>

                  <span
                    aria-hidden
                    className="mt-1.5 h-px w-3 shrink-0 bg-gradient-to-r from-violet-400/40 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Contatti;
