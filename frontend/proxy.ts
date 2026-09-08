import { NextResponse } from 'next/server';

// Simple proxy that doesn't interfere with existing routes.
// Locale is handled via cookie (SANAD_LOCALE) set by the LanguageSwitcher.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip all internal Next.js paths and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
