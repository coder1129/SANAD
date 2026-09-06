export interface CreateOrderInput {
  packageId: number;
  offerId?: number;
  couponCode?: string;
  customerPhone: string;
  notes?: string;
  requirements?: {
    targetJobTitle?: string;
    targetIndustry?: string;
    careerGoals?: string;
  };
}

export interface CustomerOrder {
  id: number;
  orderNumber: string;
  packageId: number | null;
  packageName: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  originalAmount: number;
  discountAmount: number;
  totalAmount: number;
  finalAmount: number;
  couponCode: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  paymentStatus: string;
  currency: string;
  offerName: string | null;
  payments: OrderPayment[];
  statusHistory: OrderStatusHistory[];
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
