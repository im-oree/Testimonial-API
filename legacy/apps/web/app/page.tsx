/**
 * Testimonial API — root.
 * There is deliberately no landing page: the product's single entry point is
 * the login screen (see /login). Visiting "/" lands you there.
 */
import { redirect } from 'next/navigation';

export default function RootPage(): never {
  redirect('/login');
}
