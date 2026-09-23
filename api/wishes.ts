// Vercel emits JavaScript; runtime imports must point to the emitted extension.
import { createWishesHandlers } from '../src/server/wishes.js';

const handlers = createWishesHandlers(() => ({
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_SECRET_KEY,
}));
export const GET = handlers.GET;
export const POST = handlers.POST;
