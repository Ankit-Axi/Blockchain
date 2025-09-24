const { FireblocksSDK } = require('fireblocks-sdk');
const fs = require('fs');

class FireblocksAccountManager {
    constructor() {
        // Initialize Fireblocks SDK with validation
        try {
            // Check if private key file exists
            if (!fs.existsSync('./fireblocks_secret.key')) {
                throw new Error('Private key file not found: ./fireblocks_secret.key');
            }
            
            this.privateKey = fs.readFileSync('./fireblocks_secret.key', 'utf8').trim();
            this.apiKey = "d8d4ced2-5428-43af-80f8-52d8ffae7acd";
            
            // IMPORTANT: Always use the correct API base URL
            // Sandbox: https://sandbox-api.fireblocks.io
            // Production: https://api.fireblocks.io
            this.baseUrl ='https://sandbox-api.fireblocks.io/';
            
            // Validate credentials
            if (!this.apiKey) {
                throw new Error('FIREBLOCKS_API_KEY environment variable is not set');
            }
            
            if (!this.privateKey || this.privateKey === '') {
                throw new Error('Private key file is empty or invalid');
            }
            
            // Validate private key format
            if (!this.privateKey.includes('BEGIN PRIVATE KEY') && !this.privateKey.includes('BEGIN RSA PRIVATE KEY')) {
                throw new Error('Invalid private key format. Should be PEM format.');
            }
            
            // Validate base URL format
            if (!this.baseUrl.startsWith('https://') || this.baseUrl.includes('console')) {
                console.error('❌ Invalid base URL. Use API endpoint, not console URL');
                console.error('✅ Correct: https://sandbox-api.fireblocks.io or https://api.fireblocks.io');
                console.error('❌ Wrong: https://console.fireblocks.io or similar');
                throw new Error('Invalid base URL - must be API endpoint');
            }
            
            console.log('🔧 Initializing Fireblocks SDK...');
            console.log('📍 Base URL:', this.baseUrl);
            console.log('🔑 API Key:', this.apiKey.substring(0, 8) + '...');
            console.log('🔐 Private Key format:', this.privateKey.includes('BEGIN PRIVATE KEY') ? '✅ Valid PEM' : '❌ Invalid');
            
            // Initialize with explicit options
            this.fireblocks = new FireblocksSDK(
                this.privateKey, 
                this.apiKey, 
                this.baseUrl,
                undefined, // authProvider
                { 
                    timeoutInMs: 30000,
                    additionalHeaders: {
                        'User-Agent': 'fireblocks-exchange-client/1.0'
                    }
                }
            );
            
        } catch (error) {
            console.error('❌ Failed to initialize Fireblocks SDK:', error.message);
            throw error;
        }
    }

