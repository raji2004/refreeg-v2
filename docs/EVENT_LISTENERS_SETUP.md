# Event Listeners & Rewards System Documentation

## Overview

This system connects the backend with the frontend to track user events (comments, shares, donations, logins, weekly streaks, and monthly active status) and reward users with EIZA tokens in real-time.

## Architecture

### Components

#### 1. **Event Listeners Hook** (`hooks/use-event-listeners.ts`)

A React hook that sets up real-time Supabase subscriptions for all events.

**Features:**

- Real-time PostgreSQL change listeners
- Automatic subscription cleanup
- Support for filtering by user ID
- Event callbacks for different types

**Usage:**

```typescript
useEventListeners({
  userId: "user-id",
  onComment: (payload) => console.log("Comment:", payload),
  onShare: (payload) => console.log("Share:", payload),
  onDonation: (payload) => console.log("Donation:", payload),
  onLogin: (payload) => console.log("Login:", payload),
  onWeeklyStreak: (payload) => console.log("Weekly Streak:", payload),
  onMonthlyActive: (payload) => console.log("Monthly Active:", payload),
});
```

#### 2. **Event-Reward Actions** (`actions/event-reward-actions.ts`)

Server actions for recording events and managing rewards.

**Key Functions:**

- `recordEvent(event: RewardEvent)` - Records an event and calculates rewards
- `addRewards(userId, amount, eventType, eventId)` - Adds rewards to user wallet
- `getUserWallet(userId)` - Fetches wallet balance and transaction history
- `updateUserStreaks(userId)` - Updates weekly streak and monthly active status
- `getUserStats(userId)` - Gets user's streak and activity stats

**Reward Amounts:**

```typescript
REWARD_AMOUNTS = {
  comment: 50,
  share: 100,
  donation: (amount) => amount * 0.1, // 10% of donation
  login: 10,
  weekly_streak: 500,
  monthly_active: 1000,
};
```

#### 3. **Integration Points**

**Comment Actions** (`actions/comment-actions.ts`)

- Updated `createComment()` to record comment events
- Automatically triggers reward calculation

**Donation Actions** (`actions/donation-actions.ts`)

- Updated `createDonation()` to record donation events
- Calculates rewards based on donation amount (10%)

**Cause Actions** (`actions/cause-actions.ts`)

- Updated `saveCauseShare()` to accept userId
- Added `shareCause()` function for user-tracked shares

**Auth Actions** (`actions/auth-actions.ts`)

- Added `trackLogin()` function
- Records login events and updates streaks

#### 4. **UI Components**

**Rewards Screen** (`app/ai-agent/_components/eiza-rewards-screen.tsx`)

- Real-time balance display with live updates
- Transaction history that updates as events occur
- Weekly streak counter
- Progress bar for next reward tier
- Optimistic UI updates for instant feedback

## Database Schema Requirements

The system requires the following tables in your Supabase database:

### Quick Setup

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the SQL from [supabase/migrations/001_create_rewards_tables.sql](supabase/migrations/001_create_rewards_tables.sql)
5. Paste it into the editor and click **Run**

This will create all the necessary tables with indexes and Row Level Security (RLS) policies.

### After Running Migration

1. **Enable Realtime** for the tables (optional but recommended for real-time features):
   - Go to **Realtime** section in Supabase dashboard
   - Make sure the following tables have realtime enabled:
     - `events`
     - `reward_transactions`
     - `user_wallets`
     - `user_streaks`
     - `cause_shares`

### Alternative: Manual Table Creation

If you prefer to create tables individually, here are the SQL schemas:

### `events` table

```sql
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_type ON events(event_type);
```

### `reward_transactions` table

```sql
CREATE TABLE reward_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  amount numeric NOT NULL,
  transaction_type text NOT NULL,
  event_id uuid REFERENCES events(id),
  status text DEFAULT 'completed',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_reward_transactions_user_id ON reward_transactions(user_id);
```

### `user_wallets` table

```sql
CREATE TABLE user_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  balance numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_user_wallets_user_id ON user_wallets(user_id);
```

### `user_streaks` table

```sql
CREATE TABLE user_streaks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
  weekly_streak integer DEFAULT 0,
  is_monthly_active boolean DEFAULT false,
  last_active_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_user_streaks_user_id ON user_streaks(user_id);
```

### `cause_shares` table (for real-time tracking)

```sql
CREATE TABLE cause_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  cause_id uuid NOT NULL REFERENCES causes(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_cause_shares_user_id ON cause_shares(user_id);
CREATE INDEX idx_cause_shares_cause_id ON cause_shares(cause_id);
```

## Event Flow

### 1. Comment Event

```
User creates comment
  → createComment() called
  → recordEvent('comment', userId)
  → +50 EIZA added to wallet
  → Real-time listener triggers
  → UI updates with new transaction
```

### 2. Share Event

