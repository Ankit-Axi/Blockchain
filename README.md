# Fireblocks Integration Project

This document outlines the project's structure, setup instructions, and key features of the user interface.

## Backend

* **Node.js Version:** 20.19.2 or above
* **Installation:**
    ```bash
    npm install
    ```
* **Run:**
    ```bash
    npm run dev
    ```

**Note:** If you want to check Fireblocks functionality using the API or `curl` commands directly instead of the SDK, change the filename `api.js` or `curlapi.js` to `App.js`.

## Frontend

* **Node.js Version:** 20.19.2 or above
* **Installation:**
    ```bash
    npm install
    ```
* **Run:**
    ```bash
    npm run dev
    ```

---

## Page 1: Dashboard

This is the main landing page, providing an overview of your Fireblocks accounts.

### Header

* **Dashboard:** (Currently selected)
* **Vaults & Wallets:** Navigate to view and manage vaults and wallets.
* **Transactions:** Navigate to view and manage blockchain transactions.

### Key Metrics

* **Total Vaults (Blue):** Shows the total number of vault accounts created. Vaults in Fireblocks are secure storage accounts for holding assets.
* **Total Wallets (Green):** Shows the total number of wallets across all vaults. Wallets are blockchain-specific addresses managed by the vaults.
* **Transactions (Orange):** Shows the total number of transactions that have been executed or processed.

### Recent Vault Accounts

This section lists the most recently created or accessed vault accounts.

* **Vault Name & ID:** (e.g., `axi1`, ID: `25`)
* **Assets Count:** (e.g., `2 assets`, `3 assets`)

---

## Page 2: Vaults & Wallets

This page allows you to create and manage your vault accounts and wallets.

### Create a New Vault Account

* **Enter a Vault Name:** A unique name for your new vault.
* **Auto Fuel:** Choose whether to enable Auto Fuel (which automatically funds wallets with gas for transactions).
* **Click `Create Vault Account`:** Adds the new vault.

### Create a Wallet in a Vault

* **Select a Vault Account:** Choose an existing vault from the dropdown.
* **Pick an Asset:** Select a specific token or coin (e.g., Bitcoin Testnet, ETH Testnet, USDC Testnet).
* **Click `Create Wallet`:** Creates a new wallet address within the selected vault.

### All Vault Accounts Section

This section displays a detailed list of all created vaults.

* **Each vault shows:**
    * **Status:** (e.g., Visible/Hidden)
    * **Fuel Type:** (e.g., Auto Fuel or Manual Fuel)
    * **Assets:** Lists the assets inside the vault with their balances (e.g., `ETH_TEST`, `BTC_TEST`, `USDC_TEST`).
    * **Unique ID:** Each vault has a unique identifier.

---

## Page 3: Transactions

This page is used for creating and tracking blockchain transactions.

### Top Section: Create New Transaction

* **Asset Dropdown:** Select the token or coin to send (e.g., Ethereum Testnet, USDC Testnet).
* **Amount Input:** Enter the amount to send.
* **Destination Type:** Choose between:
    * **External Address:** Send to an external wallet (e.g., MetaMask, another blockchain address).
    * **Another Vault:** Perform an internal transfer between your vault accounts.
* **Destination Address:** Enter the address or choose the target vault.
* **Optional Note:** Add any transaction remarks.
* **`Create Transaction` Button:** Submits the transaction request to the network.

### Bottom Section: Recent Transactions

This section provides a history of your transactions with key details.

* **Asset + Transaction Name:** (e.g., `USDC_ETH_TEST5_AN74 Transaction`)
* **Transaction ID:** (UUID, clickable or copyable)
* **Timestamp:** The date and time the transaction was created.
* **Amount + Token:** (e.g., `1 USDC_ETH_TEST5_AN74`)
* **Status:** The current state of the transaction (e.g., `COMPLETED`, `PENDING`, `FAILED`).