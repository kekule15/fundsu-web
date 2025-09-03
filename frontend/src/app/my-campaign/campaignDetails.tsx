"use client";
import { useEffect, useState } from "react";
import { UserProfile } from "@/types/user";
import { Campaign } from "@/types/campaign";
import "../../styles/campaignDetails.css";
import Transaction from "../wallet/transaction"; // Assuming you have this component
import { useAuth } from "@/context/AuthContext";
import { useTransactions } from "@/context/TransactionContext";
import TransactionView from "../wallet/transaction";
import { lamportsToSol } from "@/utils/converters";
import { useCampaign } from "@/context/CampaignContext";
import { defaultCampaignImage } from "@/utils/media_files";
import { useSidebar } from "@/context/SidebarContext";
import { SidebarPages } from "@/utils/sidebar_utils";

export default function CampaignDetails() {
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [supportAmount, setSupportAmount] = useState("");

  const [externalUserState, setExternalUserState] = useState(false);
  const [externalUser, setExternalUserProfile] = useState<UserProfile | null>(
    null
  );

  const { balance, user, getUserProfile } = useAuth();

  const { loading: txLoading, transactions } = useTransactions();
  const { setActiveItem, toggleSidebar } = useSidebar();

  const {
    contributeToCampaign,
    contributeState,
    selectCampaignState,
    refreshCampaign,
    selectedCampaign,
    manualSync,
    withdrawFromCampaign,
    withdrawState,
  } = useCampaign();

  const handleSupportClick = () => {
    if (user) {
      setShowSupportDialog(true);
    } else {
      // Handle case where user is not logged in
      alert("Please connect your wallet to support this campaign");
    }
  };

  useEffect(() => {
    if (campaign.author !== null) {
      try {
        setExternalUserState(true);
        getUserProfile(campaign.author).then((profile) => {
          setExternalUserProfile(profile);
          setExternalUserState(false);
        });
      } catch (error) {
        console.error("Error fetching external user profile:", error);
        setExternalUserProfile(null);
        setExternalUserState(false);
      }
    }
  }, [selectedCampaign?.author]);

  const handleDonate = async () => {
    const amount = parseFloat(supportAmount);
    if (amount <= balance && user !== null) {
      if (amount > 0) {
        // onSupport(amount);
        try {
          await contributeToCampaign(
            campaign.campaign_wallet_key,
            amount,
            campaign?.author,
            campaign.id,
            campaign.title
          ).then(() => {
            refreshCampaign();
          });
          alert(`Contribution Success!:`);
          setShowSupportDialog(false);
          setSupportAmount("");
        } catch (err) {
          console.error("Error contributing:", err);
          alert(`${err}.`);
        } finally {
          // Manually sync data after a successful contribution
          await manualSync();
        }
      } else {
        alert("Invalid amount");
      }
    } else {
      alert("Insufficient balance");
    }
  };

  const handleWithdrawal = async () => {
    try {
      await withdrawFromCampaign(
        campaign.campaign_wallet_key,
        campaign.title,
        campaign.current_amount
      ).then(() => {
        refreshCampaign();
      });
      alert(`Withdrawal Success!  Check your wallet.`);
    } catch (err) {
      console.error("Error contributing:", err);
      alert(`${err}.`);
    } finally {
      // Manually sync data after a successful contribution
      await manualSync();
    }
  };

  if (!selectedCampaign) {
    return <div className="campaign-details">No campaign selected.</div>;
  }
  if (selectCampaignState) {
    return <div className="campaign-details">Loading campaign...</div>;
  }

  const campaign = selectedCampaign;

  const isAuthor = user?.wallet_address === campaign.author;
  const canWithdraw =
    isAuthor &&
    (!campaign.locked || campaign.current_amount >= campaign.target_amount);
  const percentFunded =
    (campaign.current_amount / campaign.target_amount) * 100;

  // Filter transactions related to this campaign
  const campaignTransactions = transactions.filter(
    (tx) => tx.campaign_id === campaign.campaign_wallet_key
  );

 

  return (
    <div className="campaign-details">
      {/* Support Dialog */}
      {showSupportDialog && (
        <div className="support-dialog-overlay">
          <div className="support-dialog">
            <h3>Support This Campaign</h3>
            <div className="dialog-campaign-info">
              <p>
                <strong>{campaign.title}</strong>
              </p>
              <p>Target: {lamportsToSol(campaign.target_amount)} SOL</p>
              <p>
                Raised: {lamportsToSol(campaign.current_amount)} SOL (
                {Math.round(percentFunded)}%)
              </p>
            </div>

            <div className="balance-info">
              <p>Your Balance: {balance || 0} SOL</p>
            </div>

            <div className="amount-input">
              <label htmlFor="support-amount">Amount to donate (SOL):</label>
              <input
                type="number"
                id="support-amount"
                value={supportAmount}
                onChange={(e) => setSupportAmount(e.target.value)}
                min="0"
                max={lamportsToSol(campaign?.target_amount) || 0}
                step="0.01"
              />
            </div>

            <div className="dialog-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowSupportDialog(false)}
                disabled={contributeState}
              >
                Cancel
              </button>
              <button
                className="donate-btn"
                onClick={handleDonate}
                disabled={
                  !supportAmount ||
                  (parseFloat(supportAmount) <= 0 && contributeState)
                }
              >
                {contributeState ? <span className="loader"></span> : "Donate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header with back button and title */}
      <div className="campaign-header">
        <h1 className="details-title">{campaign.title}</h1>
      </div>

      {/* Campaign image */}
      <div className="image-container">
        <img
          src={campaign.image_url || defaultCampaignImage}
          alt={campaign.title}
          className="details-image"
        />
      </div>

      {/* Campaign details */}
      <div className="campaign-info">
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Target Amount:</span>
            <span className="info-value">
              {lamportsToSol(campaign.target_amount)} SOL
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Raised:</span>
            <span className="info-value">
              {lamportsToSol(campaign.current_amount)} SOL
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Progress:</span>
            <span className="info-value">{Math.round(percentFunded)}%</span>
          </div>
          <div className="info-item">
            <span className="info-label">No of Contributions:</span>
            <span className="info-value">
              {campaign.contributors_count || 0}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Likes:</span>
            <span className="info-value">{campaign.likes || 0}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Status:</span>
            <span className="info-value">
              {campaign.closed
                ? "Closed"
                : campaign.locked
                ? "Locked"
                : "Active"}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${percentFunded}%` }}
            ></div>
          </div>
          <div className="progress-text">
            <span>
              {lamportsToSol(campaign.current_amount)} SOL raised of{" "}
              {lamportsToSol(campaign.target_amount)} SOL
            </span>
            <span>{Math.round(percentFunded)}%</span>
          </div>
        </div>

        {/* Campaign description */}
        <div className="description-section">
          <h3>About this campaign</h3>
          <p>{campaign.description}</p>
        </div>

        {/* Author info ... if the external user is not null show this else it should be empty */}

        {isAuthor && user ? (
          <>
            <div className="author-section">
              <h3>Campaign Author</h3>
              <div className="author-info">
                <div className="author-avatar">
                  <img src={user.profile_url} alt={user.name || "Anonymous"} />
                </div>
                <div className="author-details">
                  <h4>{user.name || "Anonymous"}</h4>
                  <p className="wallet-address">
                    {campaign.author.substring(0, 8)}...
                    {campaign.author.substring(campaign.author.length - 4)}
                  </p>
                  {user.bio && <p className="author-bio">{user.bio}</p>}
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {externalUserState ? (
              <>
                <span className="loader"></span>
              </>
            ) : (
              <>
                {externalUser !== null && (
                  <div className="author-section">
                    <h3>Campaign Author</h3>
                    <div className="author-info">
                      <div className="author-avatar">
                        <img
                          src={externalUser.profile_url}
                          alt={externalUser.name || "Anonymous"}
                        />
                      </div>
                      <div className="author-details">
                        <h4>{externalUser.name || "Anonymous"}</h4>
                        <p className="wallet-address">
                          {campaign.author.substring(0, 8)}...
                          {campaign.author.substring(
                            campaign.author.length - 4
                          )}
                        </p>
                        {externalUser.bio && (
                          <p className="author-bio">{externalUser.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Action buttons */}
        {user ? (
          <div className="action-buttons">
            {isAuthor && canWithdraw && campaign.closed == false && (
              <button
                className="withdraw-btn"
                onClick={() => {
                  handleWithdrawal();
                }}
              >
                {withdrawState ? (
                  <span className="loader"></span>
                ) : (
                  "Withdraw Funds"
                )}
              </button>
            )}
            {campaign.closed === false && campaign.locked === true && (
              <>  
                <button className="support-btn" onClick={handleSupportClick}>
                  <span className="heart-icon">❤️</span> Support this Campaign
                </button>
              </>
            )}

            {campaign.closed === true && (
              <>
               <div
                  className="status-icon closed-icon"
                  title="Campaign is closed"
                >
                  ✓
                </div>
                <div className="closed-badge">This campaign is closed</div>
               
              </>
            )}
          </div>
        ) : (
          <div className="action-buttons">
            <button
              className="connect-wallet-btn"
              onClick={() => {
                setActiveItem(SidebarPages.WALLET);
              }}
            >
              Please connect wallet to Interact
            </button>
          </div>
        )}
      </div>

      {/* Transaction Section */}
      <div className="transaction-section">
        <h2 className="section-title">Transaction History</h2>
        <TransactionView transactions={campaignTransactions} />
      </div>
    </div>
  );
}
