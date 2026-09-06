export interface Testimonial {
  id: number;
  packageId: number | null;
  customerName: string;
  customerTitle: string | null;
  customerImage: string | null;
  textAr: string;
  textEn: string;
  rating: number;
  isPublished: boolean;
  displayOrder: number;
  createdAt: string | null;
}
