"use client";

import { useSidebar } from "@/context/SidebarContext";
import { logoText, userAvatarDefault } from "@/utils/media_files";
import { useAuth } from "@/context/AuthContext";
import { CircularImage } from "./CircularAvatar";
import "../styles/navbar.css";
import { SidebarPages } from "@/utils/sidebar_utils";

export function Navbar() {
  const { setActiveItem, toggleSidebar } = useSidebar();
  const { loading: loadingUser, user } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Left: Menu button + Logo (only on mobile/tablet) */}
        <div className="navbar-left">
          <button className="menu-button" onClick={toggleSidebar}>
            ☰
          </button>
          <a
            href="#"
            className="logo-link mobile-logo"
            onClick={(e) => {
              e.preventDefault();
              setActiveItem("Feeds");
            }}
          >
            <CircularImage src={logoText} alt="FundsU Logo" size={48} />
          </a>
          <span className="greeting-text">Welcome</span>
          {user && <span className="greeting-text">{user.name || "User"}</span>}
        </div>

        {/* Right: Avatar */}

        <div className="navbar-right">
          {user && (
            <button
              className="avatar-button"
              onClick={() => setActiveItem(SidebarPages.PROFILE)}
            >
              <CircularImage
                src={user.profile_url?.toString() || userAvatarDefault}
                alt="User Avatar"
                size={48}
              />
            </button>
          )}
          {user === null && (
            <button
              className="avatar-button"
              onClick={() => setActiveItem(SidebarPages.PROFILE)}
            >
              <CircularImage
                src=""
                fallbackSrc=""
                alt="Guest Avatar"
                size={48}
              />
              {/* <span className="avatar-name">Guest</span> */}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
