// Blockchain configuration for NFT system
// Copy these values to your .env.local file

module.exports = {
  // Add these to your .env.local file:
  envVars: {
    PRIVATE_KEY: 'your_private_key_here',
    POLYGONSCAN_API_KEY: 'your_polygonscan_api_key_here',
    NEXT_PUBLIC_CONTRACT_ADDRESS: '', // Will be set after deployment
    NEXT_PUBLIC_NETWORK: 'polygon_amoy'
  },
  
  // Instructions:
  instructions: `
1. Copy the envVars above to your .env.local file
2. Replace 'your_private_key_here' with your MetaMask private key
3. Get a PolygonScan API key from https://polygonscan.com/apis
4. After deployment, update NEXT_PUBLIC_CONTRACT_ADDRESS with the deployed contract address
  `
};
