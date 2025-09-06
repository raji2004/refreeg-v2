// Updated blockchain configuration for Polygon Mainnet
// Copy these values to your .env.local file

module.exports = {
  // Add these to your .env.local file:
  envVars: {
    PRIVATE_KEY: 'your_private_key_here',
    POLYGONSCAN_API_KEY: 'your_polygonscan_api_key_here',
    NEXT_PUBLIC_CONTRACT_ADDRESS: '0x26441d7ad1826ec2576ad7c3249e326998af07ec', // Your deployed contract
    NEXT_PUBLIC_NETWORK: 'polygon_mainnet'
  },
  
  // Contract Information:
  contractInfo: {
    address: '0x26441d7ad1826ec2576ad7c3249e326998af07ec',
    network: 'Polygon Mainnet',
    chainId: 137,
    blockExplorer: 'https://polygonscan.com/address/0x26441d7ad1826ec2576ad7c3249e326998af07ec',
    openSea: 'https://opensea.io/assets/matic/0x26441d7ad1826ec2576ad7c3249e326998af07ec'
  },
  
  // Instructions:
  instructions: `
🎯 CONTRACT DEPLOYED ON POLYGON MAINNET!

✅ Contract Address: 0x26441d7ad1826ec2576ad7c3249e326998af07ec
🌐 Network: Polygon Mainnet (Chain ID: 137)
💰 Cost: Real MATIC tokens (not testnet)
🔍 View on PolygonScan: https://polygonscan.com/address/0x26441d7ad1826ec2576ad7c3249e326998af07ec
🎨 View on OpenSea: https://opensea.io/assets/matic/0x26441d7ad1826ec2576ad7c3249e326998af07ec

📋 Next Steps:
1. Update .env.local with the contract address
2. Test petition creation (costs real MATIC)
3. Test petition signing (costs real MATIC)
4. Check MetaMask for NFTs
5. View on OpenSea (mainnet)

⚠️ Note: This is using real MATIC tokens, not testnet tokens!
  `
};
