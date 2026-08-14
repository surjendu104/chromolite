import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export const CopyButton = ({
  text,
  label,
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      aria-label={label ?? 'Copy to clipboard'}
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        'text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-1 rounded-md p-1 transition-colors',
        copied && 'text-success',
        className,
      )}
    >
      <motion.span
        key={copied ? 'check' : 'copy'}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.12 }}
        className="inline-flex"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </motion.span>
    </button>
  );
};
