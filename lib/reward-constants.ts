export type RewardEventType =
  | "comment"
  | "like_comment"
  | "share"
  | "donation"
  | "login"
  | "weekly_streak"
  | "monthly_active";

export type RewardRule = {
  baseAmount: number | ((amount: number) => number);
  cooldownMs: number;
  dailyCap: number | null;
};

const minute = 60 * 1000;
const day = 24 * 60 * 60 * 1000;

export const EIZA_MONTHLY_ACTIVE_DAYS = 20;

/**
 * Year 1 EIZA reward rules from the tokenomics blueprint.
 */
export const EIZA_REWARD_RULES: Record<RewardEventType, RewardRule> = {
  comment: {
    baseAmount: 2,
    cooldownMs: minute,
    dailyCap: 50,
  },
  like_comment: {
    baseAmount: 0.5,
    cooldownMs: 10 * 1000,
    dailyCap: 25,
  },
  share: {
    baseAmount: 10,
    cooldownMs: 5 * minute,
    dailyCap: 100,
  },
  donation: {
    baseAmount: (amount: number) => amount * 0.05,
    cooldownMs: 0,
    dailyCap: null,
  },
  login: {
    baseAmount: 1,
    cooldownMs: day,
    dailyCap: 1,
  },
  weekly_streak: {
    baseAmount: 25,
    cooldownMs: 7 * day,
    dailyCap: 25,
  },
  monthly_active: {
    baseAmount: 100,
    cooldownMs: 30 * day,
    dailyCap: 100,
  },
};

export const REWARD_AMOUNTS = {
  comment: EIZA_REWARD_RULES.comment.baseAmount as number,
  like_comment: EIZA_REWARD_RULES.like_comment.baseAmount as number,
  share: EIZA_REWARD_RULES.share.baseAmount as number,
  donation: EIZA_REWARD_RULES.donation.baseAmount as (amount: number) => number,
  login: EIZA_REWARD_RULES.login.baseAmount as number,
  weekly_streak: EIZA_REWARD_RULES.weekly_streak.baseAmount as number,
  monthly_active: EIZA_REWARD_RULES.monthly_active.baseAmount as number,
};

export function getRewardRule(type: string): RewardRule | null {
  return EIZA_REWARD_RULES[type as RewardEventType] ?? null;
}

export function calculateBaseReward(type: string, amount = 0): number {
  const rule = getRewardRule(type);
  if (!rule) return 0;

  const baseAmount =
    typeof rule.baseAmount === "function"
      ? rule.baseAmount(amount)
      : rule.baseAmount;

  return roundEiza(baseAmount);
}

export function roundEiza(amount: number): number {
  return Math.round(amount * 100) / 100;
}
