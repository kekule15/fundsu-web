// src/components/SplashScreen.tsx
"use client";

import { logoText } from "@/utils/media_files";
import "../styles/splash.css";
import Image from "next/image";

export function SplashScreen() {
  return (
    <div className="splash-container">
      <Image
        src={logoText}
        alt="FundsU Logo"
        width={210}
        height={100}
        className="splash-text"
        priority
      />
      {/* <h1 className="splash-text">Fundsu</h1> */}
    </div>
  );
}
