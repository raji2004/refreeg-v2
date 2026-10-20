export interface UserSavedCard {
  id: string;
  user_id: string;
  authorization_code: string;
  card_type: string | null;
  last4: string;
  exp_month: string;
  exp_year: string;
  bin: string | null;
  bank: string | null;
  brand: string | null;
  signature: string | null;
  email: string | null;
  is_default: boolean;
  created_at: Date;
}

declare module "@prisma/client" {
  interface PrismaClient {
    user_saved_cards: any;
  }
}
