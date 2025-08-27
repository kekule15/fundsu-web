"use client";
import { Campaign } from "@/types/campaign";
import "../styles/CampaignCard.css";
import { lamportsToSol } from "@/utils/converters";
import { defaultCampaignImage } from "@/utils/media_files";

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const percent = (campaign.current_amount / campaign.target_amount) * 100;
  const truncatedDescription =
    campaign.description.length > 120
      ? campaign.description.substring(0, 120) + "..."
      : campaign.description;

  return (
    <div className="campaign-card">
      <div className="campaign-image-container">
        <img
          src={campaign.image_url || defaultCampaignImage}
          alt={campaign.title}
        />
        <div className="campaign-status-icons">
          {campaign.closed && (
            <div className="status-icon closed-icon" title="Campaign is closed">
              ✓
            </div>
          )}
          {campaign.locked && (
            <div
              className="status-icon locked-icon"
              title="Funds are locked until target is met"
            >
              🔒
            </div>
          )}
        </div>
      </div>

      <div className="campaign-card-content">
        <h2>{campaign.title}</h2>
        <p className="campaign-description">{truncatedDescription}</p>

        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${percent}%` }}
            ></div>
          </div>
          <div className="progress-text">
            <span className="progress-percent">
              {Math.round(percent)}% funded
            </span>
            <small>
              {lamportsToSol(campaign.current_amount)} /{" "}
              {lamportsToSol(campaign.target_amount)} SOL
            </small>
          </div>
        </div>

        <div className="campaign-stats">
          <div className="stat-item">
            <span className="stat-value">
              {campaign.contributors_count || 0}
            </span>
            <span className="stat-label">No of contributions</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{campaign.likes || 0}</span>
            <span className="stat-label">Likes</span>
          </div>
          {/* {campaign.deadline && (
            <div className="stat-item">
              <span className="stat-value">
                {Math.ceil(
                  (campaign.deadline - Date.now()) / (1000 * 60 * 60 * 24)
                )}
                
              </span>
              <span className="stat-label">Left</span>
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}
