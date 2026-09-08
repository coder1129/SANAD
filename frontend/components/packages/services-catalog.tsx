'use client';
import { useCopy } from '@/lib/i18n/use-copy';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import {
  getServiceCategory,
  serviceCategories,
  type ServiceCategory,
} from '@/lib/packages/categories';
import {
  ArrowDownUp,
  BriefcaseBusiness,
  Check,
  FileText,
  Search,
  SlidersHorizontal,
  UserRoundCheck,
  X,
} from 'lucide-react';

import { PackageCard } from '@/components/packages/package-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { CareerPackage } from '@/types/domain';
import {
  getPackageCurrentPrice,
  getPackageShortTitle,
} from '@/lib/packages/presentation';

type SortOption =
  'recommended' | 'price-ascending' | 'price-descending' | 'delivery';

interface ServicesCatalogProps {
  packages: CareerPackage[];
}

const categoryIcons = {
  all: SlidersHorizontal,
  bundles: BriefcaseBusiness,
  documents: FileText,
  profile: UserRoundCheck,
  applications: BriefcaseBusiness,
  other: SlidersHorizontal,
};
const categoryOptions = serviceCategories.map((item) => ({
  ...item,
  icon: categoryIcons[item.value],
}));

const sortOptions: Array<{ value: SortOption; label: string }> = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-ascending', label: 'Price: low to high' },
  { value: 'price-descending', label: 'Price: high to low' },
  { value: 'delivery', label: 'Fastest delivery' },
];

function matchesSearch(packageItem: CareerPackage, query: string): boolean {
  if (!query) return true;

  const searchable = [
    packageItem.name,
    packageItem.nameAr ?? '',
    packageItem.description ?? '',
    packageItem.descriptionAr ?? '',
    ...packageItem.features,
    ...(packageItem.featuresAr ?? []),
  ]
    .join(' ')
    .toLowerCase();

  return searchable.includes(query.toLowerCase());
}

