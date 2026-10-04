export const REWARD_AMOUNTS = {
  comment: 50,
  share: 100,
  donation: (amount: number) => Math.floor(amount * 0.1),
  login: 0.5,
  weekly_streak: 500,
  monthly_active: 1000,
};
