"use client";

import { createContext, useContext, useState, ReactNode } from "react";

// Define internal view enums for each sidebar item
export const FeedsInternalViews = {
  LIST: "list",
  CAMPAIGN_DETAILS: "campaignDetails",
} as const;

export const MyCampaignsInternalViews = {
  LIST: "list",
  CAMPAIGN_DETAILS: "campaignDetails",
  CREATE_CAMPAIGN: "createCampaign",
} as const;

export const ProfileInternalViews = {
  VIEW: "view",
  EDIT: "edit",
  SETTINGS: "settings",
} as const;

export const WalletInternalViews = {
  VIEW: "view",
  DEPOSIT: "deposit",
  WITHDRAW: "withdraw",
  TRANSACTIONS: "transactions",
} as const;

interface ViewHistoryItem {
  view: string;
  title: string;
  sidebarItem: string;
}

interface SidebarContextType {
  activeItem: string;
  setActiveItem: (item: string) => void;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  // Internal navigation properties
  internalView: string;
  internalViewHistory: ViewHistoryItem[];
  navigateToInternalView: (viewName: string, viewTitle: string) => void;
  goBack: () => void;
  currentViewTitle: string;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [activeItem, setActiveItemState] = useState("Feeds");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // New state for internal navigation
  const [internalView, setInternalView] = useState("list");
  const [internalViewHistory, setInternalViewHistory] = useState<ViewHistoryItem[]>([]);
  const [currentViewTitle, setCurrentViewTitle] = useState("Feeds");

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Set active item and reset internal navigation
  const setActiveItem = (item: string) => {
    setActiveItemState(item);
    setInternalView("list");
    setInternalViewHistory([]);
    setCurrentViewTitle(item);
  };

  const navigateToInternalView = (viewName: string, viewTitle: string) => {
    // Add current state to history
    setInternalViewHistory(prev => [
      ...prev, 
      { 
        view: internalView, 
        title: currentViewTitle,
        sidebarItem: activeItem
      }
    ]);
    setInternalView(viewName);
    setCurrentViewTitle(viewTitle);

    console.log("Active item during navigation:", activeItem);
  };

  const goBack = () => {
    if (internalViewHistory.length > 0) {
      const previousView = internalViewHistory[internalViewHistory.length - 1];
      setInternalViewHistory(prev => prev.slice(0, -1));
      setInternalView(previousView.view);
      setCurrentViewTitle(previousView.title);
      
      // If we're going back to a different sidebar item, switch active item
      if (previousView.sidebarItem !== activeItem) {
        setActiveItemState(previousView.sidebarItem);
      }
    }
  };

  return (
    <SidebarContext.Provider
      value={{
        activeItem,
        setActiveItem,
        isSidebarOpen,
        toggleSidebar,
        internalView,
        internalViewHistory,
        navigateToInternalView,
        goBack,
        currentViewTitle
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}