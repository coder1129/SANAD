import Image from 'next/image';

import { cn } from '@/lib/utils/cn';

const logoSizes = {
  sm: 'w-24',
  md: 'w-36',
  lg: 'w-48',
} as const;

export interface BrandLogoProps {
  alt?: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  size?: keyof typeof logoSizes;
}

export function BrandLogo({
  alt = 'SANAD',
  className,
  loading,
  size = 'md',
}: BrandLogoProps) {
  return (
    <Image
      alt={alt}
      className={cn(logoSizes[size], 'max-w-full object-contain', className)}
      height={880}
      loading={loading}
      src="/brand/sanad-logo.jpg"
      style={{ height: 'auto' }}
      unoptimized
      width={1195}
    />
  );
}
