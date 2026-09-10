import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// A public route may opt in to reading a valid bearer token when it is
// available, while still allowing anonymous callers. This is useful for
// endpoints such as checkout previews where the result depends on the user
// (for example, a per-user coupon limit).
export const OPTIONAL_AUTH_KEY = 'optionalAuth';
export const OptionalAuth = () => SetMetadata(OPTIONAL_AUTH_KEY, true);
