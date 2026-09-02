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
  description: string | null;
  discountPercentage: number;
}

export interface CareerPackage {
  id: number;
  name: string;
  description: string | null;
  price: number;
  features: string[];
  deliveryDays: number;
  maxRevisions: number;
  sortOrder: number;
  images: PackageImage[];
  offers: PackageOffer[];
}
