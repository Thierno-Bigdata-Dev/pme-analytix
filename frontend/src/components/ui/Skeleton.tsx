import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '16px',
  circle = false,
  style,
  ...props
}) => {
  const skeletonStyle: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: circle ? '50%' : '8px',
    background: 'linear-gradient(90deg, #161f30 25%, #25324c 50%, #161f30 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer-loading 1.5s infinite',
    display: 'block',
    boxSizing: 'border-box',
    ...style,
  };

  return (
    <>
      <div style={skeletonStyle} {...props} />
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shimmer-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}} />
    </>
  );
};
