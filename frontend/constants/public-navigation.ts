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
  reviews: { href: '/feedback', label: 'Client Feedback' },
  faq: { href: '/faq', label: 'FAQ' },
} as const satisfies Record<string, PublicNavigationLink>;

export const PUBLIC_NAVIGATION_LINKS = Object.values(primaryLinks);

export const PUBLIC_SIGN_IN_LINK = {
  href: '/sign-in',
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
    links: [primaryLinks.faq],
  },
] as const;

export const PUBLIC_LEGAL_LINKS = [
  { href: '/pages/privacy-policy', label: 'Privacy Policy' },
  { href: '/pages/terms-and-conditions', label: 'Terms & Conditions' },
] as const satisfies readonly PublicNavigationLink[];
