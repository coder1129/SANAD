/** Scalar values that can appear in a query string. */
export type ApiQueryPrimitive = string | number | boolean;

/**
 * A single query parameter value. `null` and `undefined` are accepted and
 * dropped during serialization, so optional UI state can be passed straight
 * through.
 */
export type ApiQueryValue =
  ApiQueryPrimitive | ApiQueryPrimitive[] | null | undefined;

/**
 * Query parameter bag accepted by the request layer. Declare endpoint-specific
 * shapes as `type` aliases rather than `interface`, otherwise they will not be
 * assignable here (interfaces get no implicit index signature).
 */
export type ApiQueryParams = Record<string, ApiQueryValue>;
