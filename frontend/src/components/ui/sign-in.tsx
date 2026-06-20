import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

// --- TYPE DEFINITIONS ---

export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  heroImageSrc?: string;
  testimonials?: Testimonial[];
  error?: string;
  loading?: boolean;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
}

// --- SUB-COMPONENTS ---

const fieldInputClass =
  'w-full min-h-[48px] rounded-xl border border-white/10 bg-white/[0.05] px-5 py-3.5 text-[15px] text-foreground placeholder:text-foreground/30 transition-all duration-200 outline-none focus:border-violet-400/50 focus:bg-violet-500/[0.07] focus:ring-4 focus:ring-violet-500/10';

const Field = ({
  label,
  name,
  type,
  placeholder,
  autoComplete,
  suffix,
}: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  autoComplete?: string;
  suffix?: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={name} className="text-[13px] font-medium text-foreground/60 tracking-wide">
      {label}
    </label>
    <div className="relative">
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${fieldInputClass} ${suffix ? 'pr-12' : ''}`}
      />
      {suffix && (
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {suffix}
        </div>
      )}
    </div>
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
  <div
    className={`animate-testimonial ${delay} flex items-start gap-3 rounded-3xl bg-black/30 backdrop-blur-2xl border border-white/10 p-5 w-64 shadow-2xl`}
  >
    <img
      src={testimonial.avatarSrc}
      className="h-10 w-10 object-cover rounded-2xl flex-shrink-0"
      alt={testimonial.name}
    />
    <div className="text-sm leading-snug min-w-0">
      <p className="font-semibold text-white truncate">{testimonial.name}</p>
      <p className="text-white/50 text-xs truncate">{testimonial.handle}</p>
      <p className="mt-1.5 text-white/75 text-xs leading-relaxed line-clamp-3">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = (
    <>
      Bentornato su{' '}
      <span className="text-violet-400">BackClub</span>
    </>
  ),
  description = 'Accedi al tuo account e continua a gestire il tuo lavoro.',
  heroImageSrc,
  testimonials = [],
  error,
  loading = false,
  onSignIn,
  onResetPassword,
  onCreateAccount,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="h-[100dvh] w-[100dvw] flex flex-col md:flex-row font-sans overflow-hidden">

      {/* ── Left column ── */}
      <section className="flex-1 flex items-center justify-center px-6 py-10 sm:px-10 md:px-14 lg:px-16">
        <div className="w-full max-w-[380px] flex flex-col gap-8">

          {/* Heading */}
          <div className="flex flex-col gap-2">
            <h1 className="animate-element animate-delay-100 text-[2.6rem] font-semibold leading-[1.15] tracking-tight text-foreground">
              {title}
            </h1>
            <p className="animate-element animate-delay-200 text-[15px] text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>

          {/* Form */}
          <form className="flex flex-col gap-5" onSubmit={onSignIn}>

            {/* Email */}
            <div className="animate-element animate-delay-300">
              <Field
                label="Email"
                name="email"
                type="email"
                placeholder="nome@azienda.it"
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="animate-element animate-delay-400">
              <Field
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                suffix={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Nascondi password' : 'Mostra password'}
                    className="text-foreground/35 hover:text-foreground/70 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>

            {/* Remember + forgot */}
            <div className="animate-element animate-delay-500 flex items-center justify-between text-[13px]">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" name="rememberMe" className="custom-checkbox" />
                <span className="text-foreground/60">Ricordami</span>
              </label>
              <a
                href="#"
                onClick={(e) => { e.preventDefault(); onResetPassword?.(); }}
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                Password dimenticata?
              </a>
            </div>

            {/* Error */}
            {error && (
              <div className="animate-element rounded-xl border border-destructive/25 bg-destructive/10 px-5 py-3.5 text-[13px] text-destructive leading-relaxed">
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="animate-element animate-delay-600 mt-1">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-2.5 rounded-full bg-violet-600 px-7 py-3 text-[15px] font-semibold text-white transition-all duration-200 hover:bg-violet-500 hover:gap-4 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_0_1px_rgba(139,92,246,0.35),0_4px_20px_rgba(139,92,246,0.3)]"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Accesso in corso…
                  </>
                ) : (
                  <>
                    Accedi
                    <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer */}
          <p className="animate-element animate-delay-700 text-center text-[13px] text-muted-foreground">
            Non hai ancora un account?{' '}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); onCreateAccount?.(); }}
              className="text-violet-400 hover:text-violet-300 transition-colors font-medium"
            >
              Richiedi accesso
            </a>
          </p>
        </div>
      </section>

      {/* ── Right column: hero + testimonials ── */}
      {heroImageSrc && (
        <section className="hidden md:block flex-1 relative p-4">
          {/* Hero image */}
          <div
            className="animate-slide-right animate-delay-300 absolute inset-4 rounded-3xl bg-cover bg-center overflow-hidden"
            style={{ backgroundImage: `url(${heroImageSrc})` }}
          >
            {/* Subtle bottom gradient so testimonials are readable */}
            <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/60 to-transparent rounded-b-3xl" />
          </div>

          {/* Testimonial cards */}
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 px-8 w-full justify-center">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" />
                </div>
              )}
              {testimonials[2] && (
                <div className="hidden 2xl:flex">
                  <TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
