export interface Database {
  public: {
    Tables: {
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          mode: "live" | "test";
          created_at: string;
          last_used_at: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          key_prefix: string;
          key_hash: string;
          mode?: "live" | "test";
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          key_prefix?: string;
          key_hash?: string;
          mode?: "live" | "test";
          created_at?: string;
          last_used_at?: string | null;
          revoked_at?: string | null;
        };
      };
      api_bank_accounts: {
        Row: {
          id: string;
          developer_id: string;
          bank_account_number: string;
          bank_code: string;
          bank_account_name: string;
          sub_account_code: string | null;
          created_at: string;
          mode: string;
        };
        Insert: {
          id?: string;
          developer_id: string;
          bank_account_number: string;
          bank_code: string;
          bank_account_name: string;
          sub_account_code?: string | null;
          created_at?: string;
          mode?: string;
        };
        Update: {
          id?: string;
          developer_id?: string;
          bank_account_number?: string;
          bank_code?: string;
          bank_account_name?: string;
          sub_account_code?: string | null;
          created_at?: string;
          mode?: string;
        };
      };
      api_campaigns: {
        Row: {
          id: string;
          developer_id: string;
          api_key_id: string | null;
          title: string;
          description: string;
          goal_amount: number;
          raised_amount: number;
          currency: string;
          status: string;
          payout_mode: string;
          deadline: string | null;
          bank_account_number: string;
          bank_code: string;
          bank_account_name: string;
          sub_account_code: string | null;
          created_at: string;
          updated_at: string;
          mode: string;
        };
        Insert: {
          id?: string;
          developer_id: string;
          api_key_id?: string | null;
          title: string;
          description: string;
          goal_amount: number;
          raised_amount?: number;
          currency?: string;
          status?: string;
          payout_mode: string;
          deadline?: string | null;
          bank_account_number: string;
          bank_code: string;
          bank_account_name: string;
          sub_account_code?: string | null;
          created_at?: string;
          updated_at?: string;
          mode?: string;
        };
        Update: {
          id?: string;
          developer_id?: string;
          api_key_id?: string | null;
          title?: string;
          description?: string;
          goal_amount?: number;
          raised_amount?: number;
          currency?: string;
          status?: string;
          payout_mode?: string;
          deadline?: string | null;
          bank_account_number?: string;
          bank_code?: string;
          bank_account_name?: string;
          sub_account_code?: string | null;
          created_at?: string;
          updated_at?: string;
          mode?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          account_number: string | null;
          bank_name: string | null;
          account_name: string | null;
          crypto_wallets: {
            ethereum?: string;
            solana?: string;
            [key: string]: any;
          } | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          account_number?: string | null;
          bank_name?: string | null;
          account_name?: string | null;
          crypto_wallets?: {
            ethereum?: string;
            solana?: string;
            [key: string]: any;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          account_number?: string | null;
          bank_name?: string | null;
          account_name?: string | null;
          crypto_wallets?: {
            ethereum?: string;
            solana?: string;
            [key: string]: any;
          } | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      causes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          goal: number;
          raised: number;
          status: string;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
          image: string | null;
          days_active: number | null;
          trust_score: any; // jsonb
          verified_status: string;
          summary: string | null;
          location: string | null;
          multimedia: string[];
          video_links: string[];
          faqs: any; // jsonb
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          goal: number;
          raised?: number;
          status?: string;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          image?: string | null;
          days_active?: number | null;
          trust_score?: any; // jsonb
          verified_status?: string;
          summary?: string | null;
          location?: string | null;
          multimedia?: string[];
          video_links?: string[];
          faqs?: any; // jsonb
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          category?: string;
          goal?: number;
          raised?: number;
          status?: string;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          image?: string | null;
          days_active?: number | null;
          trust_score?: any; // jsonb
          verified_status?: string;
          summary?: string | null;
          location?: string | null;
          multimedia?: string[];
          video_links?: string[];
          faqs?: any; // jsonb
        };
      };
      pledges: {
        Row: {
          id: string;
          cause_id: string;
          user_id: string | null;
          token: string | null;
          amount: number;
          currency: string;
          name: string;
          email: string;
          note: string | null;
          reminder_date: string;
          status: string;
          created_at: string;
          paystack_authorization_code: string | null;
          authorization_email: string | null;
          first_transaction_reference: string | null;
          paystack_payment_status: string | null;
          scheduled_charge_reference: string | null;
          last_charge_error: string | null;
          charge_attempted_at: string | null;
        };
        Insert: {
          id?: string;
          cause_id: string;
          user_id?: string | null;
          token?: string | null;
          amount: number;
          currency?: string;
          name: string;
          email: string;
          note?: string | null;
          reminder_date: string;
          status?: string;
          created_at?: string;
          paystack_authorization_code?: string | null;
          authorization_email?: string | null;
          first_transaction_reference?: string | null;
          paystack_payment_status?: string | null;
          scheduled_charge_reference?: string | null;
          last_charge_error?: string | null;
          charge_attempted_at?: string | null;
        };
        Update: {
          id?: string;
          cause_id?: string;
          user_id?: string | null;
          token?: string | null;
          amount?: number;
          currency?: string;
          name?: string;
          email?: string;
          note?: string | null;
          reminder_date?: string;
          status?: string;
          created_at?: string;
          paystack_authorization_code?: string | null;
          authorization_email?: string | null;
          first_transaction_reference?: string | null;
          paystack_payment_status?: string | null;
          scheduled_charge_reference?: string | null;
          last_charge_error?: string | null;
          charge_attempted_at?: string | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string | null;
          cause_id: string | null;
          paystack_subscription_code: string;
          paystack_email_token: string | null;
          amount: number;
          interval: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          cause_id?: string | null;
          paystack_subscription_code: string;
          paystack_email_token?: string | null;
          amount: number;
          interval: string;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          cause_id?: string | null;
          paystack_subscription_code?: string;
          paystack_email_token?: string | null;
          amount?: number;
          interval?: string;
          status?: string;
          created_at?: string;
        };
      };
      campaign_follows: {
        Row: {
          id: string;
          cause_id: string;
          user_id: string | null;
          email: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cause_id: string;
          user_id?: string | null;
          email: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cause_id?: string;
          user_id?: string | null;
          email?: string;
          created_at?: string;
        };
      };
      petitions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          goal: number;
          raised: number;
          status: string;
          rejection_reason: string | null;
          created_at: string;
          updated_at: string;
          image: string | null;
          days_active: number | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description: string;
          category: string;
          goal: number;
          raised?: number;
          status?: string;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          image?: string | null;
          days_active?: number | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string;
          category?: string;
          goal?: number;
          raised?: number;
          status?: string;
          rejection_reason?: string | null;
          created_at?: string;
          updated_at?: string;
          image?: string | null;
          days_active?: number | null;
        };
      };
      donations: {
        Row: {
          id: string;
          cause_id: string;
          user_id: string | null;
          amount: number;
          name: string;
          email: string;
          message: string | null;
          is_anonymous: boolean;
          status: string;
          receipt_url: string | null;
          created_at: string;
          tip_amount: number;
        };
        Insert: {
          id?: string;
          cause_id: string;
          user_id?: string | null;
          amount: number;
          name: string;
          email: string;
          message?: string | null;
          is_anonymous?: boolean;
          status?: string;
          receipt_url?: string | null;
          created_at?: string;
          tip_amount?: number;
        };
        Update: {
          id?: string;
          cause_id?: string;
          user_id?: string | null;
          amount?: number;
          name?: string;
          email?: string;
          message?: string | null;
          is_anonymous?: boolean;
          status?: string;
          receipt_url?: string | null;
          created_at?: string;
          tip_amount?: number;
        };
      };
      signatures: {
        Row: {
          id: string;
          petition_id: string;
          user_id: string | null;
          amount: number;
          name: string;
          email: string;
          message: string | null;
          is_anonymous: boolean;
          status: string;
          receipt_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          petition_id: string;
          user_id?: string | null;
          amount: number;
          name: string;
          email: string;
          message?: string | null;
          is_anonymous?: boolean;
          status?: string;
          receipt_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          petition_id?: string;
          user_id?: string | null;
          amount?: number;
          name?: string;
          email?: string;
          message?: string | null;
          is_anonymous?: boolean;
          status?: string;
          receipt_url?: string | null;
          created_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          cause_id: string;
          user_id: string;
          content: string;
          created_at: string;
          updated_at: string;
          parent_id: string | null;
        };
        Insert: {
          id?: string;
          cause_id: string;
          user_id: string;
          content: string;
          created_at?: string;
          updated_at?: string;
          parent_id?: string | null;
        };
        Update: {
          id?: string;
          cause_id?: string;
          user_id?: string;
          content?: string;
          updated_at?: string;
          parent_id?: string | null;
        };
      };
      api_donations: {
        Row: {
          id: string;
          api_campaign_id: string;
          amount: number;
          tip_amount: number;
          donor_name: string;
          donor_email: string;
          message: string | null;
          is_anonymous: boolean;
          status: string;
          paystack_reference: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          api_campaign_id: string;
          amount: number;
          tip_amount?: number;
          donor_name: string;
          donor_email: string;
          message?: string | null;
          is_anonymous?: boolean;
          status?: string;
          paystack_reference: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          api_campaign_id?: string;
          amount?: number;
          tip_amount?: number;
          donor_name?: string;
          donor_email?: string;
          message?: string | null;
          is_anonymous?: boolean;
          status?: string;
          paystack_reference?: string;
          created_at?: string;
        };
      };
      api_webhooks: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          secret: string;
          events: string[];
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          url: string;
          secret: string;
          events?: string[];
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          url?: string;
          secret?: string;
          events?: string[];
          is_active?: boolean;
          updated_at?: string;
        };
      };
      api_webhook_logs: {
        Row: {
          id: string;
          webhook_id: string;
          event: string;
          payload: any;
          status_code: number | null;
          response_body: string | null;
          attempts: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          webhook_id: string;
          event: string;
          payload: any;
          status_code?: number | null;
          response_body?: string | null;
          attempts?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          webhook_id?: string;
          event?: string;
          payload?: any;
          status_code?: number | null;
          response_body?: string | null;
          attempts?: number;
        };
      };
      api_campaign_reports: {
        Row: {
          id: string;
          api_campaign_id: string;
          reason: string;
          message: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          api_campaign_id: string;
          reason: string;
          message?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          api_campaign_id?: string;
          reason?: string;
          message?: string | null;
          status?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
