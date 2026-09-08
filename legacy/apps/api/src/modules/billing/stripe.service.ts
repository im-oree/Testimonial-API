import { Injectable } from '@nestjs/common';

/**
 * StripeService — thin wrapper around Stripe API (checkout sessions,
 * customers, invoices, webhook event verification). Stripe SDK is added
 * when billing is implemented (Doc 2/3); no dependency is pulled today so
 * the skeleton stays lean.
 */
@Injectable()
export class StripeService {
  // checkoutSession() / verifyWebhook() / syncCustomer — Doc 2/3
}
