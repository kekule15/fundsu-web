"use client";

import Image from "next/image";
import { useState } from "react";

import { userAvatarDefault } from "@/utils/media_files";
import "../styles/CircularAvatar.css";

interface CircularImageProps {
  src: string;
  alt?: string;
  size?: number;
  className?: string;
  fallbackSrc?: string;
}

export function CircularImage({
  src,
  alt = "",
  size = 60,
  className = "",
  fallbackSrc = userAvatarDefault,
}: CircularImageProps) {
  // const [imgSrc, setImgSrc] = useState(src);
  // const [imageError, setImageError] = useState(false);

  // const handleError = () => {
  //   if (!imageError && fallbackSrc) {
  //     setImageError(true);
  //     setImgSrc(fallbackSrc);
  //   }
  // };

  let imgSrc = src === '' ? fallbackSrc === '' ? userAvatarDefault : fallbackSrc : src;

  return (
    <div
      className={`circular-image-container ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={imgSrc}
        alt={alt}
        width={size}
        height={size}
        // onError={handleError}
        className="circular-image"
        style={{
          maxWidth: "100%",
          height: "auto",
        }}
      />
    </div>
  );
}
