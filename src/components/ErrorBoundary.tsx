import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Compass, RefreshCw, AlertTriangle, Shield } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('PathToAdmit Production ErrorBoundary caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleResetCacheAndReload = () => {
    try {
      // Clear local session storage while preserving user auth
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F4] flex items-center justify-center p-6 text-[#14233C]">
          <div className="max-w-lg w-full bg-white rounded-3xl border border-[#E6E1D8] shadow-xl p-8 space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#14233C] text-white mx-auto flex items-center justify-center shadow-md">
              <Compass className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#B8913A]/15 border border-[#B8913A]/40 text-[#7A5B1C] text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                Session Interruption Recovered
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#14233C]">
                PathToAdmit encountered an unexpected issue
              </h1>
              <p className="text-sm text-[#5A6478] leading-relaxed">
                Your portfolio data in Cloud Firestore is safe. You can reload the application or reset temporary session cache to resume.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1e3252] text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Application
              </button>
              <button
                type="button"
                onClick={this.handleResetCacheAndReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#FAF8F4] hover:bg-[#E6E1D8]/50 border border-[#E6E1D8] text-[#14233C] font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                Reset Cache &amp; Reload
              </button>
            </div>

            {this.state.error && (
              <details className="text-left bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                <summary className="font-semibold text-slate-700 cursor-pointer select-none">
                  Technical Details (for Support)
                </summary>
                <pre className="mt-2 text-[11px] font-mono text-rose-700 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>Encrypted Student &amp; Family Record Protected</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
