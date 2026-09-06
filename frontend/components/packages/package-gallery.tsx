'use client';

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
        className="grid aspect-[4/3] place-items-center rounded-xl border border-border bg-surface-muted text-muted-foreground"
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
      <Dialog>
        <DialogTrigger asChild>
          <button
            type="button"
            aria-label={`Enlarge ${packageName} illustration`}
            className="relative block aspect-[4/3] w-full overflow-hidden rounded-xl border border-border bg-surface-muted shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Image
              alt={
                selectedImage.altText ??
                `Professional presentation for ${packageName}`
              }
              className="object-contain"
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
            <span className="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">
              <Maximize2 className="size-4" aria-hidden="true" />
              Enlarge
            </span>
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-5xl">
          <DialogTitle className="pr-10">{packageName}</DialogTitle>
          <DialogDescription>
            Service illustration. Use Escape or the close button to return to
            the service.
          </DialogDescription>
          <div className="relative h-[65svh] min-h-48 bg-surface-muted">
            <Image
              src={selectedImage.url ?? selectedImage.path}
              alt={selectedImage.altText ?? `${packageName} illustration`}
              fill
              sizes="(max-width: 1023px) 90vw, 960px"
              className="object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>

      {orderedImages.length > 1 ? (
        <div className="mt-4 grid grid-cols-4 gap-3">
          {orderedImages.map((image) => {
            const isSelected = image.id === selectedImage.id;

            return (
              <button
                aria-label={`Show ${image.altText ?? `${packageName} image`}`}
                aria-pressed={isSelected}
                className={cn(
                  'relative aspect-[4/3] overflow-hidden rounded-md border-2 bg-surface-muted transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected
                    ? 'border-accent'
                    : 'border-transparent hover:border-secondary',
                )}
                key={image.id}
                onClick={() => setSelectedId(image.id)}
                type="button"
              >
                <Image
                  alt=""
                  className="object-contain"
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
