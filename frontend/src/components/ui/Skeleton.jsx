import React from 'react';

/**
 * Skeleton Loading Component
 * For loading states before data arrives
 */
const Skeleton = ({
  variant = 'text',
  width,
  height,
  className = '',
  animate = true,
  ...props
}) => {
  const baseStyles = 'bg-gray-200 dark:bg-gray-700 rounded';
  const animationStyles = animate ? 'animate-pulse' : '';

  const variants = {
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    avatar: 'h-10 w-10 rounded-full',
    thumbnail: 'h-24 w-24 rounded-lg',
    card: 'h-32 w-full rounded-xl',
    button: 'h-10 w-24 rounded-lg',
    circle: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  const style = {
    width: width,
    height: height,
  };

  return (
    <div
      className={`
        ${baseStyles}
        ${animationStyles}
        ${variants[variant]}
        ${className}
      `}
      style={style}
      {...props}
    />
  );
};

// Skeleton Group - for complex loading states
Skeleton.Group = ({ children, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {children}
  </div>
);

// Pre-built Skeleton Templates
Skeleton.Card = ({ className = '' }) => (
  <div className={`p-4 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
    <Skeleton.Group>
      <div className="flex items-center gap-3">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="title" width="60%" />
          <Skeleton variant="text" width="40%" />
        </div>
      </div>
      <Skeleton variant="text" />
      <Skeleton variant="text" width="80%" />
    </Skeleton.Group>
  </div>
);

Skeleton.StatCard = ({ className = '' }) => (
  <div className={`p-4 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
    <div className="flex items-center justify-between mb-2">
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="circle" width={32} height={32} />
    </div>
    <Skeleton variant="title" width="50%" className="mb-1" />
    <Skeleton variant="text" width="30%" />
  </div>
);

Skeleton.DeviceCard = ({ className = '' }) => (
  <div className={`p-4 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
    <div className="flex items-center gap-3 mb-3">
      <Skeleton variant="circle" width={40} height={40} />
      <div className="flex-1">
        <Skeleton variant="title" width="60%" className="mb-1" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
    <Skeleton variant="button" width="100%" />
  </div>
);

Skeleton.RuleCard = ({ className = '' }) => (
  <div className={`p-5 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}>
    <div className="flex items-center gap-3 mb-3">
      <Skeleton variant="circle" width={36} height={36} />
      <div className="flex-1">
        <Skeleton variant="title" width="50%" className="mb-1" />
        <Skeleton variant="text" width="70%" />
      </div>
    </div>
    <Skeleton variant="rectangular" height={60} className="mb-3" />
    <div className="flex gap-2">
      <Skeleton variant="button" className="flex-1" />
      <Skeleton variant="button" width={40} />
      <Skeleton variant="button" width={40} />
    </div>
  </div>
);

export default Skeleton;
