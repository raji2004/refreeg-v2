# 🔐 Custodial NFT Minting Setup Guide

## Current Status ✅
- **Wallet Address**: `0x618F1f05F0F136029866f721c738fAccEC4394F2`
- **Contract Address**: `0x96b7cbfB002bc9c30c5BF28C18821F60FAfF595b`
- **Network**: Polygon Mainnet
- **Status**: Ready for private key setup

## Required Setup

### 1. Add Private Key to Environment
Add this to your `.env.local` file:
```bash
CUSTODIAL_WALLET_PRIVATE_KEY=your_private_key_here
```

### 2. Fund the Custodial Wallet
- Send **0.1-0.5 MATIC** to `0x618F1f05F0F136029866f721c738fAccEC4394F2`
- This covers gas fees for NFT minting

### 3. Deploy Enhanced Contract (Optional)
The current contract supports basic custodial minting, but the enhanced version has better features:
- `custodialSignPetition()` - Mint NFTs for users without wallets
- `batchCustodialSignPetition()` - Mint multiple NFTs efficiently
- Custodial minter management

## How It Works

### For Users (No Wallet Required):
1. User visits petition page
2. User enters signature message
3. User clicks "Sign Petition & Mint NFT"
4. System mints NFT using custodial wallet
5. User receives real NFT with explorer links

### For the System:
1. Custodial wallet calls `custodialSignPetition()`
2. NFT is minted to user's address
3. Real blockchain transaction is created
4. Transaction hash and token ID are stored in database
5. User gets explorer links to PolygonScan and OpenSea

## Testing Steps

1. **Set up private key** in `.env.local`
2. **Restart development server**
3. **Test minting API**:
   ```bash
   curl -X POST "http://localhost:3000/api/mint-petition-nft" \
     -H "Content-Type: application/json" \
     -d '{"petitionId":"edae2849-6077-46a2-a8ca-f0061035bfd5","signerAddress":"test-user","message":"Testing custodial minting"}'
   ```
4. **Check PolygonScan**: https://polygonscan.com/address/0x96b7cbfB002bc9c30c5BF28C18821F60FAfF595b
5. **Check OpenSea**: https://opensea.io/assets/matic/0x96b7cbfB002bc9c30c5BF28C18821F60FAfF595b

## Security Notes
- ✅ Private key stored in environment variables
- ✅ Limited funds in custodial wallet
- ✅ Users don't need to share private keys
- ✅ All transactions are transparent on blockchain

## Next Steps
1. Add the private key to your environment
2. Test the minting system
3. Deploy enhanced contract if needed
4. Start using custodial NFT minting!
