import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statCardVariants = cva(
  'relative rounded-elegant-lg border bg-white p-4 md:p-5 transition-[box-shadow,transform,background-color] duration-fast ease-elegant',
  {
    variants: {
      theme: {
        matsu: 'border-matsu-100',
        cha: 'border-cha-100',
        ai: 'border-ai-100',
        kohaku: 'border-kohaku-100',
        beni: 'border-beni-100',
        sumi: 'border-gin',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-elegant active:scale-[0.98]',
        false: 'shadow-elegant-sm',
      },
    },
    defaultVariants: {
      theme: 'sumi',
      interactive: false,
    },
  }
);

const iconWrapperVariants = cva(
  'inline-flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg flex-shrink-0',
  {
    variants: {
      theme: {
        matsu: 'bg-matsu-50 text-matsu',
        cha: 'bg-cha-50 text-cha',
        ai: 'bg-ai-50 text-ai',
        kohaku: 'bg-kohaku-50 text-kohaku-dark',
        beni: 'bg-beni-50 text-beni',
        // sumi: bg-kinari はダークでカード背景と同色になるため hai-50 に差し替え
        sumi: 'bg-kinari dark:bg-hai-50 text-sumi',
      },
    },
    defaultVariants: {
      theme: 'sumi',
    },
  }
);

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  label: string;
  value: React.ReactNode;
  unit?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, theme, interactive, label, value, unit, description, icon, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(statCardVariants({ theme, interactive }), className)}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs md:text-sm text-hai truncate">{label}</p>
            <div className="mt-1.5 flex items-baseline gap-1">
              <span className="text-xl md:text-2xl font-semibold text-sumi tabular-nums">
                {value}
              </span>
              {unit && <span className="text-xs md:text-sm text-hai">{unit}</span>}
            </div>
            {description && (
              <p className="mt-1 text-xs text-hai truncate">{description}</p>
            )}
          </div>
          {icon && <div className={cn(iconWrapperVariants({ theme }))}>{icon}</div>}
        </div>
      </div>
    );
  }
);
StatCard.displayName = 'StatCard';

export { StatCard, statCardVariants };
