/** Same-origin API contracts. Never return private invitation records publicly. */
export interface WishInput { token: string; name: string; message: string; idempotencyKey: string }
export interface PublicWish { id: string; name: string; message: string; createdAt: string }
export type WishResult = { saved: true; status: 'approved'; wish: PublicWish } | { saved: true; status: 'hidden' }
export interface WishesPage { items: PublicWish[]; nextCursor: string | null }
export interface ApiError { error: { code: string; message: string } }

export interface InvitationApi {
  submitWish(input: WishInput): Promise<WishResult>;
  getWishes(cursor?: string): Promise<WishesPage>;
}
