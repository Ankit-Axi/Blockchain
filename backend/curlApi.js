const express = require("express");
const { readFileSync } = require("fs");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { exec } = require("child_process");
const { promisify } = require("util");
const dotenv = require("dotenv");
dotenv.config();

const execAsync = promisify(exec);

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

// Escape shell arguments to prevent injection
function escapeShellArg(arg) {
  return "'" + arg.replace(/'/g, "'\"'\"'") + "'";
}

// Generic curl request function
async function makeCurlRequest(method, path, data = null) {
  const bodyJson = data ? JSON.stringify(data) : "";
  const token = generateJWT(path, bodyJson);
  const url = `${baseUrl}${path}`;
  
  let curlCommand = `curl -s -X ${method}`;
  curlCommand += ` -H ${escapeShellArg(`Authorization: Bearer ${token}`)}`;
  curlCommand += ` -H ${escapeShellArg(`X-API-Key: ${apiKey}`)}`;
  curlCommand += ` -H ${escapeShellArg('Content-Type: application/json')}`;
  
  if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    curlCommand += ` -d ${escapeShellArg(bodyJson)}`;
  }
  
  curlCommand += ` ${escapeShellArg(url)}`;

  try {
    const { stdout, stderr } = await execAsync(curlCommand);
    
    if (stderr) {
      console.error(`Curl stderr: ${stderr}`);
    }
    
    if (!stdout.trim()) {
      throw new Error('Empty response from API');
    }
    
    const response = JSON.parse(stdout);
    
    // Check if response contains error
    if (response.message && response.code) {
      throw new Error(`API Error: ${response.message} (Code: ${response.code})`);
    }
    
    return response;
  } catch (error) {
    console.error(`Curl Error: ${method} ${path}`, error.message);
    
    if (error.message.includes('Unexpected token')) {
      throw new Error('Invalid JSON response from API');
    }
    
    throw error;
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

    const data = await makeCurlRequest("POST", "/v1/vault/accounts", {
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
    const data = await makeCurlRequest("GET", "/v1/vault/accounts_paged?limit=20");
    
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

    const data = await makeCurlRequest("GET", `/v1/vault/accounts/${vaultAccountId}`);

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

    const data = await makeCurlRequest("POST", `/v1/vault/accounts/${vaultAccountId}/${assetId}`);

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

    const data = await makeCurlRequest("GET", `/v1/vault/accounts/${vaultAccountId}`);

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

    const data = await makeCurlRequest("POST", "/v1/transactions", transactionPayload);

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

    const data = await makeCurlRequest("GET", `/v1/transactions/${transactionId}`);

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

    const data = await makeCurlRequest("GET", `/v1/transactions${queryParams}`);

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

app.get("/assets", async (req, res) => {
  try {
    const data = await makeCurlRequest("GET", "/v1/supported_assets");

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

// Debug endpoint to show what curl command would be executed
app.post("/debug/curl", async (req, res) => {
  try {
    const { method = "GET", path = "/v1/vault/accounts", data = null } = req.body;
    
    const bodyJson = data ? JSON.stringify(data) : "";
    const token = generateJWT(path, bodyJson);
    const url = `${baseUrl}${path}`;
    
    let curlCommand = `curl -s -X ${method}`;
    curlCommand += ` -H ${escapeShellArg(`Authorization: Bearer ${token}`)}`;
    curlCommand += ` -H ${escapeShellArg(`X-API-Key: ${apiKey}`)}`;
    curlCommand += ` -H ${escapeShellArg('Content-Type: application/json')}`;
    
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      curlCommand += ` -d ${escapeShellArg(bodyJson)}`;
    }
    
    curlCommand += ` ${escapeShellArg(url)}`;

    res.json({
      success: true,
      curlCommand,
      tokenPreview: token.substring(0, 50) + "...",
      url,
      method,
      path
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
