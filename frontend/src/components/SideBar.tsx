"use client";

import { useSidebar } from "@/context/SidebarContext";
import { logoText } from "@/utils/media_files";
import { CircularImage } from "./CircularAvatar";
import "../styles/sidebar.css";
import { SidebarPages } from "@/utils/sidebar_utils";

// Sidebar items
const SIDEBAR_LINKS = [
  { label: SidebarPages.FEEDS },
  { label: SidebarPages.MY_CAMPAIGNS },
  { label: SidebarPages.WALLET },
  { label: SidebarPages.PROFILE },
 // { label: SidebarPages.SETTINGS }, 
] as const;

export function Sidebar() {
  const { activeItem, setActiveItem, isSidebarOpen, toggleSidebar } = useSidebar();

  const handleItemClick = (label: string) => {
    console.log("Sidebar item clicked:", label);
    setActiveItem(label);
    // Close sidebar on mobile/tablet after selection
    if (window.innerWidth < 1024) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <CircularImage src={logoText} alt="FundsU Logo" size={40} />
            <span className="sidebar-logo-text">FundsU</span>
          </div>
          <button className="sidebar-close" onClick={toggleSidebar}>
            ✕
          </button>
        </div>
        <div className="sidebar-links">
          {SIDEBAR_LINKS.map(({ label }) => (
            <button
              key={label}
              className={`sidebar-link ${activeItem === label ? "active" : ""}`}
              onClick={() => handleItemClick(label)}
            >
              {label}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}