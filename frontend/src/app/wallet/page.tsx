"use client";

import Transaction from "./transaction";
import "../../styles/wallet.css";
import { useCampaign } from "@/context/CampaignContext";
import { useAuth } from "@/context/AuthContext";
import ConnectWalletComponent from "@/components/ConnectWalletComponent";
import TransactionView from "./transaction";
import { useTransactions } from "@/context/TransactionContext";
import { useState } from "react";

export default function MyWallet() {
  const { campaigns, loading } = useCampaign();
  const { loading: authLoading, user, balance } = useAuth();

  const { loading: txLoading, transactions } = useTransactions();
   const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

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

   // Filter transactions related to this campaign
  const filteredTransactions = transactions.filter(
    (tx) =>
      user &&
      (tx.user_id === user.wallet_address || tx.recipient_user_id === user.wallet_address)
  );

    const truncateAddress = (hash: string) => {
    if (!hash) return "";
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
  };

  const copyAddress = async (hash?: string) => {
    if (!hash) return;
    try {
      if (navigator?.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(hash);
      } else {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = hash;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopiedAddress(hash);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="wallet-page">
      {/* Wallet Section */}
      <div className="wallet-section card">
        <h2 className="section-title">My Wallet</h2>

        <div className="wallet-info">
            <div className="wallet-detail">
              <span className="detail-label">Address:</span>
              <div className="wallet-address-wrapper">
                <span className="wallet-address" title={user.wallet_address}>
                  {truncateAddress(user.wallet_address)}
                </span>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => copyAddress(user.wallet_address)}
                  aria-label="Copy wallet address"
                >
                  {copiedAddress === user.wallet_address ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
            <div className="wallet-detail">
              <span className="detail-label">Balance:</span>
              <span className="wallet-balance">{balance} SOL</span>
            </div>
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
        <TransactionView transactions={filteredTransactions} />
      </div>
    </div>
  );
}
