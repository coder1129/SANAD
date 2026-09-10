export interface CreateOrderInput {
  packageId: number;
  offerId?: number;
  couponCode?: string;
  secondaryPackageId?: number;
  customerPhone: string;
  notes?: string;
  requirements?: {
    targetJobTitle?: string;
    targetIndustry?: string;
    targetCountry?: string;
    yearsOfExperience?: string;
    education?: string;
    keySkills?: string;
    careerGoals?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
    targetCompany?: string;
    jobPostingUrl?: string;
    firstCv?: boolean;
  };
}

export interface OrderRequirements {
  targetJobTitle?: string;
  targetIndustry?: string;
  targetCountry?: string;
  yearsOfExperience?: string;
  education?: string;
  keySkills?: string;
  careerGoals?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  targetCompany?: string;
  jobPostingUrl?: string;
  firstCv?: boolean;
}

export interface CustomerOrder {
  id: number;
  orderNumber: string;
  packageId: number | null;
  packageName: string | null;
  packageNameAr?: string | null;
  secondaryPackageId: number | null;
  secondaryPackageName: string | null;
  secondaryPackageNameAr?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  originalAmount: number;
  discountAmount: number;
  secondaryOriginalAmount: number;
  secondaryDiscountAmount: number;
  totalAmount: number;
  finalAmount: number;
  couponCode: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  paymentStatus: string;
  currency: string;
  offerName: string | null;
  offerNameAr?: string | null;
  payments: OrderPayment[];
  statusHistory: OrderStatusHistory[];
  requirements: OrderRequirements;
  notes: string | null;
}

export interface OrderPayment {
  id: number;
  transactionId: string;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: string;
  paymentDate: string | null;
  createdAt: string | null;
}

export interface OrderStatusHistory {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string | null;
}
