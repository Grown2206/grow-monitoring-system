import React from 'react';

/**
 * Unified Card Component
 * Variants: default, elevated, outlined, glass
 */
const Card = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  hover = false,
  onClick,
  ...props
}) => {
  const baseStyles = 'rounded-xl transition-all duration-200';

  const variants = {
    default: 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
    elevated: 'bg-white dark:bg-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
    outlined: 'bg-transparent border-2 border-gray-200 dark:border-gray-700',
    glass: 'bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50',
    gradient: 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700',
  };

  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const hoverStyles = hover
    ? 'hover:shadow-lg hover:border-emerald-500/50 cursor-pointer'
    : '';

  return (
    <div
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${paddings[padding]}
        ${hoverStyles}
        ${className}
      `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

// Card Header
Card.Header = ({ children, className = '', ...props }) => (
  <div className={`flex items-center justify-between mb-4 ${className}`} {...props}>
    {children}
  </div>
);

// Card Title
Card.Title = ({ children, icon: Icon, className = '', ...props }) => (
  <div className={`flex items-center gap-2 ${className}`} {...props}>
    {Icon && <Icon size={20} className="text-emerald-500" />}
    <h3 className="font-semibold text-gray-900 dark:text-white">{children}</h3>
  </div>
);

// Card Body
Card.Body = ({ children, className = '', ...props }) => (
  <div className={className} {...props}>
    {children}
  </div>
);

// Card Footer
Card.Footer = ({ children, className = '', ...props }) => (
  <div className={`mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 ${className}`} {...props}>
    {children}
  </div>
);

export default Card;
