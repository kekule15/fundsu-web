"use client";

import Transaction from "./transaction";
import "../../styles/wallet.css";
import { useCampaign } from "@/context/CampaignContext";
import { useAuth } from "@/context/AuthContext";
import ConnectWalletComponent from "@/components/ConnectWalletComponent";
import TransactionView from "./transaction";
import { useTransactions } from "@/context/TransactionContext";

export function MyWallet() {
  const { campaigns, loading } = useCampaign();
  const { loading: authLoading, user, balance } = useAuth();

  const { loading: txLoading, transactions } = useTransactions();

  const deposit = () => {
    const url = "https://faucet.solana.com"; // Solana faucet URL
    window.open(url, "_blank"); // "_blank" makes it open in new tab
  };

  const withdraw = () => {
    alert("Tranfer functionality coming soon!");
  };

  if (!user) {
    return <ConnectWalletComponent />;
  }

  return (
    <div className="wallet-page">
      {/* Wallet Section */}
      <div className="wallet-section card">
        <h2 className="section-title">My Wallet</h2>

        <div className="wallet-info">
          <p className="wallet-address">
            <span className="label">Address:</span> {user.wallet_address}
          </p>
          <p className="wallet-balance">
            <span className="label">Balance:</span> {balance} SOL
          </p>
        </div>

        <div className="wallet-buttons">
          <button className="wallet-btn deposit-btn" onClick={deposit}>
            Deposit
          </button>
          <button className="wallet-btn withdraw-btn" onClick={withdraw}>
            Transfer
          </button>
        </div>
      </div>

      {/* Transaction Section */}
      <div className="transaction-section card">
        <h2 className="section-title">Transaction History</h2>
        <TransactionView transactions={transactions} />
      </div>
    </div>
  );
}