    /**
     * Test API connectivity and authentication
     */
    async testConnection() {
        try {
            console.log('🔍 Testing Fireblocks API connection...');
            console.log('📡 Making request to:', `${this.baseUrl}/v1/vault/accounts`);
            
            // Try the simplest possible API call first
            const response = await this.fireblocks.getVaultAccountById('188816bd-0e79-3ba8-78df-fda33622be44');
            
            console.log('✅ API connection successful');
            console.log('📊 Response type:', typeof response);
            
            if (response && response.accounts) {
                console.log('📋 Total vault accounts:', response.accounts.length);
            } else {
                console.log('📋 Response structure:', Object.keys(response || {}));
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ API connection failed:', error.message);
            
            // Enhanced error debugging
            if (error.response) {
                console.error('📊 Response Status:', error.response.status);
                console.error('📋 Response Headers:', error.response.headers);
                console.error('📄 Response Data:', error.response.data);
            }
            
            if (error.request) {
                console.error('📡 Request Details:', {
                    url: error.request.path,
                    method: error.request.method,
                    headers: error.request.getHeaders ? error.request.getHeaders() : 'N/A'
                });
            }
            
            // Check if response is HTML (redirect to console)
            if (error.response && typeof error.response.data === 'string' && error.response.data.includes('<!doctype html>')) {
                console.error('🚨 ERROR: API call redirected to web console');
                console.error('🔧 This means you\'re using the wrong base URL');
                throw new Error('Invalid base URL - API call redirected to web console');
            }
            
            // Provide specific error guidance based on status code
            if (error.response?.status === 400) {
                console.error('🔧 Bad Request (400) - Possible causes:');
                console.error('   1. Invalid request parameters');
                console.error('   2. Malformed private key');
                console.error('   3. API key format issues');
                console.error('   4. Clock synchronization issues');
                console.error('   5. SDK version compatibility');
                console.error('   6. Missing required headers');
            } else if (error.response?.status === 401) {
                console.error('🔧 Authentication Error (401) - Check:');
                console.error('   1. API Key is correct and active');
                console.error('   2. Private key file matches the API key');
                console.error('   3. Using correct base URL (sandbox vs production)');
                console.error('   4. API key has required permissions');
                console.error('   5. Private key is in correct PEM format');
            } else if (error.response?.status === 403) {
                console.error('🔧 Forbidden (403) - Check:');
                console.error('   1. API key permissions');
                console.error('   2. Account access rights');
                console.error('   3. Workspace/organization settings');
            }
            
            throw error;
        }
    }

    async createUserAccount(userData) {
        try {
            const { userId, email, name, assets = ['BTC', 'ETH'] } = userData;
            
            console.log(`Creating account for user: ${name} (${userId})`);

            // Step 1: Create Vault Account
            const vaultAccount = await this.createVaultAccount(userId, name);
            console.log(`✅ Vault account created: ${vaultAccount.id}`);

            // Step 2: Create wallet assets for specified cryptocurrencies
            const walletAssets = await this.createWalletAssets(vaultAccount.id, assets);
            console.log(`✅ Created ${walletAssets.length} wallet assets`);

            // Step 3: Generate deposit addresses
            const depositAddresses = await this.generateDepositAddresses(vaultAccount.id, assets);
            console.log(`✅ Generated deposit addresses for ${depositAddresses.length} assets`);

            // Return complete account information
            return {
                success: true,
                vaultAccountId: vaultAccount.id,
                userId: userId,
                name: name,
                email: email,
                assets: walletAssets,
                depositAddresses: depositAddresses,
                createdAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error creating user account:', error.message);
            throw new Error(`Failed to create account for ${userData.name}: ${error.message}`);
        }
    }

    /**
     * Create a new vault account
     * @private
     */
    async createVaultAccount(userId, name) {
        const accountData = {
            name: `${name} - ${userId}`,
            hiddenOnUI: false,
            customerRefId: userId
        };

        const vaultAccount = await this.fireblocks.createVaultAccount(accountData);
        return vaultAccount;
    }

    /**
     * Create wallet assets for specified cryptocurrencies
     * @private
     */
    async createWalletAssets(vaultAccountId, assets) {
        const createdAssets = [];

        for (const assetId of assets) {
            try {
                console.log(`Creating wallet asset for ${assetId}...`);
                const asset = await this.fireblocks.createVaultAsset(vaultAccountId, assetId);
                createdAssets.push({
                    assetId: assetId,
                    id: asset.id,
                    address: asset.address,
                    balance: asset.balance || '0',
                    status: 'created'
                });
                console.log(`✅ Created ${assetId} wallet`);
                
                // Add delay to avoid rate limiting
                await this.delay(1000);
            } catch (error) {
                console.error(`❌ Failed to create ${assetId} wallet:`, error.message);
                createdAssets.push({
                    assetId: assetId,
                    error: error.message,
                    status: 'failed'
                });
            }
        }

        return createdAssets;
    }

    /**
     * Generate deposit addresses for assets
     * @private
     */
    async generateDepositAddresses(vaultAccountId, assets) {
        const addresses = [];

        for (const assetId of assets) {
            try {
                const addressInfo = await this.fireblocks.generateNewAddress(vaultAccountId, assetId);
                addresses.push({
                    assetId: assetId,
                    address: addressInfo.address,
                    tag: addressInfo.tag || null,
                    type: 'deposit'
                });
                console.log(`✅ Generated ${assetId} address: ${addressInfo.address}`);
                
                // Add delay to avoid rate limiting
                await this.delay(500);
            } catch (error) {
                console.error(`❌ Failed to generate ${assetId} address:`, error.message);
                addresses.push({
                    assetId: assetId,
                    error: error.message,
                    status: 'failed'
                });
            }
        }

        return addresses;
    }

    /**
     * Get user account information
     */
    async getUserAccount(vaultAccountId) {
        try {
            const vaultAccount = await this.fireblocks.getVaultAccountById(vaultAccountId);
            return vaultAccount;
        } catch (error) {
            throw new Error(`Failed to get account ${vaultAccountId}: ${error.message}`);
        }
    }

    /**
     * Get user account by customer reference ID
     */
    async getUserAccountByRefId(customerRefId) {
        try {
            const vaultAccounts = await this.fireblocks.getVaultAccounts({
                namePrefix: '',
                nameSuffix: '',
                minAmountThreshold: 0
            });
            
            const userAccount = vaultAccounts.accounts.find(
                account => account.customerRefId === customerRefId
            );
            
            return userAccount || null;
        } catch (error) {
            throw new Error(`Failed to get account by ref ID ${customerRefId}: ${error.message}`);
        }
    }

    /**
     * Get account balance for specific asset
     */
    async getAccountBalance(vaultAccountId, assetId) {
        try {
            const vaultAccount = await this.fireblocks.getVaultAccountById(vaultAccountId);
            const asset = vaultAccount.assets.find(a => a.id === assetId);
            return asset ? asset.balance : '0';
        } catch (error) {
            throw new Error(`Failed to get balance: ${error.message}`);
        }
    }

    /**
     * Utility function to add delay
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Debugging function to validate setup
function validateSetup() {
    console.log('🔧 === FIREBLOCKS SETUP VALIDATION ===');
    
    // Check environment variables
    console.log('📋 Environment Variables:');
    console.log('   API_KEY:', 'd8d4ced2-5428-43af-80f8-52d8ffae7acd' ? 
        'd8d4ced2-5428-43af-80f8-52d8ffae7acd'.substring(0, 8) + '...' : '❌ Missing');
    console.log('   BASE_URL:', process.env.FIREBLOCKS_BASE_URL || '❌ Missing');
    
    // Check private key file
    const fs = require('fs');
    if (fs.existsSync('./fireblocks_secret.key')) {
        const keyContent = fs.readFileSync('./fireblocks_secret.key', 'utf8').trim();
        console.log('🔐 Private Key File:');
        console.log('   File exists: ✅');
        console.log('   File size:', keyContent.length, 'characters');
        console.log('   Starts with BEGIN:', keyContent.includes('BEGIN PRIVATE KEY') ? '✅' : '❌');
        console.log('   Ends with END:', keyContent.includes('END PRIVATE KEY') ? '✅' : '❌');
        console.log('   First 50 chars:', keyContent.substring(0, 50) + '...');
    } else {
        console.log('🔐 Private Key File: ❌ Not found');
    }
    
    console.log('🔧 === END VALIDATION ===\n');
}

// Usage Examples
async function main() {
    try {
        // Validate setup first
        validateSetup();
        
        const accountManager = new FireblocksAccountManager();
        
        // Test API connection first
        await accountManager.testConnection();

        // Example 1: Create a new user account
        const newUser = {
            userId: 'user_12345',
            email: 'john.doe@example.com',
            name: 'John Doe',
            assets: ['BTC', 'ETH'] // Start with just these two
        };

        const userAccount = await accountManager.createUserAccount(newUser);
        console.log('🎉 User account created successfully:', userAccount);

    } catch (error) {
        console.error('❌ Main execution error:', error.message);
        
        // Additional debugging for 400 errors
        if (error.message.includes('400')) {
            console.error('\n🔧 === 400 ERROR DEBUGGING ===');
            console.error('This usually means:');
            console.error('1. Check your private key format');
            console.error('2. Ensure API key is from the correct environment (sandbox/production)');
            console.error('3. Verify system clock is synchronized');
            console.error('4. Check Fireblocks SDK version compatibility');
            console.error('5. Make sure private key and API key are from the same Fireblocks account');
        }
    }
}

// Express.js API endpoints example
const express = require('express');
const app = express();
app.use(express.json());

const accountManager = new FireblocksAccountManager();

// Create user account endpoint
app.post('/api/users/create-account', async (req, res) => {
    try {
        const { userId, email, name, assets } = req.body;
        
        // Validate required fields
        if (!userId || !email || !name) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: userId, email, name'
            });
        }

        // Check if user already exists
        const existingAccount = await accountManager.getUserAccountByRefId(userId);
        if (existingAccount) {
            return res.status(409).json({
                success: false,
                error: 'User account already exists',
                vaultAccountId: existingAccount.id
            });
        }

        // Create new account
        const userAccount = await accountManager.createUserAccount({
            userId,
            email,
            name,
            assets: assets || ['BTC', 'ETH']
        });

        res.status(201).json(userAccount);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get user account endpoint
app.get('/api/users/:userId/account', async (req, res) => {
    try {
        const { userId } = req.params;
        const account = await accountManager.getUserAccountByRefId(userId);
        
        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'User account not found'
            });
        }

        res.json({
            success: true,
            account: account
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get account balance endpoint
app.get('/api/users/:userId/balance/:assetId', async (req, res) => {
    try {
        const { userId, assetId } = req.params;
        const account = await accountManager.getUserAccountByRefId(userId);
        
        if (!account) {
            return res.status(404).json({
                success: false,
                error: 'User account not found'
            });
        }

        const balance = await accountManager.getAccountBalance(account.id, assetId.toUpperCase());
        
        res.json({
            success: true,
            userId: userId,
            assetId: assetId.toUpperCase(),
            balance: balance
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Export for use in other modules
module.exports = FireblocksAccountManager;

// Uncomment to run the example
main();

// Uncomment to start the Express server
// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
// });

/* 
SETUP INSTRUCTIONS:

1. Install dependencies:
   npm install fireblocks-sdk express dotenv

2. Create environment variables (.env file):
   FIREBLOCKS_API_KEY=your_api_key_here
   FIREBLOCKS_BASE_URL=https://sandbox-api.fireblocks.io
   
   ⚠️  IMPORTANT URLS:
   ❌ WRONG: https://sandbox.fireblocks.io (Console URL - causes HTML response)
   ❌ WRONG: https://console.fireblocks.io (Console URL)
   ✅ CORRECT: https://sandbox-api.fireblocks.io (API URL for testing)
   ✅ CORRECT: https://api.fireblocks.io (API URL for production)

3. Place your private key file:
   - Save your Fireblocks private key as 'fireblocks_secret.key' in the same directory
   - Make sure the file has proper permissions (600)

4. Supported Asset IDs:
   BTC, ETH, USDT, USDC, LTC, BCH, XRP, ADA, DOT, LINK, etc.

5. Rate Limiting:
   - The code includes delays to avoid Fireblocks rate limits
   - Adjust delay times based on your API tier

6. Error Handling:
   - All functions include comprehensive error handling
   - Failed asset creation won't stop the entire process

7. Security Notes:
   - Never commit your private key or API credentials
   - Use environment variables for sensitive data
   - Implement proper authentication for your API endpoints
*/