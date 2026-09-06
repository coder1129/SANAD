import Link from 'next/link';
import { Check, Minus } from 'lucide-react';
import { getServiceCategory } from '@/lib/packages/categories';
import {
  getPackageHref,
  getPackageCurrentPrice,
  formatPackagePrice,
} from '@/lib/packages/presentation';
import type { CareerPackage } from '@/types/domain';
import { Button } from '@/components/ui/button';

export function PackageComparison({ packages }: { packages: CareerPackage[] }) {
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
          Compare complete packages
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Choose by what is included, the delivery estimate and revision
          allowance.
        </p>
        <p id="comparison-help" className="mt-5 text-sm text-muted-foreground">
          On smaller screens, scroll the table sideways to compare every
          package.
        </p>
        <div
          role="region"
          aria-label="Package comparison"
          aria-describedby="comparison-help"
          tabIndex={0}
          className="mt-3 overflow-x-auto rounded-lg border border-border bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <table className="w-full min-w-[42rem] text-left text-sm">
            <caption className="sr-only">
              Published deliverables, delivery estimates and
              revisions
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="p-5">
                  Included service
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
                      {item.name}
                    </Link>
                    <span className="mt-3 block text-xl">
                      {formatPackagePrice(getPackageCurrentPrice(item))}
                    </span>

                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {features.map((feature) => (
                <tr key={feature} className="border-b border-border">
                  <th scope="row" className="p-4 font-medium">
                    {feature}
                  </th>
                  {bundles.map((item) => (
                    <td key={item.id} className="p-4">
                      {item.features.includes(feature) ? (
                        <>
                          <Check
                            className="size-5 text-secondary"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Included</span>
                        </>
                      ) : (
                        <>
                          <Minus
                            className="size-5 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="sr-only">Not listed</span>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-border">
                <th scope="row" className="p-4 font-medium">
                  Estimated delivery
                </th>
                {bundles.map((item) => (
                  <td key={item.id} className="p-4">
                    {item.deliveryDays} days
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border">
                <th scope="row" className="p-4 font-medium">
                  Revision rounds
                </th>
                {bundles.map((item) => (
                  <td key={item.id} className="p-4">
                    {item.maxRevisions}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row" className="p-4 font-medium">
                  Explore the scope
                </th>
                {bundles.map((item) => (
                  <td key={item.id} className="p-4">
                    <Button asChild variant="outline">
                      <Link
                        aria-label={`View ${item.name}`}
                        href={getPackageHref(item)}
                      >
                        View details
                      </Link>
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          Compare standalone services too. A higher package price does not
          necessarily mean a saving. Confirm any differences in scope before
          choosing.
        </p>
      </div>
    </section>
  );
}
