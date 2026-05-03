import React from 'react';

export default function EmptyState({
  icon = '📭',
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center py-12 px-4 text-center
        bg-gray-50 rounded-xl border border-gray-200
        ${className}
      `}
    >
      <span className="text-4xl mb-3 opacity-80" aria-hidden="true">
        {icon}
      </span>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>}
      {description && <p className="text-gray-600 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}
