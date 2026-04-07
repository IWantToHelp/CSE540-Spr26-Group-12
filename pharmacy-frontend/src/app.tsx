import React, { useState } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0xYourContractAddressHere";

const CONTRACT_ABI: any[] = [];

const STATUS_OPTIONS = [
  { value: 0, label: "Manufactured" },
  { value: 1, label: "In Transit" },
  { value: 2, label: "In Warehouse" },
  { value: 3, label: "In Pharmacy" },
  { value: 4, label: "Sold" },
  { value: 5, label: "Recalled" },
  { value: 6, label: "Expired" },
];

const ROLE_OPTIONS = [
  { value: 1, label: "Manufacturer" },
  { value: 2, label: "Distributor" },
  { value: 3, label: "Pharmacy" },
  { value: 4, label: "Regulator" },
];

function roleLabel(value: number | null) {
  if (value === null) return "Unknown";
  const match = ROLE_OPTIONS.find((r) => r.value === value);
  return match ? match.label : "None";
}

function statusLabel(value: number) {
  const match = STATUS_OPTIONS.find((s) => s.value === value);
  return match ? match.label : "Unknown";
}

function formatDateFromUnix(ts?: bigint) {
  if (!ts) return "-";
  return new Date(Number(ts) * 1000).toLocaleString();
}

function inputDateToUnix(value: string) {
  if (!value) return 0;
  return Math.floor(new Date(value).getTime() / 1000);
}

