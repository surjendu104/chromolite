import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface CopyButtonProps {
  text: string;
  label?: string;
  showLabel?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export const CopyButton = ({
  text,
  label = 'Copy to clipboard',
  showLabel = false,
  className,
  size = 'md',
}: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={handleCopy}
      className={cn(
        'text-text-muted hover:text-foreground hover:bg-surface-subtle inline-flex cursor-pointer items-center gap-1 rounded-md transition-colors select-none',
        size === 'sm' ? 'p-1 text-[11px]' : 'p-1.5 text-[12px]',
        copied && 'text-success hover:text-success',
        className,
      )}
    >
      <motion.span
        key={copied ? 'check' : 'copy'}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.12 }}
        className="inline-flex items-center justify-center"
      >
        {copied ? (
          <Check className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        ) : (
          <Copy className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
        )}
      </motion.span>
      {showLabel && (
        <span className="font-sans text-[11px]">
          {copied ? 'Copied' : label}
        </span>
      )}
    </button>
  );
};
