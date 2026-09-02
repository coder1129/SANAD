'use client';

import { FileText, Images } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import type { PackageImage } from '@/types/domain';

interface PackageGalleryProps {
  images: PackageImage[];
  packageName: string;
}

export function PackageGallery({ images, packageName }: PackageGalleryProps) {
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
        aria-label={`${packageName} service preview`}
        className="grid aspect-[4/3] place-items-center rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 text-primary-foreground/70"
        role="img"
      >
        <div className="text-center">
          <FileText
            aria-hidden="true"
            className="mx-auto size-16"
            strokeWidth={1}
          />
          <p className="mt-4 text-sm font-semibold">Service preview</p>
        </div>
      </div>
    );
  }

  return (
    <div aria-label={`${packageName} image gallery`}>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-primary-foreground/15 bg-surface-muted shadow-lg">
        <Image
          alt={
            selectedImage.altText ??
            `Professional presentation for ${packageName}`
          }
          className="object-cover"
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
          <span className="absolute top-4 right-4 inline-flex items-center gap-2 rounded-full bg-primary/85 px-3 py-1.5 text-xs font-semibold text-primary-foreground backdrop-blur-sm">
            <Images aria-hidden="true" className="size-3.5" />
            {orderedImages.length} images
          </span>
        ) : null}
      </div>

      {orderedImages.length > 1 ? (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {orderedImages.map((image) => {
            const isSelected = image.id === selectedImage.id;

            return (
              <button
                aria-label={`Show ${image.altText ?? `${packageName} image`}`}
                aria-pressed={isSelected}
                className={cn(
                  'relative aspect-[4/3] overflow-hidden rounded-md border-2 bg-surface-muted transition-colors duration-200',
                  isSelected
                    ? 'border-accent'
                    : 'border-transparent hover:border-primary-foreground/50',
                )}
                key={image.id}
                onClick={() => setSelectedId(image.id)}
                type="button"
              >
                <Image
                  alt=""
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
