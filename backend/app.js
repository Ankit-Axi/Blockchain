const express = require("express");
const { readFileSync } = require("fs");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const dotenv = require("dotenv");
dotenv.config();
 
const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());
 
const apiKey = process.env.FIREBLOCKS_API_KEY;
const secretKeyPath = process.env.FIREBLOCKS_SECRET_KEY_PATH;
const baseUrl = process.env.FIREBLOCKS_ENV === "production" 
  ? "https://api.fireblocks.io" 
  : "https://sandbox-api.fireblocks.io";
 
let secretKey;
 
try {
  secretKey = readFileSync(secretKeyPath, "utf8");
  console.log(`Fireblocks API initialized with baseUrl: ${baseUrl}`);
} catch (error) {
  console.error("Failed to read secret key:", error.message);
  process.exit(1);
}
 
// JWT signature generation for Fireblocks API
function generateJWT(path, bodyJson = "") {
  const nonce = crypto.randomBytes(16).toString("base64");
  const timestamp = Math.floor(Date.now() / 1000);
  const token = {
    uri: path,
    nonce: nonce,
    iat: timestamp,
    exp: timestamp + 55, // 55 seconds expiry
    sub: apiKey,
    bodyHash: crypto.createHash("sha256").update(bodyJson).digest("hex")
  };
 
  return jwt.sign(token, secretKey, { algorithm: "RS256" });
}
 
// Generic API request function
async function makeFireblocksRequest(method, path, data = null) {
  const bodyJson = data ? JSON.stringify(data) : "";
  const token = generateJWT(path, bodyJson);
  const config = {
    method,
    url: `${baseUrl}${path}`,
    headers: {
      "Authorization": `Bearer ${token}`,
      "X-API-Key": apiKey,
      "Content-Type": "application/json"
    }
  };
 
  if (data) {
    config.data = data;
  }
 
  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`API Error: ${method} ${path}`, error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
}
 
app.get("/health", (req, res) => {
  res.json({ status: "OK", baseUrl, timestamp: new Date().toISOString() });
});
 
app.post("/vault/create", async (req, res) => {
  try {
    const { name, autoFuel = true, hiddenOnUI = false } = req.body;
 
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
 
    const data = await makeFireblocksRequest("POST", "/v1/vault/accounts", {
      name,
      autoFuel,
      hiddenOnUI,
    });
 
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error creating vault account:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create vault account",
    });
  }
});
 
app.get("/vault/accounts", async (req, res) => {
  try {
    const data = await makeFireblocksRequest("GET", "/v1/vault/accounts_paged?limit=20");
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching vault accounts:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch vault accounts",
    });
  }
});
 
app.get("/vault/accounts/:vaultAccountId", async (req, res) => {
  try {
    const { vaultAccountId } = req.params;
 
    const data = await makeFireblocksRequest("GET", `/v1/vault/accounts/${vaultAccountId}`);
 
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching vault account:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch vault account",
    });
  }
});
 
app.post("/vault/:vaultAccountId/wallet", async (req, res) => {
  try {
    const { vaultAccountId } = req.params;
    const { assetId } = req.body;
 
    if (!assetId) {
      return res.status(400).json({ error: "assetId is required" });
    }
 
    const data = await makeFireblocksRequest("POST", `/v1/vault/accounts/${vaultAccountId}/${assetId}`);
 
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error creating wallet:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create wallet",
    });
  }
});
 
app.get("/vault/:vaultAccountId/assets", async (req, res) => {
  try {
    const { vaultAccountId } = req.params;
 
    const data = await makeFireblocksRequest("GET", `/v1/vault/accounts/${vaultAccountId}`);
 
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching vault assets:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch vault assets",
    });
  }
});
 