function App() {
  const [walletAddress, setWalletAddress] = useState("");
  const [walletRole, setWalletRole] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [searchProductId, setSearchProductId] = useState("");
  const [product, setProduct] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);

  const [roleAddress, setRoleAddress] = useState("");
  const [roleValue, setRoleValue] = useState("1");

  const [registerForm, setRegisterForm] = useState({
    name: "",
    batchNumber: "",
    manufactureDate: "",
    expiryDate: "",
    manufacturer: "",
  });

  const [statusForm, setStatusForm] = useState({
    productId: "",
    newStatus: "2",
    note: "",
  });

  const [transferForm, setTransferForm] = useState({
    productId: "",
    newOwner: "",
    note: "",
  });

  const [recallForm, setRecallForm] = useState({
    productId: "",
    reason: "",
  });

  async function getContract(useSigner = false) {
    const eth = (window as any).ethereum;
    if (!eth) throw new Error("MetaMask is not installed.");
    if (!CONTRACT_ABI.length) {
      throw new Error("Please paste your contract ABI into CONTRACT_ABI.");
    }

    const provider = new ethers.BrowserProvider(eth);
    const signerOrProvider = useSigner ? await provider.getSigner() : provider;
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
  }

  async function connectWallet() {
    setMessage("");
    setError("");
    try {
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("MetaMask is not installed.");

      const provider = new ethers.BrowserProvider(eth);
      const accounts = await provider.send("eth_requestAccounts", []);
      const account = accounts[0];
      setWalletAddress(account);

      if (CONTRACT_ABI.length) {
        const contract = await getContract(false);
        const role = await contract.roles(account);
        setWalletRole(Number(role));
      }

      setMessage("Wallet connected.");
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet.");
    }
  }

  async function loadProductData() {
    setMessage("");
    setError("");
    try {
      if (!searchProductId) throw new Error("Enter a product ID.");
      const contract = await getContract(false);

      const fetchedProduct = await contract.getProduct(searchProductId);
      const fetchedHistory = await contract.getProductHistory(searchProductId);

      setProduct({
        id: fetchedProduct.id,
        name: fetchedProduct.name,
        batchNumber: fetchedProduct.batchNumber,
        manufactureDate: fetchedProduct.manufactureDate,
        expiryDate: fetchedProduct.expiryDate,
        manufacturer: fetchedProduct.manufacturer,
        currentOwner: fetchedProduct.currentOwner,
        status: Number(fetchedProduct.status),
        exists: fetchedProduct.exists,
      });

      setHistory(
        fetchedHistory.map((entry: any) => ({
          actor: entry.actor,
          status: Number(entry.status),
          from: entry.from,
          to: entry.to,
          timestamp: entry.timestamp,
          note: entry.note,
        }))
      );

      setMessage(`Loaded product #${searchProductId}.`);
    } catch (err: any) {
      setProduct(null);
      setHistory([]);
      setError(err.message || "Failed to load product.");
    }
  }

  async function runTransaction(action: () => Promise<any>, successText: string) {
    setMessage("");
    setError("");
    try {
      const tx = await action();
      await tx.wait();
      setMessage(successText);
    } catch (err: any) {
      setError(err.reason || err.message || "Transaction failed.");
    }
  }

  async function assignRole() {
    const contract = await getContract(true);
    await runTransaction(
      () => contract.assignRole(roleAddress, Number(roleValue)),
      "Role assigned."
    );
  }

  async function registerProduct() {
    const contract = await getContract(true);
    await runTransaction(
      () =>
        contract.registerProduct(
          registerForm.name,
          registerForm.batchNumber,
          inputDateToUnix(registerForm.manufactureDate),
          inputDateToUnix(registerForm.expiryDate),
          registerForm.manufacturer
        ),
      "Product registered."
    );
  }

  async function updateStatus() {
    const contract = await getContract(true);
    await runTransaction(
      () =>
        contract.updateStatus(
          Number(statusForm.productId),
          Number(statusForm.newStatus),
          statusForm.note
        ),
      "Status updated."
    );
  }

  async function transferOwnership() {
    const contract = await getContract(true);
    await runTransaction(
      () =>
        contract.transferOwnership(
          Number(transferForm.productId),
          transferForm.newOwner,
          transferForm.note
        ),
      "Ownership transferred."
    );
  }

  async function recallProduct() {
    const contract = await getContract(true);
    await runTransaction(
      () => contract.recallProduct(Number(recallForm.productId), recallForm.reason),
      "Product recalled."
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1>Pharmacy Supply Chain Dashboard</h1>
        <p>Track products, transfer ownership, and view blockchain history.</p>

        <div style={styles.card}>
          <button style={styles.button} onClick={connectWallet}>
            Connect MetaMask
          </button>
          <p><b>Wallet:</b> {walletAddress || "Not connected"}</p>
          <p><b>Role:</b> {roleLabel(walletRole)}</p>
          <p><b>Contract:</b> {CONTRACT_ADDRESS}</p>
        </div>

        {message && <div style={styles.success}>{message}</div>}
        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.card}>
          <h2>Product Lookup</h2>
          <input
            style={styles.input}
            placeholder="Enter Product ID"
            value={searchProductId}
            onChange={(e) => setSearchProductId(e.target.value)}
          />
          <button style={styles.button} onClick={loadProductData}>
            View Product
          </button>

          {product && (
            <div style={{ marginTop: 16 }}>
              <h3>Product #{String(product.id)}</h3>
              <p><b>Name:</b> {product.name}</p>
              <p><b>Batch:</b> {product.batchNumber}</p>
              <p><b>Manufacturer:</b> {product.manufacturer}</p>
              <p><b>Owner:</b> {product.currentOwner}</p>
              <p><b>Status:</b> {statusLabel(product.status)}</p>
              <p><b>Manufacture Date:</b> {formatDateFromUnix(product.manufactureDate)}</p>
              <p><b>Expiry Date:</b> {formatDateFromUnix(product.expiryDate)}</p>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <h2>Product History</h2>
          {history.length === 0 ? (
            <p>No history loaded yet.</p>
          ) : (
            history.map((entry, index) => (
              <div key={index} style={styles.historyItem}>
                <p><b>Status:</b> {statusLabel(entry.status)}</p>
                <p><b>Actor:</b> {entry.actor}</p>
                <p><b>From:</b> {entry.from}</p>
                <p><b>To:</b> {entry.to}</p>
                <p><b>Time:</b> {formatDateFromUnix(entry.timestamp)}</p>
                <p><b>Note:</b> {entry.note || "-"}</p>
              </div>
            ))
          )}
        </div>

        <div style={styles.grid}>
          <div style={styles.card}>
            <h2>Assign Role</h2>
            <input
              style={styles.input}
              placeholder="Wallet address"
              value={roleAddress}
              onChange={(e) => setRoleAddress(e.target.value)}
            />
            <select
              style={styles.input}
              value={roleValue}
              onChange={(e) => setRoleValue(e.target.value)}
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <button style={styles.button} onClick={assignRole}>
              Assign Role
            </button>
          </div>

          <div style={styles.card}>
            <h2>Register Product</h2>
            <input
              style={styles.input}
              placeholder="Product name"
              value={registerForm.name}
              onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="Batch number"
              value={registerForm.batchNumber}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, batchNumber: e.target.value })
              }
            />
            <input
              style={styles.input}
              type="date"
              value={registerForm.manufactureDate}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, manufactureDate: e.target.value })
              }
            />
            <input
              style={styles.input}
              type="date"
              value={registerForm.expiryDate}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, expiryDate: e.target.value })
              }
            />
            <input
              style={styles.input}
              placeholder="Manufacturer name"
              value={registerForm.manufacturer}
              onChange={(e) =>
                setRegisterForm({ ...registerForm, manufacturer: e.target.value })
              }
            />
            <button style={styles.button} onClick={registerProduct}>
              Register Product
            </button>
          </div>

          <div style={styles.card}>
            <h2>Update Status</h2>
            <input
              style={styles.input}
              placeholder="Product ID"
              value={statusForm.productId}
              onChange={(e) => setStatusForm({ ...statusForm, productId: e.target.value })}
            />
            <select
              style={styles.input}
              value={statusForm.newStatus}
              onChange={(e) => setStatusForm({ ...statusForm, newStatus: e.target.value })}
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <input
              style={styles.input}
              placeholder="Note"
              value={statusForm.note}
              onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
            />
            <button style={styles.button} onClick={updateStatus}>
              Update Status
            </button>
          </div>

          <div style={styles.card}>
            <h2>Transfer Ownership</h2>
            <input
              style={styles.input}
              placeholder="Product ID"
              value={transferForm.productId}
              onChange={(e) => setTransferForm({ ...transferForm, productId: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="New owner address"
              value={transferForm.newOwner}
              onChange={(e) => setTransferForm({ ...transferForm, newOwner: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="Note"
              value={transferForm.note}
              onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
            />
            <button style={styles.button} onClick={transferOwnership}>
              Transfer Ownership
            </button>
          </div>

          <div style={styles.card}>
            <h2>Recall Product</h2>
            <input
              style={styles.input}
              placeholder="Product ID"
              value={recallForm.productId}
              onChange={(e) => setRecallForm({ ...recallForm, productId: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="Recall reason"
              value={recallForm.reason}
              onChange={(e) => setRecallForm({ ...recallForm, reason: e.target.value })}
            />
            <button style={styles.button} onClick={recallProduct}>
              Recall Product
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  card: {
    background: "white",
    border: "1px solid #ddd",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "20px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    boxSizing: "border-box",
  },
  button: {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    marginTop: "6px",
  },
  success: {
    background: "#ecfdf5",
    border: "1px solid #a7f3d0",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
  },
  error: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "16px",
    color: "#991b1b",
  },
  historyItem: {
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    padding: "12px",
    marginBottom: "12px",
    background: "#fafafa",
  },
};

export default App;
