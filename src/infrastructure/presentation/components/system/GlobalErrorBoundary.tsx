import React, { ReactNode } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';

interface GlobalErrorBoundaryProps {
  children: ReactNode;
}

const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] h-full w-full bg-background/95 text-foreground p-8">
      <div className="max-w-xl w-full bg-surface border border-danger/30 rounded-lg p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-danger shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>
        <h2 className="text-xl font-bold text-danger mb-4 flex items-center gap-2">
          <span className="animate-pulse">⚠️</span> UI Telemetry Desync
        </h2>
        <p className="text-foreground/80 mb-4 text-sm leading-relaxed">
          The presentation matrix encountered a catastrophic fault. Edge node connections and core backend streams may persist asynchronously.
        </p>
        <div className="bg-background-dark p-4 rounded text-xs font-mono text-warning overflow-auto max-h-48 mb-6 border border-warning/10 shadow-inner">
          {(error as any)?.message || String(error)}
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded text-sm font-medium bg-surface-hover hover:bg-surface border border-foreground/10 transition-colors"
          >
            Purge Cache & Reload
          </button>
          <button
             onClick={resetErrorBoundary}
             className="px-4 py-2 rounded text-sm font-bold bg-danger/80 hover:bg-danger text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:shadow-[0_0_25px_rgba(239,68,68,0.5)]"
          >
            Reinitialize View
          </button>
        </div>
      </div>
    </div>
  );
};

export const GlobalErrorBoundary: React.FC<GlobalErrorBoundaryProps> = ({ children }) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        // E.g., send via standard observability adapter hooks
        console.error('UI Operational Failure:', error, info.componentStack);
      }}
    >
      {children}
    </ErrorBoundary>
  );
};