```
User shares cause
  → shareCause(causeId, userId) called
  → saveCauseShare() increments counter
  → recordEvent('share', userId)
  → +100 EIZA added to wallet
  → Real-time listener triggers
  → UI updates with new transaction
```

### 3. Donation Event

```
User makes donation
  → createDonation(causeId, userId, amount)
  → recordEvent('donation', userId, amount)
  → +(amount * 0.1) EIZA added to wallet
  → Real-time listener triggers
  → UI updates with new transaction
```

### 4. Login Event

```
User signs in
  → trackLogin(userId) called
  → recordEvent('login', userId)
  → +10 EIZA added to wallet
  → updateUserStreaks() called
  → Weekly streak incremented/reset
  → If milestone reached: +500 EIZA bonus
  → Real-time listener triggers
  → UI updates with streak and balance
```

### 5. Weekly Streak Event

```
Weekly streak reaches multiple of 7 days
  → updateUserStreaks() called
  → Streak milestone detected
  → recordEvent('weekly_streak', userId)
  → +500 EIZA added to wallet
  → Real-time listener triggers
  → UI updates
```

### 6. Monthly Active Event

```
User active in new month
  → updateUserStreaks() called
  → Monthly milestone detected
  → recordEvent('monthly_active', userId)
  → +1000 EIZA added to wallet
  → Real-time listener triggers
  → UI updates
```

## Integration Guide

### 1. Setup Authentication Tracking

In your login/signup flow, call `trackLogin()`:

```typescript
import { trackLogin } from "@/actions/users/auth-actions";

// After successful authentication
await trackLogin(user.id);
```

### 2. Use Rewards Screen

Import the component in your app:

```typescript
import EizaRewardsScreen from "@/app/ai-agent/_components/eiza-rewards-screen";

export default function Dashboard() {
  return <EizaRewardsScreen />;
}
```

### 3. Record Share Events

When users share a cause:

```typescript
import { shareCause } from "@/actions/causes/cause-actions";

// After user clicks share
await shareCause(causeId, userId);
```

## Real-Time Features

- **Instant Balance Updates**: Balance updates immediately when events occur
- **Live Transaction History**: New transactions appear at the top of the list
- **Streak Counter**: Real-time weekly streak display
- **Optimistic Updates**: UI updates before server confirmation for better UX
- **Automatic Cleanup**: Subscriptions cleaned up on component unmount

## Error Handling

The system is designed to be fault-tolerant:

- Event tracking failures don't prevent main actions from completing
- Errors are logged to console for debugging
- Wallet updates use Supabase upsert to handle concurrent updates
- Realtime listeners automatically reconnect on connection loss

## Testing

### Test Comment Event

```typescript
// Simulate user commenting
await createComment(causeId, userId, "Great cause!");
// Check: +50 EIZA added to wallet, transaction appears in history
```

### Test Donation Event

```typescript
// Simulate user donating $100
await createDonation(causeId, userId, { amount: 100, ... });
// Check: +10 EIZA added to wallet (10% of donation)
```

### Test Share Event

```typescript
// Simulate user sharing
await shareCause(causeId, userId);
// Check: +100 EIZA added to wallet
```

### Test Login Event

```typescript
// Simulate login
await trackLogin(userId);
// Check: +10 EIZA added, streak updated
```

## Configuration

### Adjust Reward Amounts

Edit `REWARD_AMOUNTS` in `actions/event-reward-actions.ts`:

```typescript
export const REWARD_AMOUNTS = {
  comment: 50, // Change this value
  share: 100, // Change this value
  donation: (amount) => amount * 0.1, // Adjust percentage
  login: 10,
  weekly_streak: 500,
  monthly_active: 1000,
};
```

### Adjust USD Conversion Rate

In `eiza-rewards-screen.tsx`:

```typescript
const usdEquivalent = useMemo(
  () => (balance * 0.3825).toFixed(2), // Change 0.3825 to your rate
  [balance],
);
```

## Performance Considerations

- Subscriptions are user-filtered to reduce bandwidth
- Event recording happens asynchronously without blocking main actions
- Wallet upserts use Supabase's built-in conflict resolution
- Transaction history limited to 50 most recent transactions in UI
- Real-time updates debounced to prevent excessive re-renders

## Troubleshooting

### Real-time updates not working

- Verify Supabase Real-time is enabled in your database
- Check that user is authenticated (Real-time requires auth)
- Verify filter syntax in event listeners

### Rewards not calculating

- Check that user exists in `user_wallets` table (auto-created on first event)
- Verify event recording succeeds in browser console
- Check `events` and `reward_transactions` tables for entries

### Streak not updating

- Verify `user_streaks` table exists and has data
- Check that `updateUserStreaks()` is called on login
- Verify date comparisons work correctly in server timezone

## Future Enhancements

- [ ] Reward multipliers for consecutive streaks
- [ ] Special bonuses for referrals
- [ ] Leaderboards with top earners
- [ ] Reward history export
- [ ] Mobile push notifications for rewards
- [ ] Reward redemption system
- [ ] Tiered achievement badges
