import React from 'react';

/**
 * Badge Component
 * For status indicators, counts, labels
 */
const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  pulse = false,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full';

  const variants = {
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    primary: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };

  const dotVariants = {
    default: 'bg-gray-500',
    primary: 'bg-emerald-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    info: 'bg-blue-500',
    purple: 'bg-purple-500',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <span
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {dot && (
        <span className={`
          ${dotSizes[size]}
          ${dotVariants[variant]}
          rounded-full mr-1.5
          ${pulse ? 'animate-pulse' : ''}
        `} />
      )}
      {children}
    </span>
  );
};

// Status Badge with dot indicator
Badge.Status = ({ status, children, ...props }) => {
  const statusVariants = {
    online: 'success',
    offline: 'danger',
    idle: 'warning',
    active: 'primary',
    error: 'danger',
    pending: 'warning',
    success: 'success',
    failed: 'danger',
    skipped: 'warning',
  };

  return (
    <Badge variant={statusVariants[status] || 'default'} dot pulse={status === 'online' || status === 'active'} {...props}>
      {children || status}
    </Badge>
  );
};

export default Badge;
