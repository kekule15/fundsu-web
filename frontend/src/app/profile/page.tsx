"use client";

import { useState, useEffect } from "react";
import { UserProfile } from "@/types/user";
import { useAuth } from "@/context/AuthContext";
import ConnectWalletComponent from "@/components/ConnectWalletComponent";
import "../../styles/profile.css";
import { normalizeTimestamp } from "@/utils/app_helpers";
import { CircularImage } from "@/components/CircularAvatar";
import { userAvatarDefault } from "@/utils/media_files";
import { lamportsToSol } from "@/utils/converters";

export function Profile() {
  const {
    logout,
    user,
    updateUserProfile,
    updateUserState,
    balance,
    refreshInternalUser,
  } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<UserProfile | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize editedUser when user data is available
  useEffect(() => {
    if (user) {
      setEditedUser({ ...user });
    }
  }, [user]);

  // Show connect wallet if user is not authenticated
  if (!user) {
    return <ConnectWalletComponent />;
  }

  // Show loading state while editedUser is being initialized
  if (!editedUser) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">Loading profile...</div>
      </div>
    );
  }

  const validateImageUrl = (url: string) => {
    if (!url) return true; // Empty URL is valid (will use default avatar)
    const validExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    return validExtensions.some((ext) => url.toLowerCase().endsWith(ext));
  };

  const handleSave = async () => {
    if (!editedUser) return;

    // Validate image URL before saving
    if (!validateImageUrl(editedUser.profile_url)) {
      setImageError(
        "Invalid image URL. Must end with .jpg, .jpeg, .png, .gif, or .webp"
      );
      return;
    }

    setIsSaving(true);
    try {
      await updateUserProfile(editedUser).then(async () => {
        console.log("Profile updated successfully");
        setEditedUser({ ...editedUser });
        await refreshInternalUser();
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      // Handle error (show message to user)
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedUser({ ...user });
    setIsEditing(false);
    setImageError(null);
  };

  const handleLogout = () => {
    setEditedUser(null);
    setIsEditing(false);
    setImageError(null);
    logout();
  };

  // Update specific field in editedUser
  const handleFieldChange = (field: keyof UserProfile, value: any) => {
    console.log("Before update, editedUser:", editedUser);
    console.log(`Field changed: ${field}, New value: ${value}`);
    let updatedUser = { ...editedUser, [field]: value };

    setEditedUser({ ...updatedUser });
    console.log("After update, updatedUser:", updatedUser);
    console.log("Updated editedUser:", editedUser.profile_url);
  };

  // Update nested social_links field
  const handleSocialLinkChange = (
    platform: keyof NonNullable<UserProfile["social_links"]>,
    value: string
  ) => {
    setEditedUser((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        social_links: {
          ...prev.social_links,
          [platform]: value,
        },
      };
    });
  };

  const formatDate = (timestamp: any) => {
    const ms = normalizeTimestamp(timestamp);
    if (!ms) return "Unknown date";
    const d = new Date(ms);
    return d.toLocaleString();
  };
  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2 className="profile-title">Profile</h2>
        <div className="profile-actions">
          {!isEditing ? (
            <>
              <button
                className="btn-secondary"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </button>
              <button className="btn-logout" onClick={handleLogout}>
                Log Out
              </button>
            </>
          ) : (
            <>
              <button
                className="btn-cancel"
                onClick={handleCancel}
                disabled={updateUserState}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={updateUserState}
              >
                {updateUserState ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-section">
          <h3 className="section-title">Personal Information</h3>

          <div className="profile-info-grid">
            <div className="profile-image-section">
              <div className="profile-image-container">
                <CircularImage
                  src={editedUser.profile_url ?? userAvatarDefault}
                  alt="User Avatar"
                  className="profile-image"
                  size={100}
                />

                {/* {!user.verified && (
                  <div className="verified-badge" title="Verified Account">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )} */}
              </div>

              {isEditing && (
                <div className="image-url-input">
                  <label htmlFor="profile-url">Profile Image URL</label>
                  <input
                    id="profile-url"
                    type="url"
                    value={editedUser.profile_url}
                    onChange={(e) => {
                      if (!validateImageUrl(e.target.value)) {
                        setImageError("Invalid image URL");
                      } else {
                        // console.log("Old Profile URL:", editedUser.profile_url);
                        handleFieldChange("profile_url", e.target.value);
                        // console.log("Profile URL:", e.target.value);
                      }
                    }}
                    placeholder="https://example.com/your-photo.jpg"
                  />
                  {imageError && <p className="error-text">{imageError}</p>}
                </div>
              )}
            </div>

            <div className="profile-details">
              {isEditing ? (
                <>
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      value={editedUser.name}
                      onChange={
                        (e) => handleFieldChange("name", e.target.value)
                        // setEditedUser({ ...editedUser, name: e.target.value })
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="bio">Bio</label>
                    <textarea
                      id="bio"
                      value={editedUser.bio || ""}
                      onChange={(e) => handleFieldChange("bio", e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={editedUser.email || ""}
                      onChange={(e) =>
                        handleFieldChange("email", e.target.value)
                      }
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="website">Website</label>
                    <input
                      id="website"
                      type="url"
                      value={editedUser.website || ""}
                      onChange={(e) =>
                        handleFieldChange("website", e.target.value)
                      }
                      placeholder="https://your-website.com"
                    />
                  </div>
                </>
              ) : (
                <>
                  <h2 className="user-name">{user.name}</h2>
                  <p className="user-bio">{user.bio || "No bio provided."}</p>
                  <div className="user-detail">
                    <span className="detail-label">Email:</span>
                    <span className="detail-value">
                      {user.email || "Not provided"}
                    </span>
                  </div>
                  <div className="user-detail">
                    <span className="detail-label">Website:</span>
                    {user.website ? (
                      <a
                        href={user.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="detail-link"
                      >
                        {user.website}
                      </a>
                    ) : (
                      <span className="detail-value">Not provided</span>
                    )}
                  </div>
                  <div className="user-detail">
                    <span className="detail-label">Member since:</span>
                    <span className="detail-value">
                      {formatDate(user.date_created)}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="profile-section">
          <h3 className="section-title">Wallet Information</h3>
          <div className="wallet-info">
            <div className="wallet-detail">
              <span className="detail-label">Wallet Address:</span>
              <span className="wallet-address">{user.wallet_address}</span>
            </div>
            <div className="wallet-detail">
              <span className="detail-label">Balance:</span>
              <span className="wallet-balance">{balance} SOL</span>
            </div>
          </div>
        </div>

        {/* <div className="profile-section">
          <h3 className="section-title">Social Links</h3>
          {isEditing ? (
            <div className="social-links-edit">
              <div className="form-group">
                <label htmlFor="twitter">Twitter Username</label>
                <input
                  id="twitter"
                  type="text"
                  value={editedUser.social_links?.twitter || ""}
                  onChange={(e) =>
                    setEditedUser({
                      ...editedUser,
                      social_links: {
                        ...editedUser.social_links,
                        twitter: e.target.value,
                      },
                    })
                  }
                  placeholder="yourusername"
                />
              </div>
              <div className="form-group">
                <label htmlFor="github">GitHub Username</label>
                <input
                  id="github"
                  type="text"
                  value={editedUser.social_links?.github || ""}
                  onChange={(e) =>
                    setEditedUser({
                      ...editedUser,
                      social_links: {
                        ...editedUser.social_links,
                        github: e.target.value,
                      },
                    })
                  }
                  placeholder="yourusername"
                />
              </div>
              <div className="form-group">
                <label htmlFor="discord">Discord Username</label>
                <input
                  id="discord"
                  type="text"
                  value={editedUser.social_links?.discord || ""}
                  onChange={(e) =>
                    setEditedUser({
                      ...editedUser,
                      social_links: {
                        ...editedUser.social_links,
                        discord: e.target.value,
                      },
                    })
                  }
                  placeholder="username#1234"
                />
              </div>
            </div>
          ) : (
            <div className="social-links">
              {user.social_links?.twitter && (
                <a
                  href={`https://twitter.com/${user.social_links.twitter}`}
                  className="social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  @{user.social_links.twitter}
                </a>
              )}
              {user.social_links?.github && (
                <a
                  href={`https://github.com/${user.social_links.github}`}
                  className="social-link"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  {user.social_links.github}
                </a>
              )}
              {user.social_links?.discord && (
                <div className="social-link">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.25c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z" />
                  </svg>
                  {user.social_links.discord}
                </div>
              )}
              {!user.social_links?.twitter &&
                !user.social_links?.github &&
                !user.social_links?.discord && <p>No social links added.</p>}
            </div>
          )}
        </div> */}

        <div className="profile-section">
          <h3 className="section-title">Campaign Stats</h3>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">
                {user.campaigns_created?.length || 0}
              </div>
              <div className="stat-label">Campaigns Created</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {user.campaigns_contributed?.length || 0}
              </div>
              <div className="stat-label">Campaigns Backed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {lamportsToSol(user.total_contributions ?? 0) || 0} SOL
              </div>
              <div className="stat-label">Total Contributions</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{user.reputation_score || 0}</div>
              <div className="stat-label">Reputation Score</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
