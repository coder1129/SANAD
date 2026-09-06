export enum UserRole {
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum OrderStatus {
  PENDING = 'pending',
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  AWAITING_INFORMATION = 'awaiting_information',
  RECEIVED = 'received',
  IN_PROGRESS = 'in_progress',
  UNDER_REVIEW = 'under_review',
  READY = 'ready',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum ReviewStatus {
  PENDING = 'pending',
  PUBLISHED = 'published',
  HIDDEN = 'hidden',
}

export enum PaymentMethod {
  TELR = 'telr',
  PAYTABS = 'paytabs',
  CARD = 'card',
  APPLE_PAY = 'apple_pay',
  MADA = 'mada',
  OTHER = 'other',
}

export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum EmailStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum NotificationType {
  ORDER = 'order',
  PAYMENT = 'payment',
  SYSTEM = 'system',
  MARKETING = 'marketing',
}

export enum MediaType {
  LOGO = 'logo',
  HERO = 'hero',
  BANNER = 'banner',
  ICON = 'icon',
  OTHER = 'other',
}

export enum AdminAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  EXPORT = 'export',
  LOGIN = 'login',
  LOGOUT = 'logout',
}

export enum FileCategory {
  CUSTOMER_UPLOAD = 'customer_upload',
  ADMIN_DELIVERABLE = 'admin_deliverable',
}
