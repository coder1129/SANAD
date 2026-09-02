export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string | null;
}

export interface ApiErrorResponse {
  success: boolean;
  message: string;
  code: string | null;
  errors: Record<string, string[]> | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
