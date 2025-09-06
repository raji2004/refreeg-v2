# Feature-Based Migration Strategy (Main Database)

This directory contains individual migration scripts for each crypto feature, specifically designed for your main database structure.

## Current Main Database Status

### ✅ **Already Implemented:**
- **Multi-Wallet Crypto Donations**: `crypto_wallets` column and `crypto_donations` table exist
- **Matching Pool**: `matching_pools`, `matching_pool_causes`, and `matching_donations` tables exist

### ❌ **Missing Features:**
- **Streaming Donations**: `streaming_donations` and `crypto_streaming_donations` tables
- **NFT Petition System**: NFT columns and petition signature tables

## Migration Scripts

### 1. Multi-Wallet Crypto Donations (`01_multi_wallet_crypto_donations_main.sql`)
- **Status**: MOSTLY ALREADY EXISTS
- **What it does**: Only adds missing functions (`update_updated_at_column`, `increment_cause_raised`, `confirm_crypto_donation`)
- **Dependencies**: None
- **Risk**: Very low - only adds functions

### 2. Streaming Donations (`02_streaming_donations_main.sql`)
- **Status**: NEW FEATURE
- **What it does**: Creates `streaming_donations` and `crypto_streaming_donations` tables with all functions
- **Dependencies**: Multi-Wallet Crypto Donations (functions)
- **Risk**: Low - new tables, no existing data affected

### 3. Matching Pool (`03_matching_pool_main.sql`)
- **Status**: ALREADY EXISTS
- **What it does**: Only adds missing functions (`process_matching_donation`, `get_matching_status`)
- **Dependencies**: None
- **Risk**: Very low - only adds functions

### 4. NFT Petition System (`04_nft_petition_system_main.sql`)
- **Status**: NEW FEATURE
- **What it does**: 
  - Creates new `petitions` table with NFT functionality
  - Creates `petition_signatures`, `petition_categories`, `petition_category_mapping` tables
  - Adds NFT-related functions and triggers
- **Dependencies**: None
- **Risk**: Low - creates new tables (non-destructive)

## Deployment Order

1. **Multi-Wallet Crypto Donations** - Add missing functions (5 minutes)
2. **Matching Pool** - Add missing functions (5 minutes)
3. **Streaming Donations** - Create new tables (10 minutes)
4. **NFT Petition System** - Add NFT functionality (15 minutes)

## Usage

### Apply All Features
```sql
-- Apply to main database
\i migrations/feature-based/01_multi_wallet_crypto_donations_main.sql
\i migrations/feature-based/03_matching_pool_main.sql
\i migrations/feature-based/02_streaming_donations_main.sql
\i migrations/feature-based/04_nft_petition_system_main.sql
```

### Apply Individual Features
```sql
-- Apply only streaming donations
\i migrations/feature-based/02_streaming_donations_main.sql

-- Apply only NFT functionality
\i migrations/feature-based/04_nft_petition_system_main.sql
```

## Key Differences from Test Database

1. **New `petitions` table**: Created specifically for NFT functionality (separate from `causes`)
2. **Existing crypto infrastructure**: Most crypto features already implemented
3. **Minimal changes**: Focus on adding missing functions and new features only

## Testing

Each migration script is designed to be:
- **Idempotent**: Can be run multiple times safely
- **Non-destructive**: Uses `IF NOT EXISTS` and `ADD COLUMN IF NOT EXISTS`
- **Backward compatible**: Doesn't break existing functionality

## Estimated Deployment Time

- **Total time**: ~35 minutes
- **Downtime**: None (all operations are additive)
- **Risk level**: Very low (mostly adding functions and new tables)
