"use client";

import { useSidebar } from "@/context/SidebarContext";


import Settings from "./settings/page";
import { Sidebar } from "@/components/SideBar";
import { FloatingRight } from "@/components/FloatingRight";

import "../styles/homepage.css"; // Homepage-specific layout styles
import { JSX } from "react";
import { SidebarPage, SidebarPages } from "@/utils/sidebar_utils";
import { InternalNavBar } from "@/components/InternalNavBar";
import Feed from "./feed/feed";
import MyCampaigns from "./my-campaign/page";
import MyWallet from "./wallet/page";
import Profile from "./profile/page";


export default function HomePage() {
  const { activeItem } = useSidebar();

  const pageMap: Record<SidebarPage, JSX.Element> = {
    [SidebarPages.FEEDS]: <Feed />,
    [SidebarPages.MY_CAMPAIGNS]: <MyCampaigns />,
    [SidebarPages.WALLET]: <MyWallet />,
    [SidebarPages.PROFILE]: <Profile />,
    //[SidebarPages.SETTINGS]: <Settings />,
  };

  return (
    <div className="homepage-layout">
      <div className="main-content-container">
        <main className="main-content">
          <InternalNavBar />
          {pageMap[activeItem as SidebarPage] || <div>Page not found</div>}
        </main>
      </div>

      <div className="floating-right-container">
        <FloatingRight />
      </div>
    </div>
  );
}
