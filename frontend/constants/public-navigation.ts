export interface PublicNavigationLink {
  href: string;
  label: string;
}

export const PUBLIC_SERVICES_HREF = '/packages';

const primaryLinks = {
  home: { href: '/', label: 'Home' },
  services: { href: PUBLIC_SERVICES_HREF, label: 'Services' },
  howItWorks: { href: '/#how-it-works', label: 'How It Works' },
  about: { href: '/pages/about-us', label: 'About Us' },
  reviews: { href: '/#reviews', label: 'Client Feedback' },
} as const satisfies Record<string, PublicNavigationLink>;

export const PUBLIC_NAVIGATION_LINKS = Object.values(primaryLinks);

export const PUBLIC_SIGN_IN_LINK = {
  href: '/login',
  label: 'Sign In',
} as const satisfies PublicNavigationLink;

export const PUBLIC_PRIMARY_ACTION = {
  href: PUBLIC_SERVICES_HREF,
  label: 'View Services',
} as const satisfies PublicNavigationLink;

export const PUBLIC_FOOTER_GROUPS = [
  {
    label: 'Explore',
    links: [primaryLinks.home, primaryLinks.services, primaryLinks.howItWorks],
  },
  {
    label: 'Company',
    links: [primaryLinks.about, primaryLinks.reviews],
  },
  {
    label: 'Support',
    links: [{ href: '/#faq', label: 'FAQ' }],
  },
] as const;

export const PUBLIC_LEGAL_LINKS = [
  { href: '/pages/privacy-policy', label: 'Privacy Policy' },
  { href: '/pages/terms-and-conditions', label: 'Terms & Conditions' },
] as const satisfies readonly PublicNavigationLink[];

export type SocialPlatformKey =
  'instagram' | 'whatsapp' | 'tiktok' | 'email' | 'facebook';

export interface PublicSocialLink {
  platform: SocialPlatformKey;
  href: string;
  label: string;
  ariaLabel: string;
}

export const PUBLIC_WHATSAPP_HREF = 'https://wa.me/966500000000';

export const PUBLIC_SOCIAL_LINKS: readonly PublicSocialLink[] = [
  {
    platform: 'instagram',
    href: 'https://instagram.com',
    label: 'Instagram',
    ariaLabel: 'Follow us on Instagram',
  },
  {
    platform: 'whatsapp',
    href: PUBLIC_WHATSAPP_HREF,
    label: 'WhatsApp',
    ariaLabel: 'Contact us on WhatsApp',
  },
  {
    platform: 'tiktok',
    href: 'https://tiktok.com',
    label: 'TikTok',
    ariaLabel: 'Follow us on TikTok',
  },
  {
    platform: 'email',
    href: 'mailto:contact@sanad.sa',
    label: 'Email',
    ariaLabel: 'Send us an email',
  },
  {
    platform: 'facebook',
    href: 'https://facebook.com',
    label: 'Facebook',
    ariaLabel: 'Follow us on Facebook',
  },
] as const;
