import React from 'react';

const statusStyles = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  default: 'bg-gray-100 text-gray-700',
};

const roleStyles = {
  admin: 'bg-amber-100 text-amber-800',
  researcher: 'bg-blue-100 text-blue-800',
  participant: 'bg-teal-100 text-teal-800',
};

export default function Badge({
  children,
  variant = 'default',
  status,
  role,
  className = '',
}) {
  const style = status ? statusStyles[status] || statusStyles.default
    : role ? roleStyles[role] || statusStyles.default
    : statusStyles.default;

  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize
        ${style}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
