"use client";

import { useEffect, useState } from "react";
import { Transaction, TransactionType } from "@/types/transaction";
import { useAuth } from "@/context/AuthContext";
import { UserProfile } from "@/types/user";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Coins,
  Gift,
  DollarSign,
  Users,
  AlertCircle,
} from "lucide-react";
// css
import "../../styles/transaction.css";
import { normalizeTimestamp } from "@/utils/app_helpers";
import { lamportsToSol } from "@/utils/converters";

interface TransactionViewProps {
  transactions: Transaction[];
}

export default function TransactionView({ transactions }: TransactionViewProps) {
  const { user, getUserProfile } = useAuth();
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      const uniqueUserIds = new Set<string>();

      transactions.forEach((tx) => {
        if (tx.user_id && tx.user_id !== user?.wallet_address) {
          uniqueUserIds.add(tx.user_id);
        }
        if (tx.recipient_user_id && tx.recipient_user_id !== user?.wallet_address) {
          uniqueUserIds.add(tx.recipient_user_id);
        }
      });

      const profileMap: Record<string, UserProfile> = {};
      for (const uid of uniqueUserIds) {
        try {
          const profile = await getUserProfile(uid);
          if (profile) profileMap[uid] = profile;
        } catch (err) {
          console.error("Failed to fetch profile:", err);
        }
      }
      setProfiles(profileMap);
    };

    fetchProfiles();
  }, [transactions, user?.wallet_address, getUserProfile]);

  // Only show transactions where the current user is involved
  const filteredTransactions = transactions.filter(
    (tx) =>
      user &&
      (tx.user_id === user.wallet_address || tx.recipient_user_id === user.wallet_address)
  );

  const getIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.CONTRIBUTION:
        return <Coins className="tx-icon contribution" />;
      case TransactionType.DEPOSIT:
        return <ArrowDownCircle className="tx-icon deposit" />;
      case TransactionType.WITHDRAW:
        return <ArrowUpCircle className="tx-icon withdraw" />;
      case TransactionType.CAMPAIGN_CREATED:
        return <Users className="tx-icon created" />;
      case TransactionType.CAMPAIGN_CLOSED:
        return <AlertCircle className="tx-icon closed" />;
      case TransactionType.TRANSFER:
        return <DollarSign className="tx-icon transfer" />;
      case TransactionType.REWARD:
        return <Gift className="tx-icon reward" />;
      case TransactionType.FEE:
        return <DollarSign className="tx-icon fee" />;
      default:
        return <AlertCircle className="tx-icon" />;
    }
  };

  // Robust date normalization: accepts number (s or ms), Firestore Timestamp (toMillis), ISO string
 

  const formatDate = (timestamp: any) => {
    const ms = normalizeTimestamp(timestamp);
    if (!ms) return "Unknown date";
    const d = new Date(ms);
    return d.toLocaleString();
  };

  const truncateHash = (hash: string) => {
    if (!hash) return "";
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}…${hash.slice(-6)}`;
  };

  const copyHash = async (hash?: string) => {
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
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  if (!user) {
    return <p className="empty-text">Please connect your wallet to view transactions.</p>;
  }

  return (
    <div className="transaction-list">
      {filteredTransactions.length === 0 ? (
        <p className="empty-text">No transactions yet.</p>
      ) : (
        filteredTransactions.map((tx) => {
          const initiator =
            tx.user_id === user.wallet_address
              ? "You"
              : profiles[tx.user_id]?.name || (tx.user_id ? tx.user_id.slice(0, 6) + "..." : "Unknown");

          const recipient =
            tx.recipient_user_id === user.wallet_address
              ? "You"
              : profiles[tx.recipient_user_id || ""]?.name ||
                (tx.recipient_user_id ? tx.recipient_user_id.slice(0, 6) + "..." : null);

          return (
            <div key={tx.id} className="transaction-card" role="listitem">
              <div className="tx-icon-container">{getIcon(tx.type)}</div>

              <div className="tx-content">
                <div className="tx-header">
                  <span className="tx-type">{tx.type.replace(/_/g, " ")}</span>
                  <span className="tx-date">{formatDate(tx.date)}</span>
                </div>

                <div className="tx-details">
                  <span className="tx-user">
                    {initiator}
                    {recipient ? ` → ${recipient}` : ""}
                  </span>

                  {tx.amount ? <span className="tx-amount">{lamportsToSol(tx.amount)} SOL</span> : null}
                </div>

                {tx.tx_hash && (
                  <div className="tx-meta">
                    <span className="tx-hash" title={tx.tx_hash}>
                      {truncateHash(tx.tx_hash)}
                    </span>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => copyHash(tx.tx_hash)}
                      aria-label="Copy transaction hash"
                    >
                      {copiedHash === tx.tx_hash ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}

                {tx.description && <p className="tx-description">{tx.description}</p>}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
