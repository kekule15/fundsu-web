// src/app/layout.tsx
import { AuthProvider } from "@/context/AuthContext";
import { WalletAdapterProvider } from "@/context/WalletAdapterProvider";
import "../styles/globals.css";
import AppLayout from "./appLayout";
import WalletListener from "@/lib/walletListener";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <WalletAdapterProvider>
          <AuthProvider>
            <WalletListener />
            <AppLayout>{children}</AppLayout>
          </AuthProvider>
        </WalletAdapterProvider>
      </body>
    </html>
  );
}
