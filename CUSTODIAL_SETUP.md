# 🔐 Custodial NFT Minting Setup

## Environment Variables Required

Add this to your `.env.local` file:

```bash
# Custodial Wallet Configuration
CUSTODIAL_WALLET_PRIVATE_KEY=your_private_key_here
```

## How to Get a Custodial Wallet Private Key

### Option 1: Generate New Wallet (Recommended)
1. Use MetaMask or any wallet to create a new wallet
2. Export the private key
3. Fund it with MATIC for gas fees (recommend 0.1-0.5 MATIC)
4. Add the private key to your environment variables

### Option 2: Use Existing Wallet
1. Export private key from your existing wallet
2. Make sure it has MATIC for gas fees
3. Add to environment variables

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit the private key to version control
- Store it securely in your environment variables
- Consider using a dedicated wallet for this purpose
- Monitor the wallet balance regularly

## Testing the System

1. Set up the environment variable
2. Restart your development server
3. Visit the petition page
4. Users can now mint NFTs without needing wallets!

## How It Works

1. User signs petition with a message
2. System uses custodial wallet to mint NFT on blockchain
3. Real transaction is created and recorded
4. User gets real NFT with explorer links
5. No wallet connection required from user
