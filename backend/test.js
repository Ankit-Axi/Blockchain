const { readFileSync } = require("fs");
const {
  Fireblocks,
  BasePath,
  TransferPeerPathType,
} = require("@fireblocks/ts-sdk");

const apiKey = "d8d4ced2-5428-43af-80f8-52d8ffae7acd";
const secretKey = readFileSync("./fireblocks_secret.key", "utf8");
const basePath =
  process.env.FIREBLOCKS_ENV === "production"
    ? BasePath.Production
    : BasePath.Sandbox;
console.log(basePath);

const fireblocks = new Fireblocks({ apiKey, secretKey, basePath });

const createVaultAccountHandle = async () => {
  const vaultAccount = await fireblocks.vaults.createVaultAccount({
    createVaultAccountRequest: {
      name: "antino",
      autoFuel: true,
      hiddenOnUI: false,
    },
  });
  console.log(JSON.stringify(vaultAccount.data, null, 2));
};

createVaultAccountHandle();

const createWalletInVault = async () => {
  try {
    const vaultWallet = await fireblocks.vaults.createVaultAccountAsset({
      vaultAccountId: "20",
      assetId: "BTC_TEST",
    });

    console.log(JSON.stringify(vaultWallet, null, 2));
  } catch (e) {
    console.log(e);
  }
};
createWalletInVault();

const transactionPayload = {
  assetId: "ETH_TEST5",
  amount: "0.001",
  source: {
    type: TransferPeerPathType.VaultAccount,
    id: "20",
  },
  destination: {
    type: TransferPeerPathType.OneTimeAddress,
    oneTimeAddress: {
      address: "0x3c905aC275240085FD295E8c493BF9A8aFE4cE75",
    },
  },
  note: "Your first OTA transaction!",
};

const createTransaction = async (transactionPayload) => {
  try {
    const transactionResponse = await fireblocks.transactions.createTransaction(
      {
        transactionRequest: transactionPayload,
      }
    );
    console.log(JSON.stringify(transactionResponse.data, null, 2));
    return transactionResponse.data;
  } catch (error) {
    console.error(error);
  }
};

console.log(createTransaction(transactionPayload));