app.post("/transactions/create", async (req, res) => {
  try {
    const {
      assetId,
      amount,
      sourceVaultId,
      destinationType,
      destinationAddress,
      destinationVaultId,
      note,
    } = req.body;
 
    if (!assetId || !amount || !sourceVaultId) {
      return res.status(400).json({
        error: "assetId, amount, and sourceVaultId are required",
      });
    }
 
    const transactionPayload = {
      assetId,
      amount,
      source: {
        type: "VAULT_ACCOUNT",
        id: sourceVaultId.toString(),
      },
      note: note || `Transaction created at ${new Date().toISOString()}`,
    };
 
    if (destinationType === "vault" && destinationVaultId) {
      transactionPayload.destination = {
        type: "VAULT_ACCOUNT",
        id: destinationVaultId.toString(),
      };
    } else if (destinationType === "address" && destinationAddress) {
      transactionPayload.destination = {
        type: "ONE_TIME_ADDRESS",
        oneTimeAddress: {
          address: destinationAddress,
        },
      };
    } else {
      return res.status(400).json({
        error:
          'Invalid destination. Provide either (destinationType: "vault", destinationVaultId) or (destinationType: "address", destinationAddress)',
      });
    }
 
    const data = await makeFireblocksRequest("POST", "/v1/transactions", transactionPayload);
 
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error creating transaction:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to create transaction",
    });
  }
});
 
app.get("/transactions/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
 
    const data = await makeFireblocksRequest("GET", `/v1/transactions/${transactionId}`);
 
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching transaction:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch transaction",
    });
  }
});
 
app.get("/transactions", async (req, res) => {
  try {
    const { limit = 10, before, after, status } = req.query;
 
    let queryParams = `?limit=${limit}`;
    if (before) queryParams += `&before=${before}`;
    if (after) queryParams += `&after=${after}`;
    if (status) queryParams += `&status=${status}`;
 
    const data = await makeFireblocksRequest("GET", `/v1/transactions${queryParams}`);
 
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch transactions",
    });
  }
});

app.post("/transactions/estimate-fee", async (req, res) => {
  try {
    const {
      assetId,
      amount,
      sourceVaultId,
      destinationType,
      destinationAddress,
      destinationVaultId,
      allowBaseAssetAddress = false, 
    } = req.body;
 
    if (!assetId || !amount || !sourceVaultId) {
      return res.status(400).json({
        error: "assetId, amount, and sourceVaultId are required",
      });
    }
 
    const transactionPayload = {
      assetId,
      amount,
      operation: "TRANSFER",
      source: {
        type: "VAULT_ACCOUNT",
        id: sourceVaultId.toString(),
      },
      extraParameters: {
        allowBaseAssetAddress,
      },
    };
 
    if (destinationType === "vault" && destinationVaultId) {
      transactionPayload.destination = {
        type: "VAULT_ACCOUNT",
        id: destinationVaultId.toString(),
      };
    } else if (destinationType === "address" && destinationAddress) {
      transactionPayload.destination = {
        type: "ONE_TIME_ADDRESS",
        oneTimeAddress: {
          address: destinationAddress,
        },
      };
    } else {
      return res.status(400).json({
        error: 'Invalid destination. Provide either (destinationType: "vault", destinationVaultId) or (destinationType: "address", destinationAddress)',
      });
    }
 
    const feeEstimation = await makeFireblocksRequest(
      "POST",
      "/v1/transactions/estimate_fee",
      transactionPayload
    );
    res.json({
      success: true,
      data: feeEstimation,
    });
  } catch (error) {
    console.error("Error estimating transaction fee:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to estimate transaction fee",
    });
  }
});

app.get("/vault/:vaultAccountId/addresses", async (req, res) => {
  try {
    const { vaultAccountId } = req.params;
    const vaultAssets = await makeFireblocksRequest(
      "GET",
      `/v1/vault/accounts/${vaultAccountId}`
    );
 
    if (!vaultAssets.assets || vaultAssets.assets.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No assets found for vault ${vaultAccountId}`,
      });
    }
    const addressesByAsset = {};
 
    for (const asset of vaultAssets.assets) {
      const depositAddrs = await makeFireblocksRequest(
        "GET",
        `/v1/vault/accounts/${vaultAccountId}/${asset.id}/addresses`
      );
      addressesByAsset[asset.id] = depositAddrs;
    }
 
    res.json({
      success: true,
      vaultAccountId,
      addresses: addressesByAsset,
    });
  } catch (error) {
    console.error("Error fetching vault addresses:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch vault addresses",
    });
  }
});
 
 
app.get("/assets", async (req, res) => {
  try {
    const data = await makeFireblocksRequest("GET", "/v1/supported_assets");
 
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching supported assets:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to fetch supported assets",
    });
  }
});
 
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});
 
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});
 
app.listen(port, () => {
  console.log(`Fireblocks API server running on port ${port}`);
});
 
module.exports = app;