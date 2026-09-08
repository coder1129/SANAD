import { useCopy } from '@/lib/i18n/use-copy';
import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import { getServiceCategory } from '@/lib/packages/categories';
import {
  getPackageHref,
  getPackageCurrentPrice,
} from '@/lib/packages/presentation';
import type { CareerPackage } from '@/types/domain';
import { Button } from '@/components/ui/button';

export function PackageComparison({ packages }: { packages: CareerPackage[] }) {
  const _copy = useCopy();

  const bundles = packages.filter(
    (item) => getServiceCategory(item) === 'bundles',
  );
  if (bundles.length < 2) return null;
  const features = [...new Set(bundles.flatMap((item) => item.features))];
  return (
    <section
      id="compare-packages"
      aria-labelledby="comparison-heading"
      className="scroll-mt-24 border-b border-border bg-surface-muted"
    >
      <div className="layout-container layout-section">
        <h2 id="comparison-heading" className="type-h2 text-primary">
          {_copy('Compare complete packages')}
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {_copy(
            'Choose by what is included, the delivery estimate and revision allowance.',
          )}
        </p>
        <p id="comparison-help" className="mt-5 text-sm text-muted-foreground">
          {_copy(
            'On smaller screens, scroll the table sideways to compare every package.',
          )}
        </p>
        <div
          role="region"
          aria-label={_copy('Package comparison')}
          aria-describedby="comparison-help"
          tabIndex={0}
          className="relative mt-3 overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <table className="w-full min-w-[42rem] text-start text-sm">
            <caption className="sr-only">
              {_copy(
                'Published deliverables, delivery estimates and revisions',
              )}
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="p-5">
                  {_copy('Included service')}
                </th>
                {bundles.map((item) => (
                  <th
                    scope="col"
                    key={item.id}
                    className="min-w-44 p-5 align-top text-primary"
                  >
                    <Link
                      className="underline decoration-border underline-offset-4"
                      href={getPackageHref(item)}
                    >
                      {_copy(item.name, item.nameAr)}
                    </Link>
                    <span className="mt-3 block text-xl">
                      {_copy(_copy.money(getPackageCurrentPrice(item)))}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature} className="border-b border-border">
                  <th scope="row" className="p-4 font-medium">
                    {_copy(feature)}
                  </th>
                  {bundles.map((item) => (
                    <td key={item.id} className="p-4">
                      {item.features.includes(feature) ? (
                        <>
                          <Check
                            className="size-5 text-secondary"
                            aria-hidden="true"
                          />
                          <span className="sr-only">{_copy('Included')}</span>
                        </>
                      ) : (
                        <>
                          <Minus
                            className="size-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="sr-only">{_copy('Not listed')}</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-border">
                <th scope="row" className="p-4 font-medium">
                  {_copy('Estimated delivery')}
                </th>
                {bundles.map((item) => (
                  <td key={item.id} className="p-4">
                    {_copy(item.deliveryDays)} {_copy('days')}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border">
                <th scope="row" className="p-4 font-medium">
                  {_copy('Revision rounds')}
                </th>
                {bundles.map((item) => (
                  <td key={item.id} className="p-4">
                    {_copy(item.maxRevisions)}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="p-4 font-medium">
                  {_copy('Explore the scope')}
                </th>
                {bundles.map((item) => (
                  <td key={item.id} className="p-4">
                    <Button asChild variant="outline">
                      <Link
                        aria-label={_copy(`View ${item.name}`)}
                        href={getPackageHref(item)}
                      >
                        {_copy('View details')}
                      </Link>
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {_copy(
            'Compare standalone services too. A higher package price does not necessarily mean a saving. Confirm any differences in scope before choosing.',
          )}
        </p>
      </div>
    </section>
  );
}
