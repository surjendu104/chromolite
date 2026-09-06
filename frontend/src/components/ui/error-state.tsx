import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  technicalDetails?: string | Record<string, unknown>;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'An error occurred',
  message = 'Failed to load data from ChromaDB.',
  technicalDetails,
  onRetry,
  className,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const formattedDetails =
    typeof technicalDetails === 'object'
      ? JSON.stringify(technicalDetails, null, 2)
      : technicalDetails;

  return (
    <div
      className={cn(
        'mx-auto flex max-w-md flex-col items-center justify-center p-8 text-center',
        className,
      )}
    >
      <div className="border-error-border bg-error-subtle text-error mb-3 flex h-8 w-8 items-center justify-center rounded-md border">
        <AlertCircle className="h-4 w-4" />
      </div>

      <h3 className="text-foreground text-[14px] font-semibold tracking-tight">
        {title}
      </h3>

      <p className="text-text-secondary mt-1 text-[13px] leading-normal">
        {message}
      </p>

      {onRetry && (
        <div className="mt-4">
          <Button
            size="sm"
            variant="secondary"
            onClick={onRetry}
            leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            Retry
          </Button>
        </div>
      )}

      {formattedDetails && (
        <div className="mt-4 w-full text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-text-muted hover:text-foreground mx-auto flex items-center gap-1 font-mono text-[11px] transition-colors"
          >
            <span>{showDetails ? 'Hide' : 'View'} technical details</span>
            {showDetails ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>

          {showDetails && (
            <pre className="border-border bg-surface-subtle text-text-secondary mt-2 max-h-36 overflow-y-auto rounded-md border p-2.5 font-mono text-[11px] leading-relaxed break-all whitespace-pre-wrap">
              {formattedDetails}
            </pre>
          )}
        </div>
      )}
    </div>
  );
};
