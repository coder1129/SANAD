import { redirect } from 'next/navigation';

/**
 * Authentication is presented from the current page through AuthModalProvider.
 * Keep this legacy route as a safe fallback for old bookmarks and links.
 */
export default function SignInRoute() {
  redirect('/');
}
