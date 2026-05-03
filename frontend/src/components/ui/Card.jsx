import React from 'react';

export default function Card({ children, className = '', padding = true, ...props }) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-gray-200 shadow-card
        transition-shadow duration-200 hover:shadow-cardHover
        ${padding ? 'p-4 sm:p-5' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function CardTitle({ children, className = '' }) {
  return <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>{children}</h3>;
}

export function CardContent({ children, className = '' }) {
  return <div className={`text-gray-600 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-2 ${className}`}>
      {children}
    </div>
  );
}
