/** Future same-origin API contracts. Never return private invitation records publicly. */
export interface WishInput { token: string; name: string; message: string; idempotencyKey: string }
export interface WishResult { saved: true; status: 'pending' }
export interface PublicWish { id: string; name: string; message: string; createdAt: string }
export interface WishesPage { items: PublicWish[]; nextCursor: string | null }
export interface ApiError { error: { code: string; message: string } }

export interface InvitationApi {
  submitWish(input: WishInput): Promise<WishResult>;
  getWishes(cursor?: string): Promise<WishesPage>;
}
