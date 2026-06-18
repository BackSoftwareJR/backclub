import { cn } from './Button';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function Logo({ size = 'md', className }: LogoProps) {
    const sizeClasses = {
        sm: 'text-xl',
        md: 'text-2xl',
        lg: 'text-3xl',
    };

    return (
        <div className={cn('flex items-center', className)}>
            <span
                className={cn(
                    'font-bold tracking-tight',
                    sizeClasses[size],
                    'relative inline-block'
                )}
                style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    textShadow: '0 0 40px rgba(102, 126, 234, 0.3)',
                    letterSpacing: '-0.02em',
                }}
            >
                Back Club
            </span>
        </div>
    );
}

