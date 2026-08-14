import { cn } from '../../lib/utils';

export const SectionLabel = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h3
    className={cn(
      'text-muted-foreground text-[11px] font-semibold tracking-wider uppercase',
      className,
    )}
  >
    {children}
  </h3>
);
