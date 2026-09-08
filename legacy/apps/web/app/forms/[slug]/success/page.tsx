/** Doc 4 — public-forms (success screen). Structural skeleton; visual pass in Doc 5. */
import Link from 'next/link';

export default function FormSuccessPage() {
  return (
    <main style={{ maxWidth: 560, margin: '80px auto' }} data-testid="form-success">
      <h1>Thank you!</h1>
      <p>Your feedback has been submitted and is waiting for review.</p>
      <Link href="/">Back to home</Link>
    </main>
  );
}
