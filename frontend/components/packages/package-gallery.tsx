'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import { FileText, Images, Maximize2 } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils/cn';
import type { PackageImage } from '@/types/domain';

interface PackageGalleryProps {
  images: PackageImage[];
  packageName: string;
  variant?: 'default' | 'hero';
  className?: string;
}

export function PackageGallery({
  images,
  packageName,
  variant = 'default',
  className,
}: PackageGalleryProps) {
  const _copy = useCopy();

  const orderedImages = useMemo(
    () =>
      [...images].sort((first, second) => {
        if (first.isPrimary !== second.isPrimary) {
          return first.isPrimary ? -1 : 1;
        }

        return first.displayOrder - second.displayOrder;
      }),
    [images],
  );
  const [selectedId, setSelectedId] = useState<number | null>(
    orderedImages[0]?.id ?? null,
  );
  const selectedImage =
    orderedImages.find((image) => image.id === selectedId) ??
    orderedImages[0] ??
    null;

  if (selectedImage === null) {
    return (
      <div
        aria-label={_copy(`${packageName} service preview`)}
        className={cn(
          'grid aspect-[4/3] place-items-center rounded-xl border text-muted-foreground',
          variant === 'hero'
            ? 'border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground/70'
            : 'border-border bg-surface-muted',
          className,
        )}
        role="img"
      >
        <div className="text-center">
          <FileText
            aria-hidden="true"
            className="mx-auto size-16"
            strokeWidth={1}
          />
          <p className="mt-4 text-sm font-semibold">
            {_copy('Service preview')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      aria-label={_copy(
        `${packageName} image gallery`,
        `معرض صور ${packageName}`,
      )}
      className={className}
    >
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={_copy(
              `Enlarge ${packageName} illustration`,
              `تكبير صورة ${packageName}`,
            )}
            className={cn(
              'group relative block aspect-[4/3] w-full overflow-hidden rounded-xl border shadow-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              variant === 'hero'
                ? 'border-primary-foreground/20 bg-primary-foreground/5 hover:border-accent/60 shadow-[0_12px_32px_rgb(0_0_0_/_0.35)]'
                : 'border-border bg-surface-muted',
            )}
          >
            <Image
              alt={_copy(
                selectedImage.altText ??
                  `Professional presentation for ${packageName}`,
                selectedImage.altText ?? `عرض توضيحي لخدمة ${packageName}`,
              )}
              className={cn(
                'transition-transform duration-500 group-hover:scale-105',
                variant === 'hero' ? 'object-cover' : 'object-contain',
              )}
              fill
              priority
              sizes="(max-width: 1023px) calc(100vw - 2rem), 46vw"
              src={selectedImage.url ?? selectedImage.path}
            />
            <span
              aria-hidden="true"
              className="absolute right-0 bottom-0 h-1 w-1/3 bg-accent"
            />
            {orderedImages.length > 1 ? (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full border border-primary-foreground/20 bg-primary/85 px-3 py-1 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
                <Images aria-hidden="true" className="size-3.5" />
                {orderedImages.length} {_copy('images')}
              </span>
            ) : null}
            <span
              className={cn(
                'absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition-colors',
                variant === 'hero'
                  ? 'border border-primary-foreground/20 bg-primary/90 text-primary-foreground shadow-sm group-hover:border-accent group-hover:bg-accent group-hover:text-accent-foreground'
                  : 'bg-primary text-primary-foreground',
              )}
            >
              <Maximize2 className="size-3.5" aria-hidden="true" />
              {_copy('Enlarge')}
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl">
          <DialogTitle className="pe-10">{_copy(packageName)}</DialogTitle>
          <DialogDescription>
            {_copy(
              'Service illustration. Use Escape or the close button to return to the service.',
            )}
          </DialogDescription>
          <div className="relative h-[65svh] min-h-48 bg-surface-muted">
            <Image
              src={selectedImage.url ?? selectedImage.path}
              alt={_copy(
                selectedImage.altText ?? `${packageName} illustration`,
                selectedImage.altText ?? `صورة توضيحية لخدمة ${packageName}`,
              )}
              fill
              sizes="(max-width: 1023px) 90vw, 960px"
              className="object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {orderedImages.length > 1 ? (
        <div className="mt-3 grid grid-cols-4 gap-2.5">
          {orderedImages.map((image) => {
            const isSelected = image.id === selectedImage.id;

            return (
              <button
                aria-label={_copy(
                  `Show ${image.altText ?? `${packageName} image`}`,
                  `عرض ${image.altText ?? `صورة ${packageName}`}`,
                )}
                aria-pressed={isSelected}
                className={cn(
                  'relative aspect-[4/3] overflow-hidden rounded-lg border-2 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  variant === 'hero'
                    ? isSelected
                      ? 'border-accent shadow-md ring-2 ring-accent/30'
                      : 'border-primary-foreground/20 bg-primary-foreground/5 hover:border-primary-foreground/50'
                    : isSelected
                      ? 'border-accent'
                      : 'border-transparent bg-surface-muted hover:border-secondary',
                )}
                key={image.id}
                onClick={() => setSelectedId(image.id)}
                type="button"
              >
                <Image
                  alt={_copy('')}
                  className="object-cover"
                  fill
                  sizes="9rem"
                  src={image.url ?? image.path}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
