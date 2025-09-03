// src/components/AppLayout.tsx
"use client"; // 👈 this file is client-side only

import { SidebarProvider } from "@/context/SidebarContext";
import { AuthProvider } from "@/context/AuthContext";
import { CampaignProvider } from "@/context/CampaignContext";
import { TransactionProvider } from "@/context/TransactionContext";
import "../styles/globals.css";
import "../styles/layout.css";
import { Navbar } from "@/components/Navbar";
import { Sidebar } from "@/components/SideBar";
import { SplashScreen } from "@/components/SplashScreen";
import { useAuth } from "@/context/AuthContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  return (
    <CampaignProvider>
      <TransactionProvider>
        <SidebarProvider>
          <div className="layout-container">
            <Navbar />
            <div className="layout-main">
              <Sidebar />
              <main className="main-content">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      </TransactionProvider>
    </CampaignProvider>
  );
}