export function ServicesCatalog({ packages }: ServicesCatalogProps) {
  const _copy = useCopy();

  const params = useSearchParams();
  const query = params.get('q') ?? '';
  const category =
    categoryOptions.find((item) => item.value === params.get('category'))
      ?.value ?? 'all';
  const sort =
    sortOptions.find((item) => item.value === params.get('sort'))?.value ??
    'recommended';
  function updateFilters(values: Record<string, string>) {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(values)) {
      if (!value || value === 'all' || value === 'recommended')
        url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState(
      null,
      '',
      `${url.pathname}${url.search}${url.hash}`,
    );
  }
  const setQuery = (value: string) => updateFilters({ q: value });
  const setCategory = (value: ServiceCategory) =>
    updateFilters({ category: value });
  const setSort = (value: SortOption) => updateFilters({ sort: value });

  const visiblePackages = React.useMemo(() => {
    const nextPackages = packages.filter((packageItem) => {
      const categoryMatches =
        category === 'all' || getServiceCategory(packageItem) === category;
      return categoryMatches && matchesSearch(packageItem, query.trim());
    });

    return [...nextPackages].sort((first, second) => {
      if (sort === 'price-ascending') {
        return getPackageCurrentPrice(first) - getPackageCurrentPrice(second);
      }
      if (sort === 'price-descending') {
        return getPackageCurrentPrice(second) - getPackageCurrentPrice(first);
      }
      if (sort === 'delivery') {
        return (
          first.deliveryDays - second.deliveryDays ||
          first.sortOrder - second.sortOrder
        );
      }
      return first.sortOrder - second.sortOrder;
    });
  }, [category, packages, query, sort]);

  const clearFilters = () => {
    updateFilters({ q: '', category: 'all', sort: 'recommended' });
  };

  return (
    <section
      aria-labelledby="services-catalog-heading"
      className="border-b border-border bg-background"
      id="services-catalog"
      style={{ scrollMarginTop: '6rem' }}
    >
      <div className="layout-container layout-section">
        <div className="flex flex-col gap-5 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.18em] text-secondary uppercase sm:text-sm">
              <span aria-hidden="true" className="h-px w-8 bg-accent" />
              {_copy('Find your fit')}
            </p>
            <h2
              className="type-h2 mt-4 text-primary"
              id="services-catalog-heading"
            >
              {_copy('Choose the support you need.')}
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground lg:text-end">
            {_copy(
              'Start with the outcome you need, then compare scope, delivery, and investment at a glance.',
            )}
          </p>
        </div>

        <div className="mt-8 grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 start-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              aria-label={_copy('Search services')}
              className="h-12 pe-10 ps-10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={_copy('Search by service, document, or outcome')}
              type="search"
              value={query}
            />
            {query ? (
              <button
                aria-label={_copy('Clear service search')}
                className="absolute top-1/2 end-1 grid size-11 -translate-y-1/2 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-surface-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setQuery('')}
                type="button"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </div>

          <label className="relative flex min-h-12 items-center gap-2 rounded-md border border-[var(--control-border)] bg-surface px-3 text-sm shadow-xs focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
            <ArrowDownUp
              aria-hidden="true"
              className="size-4 shrink-0 text-secondary"
            />
            <span className="sr-only">{_copy('Sort services')}</span>
            <select
              aria-label={_copy('Sort services')}
              className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent text-foreground outline-none"
              onChange={(event) => setSort(event.target.value as SortOption)}
              value={sort}
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {_copy(option.label)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div
          aria-label={_copy('Filter services by category')}
          className="mt-4 flex flex-wrap gap-2"
          role="group"
        >
          {categoryOptions
            .filter(
              (option) =>
                option.value !== 'other' ||
                packages.some((item) => getServiceCategory(item) === 'other'),
            )
            .map(({ value, label, icon: Icon }) => {
              const selected = category === value;
              return (
                <button
                  aria-pressed={selected}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-md border px-3.5 text-sm font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    selected
                      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                      : 'border-border bg-surface text-foreground hover:border-accent hover:bg-surface-muted'
                  }`}
                  key={value}
                  onClick={() => setCategory(value)}
                  type="button"
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {_copy(label)}
                </button>
              );
            })}
        </div>

        <div className="mt-7 flex flex-wrap items-center justify-between gap-3 text-sm">
          <p
            className="font-semibold text-primary"
            role="status"
            aria-live="polite"
          >
            {_copy('Showing')} {visiblePackages.length} {_copy('of')}{' '}
            {packages.length} {_copy('services')}
          </p>
          {query || category !== 'all' || sort !== 'recommended' ? (
            <Button
              className="h-9 px-3 text-sm"
              onClick={clearFilters}
              type="button"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
              {_copy('Reset filters')}
            </Button>
          ) : null}
        </div>

        {visiblePackages.length > 0 ? (
          <ul className="mt-6 grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
            {visiblePackages.map((packageItem, index) => (
              <li key={packageItem.id}>
                <PackageCard
                  categoryLabel={
                    categoryOptions.find(
                      (option) =>
                        option.value === getServiceCategory(packageItem),
                    )?.label ?? 'Career service'
                  }
                  index={index}
                  packageItem={packageItem}
                  shortTitle={getPackageShortTitle(packageItem)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 border border-dashed border-border bg-surface-muted px-6 py-14 text-center sm:px-10">
            <span className="mx-auto grid size-12 place-items-center rounded-md bg-surface text-secondary shadow-xs">
              <Search aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-5 text-lg font-semibold text-primary">
              {_copy(
                packages.length
                  ? 'No services match those filters.'
                  : 'Services are being updated.',
              )}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {_copy(
                packages.length
                  ? 'Try a broader search or return to the full services list.'
                  : 'Please check back shortly for the current catalog.',
              )}
            </p>
            {packages.length > 0 ? (
              <Button className="mt-6" onClick={clearFilters} type="button">
                <Check aria-hidden="true" className="size-4" />
                {_copy('Show all services')}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
