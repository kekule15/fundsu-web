"use client";
import { useState } from "react";
import { CampaignCard } from "@/components/CampaignCard";
import "../../styles/feed.css";
import CampaignDetails from "../my-campaign/campaignDetails";
import { useCampaign } from "@/context/CampaignContext";
import { FeedsInternalViews, useSidebar } from "@/context/SidebarContext";
import { Campaign } from "@/types/campaign";
import { useAuth } from "@/context/AuthContext";
import { useWalletGeneration } from "@/context/WalletGenerationContext";

export default function Feed() {
  const { user } = useAuth();

  const { campaigns, loading, selectCampaign, selectedCampaign, manualSync } =
    useCampaign();
  const { internalView, navigateToInternalView, goBack } = useSidebar();

  const { restoreFromStorage, silentlyRestoreFromStorage } =
    useWalletGeneration();

  // Filter campaigns to only show locked ones (target not met yet)
  const lockedCampaigns = campaigns.filter(
    (campaign) => campaign.locked === true
  );

  const handleCampaignClick = async (campaign: any) => {
    // await silentlyRestoreFromStorage();
    // let result = await manualSync();
    // console.log("Manual sync result:", result);
    selectCampaign(campaign);

    navigateToInternalView(
      FeedsInternalViews.CAMPAIGN_DETAILS,
      "Campaign details"
    );
  };

  if (loading) return <div className="loading-text">Loading campaigns...</div>;

  return (
    <>
      {internalView === FeedsInternalViews.CAMPAIGN_DETAILS ? (
        <CampaignDetails />
      ) : (
        <>
          {lockedCampaigns.length === 0 && (
            <div className="no-campaigns">
              <p>No active campaigns at the moment. Check back later!</p>
            </div>
          )}
          <div className="feed-home">
            {lockedCampaigns.length > 0 && (
              <section>
                <h1 className="feed-title">All Campaigns</h1>
                <div className="campaign-grid">
                  {lockedCampaigns.map((c) => (
                    <div
                      key={c.id}
                      onClick={async () => {
                        handleCampaignClick(c);
                      }}
                    >
                      <CampaignCard campaign={c} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </>
      )}
    </>
  );
}
