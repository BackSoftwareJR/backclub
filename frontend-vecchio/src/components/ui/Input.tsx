import { type InputHTMLAttributes, forwardRef } from 'react';
import { cn } from './Button';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, label, error, ...props }, ref) => {
        return (
            <div className="space-y-1.5">
                {label && (
                    <label className="text-sm font-medium text-slate-400 ml-1">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={cn(
                        'flex w-full rounded-xl bg-slate-900/50 border border-slate-800 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200',
                        error && 'border-red-500/50 focus:ring-red-500/50 focus:border-red-500/50',
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-sm text-red-400 ml-1 animate-in slide-in-from-top-1 fade-in">
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
