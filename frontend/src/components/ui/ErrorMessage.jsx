import React from 'react';

export default function ErrorMessage({ message, onDismiss, className = '' }) {
  if (!message) return null;
  return (
    <div
      className={`
        flex items-center justify-between gap-3 px-4 py-3 rounded-lg
        bg-red-50 border border-red-200 text-red-800
        ${className}
      `}
      role="alert"
    >
      <span className="text-sm font-medium">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded hover:bg-red-100 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
