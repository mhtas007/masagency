import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "هەڵەیەک ڕوویدا لە کاتی کارکردنی سیستەمەکە.";
      let errorDetails = "";

      try {
        if (this.state.error?.message) {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error && parsedError.error.includes("Missing or insufficient permissions")) {
            errorMessage = "ببورە، تۆ دەسەڵاتی پێویستت نییە بۆ ئەنجامدانی ئەم کردارە.";
            errorDetails = `کردار: ${parsedError.operationType} | شوێن: ${parsedError.path}`;
          } else {
            errorMessage = parsedError.error || errorMessage;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">هەڵەیەک ڕوویدا</h1>
            <p className="text-gray-600 mb-4">{errorMessage}</p>
            {errorDetails && (
              <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg mb-6 text-left" dir="ltr">
                {errorDetails}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium hover:bg-black transition-colors"
            >
              نوێکردنەوەی پەڕە
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
