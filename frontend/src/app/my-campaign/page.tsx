"use client";

import { useState, useMemo } from "react";
import { CampaignCard } from "@/components/CampaignCard";
import CampaignDetails from "./campaignDetails";
import CreateCampaign from "./createCampaign";
import "../../styles/myCampaign.css";
import { useCampaign } from "@/context/CampaignContext";
import { useAuth } from "@/context/AuthContext";
import ConnectWalletComponent from "@/components/ConnectWalletComponent";
import { MyCampaignsInternalViews, useSidebar } from "@/context/SidebarContext";
import type { Campaign } from "@/types/campaign";
import { lamportsToSol } from "@/utils/converters";

export default function MyCampaigns() {
  const { loading: authLoading, user, getUserProfile } = useAuth();

  if (!user) {
    return <ConnectWalletComponent />;
  }

  const { userCampaigns, loading, selectCampaign, selectedCampaign } =
    useCampaign();
  const { internalView, navigateToInternalView, goBack, internalViewHistory } =
    useSidebar();

  const handleCampaignClick = async (campaign: Campaign) => {
    selectCampaign(campaign);

    navigateToInternalView(
      MyCampaignsInternalViews.CAMPAIGN_DETAILS,
      "Campaign details"
    );
  };

  // === Insights / Metrics ===
  const { activeCampaigns, completedCampaigns, totalRaised } = useMemo(() => {
    const active = userCampaigns.filter((c) => c.locked && !c.closed);
    const completed = userCampaigns.filter((c) => !c.locked || c.closed);

    const raised = userCampaigns.reduce(
      (sum, c) => sum + (c.current_amount || 0),
      0
    );
    // For now, assuming "totalContributed" = sum of contributions across campaigns where user contributed.
    // If you track contributions separately, you can refine this.
    // const contributed = userCampaigns
    //   .filter((c) => c.contributors_count && c.contributors_count > 0)
    //   .reduce((sum, c) => sum + (c.current_amount || 0), 0);

    return {
      activeCampaigns: active,
      completedCampaigns: completed,
      totalRaised: raised,
    };
  }, [userCampaigns]);

  if (loading)
    return <div className="loading-text">Loading your campaigns...</div>;

  return (
    <>
      {internalView === MyCampaignsInternalViews.CREATE_CAMPAIGN && (
        <CreateCampaign onBack={goBack} /> // Pass goBack directly, not as lambda
      )}

      {internalView === MyCampaignsInternalViews.CAMPAIGN_DETAILS &&
        selectedCampaign && <CampaignDetails />}

      {internalViewHistory.length === 0 && internalView === "list" && (
        <div className="my-campaigns-page">
          {/* Insights Section */}
          <div className="insights-grid">
            <div className="insight-card">
              <h3>Total Campaigns</h3>
              <p>{userCampaigns.length}</p>
            </div>
            <div className="insight-card">
              <h3>Active Campaigns</h3>
              <p>{activeCampaigns.length}</p>
            </div>
            <div className="insight-card">
              <h3>Completed Campaigns</h3>
              <p>{completedCampaigns.length}</p>
            </div>
            <div className="insight-card">
              <h3>Total Raised</h3>
              <p>{lamportsToSol(totalRaised)} SOL</p>
            </div>
            <div className="insight-card">
              <h3>Your Contributions</h3>
              <p>{lamportsToSol(user.total_contributions ?? 0)} SOL</p>
            </div>
          </div>

          {/* Active Campaigns */}
          <section>
            <h2 className="section-title">Active Campaigns</h2>
            <div className="campaign-grid">
              {activeCampaigns.map((c) => (
                <div key={c.id} onClick={() => handleCampaignClick(c)}>
                  <CampaignCard campaign={c} />
                </div>
              ))}
            </div>
          </section>

          {/* Completed Campaigns */}
          <section>
            {completedCampaigns.length !== 0 && (
              <>
                <h2 className="section-title">Completed Campaigns</h2>
                <div className="campaign-grid">
                  {completedCampaigns.map((c) => (
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
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
}
