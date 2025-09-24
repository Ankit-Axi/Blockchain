import React, { useState, useEffect } from "react";
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Box,
  Paper,
  Avatar,
  Chip,
  IconButton,
  Alert,
  AlertTitle,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  Tooltip,
  Fade,
} from "@mui/material";
import {
  AccountBalanceWallet,
  Add,
  Send,
  Visibility,
  TrendingUp,
  ContentCopy,
  Check,
  Refresh,
  Dashboard,
  AccountBalance,
  SwapHoriz,
  Warning,
  AttachMoney,
  LocalAtm,
} from "@mui/icons-material";
import axios from "axios"

const API_BASE_URL = "http://localhost:3000";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
      light: "#42a5f5",
      dark: "#1565c0",
    },
    secondary: {
      main: "#9c27b0",
      light: "#ba68c8",
      dark: "#7b1fa2",
    },
    background: {
      default: "#f5f5f5",
      paper: "#ffffff",
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
  },
});

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const FireblocksApp = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [vaultAccounts, setVaultAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [copiedText, setCopiedText] = useState("");

  const [vaultForm, setVaultForm] = useState({ name: "", autoFuel: true });
  const [walletForm, setWalletForm] = useState({
    vaultAccountId: "",
    assetId: "BTC_TEST",
  });
  const [transactionForm, setTransactionForm] = useState({
    assetId: "ETH_TEST5",
    amount: "",
    sourceVaultId: "",
    destinationType: "address",
    destinationAddress: "",
    destinationVaultId: "",
    note: "",
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    showSnackbar("Copied to clipboard!", "info");
    setTimeout(() => setCopiedText(""), 2000);
  };

  const apiCall = async (endpoint, options = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { "Content-Type": "application/json", ...options.headers },
        ...options,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "API call failed");
      return data;
    } catch (err) {
      throw new Error(err.message || "Network error");
    }
  };

  const fetchVaultAccounts = async () => {
    try {
      setLoading(true);
      const data = await apiCall("/vault/accounts");
      setVaultAccounts(data.data.accounts || []);
    } catch (err) {
      showSnackbar(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const data = await apiCall("/transactions?limit=20");
      setTransactions(data.data || []);
    } catch (err) {
      console.error("Failed to fetch transactions:", err.message);
    }
  };

  const createVaultAccount = async () => {
    if (!vaultForm.name.trim()) {
      showSnackbar("Please enter a vault name", "warning");
      return;
    }

    try {
      setLoading(true);
      await apiCall("/vault/create", {
        method: "POST",
        body: JSON.stringify(vaultForm),
      });
      showSnackbar("Vault account created successfully!");
      setVaultForm({ name: "", autoFuel: true });
      fetchVaultAccounts();
    } catch (err) {
      showSnackbar(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const createWallet = async () => {
    if (!walletForm.vaultAccountId) {
      showSnackbar("Please select a vault account", "warning");
      return;
    }

    try {
      setLoading(true);
      await apiCall(`/vault/${walletForm.vaultAccountId}/wallet`, {
        method: "POST",
        body: JSON.stringify({ assetId: walletForm.assetId }),
      });
      showSnackbar("Wallet created successfully!");
      setWalletForm({ vaultAccountId: "", assetId: "BTC_TEST" });
      fetchVaultAccounts();
    } catch (err) {
      showSnackbar(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const createTransaction = async () => {
    if (!transactionForm.amount || !transactionForm.sourceVaultId) {
      showSnackbar("Please fill in all required fields", "warning");
      return;
    }

    if (
      transactionForm.destinationType === "address" &&
      !transactionForm.destinationAddress
    ) {
      showSnackbar("Please enter destination address", "warning");
      return;
    }

    if (
      transactionForm.destinationType === "vault" &&
      !transactionForm.destinationVaultId
    ) {
      showSnackbar("Please select destination vault", "warning");
      return;
    }

    try {
      setLoading(true);
      await apiCall("/transactions/create", {
        method: "POST",
        body: JSON.stringify(transactionForm),
      });
      showSnackbar("Transaction created successfully!");
      setTransactionForm({
        assetId: "ETH_TEST5",
        amount: "",
        sourceVaultId: "",
        destinationType: "address",
        destinationAddress: "",
        destinationVaultId: "",
        note: "",
      });
      fetchTransactions();
    } catch (err) {
      showSnackbar(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultAccounts();
    fetchTransactions();
  }, []);

   const callData = async()=>{
      const response = await axios.post(
      "https://api.merklescience.com/v3/addresses/monitor",
      {
        address: "0x3c905aC275240085FD295E8c493BF9A8aFE4cE75",
        blockchain: "ETH",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "R4MOPP0WOWEDH8F593E63OBQ6Z94YD9JNE1GW6CYE",
        },
      }
    );

    const data = response.data;
    console.log(data,"data")
    }

  useEffect(()=>{
   
    callData()
  })

  const StatCard = ({
    title,
    value,
    icon: Icon,
    color = "primary",
    gradient,
  }) => (
    <Card
      sx={{
        background:
          gradient ||
          `linear-gradient(135deg, ${theme.palette[color].light} 0%, ${theme.palette[color].main} 100%)`,
        color: "white",
        height: "120px",
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "100%",
        }}
      >
        <Box>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {value}
          </Typography>
        </Box>
        <Icon sx={{ fontSize: 48, opacity: 0.8 }} />
      </CardContent>
    </Card>
  );

  const renderDashboard = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={5}>
        <StatCard
          title="Total Vaults"
          value={vaultAccounts.length}
          icon={AccountBalanceWallet}
          color="primary"
        />
      </Grid>
      <Grid item xs={12} md={5}>
        <StatCard
          title="Total Wallets"
          value={vaultAccounts.reduce(
            (sum, vault) => sum + (vault.assets?.length || 0),
            0
          )}
          icon={AttachMoney}
          gradient="linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)"
        />
      </Grid>
      <Grid item xs={12} md={4}>
        <StatCard
          title="Transactions"
          value={transactions.length}
          icon={TrendingUp}
          gradient="linear-gradient(135deg, #ff9800 0%, #f57c00 100%)"
        />
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <AccountBalance />
              Recent Vault Accounts
            </Typography>
            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : vaultAccounts.length === 0 ? (
              <Box textAlign="center" py={4}>
                <AccountBalanceWallet
                  sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
                />
                <Typography variant="body1" color="text.secondary" gutterBottom>
                  No vault accounts found
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setActiveTab(1)}
                  sx={{ mt: 2 }}
                >
                  Create Your First Vault
                </Button>
              </Box>
            ) : (
              <List>
                {vaultAccounts.slice(0, 7).map((vault, index) => (
                  <React.Fragment key={vault.id}>
                    <ListItem
                      sx={{
                        bgcolor: "grey.50",
                        borderRadius: 2,
                        mb: 1,
                        "&:hover": { bgcolor: "grey.100" },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: "primary.main" }}>
                          <AccountBalanceWallet />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={vault.name}
                        secondary={`ID: ${vault.id}`}
                      />
                      <Box textAlign="right">
                        <Typography variant="body2" fontWeight={600}>
                          {vault.assets?.length || 0} assets
                        </Typography>
                        <Chip
                          label={vault.hiddenOnUI ? "Hidden" : "Visible"}
                          size="small"
                          color={vault.hiddenOnUI ? "default" : "success"}
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </ListItem>
                    {index < Math.min(vaultAccounts.length - 1, 4) && (
                      <Divider />
                    )}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderVaults = () => (
    <Grid container spacing={3}>
      {/* Create Vault Account */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Add />
              Create New Vault Account
            </Typography>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Vault Name"
                value={vaultForm.name}
                onChange={(e) =>
                  setVaultForm({ ...vaultForm, name: e.target.value })
                }
                placeholder="Enter vault name"
                sx={{ mb: 2 }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={vaultForm.autoFuel}
                    onChange={(e) =>
                      setVaultForm({ ...vaultForm, autoFuel: e.target.checked })
                    }
                  />
                }
                label="Enable Auto Fuel"
              />
            </Box>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={loading ? <CircularProgress size={20} /> : <Add />}
              onClick={createVaultAccount}
              disabled={loading}
            >
              Create Vault Account
            </Button>
          </CardActions>
        </Card>
      </Grid>

      {/* Create Wallet */}
      <Grid item xs={12} lg={6}>
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <LocalAtm />
              Create Wallet in Vault
            </Typography>
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Vault Account</InputLabel>
                <Select
                  value={walletForm.vaultAccountId}
                  label="Vault Account"
                  onChange={(e) =>
                    setWalletForm({
                      ...walletForm,
                      vaultAccountId: e.target.value,
                    })
                  }
                >
                  {vaultAccounts.map((vault) => (
                    <MenuItem key={vault.id} value={vault.id}>
                      {vault.name} (ID: {vault.id})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Asset</InputLabel>
                <Select
                  value={walletForm.assetId}
                  label="Asset"
                  onChange={(e) =>
                    setWalletForm({ ...walletForm, assetId: e.target.value })
                  }
                >
                  <MenuItem value="BTC_TEST">Bitcoin (Testnet)</MenuItem>
                  <MenuItem value="ETH_TEST5">Ethereum (Testnet)</MenuItem>
                  <MenuItem value="USDC_ETH_TEST5_AN74">USDC (Testnet)</MenuItem>
                  <MenuItem value="LTC_TEST">Litecoin (Testnet)</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button
              variant="contained"
              fullWidth
              startIcon={loading ? <CircularProgress size={20} /> : <Add />}
              onClick={createWallet}
              disabled={loading}
            >
              Create Wallet
            </Button>
          </CardActions>
        </Card>
      </Grid>

      {/* All Vault Accounts */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <AccountBalance />
              All Vault Accounts
            </Typography>
            {vaultAccounts.length === 0 ? (
              <Box textAlign="center" py={4}>
                <AccountBalanceWallet
                  sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
                />
                <Typography variant="body1" color="text.secondary">
                  No vault accounts found. Create one above!
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {vaultAccounts.map((vault) => (
                  <Grid item xs={12} md={6} lg={4} key={vault.id}>
                    <Card variant="outlined" sx={{ height: "100%" }}>
                      <CardContent>
                        <Box display="flex" alignItems="center" mb={2}>
                          <Avatar sx={{ bgcolor: "primary.main", mr: 2 }}>
                            <AccountBalanceWallet />
                          </Avatar>
                          <Box flexGrow={1}>
                            <Typography variant="h6" noWrap>
                              {vault.name}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                ID: {vault.id}
                              </Typography>
                              <Tooltip title="Copy ID">
                                <IconButton
                                  size="small"
                                  onClick={() => copyToClipboard(vault.id)}
                                >
                                  {copiedText === vault.id ? (
                                    <Check fontSize="small" />
                                  ) : (
                                    <ContentCopy fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                        </Box>

                        <Box display="flex" gap={1} mb={2}>
                          <Chip
                            label={vault.hiddenOnUI ? "Hidden" : "Visible"}
                            size="small"
                            color={vault.hiddenOnUI ? "default" : "success"}
                          />
                          <Chip
                            label={vault.autoFuel ? "Auto Fuel" : "Manual Fuel"}
                            size="small"
                            color={vault.autoFuel ? "primary" : "default"}
                          />
                        </Box>

                        {vault.assets && vault.assets.length > 0 && (
                          <>
                            <Divider sx={{ my: 2 }} />
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              gutterBottom
                            >
                              Assets ({vault.assets.length}):
                            </Typography>
                            <Box sx={{ maxHeight: 150, overflowY: "auto" }}>
                              {vault.assets.map((asset, index) => (
                                <Paper
                                  key={index}
                                  variant="outlined"
                                  sx={{ p: 1, mb: 1 }}
                                >
                                  <Box
                                    display="flex"
                                    justifyContent="space-between"
                                    alignItems="center"
                                  >
                                    <Typography
                                      variant="body2"
                                      fontWeight={600}
                                    >
                                      {asset.id}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {asset.balance || "0"}
                                    </Typography>
                                  </Box>
                                  {asset.address && (
                                    <Box
                                      display="flex"
                                      alignItems="center"
                                      gap={1}
                                      mt={0.5}
                                    >
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontFamily: "monospace",
                                          wordBreak: "break-all",
                                          flexGrow: 1,
                                        }}
                                      >
                                        {asset.address.substring(0, 20)}...
                                      </Typography>
                                      <Tooltip title="Copy Address">
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            copyToClipboard(asset.address)
                                          }
                                        >
                                          {copiedText === asset.address ? (
                                            <Check fontSize="small" />
                                          ) : (
                                            <ContentCopy fontSize="small" />
                                          )}
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  )}
                                </Paper>
                              ))}
                            </Box>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTransactions = () => (
    <Grid container spacing={3}>
      {/* Create Transaction */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Send />
              Create New Transaction
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Asset</InputLabel>
                  <Select
                    value={transactionForm.assetId}
                    label="Asset"
                    onChange={(e) =>
                      setTransactionForm({
                        ...transactionForm,
                        assetId: e.target.value,
                      })
                    }
                  >
                    <MenuItem value="ETH_TEST5">Ethereum (Testnet)</MenuItem>
                    <MenuItem value="BTC_TEST">Bitcoin (Testnet)</MenuItem>
                    <MenuItem value="USDC_TEST">USDC (Testnet)</MenuItem>
                    <MenuItem value="LTC_TEST">Litecoin (Testnet)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  inputProps={{ step: "0.000001" }}
                  value={transactionForm.amount}
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      amount: e.target.value,
                    })
                  }
                  placeholder="0.001"
                />
              </Grid>

              <Grid item xs={12} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Source Vault</InputLabel>
                  <Select
                    value={transactionForm.sourceVaultId}
                    label="Source Vault"
                    onChange={(e) =>
                      setTransactionForm({
                        ...transactionForm,
                        sourceVaultId: e.target.value,
                      })
                    }
                  >
                    {vaultAccounts.map((vault) => (
                      <MenuItem key={vault.id} value={vault.id}>
                        {vault.name} (ID: {vault.id})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Destination Type:
                </Typography>
                <RadioGroup
                  row
                  value={transactionForm.destinationType}
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      destinationType: e.target.value,
                    })
                  }
                >
                  <FormControlLabel
                    value="address"
                    control={<Radio />}
                    label="External Address"
                  />
                  <FormControlLabel
                    value="vault"
                    control={<Radio />}
                    label="Another Vault"
                  />
                </RadioGroup>
              </Grid>

              {transactionForm.destinationType === "address" ? (
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Destination Address"
                    value={transactionForm.destinationAddress}
                    onChange={(e) =>
                      setTransactionForm({
                        ...transactionForm,
                        destinationAddress: e.target.value,
                      })
                    }
                    placeholder="0x3c905aC275240085FD295E8c493BF9A8aFE4cE75"
                  />
                </Grid>
              ) : (
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Destination Vault</InputLabel>
                    <Select
                      value={transactionForm.destinationVaultId}
                      label="Destination Vault"
                      onChange={(e) =>
                        setTransactionForm({
                          ...transactionForm,
                          destinationVaultId: e.target.value,
                        })
                      }
                    >
                      {vaultAccounts.map((vault) => (
                        <MenuItem key={vault.id} value={vault.id}>
                          {vault.name} (ID: {vault.id})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Note (Optional)"
                  value={transactionForm.note}
                  onChange={(e) =>
                    setTransactionForm({
                      ...transactionForm,
                      note: e.target.value,
                    })
                  }
                  placeholder="Transaction description"
                />
              </Grid>
            </Grid>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <Send />}
              onClick={createTransaction}
              disabled={loading}
              size="large"
            >
              Create Transaction
            </Button>
          </CardActions>
        </Card>
      </Grid>

      {/* Transactions List */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <SwapHoriz />
              Recent Transactions
            </Typography>
            {transactions.length === 0 ? (
              <Box textAlign="center" py={4}>
                <SwapHoriz
                  sx={{ fontSize: 64, color: "text.disabled", mb: 2 }}
                />
                <Typography variant="body1" color="text.secondary">
                  No transactions found
                </Typography>
              </Box>
            ) : (
              <List>
                {transactions.map((tx, index) => (
                  <React.Fragment key={index}>
                    <ListItem
                      sx={{
                        bgcolor: "grey.50",
                        borderRadius: 2,
                        mb: 1,
                        "&:hover": { bgcolor: "grey.100" },
                      }}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: "success.main" }}>
                          <Send />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${tx.assetId} Transaction`}
                        secondary={
                          <Box>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                ID: {tx.id}
                              </Typography>
                              <Tooltip title="Copy Transaction ID">
                                <IconButton
                                  size="small"
                                  onClick={() => copyToClipboard(tx.id)}
                                >
                                  {copiedText === tx.id ? (
                                    <Check fontSize="small" />
                                  ) : (
                                    <ContentCopy fontSize="small" />
                                  )}
                                </IconButton>
                              </Tooltip>
                            </Box>
                            {tx.note && (
                              <Typography
                                variant="body2"
                                sx={{ fontStyle: "italic", mt: 0.5 }}
                              >
                                "{tx.note}"
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <Box textAlign="right">
                        <Typography variant="body1" fontWeight={600}>
                          {tx.amount} {tx.assetId}
                        </Typography>
                        <Chip
                          label={tx.status || "UNKNOWN"}
                          size="small"
                          color={
                            tx.status === "COMPLETED"
                              ? "success"
                              : tx.status === "PENDING"
                              ? "warning"
                              : tx.status === "FAILED"
                              ? "error"
                              : "default"
                          }
                          sx={{ mt: 0.5 }}
                        />
                      </Box>
                    </ListItem>
                    {index < transactions.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Avatar sx={{ bgcolor: "secondary.main", mr: 2 }}>
            <AccountBalanceWallet />
          </Avatar>
          <Box flexGrow={1}>
            <Typography variant="h6" component="div">
              Fireblocks Manager
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              Vault & Transaction Management
            </Typography>
          </Box>
          <Tooltip title="Refresh Data">
            <IconButton
              color="inherit"
              onClick={() => {
                fetchVaultAccounts();
                fetchTransactions();
              }}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          minHeight: "100vh",
          width: "1300px",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            centered
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab icon={<Dashboard />} label="Dashboard" />
            <Tab icon={<AccountBalanceWallet />} label="Vaults & Wallets" />
            <Tab icon={<Send />} label="Transactions" />
          </Tabs>
        </Paper>

        <Fade in={true} timeout={500}>
          <Box sx={{ flex: 1 }}>
            <TabPanel value={activeTab} index={0}>
              {renderDashboard()}
            </TabPanel>
            <TabPanel value={activeTab} index={1}>
              {renderVaults()}
            </TabPanel>
            <TabPanel value={activeTab} index={2}>
              {renderTransactions()}
            </TabPanel>
          </Box>
        </Fade>
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </ThemeProvider>
  );
};

export default FireblocksApp;
