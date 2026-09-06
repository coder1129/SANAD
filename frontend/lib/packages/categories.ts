import type { CareerPackage } from '@/types/domain';

export const serviceCategories = [
  { value: 'all', label: 'All services' },
  { value: 'bundles', label: 'Complete packages' },
  { value: 'documents', label: 'CV & documents' },
  { value: 'profile', label: 'LinkedIn' },
  { value: 'applications', label: 'Job applications' },
  { value: 'other', label: 'Other services' },
] as const;

export type ServiceCategory = (typeof serviceCategories)[number]['value'];

// Explicit published service names avoid classifying a CV as application
// support just because its description mentions a job search.
const categoriesByName: Record<string, Exclude<ServiceCategory, 'all'>> = {
  'professional distinction package': 'bundles',
  'career excellence package': 'bundles',
  'golden signature package': 'bundles',
  'professional cv': 'documents',
  'linkedin profile optimization': 'profile',
  'job application service': 'applications',
};

export function getServiceCategory(packageItem: CareerPackage) {
  return categoriesByName[packageItem.name.trim().toLowerCase()] ?? 'other';
}

export function getServiceCategoryLabel(packageItem: CareerPackage) {
  return serviceCategories.find(
    (item) => item.value === getServiceCategory(packageItem),
  )!.label;
}
