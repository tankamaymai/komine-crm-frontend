import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const pageSectionVariants = cva('rounded-elegant-lg border border-gin/80 bg-white shadow-elegant-sm', {
  variants: {
    padding: {
      none: '',
      sm: 'p-3 md:p-4',
      default: 'p-4 md:p-6',
      lg: 'p-6 md:p-8',
    },
  },
  defaultVariants: {
    padding: 'default',
  },
});

export interface PageSectionProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'title'>,
    VariantProps<typeof pageSectionVariants> {
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  /** セクションヘッダーの左にブランドカラーの縦線を表示 */
  accent?: 'matsu' | 'cha' | 'ai' | 'kohaku' | 'beni' | false;
}

const ACCENT_CLASS: Record<Exclude<PageSectionProps['accent'], false | undefined>, string> = {
  matsu: 'border-l-matsu',
  cha: 'border-l-cha',
  ai: 'border-l-ai',
  kohaku: 'border-l-kohaku',
  beni: 'border-l-beni',
};

const PageSection = React.forwardRef<HTMLElement, PageSectionProps>(
  ({ className, padding, title, description, icon, action, accent = 'matsu', children, ...props }, ref) => {
    const hasHeader = Boolean(title || description || icon || action);
    return (
      <section
        ref={ref}
        className={cn(pageSectionVariants({ padding }), className)}
        {...props}
      >
        {hasHeader && (
          <header
            className={cn(
              'mb-4 flex items-start justify-between gap-3 pl-3 border-l-4',
              accent ? ACCENT_CLASS[accent] : 'border-l-transparent'
            )}
          >
            <div className="flex items-start gap-2 min-w-0">
              {icon && <div className="mt-0.5 text-matsu flex-shrink-0">{icon}</div>}
              <div className="min-w-0">
                {title && (
                  <h3 className="font-mincho text-base md:text-lg font-semibold text-sumi truncate">
                    {title}
                  </h3>
                )}
                {description && (
                  <p className="text-xs md:text-sm text-hai mt-0.5">{description}</p>
                )}
              </div>
            </div>
            {action && <div className="flex-shrink-0">{action}</div>}
          </header>
        )}
        {children}
      </section>
    );
  }
);
PageSection.displayName = 'PageSection';

export { PageSection, pageSectionVariants };
