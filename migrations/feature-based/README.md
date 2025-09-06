# Feature-Based Migration Strategy

This directory contains individual migration scripts for each crypto feature, allowing for incremental deployment and easy rollback.

## Migration Scripts

### 1. Multi-Wallet Crypto Donations (`01_multi_wallet_crypto_donations.sql`)
- Adds `crypto_wallets` JSONB column to profiles table
- Creates `crypto_donations` table
- Adds crypto donation functions and triggers
- **Dependencies**: None
- **Tables Added**: `crypto_donations`
- **Functions Added**: `increment_cause_raised`, `confirm_crypto_donation`, `update_updated_at_column`

### 2. Streaming Donations (`02_streaming_donations.sql`)
- Creates `streaming_donations` and `crypto_streaming_donations` tables
- Adds streaming processing functions
- **Dependencies**: Multi-Wallet Crypto Donations (for crypto streaming)
- **Tables Added**: `streaming_donations`, `crypto_streaming_donations`
- **Functions Added**: `process_streaming_donations`, `get_streaming_status`, `get_crypto_streaming_status`

### 3. Matching Pool (`03_matching_pool.sql`)
- Creates matching pool tables and functions
- Adds auto-redirect functionality
- **Dependencies**: None
- **Tables Added**: `matching_pools`, `matching_pool_causes`, `matching_donations`
- **Functions Added**: `process_matching_donation`, `get_matching_status`

### 4. NFT Petition System (`04_nft_petition_system.sql`)
- Adds NFT columns to existing `petitions` table
- Creates petition signature and category tables
- **Dependencies**: None
- **Tables Added**: `petition_signatures`, `petition_categories`, `petition_category_mapping`
- **Functions Added**: `update_petition_signature_count`, `get_petition_stats`

## Deployment Order

1. **Multi-Wallet Crypto Donations** - Foundation for crypto features
2. **Streaming Donations** - Builds on crypto donations
3. **Matching Pool** - Independent feature
4. **NFT Petition System** - Independent feature

## Usage

### Apply Individual Features
```sql
-- Apply to main database
\i migrations/feature-based/01_multi_wallet_crypto_donations.sql
\i migrations/feature-based/02_streaming_donations.sql
\i migrations/feature-based/03_matching_pool.sql
\i migrations/feature-based/04_nft_petition_system.sql
```

### Rollback All Features
```sql
-- WARNING: This will delete all crypto-related data
\i migrations/feature-based/rollback_all_features.sql
```

## Testing

Each migration script is designed to be:
- **Idempotent**: Can be run multiple times safely
- **Non-destructive**: Uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`
- **Backward compatible**: Doesn't break existing functionality

## Pull Request Strategy

Each feature can be deployed as a separate PR:
1. **PR #1**: Multi-Wallet Crypto Donations
2. **PR #2**: Streaming Donations  
3. **PR #3**: Matching Pool
4. **PR #4**: NFT Petition System

This allows for:
- Independent testing of each feature
- Easy rollback if issues arise
- Gradual deployment to production
- Clear feature boundaries for code review