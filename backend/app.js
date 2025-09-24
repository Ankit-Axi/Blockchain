const express = require("express");
const { readFileSync } = require("fs");
const cors = require("cors"); 
const {
  Fireblocks,
  BasePath,
  TransferPeerPathType,
} = require("@fireblocks/ts-sdk");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
app.use(cors());
app.use(express.json());

const apiKey =
  process.env.FIREBLOCKS_API_KEY;
const secretKeyPath =
  process.env.FIREBLOCKS_SECRET_KEY_PATH;
const basePath =
  process.env.FIREBLOCKS_ENV === "production"
    ? BasePath.Production
    : BasePath.Sandbox;
console.log(apiKey,secretKeyPath);

let fireblocks;

try {
  const secretKey = readFileSync(secretKeyPath, "utf8");
  fireblocks = new Fireblocks({
    apiKey,
    secretKey,
    basePath,
  });
  console.log(`Fireblocks initialized with basePath: ${basePath}`);
} catch (error) {
  console.error("Failed to initialize Fireblocks:", error.message);
  process.exit(1);
}

app.get("/health", (req, res) => {
  res.json({ status: "OK", basePath, timestamp: new Date().toISOString() });
});

app.post("/vault/create", async (req, res) => {
  try {
    const { name, autoFuel = true, hiddenOnUI = false } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const vaultAccount = await fireblocks.vaults.createVaultAccount({
      createVaultAccountRequest: {
        name,
        autoFuel,
        hiddenOnUI,
      },
    });

    res.json({
      success: true,
      data: vaultAccount.data,
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
    const vaultAccounts = await fireblocks.vaults.getPagedVaultAccounts("20");
    res.json({
      success: true,
      data: vaultAccounts.data,
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

    const vaultAccount = await fireblocks.vaults.getVaultAccount({vaultAccountId});

    res.json({
      success: true,
      data: vaultAccount.data,
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

    const vaultWallet = await fireblocks.vaults.createVaultAccountAsset({
      vaultAccountId,
      assetId,
    });

    res.json({
      success: true,
      data: vaultWallet.data,
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

    const assets = await fireblocks.vaults.getVaultAccountAssets({
      vaultAccountId,
    });

    res.json({
      success: true,
      data: assets.data,
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
        type: TransferPeerPathType.VaultAccount,
        id: sourceVaultId.toString(),
      },
      note: note || `Transaction created at ${new Date().toISOString()}`,
    };

    if (destinationType === "vault" && destinationVaultId) {
      transactionPayload.destination = {
        type: TransferPeerPathType.VaultAccount,
        id: destinationVaultId.toString(),
      };
    } else if (destinationType === "address" && destinationAddress) {
      transactionPayload.destination = {
        type: TransferPeerPathType.OneTimeAddress,
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

    const transactionResponse = await fireblocks.transactions.createTransaction(
      {
        transactionRequest: transactionPayload,
      }
    );

    res.json({
      success: true,
      data: transactionResponse.data,
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

    const transaction = await fireblocks.transactions.getTransaction({
      txId: transactionId,
    });

    res.json({
      success: true,
      data: transaction.data,
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

    const params = { limit: parseInt(limit) };
    if (before) params.before = before;
    if (after) params.after = after;
    if (status) params.status = status;

    const transactions = await fireblocks.transactions.getTransactions(params);

    res.json({
      success: true,
      data: transactions.data,
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
    const assets = await fireblocks.supportedAssets.getSupportedAssets();

    res.json({
      success: true,
      data: assets.data,
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