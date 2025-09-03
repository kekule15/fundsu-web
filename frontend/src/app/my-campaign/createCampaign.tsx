"use client";

import { useState } from "react";
import "../../styles/createCampaign.css";
import { useCampaign } from "@/context/CampaignContext";

interface Props {
  onBack: () => void;
}

export default function CreateCampaign({ onBack }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageError, setImageError] = useState<string | null>(null);

  const validateImageUrl = (url: string) => {
    const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    return validExtensions.some((ext) => url.toLowerCase().endsWith(ext));
  };

  const { initializeCampaign, createCampaignState, manualSync } = useCampaign();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (imageUrl && !validateImageUrl(imageUrl)) {
      setImageError(
        "Invalid image URL. Must end with .jpg, .jpeg, .png, .gif, or .webp"
      );
      return;
    }

    try {
      const campaignPda = await initializeCampaign(
        title,
        description,
        Number(targetAmount),
        imageUrl
      );
      alert(`Campaign Created! PDA: ${campaignPda}`);
      onBack();
    } catch (err) {
      console.error("Error creating campaign:", err);
      alert(`${err}.`);
    } finally {
      // Manually sync data after a successful contribution
      await manualSync();
    }
  };

  return (
    <div className="create-campaign">
      {/* Two-column layout */}
      <div className="create-campaign-card">
        {" "}
        {/* Add this wrapper */}
        <div className="content">
          {/* Form Section */}
          <form onSubmit={handleSubmit} className="create-form">
            <label>
              Title
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            <label>
              Description
              <textarea
                className="fixed-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </label>

            <label>
              Target Amount (SOL)
              <input
                type="number"
                value={targetAmount}
                placeholder="0.0001"
                onChange={(e) => {
                  setTargetAmount(e.target.value);
                }}
                required
              />
            </label>

            <label>
              Image URL (optional)
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setImageError(null);
                }}
                placeholder="https://example.com/image.png"
              />
            </label>
            {imageError && <p className="error-text">{imageError}</p>}

            <div className="submit-container">
              <button
                type="submit"
                className="submit-btn"
                onClick={handleSubmit}
                disabled={createCampaignState}
              >
                {createCampaignState ? (
                  <span className="loader"></span>
                ) : (
                  "Create"
                )}
              </button>
            </div>
          </form>

          {/* Image Section */}

          {imageUrl && validateImageUrl(imageUrl) ? (
            <div className="image-preview-section">
              <div className="image-preview-card">
                <img
                  src={imageUrl}
                  alt="Campaign preview"
                  className="preview-img"
                />
              </div>
            </div>
          ) : (
            <div className="image-section-container"></div>
          )}
        </div>
      </div>
    </div>
  );
}
