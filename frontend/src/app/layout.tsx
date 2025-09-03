// src/app/layout.tsx
import { AuthProvider } from "@/context/AuthContext";
// import { WalletAdapterProvider } from "@/context/WalletAdapterProvider";
import "../styles/globals.css";
import AppLayout from "./appLayout";
// import WalletListener from "@/lib/walletListener";
import { WalletGenerationProvider } from "@/context/WalletGenerationContext";
import { SidebarProvider } from "@/context/SidebarContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SidebarProvider>
          <WalletGenerationProvider>
            <AuthProvider>
              {/* <WalletListener /> */}
              <AppLayout>{children}</AppLayout>
            </AuthProvider>
          </WalletGenerationProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}
