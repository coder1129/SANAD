export interface PackageImage {
  id: number;
  path: string;
  url?: string | null;
  altText: string | null;
  isPrimary: boolean;
  displayOrder: number;
}

export interface PackageOffer {
  id: number;
  name: string;
  nameAr?: string | null;
  description: string | null;
  discountPercentage: number;
}

export interface CompanionOffer extends PackageOffer {
  type: 'cross_service_any' | 'cross_service_specific';
  packageId?: number | null;
  packageName?: string | null;
  packageNameAr?: string | null;
  packagePrice?: number | null;
}

export interface CareerPackage {
  id: number;
  name: string;
  nameAr?: string | null;
  descriptionAr?: string | null;
  featuresAr?: string[];
  description: string | null;
  price: number;
  features: string[];
  deliveryDays: number;
  maxRevisions: number;
  sortOrder: number;
  images: PackageImage[];
  offers: PackageOffer[];
  companionOffers?: CompanionOffer[];
  buyerCount: number;
  ratingAverage: number | null;
  ratingCount: number;
}
