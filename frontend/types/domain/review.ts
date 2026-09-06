export type ReviewStatus = 'pending' | 'published' | 'hidden';

export interface PackageReview {
  id: number;
  userId: number;
  packageId: number;
  orderId: number;
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: string | null;
  updatedAt: string | null;
  customerDisplayName?: string;
  verifiedCustomer?: boolean;
  packageName?: string;
  orderNumber?: string;
  customerName?: string;
  customerEmail?: string;
}

export interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}
