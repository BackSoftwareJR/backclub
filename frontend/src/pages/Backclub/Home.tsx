import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SparklesCore } from '@/components/ui/sparkles';
import { LiquidButton } from '@/components/ui/liquid-glass-button';

const Home = () => {
  return (
    <section
      className="min-h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden px-4"
      aria-label="Hero"
    >
      <h1 className="md:text-7xl text-3xl lg:text-9xl font-bold text-center text-white relative z-20 tracking-tight">
        BackClub
      </h1>

      <div className="relative z-20 w-full max-w-[40rem] flex flex-col items-center mt-10 sm:mt-14 md:mt-16">
        {/* Linea blu centrata sotto il titolo */}
        <div
          className="relative w-[75%] max-w-md h-4 shrink-0"
          aria-hidden="true"
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2">
            <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent blur-sm" />
            <div className="h-px w-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          </div>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1/4">
            <div className="h-[5px] w-full bg-gradient-to-r from-transparent via-sky-500 to-transparent blur-sm" />
            <div className="h-px w-full bg-gradient-to-r from-transparent via-sky-500 to-transparent" />
          </div>
        </div>

        {/* Particelle + accedi appena sopra i puntini */}
        <div className="relative w-full h-36 sm:h-44 md:h-48 mt-10 sm:mt-12 md:mt-14">
          <SparklesCore
            background="transparent"
            minSize={0.4}
            maxSize={1}
            particleDensity={1200}
            className="absolute inset-0 w-full h-full"
            particleColor="#FFFFFF"
          />
          <div className="absolute inset-0 w-full h-full bg-black [mask-image:radial-gradient(350px_200px_at_top,transparent_20%,white)]" />

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              duration: 0.9,
              delay: 0.45,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="absolute left-1/2 -translate-x-1/2 z-20 bottom-[42%] sm:bottom-[40%] md:bottom-[38%]"
          >
            <LiquidButton
              asChild
              size="lg"
              className="text-white text-sm sm:text-base font-normal tracking-[-0.01em] lowercase min-w-[8.5rem] sm:min-w-[9rem]"
            >
              <Link to="/login">accedi</Link>
            </LiquidButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Home;
