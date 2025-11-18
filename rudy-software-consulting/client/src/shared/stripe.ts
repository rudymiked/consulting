// stripe.ts
import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);

stripePromise.then(stripe => {
  console.log('Stripe loaded successfully');
}).catch(error => {
  console.error('Error loading Stripe:', error);
});
