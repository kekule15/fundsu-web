"use client";

import { MyCampaignsInternalViews, useSidebar } from "@/context/SidebarContext";
import "../styles/internalNavBar.css";
import { SidebarPages } from "@/utils/sidebar_utils";
import { useAuth } from "@/context/AuthContext";

export function InternalNavBar() {
  const {
    activeItem,
    internalView,
    internalViewHistory,
    goBack,
    currentViewTitle,
    navigateToInternalView,
  } = useSidebar();
  const { user } = useAuth();

  // Don't show internal nav bar on Wallet page if in view mode
  if (activeItem === SidebarPages.WALLET || activeItem === SidebarPages.PROFILE)
    return null;

  return (
    <div className="internal-nav-bar">
      {internalViewHistory.length > 0 && (
        <button className="back-button" onClick={goBack}>
          ← Back
        </button>
      )}

      <div className="nav-title-container">
        <h1 className="internal-nav-title">{currentViewTitle}</h1>

        {activeItem === SidebarPages.MY_CAMPAIGNS &&
          internalViewHistory.length === 0 &&
          user !== null && (
            <button
              className="create-btn"
              onClick={() =>
                navigateToInternalView(
                  MyCampaignsInternalViews.CREATE_CAMPAIGN,
                  "Create Campaign"
                )
              }
            >
              + Create Campaign
            </button>
          )}
      </div>
    </div>
  );
}
