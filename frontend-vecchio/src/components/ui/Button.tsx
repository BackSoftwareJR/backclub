import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = 'primary', size = 'md', isLoading, children, ...props }, ref) => {
        const variants = {
            primary: 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 border border-transparent',
            secondary: 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 backdrop-blur-sm',
            ghost: 'hover:bg-white/5 text-slate-400 hover:text-slate-200',
            danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20',
        };

        const sizes = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2.5',
            lg: 'px-6 py-3 text-lg',
        };

        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
                    variants[variant],
                    sizes[size],
                    className
                )}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : null}
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button, cn };
