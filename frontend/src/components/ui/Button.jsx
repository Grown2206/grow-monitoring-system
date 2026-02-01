import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Unified Button Component
 * Variants: primary, secondary, danger, ghost, success
 * Sizes: sm, md, lg
 */
const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  fullWidth = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 active:bg-emerald-800',
    secondary: 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
    ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:bg-green-800',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 active:bg-amber-700',
    purple: 'bg-purple-600 text-white hover:bg-purple-700 focus:ring-purple-500 active:bg-purple-800',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  return (
    <button
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={iconSizes[size]} className="animate-spin" />
          <span>Laden...</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon size={iconSizes[size]} />}
          {children}
          {Icon && iconPosition === 'right' && <Icon size={iconSizes[size]} />}
        </>
      )}
    </button>
  );
};

export default Button;
