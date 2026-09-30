import { z } from "zod";

export const CreateBankSchema = z.object({
  bank_account_number: z.string().min(10).max(20),
  bank_code: z.string().min(2),
  bank_account_name: z.string().min(2),
});

export const CreateCampaignSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(20).max(5000),
  goal_amount: z.number().positive(),
  payout_mode: z.enum(["manual", "automated"]), 
  deadline: z.string().datetime().optional(),
  category_id: z.string().uuid().optional(),
  
  
  bank_id: z.string().uuid().optional(),
  bank_account_number: z.string().min(10).max(20).optional(),
  bank_code: z.string().min(2).optional(),
  bank_account_name: z.string().min(2).optional(),
}).refine((data) => {
  if (data.payout_mode === "automated" && !data.deadline) {
    return false;
  }
  return true;
}, {
  message: "Deadline is required when payout_mode is 'automated'",
  path: ["deadline"]
}).refine((data) => {
  if (!data.bank_id && (!data.bank_account_number || !data.bank_code || !data.bank_account_name)) {
    return false;
  }
  return true;
}, {
  message: "Either bank_id or full bank details are required",
  path: ["bank_id"]
});

export const UpdateCampaignSchema = z.object({
  title: z.string().min(5).max(100).optional(),
  description: z.string().min(20).max(5000).optional(),
  goal_amount: z.number().positive().optional(),
  payout_mode: z.enum(["manual", "automated"]).optional(),
  deadline: z.string().datetime().optional(),
  category_id: z.string().uuid().optional(),
  bank_id: z.string().uuid().optional(),
  bank_account_number: z.string().min(10).max(20).optional(),
  bank_code: z.string().min(2).optional(),
  bank_account_name: z.string().min(2).optional(),
  status: z.enum(["active", "completed", "paused", "cancelled"]).optional(),
});

export const InitiateDonationSchema = z.object({
  campaign_id: z.string().uuid(),
  amount: z.number().positive(),
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().optional(),
  is_anonymous: z.boolean().optional().default(false),
  tip_amount: z.number().nonnegative().optional().default(0),
  callback_url: z.string().url().optional()
});

export const ReportCampaignSchema = z.object({
  reason: z.string().min(5).max(100),
  message: z.string().max(2000).optional(),
});
