"use client";

import React from "react";

type ProfileHeaderClientProps = {
  isOwn: boolean;
  profileId: string;
  username?: string | null;
  avatarUrl: string | null;
  bio?: string | null;
  level?: string | null;
  group?: string | null;
  postCount: number;
  commentCount: number;
};

export default function ProfileHeaderClient({
  isOwn,
  profileId,
  username,
  avatarUrl,
  bio,
  level,
  group,
  postCount,
  commentCount,
}: ProfileHeaderClientProps) {
  const safeUsername = (username ?? "").toString().trim();
  const initial = safeUsername.length > 0 ? safeUsername.charAt(0).toUpperCase() : "?";

  const safeBio = (bio ?? "").toString();
  const safeLevel = (level ?? "").toString();
  const safeGroup = (group ?? "").toString();
  return (
    <div style={{ padding: 20 }}>
      <div className="profile-header">
        <div
          className="avatar"
          style={{ width: 96, height: 96, borderRadius: "50%", overflow: "hidden" }}
          aria-label="Profile avatar"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={safeUsername || "profile"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 48, lineHeight: "96px", display: "block", textAlign: "center" }}>
              {initial}
            </span>
          )}
        </div>

        <div className="profile-info" style={{ marginLeft: 16 }}>
          <div
            className="username"
            style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}
          >
            @{safeUsername || ""}
          </div>

          <div className="counters" style={{ display: "flex", gap: 16 }}>
            <div className="posts-counter">
              <span style={{ fontSize: 18, fontWeight: 700 }}>{postCount}</span>{" "}
              <span style={{ fontSize: 13 }}>Posts</span>
            </div>
            <div className="comments-counter">
              <span style={{ fontSize: 18, fontWeight: 700 }}>{commentCount}</span>{" "}
              <span style={{ fontSize: 13 }}>Comments</span>
            </div>
          </div>

          {(safeBio || safeLevel || safeGroup) && (
            <div className="profile-meta" style={{ marginTop: 12, fontSize: 14 }}>
              {safeBio && <div className="bio">{safeBio}</div>}
              {safeLevel && <div className="level">Level: {safeLevel}</div>}
              {safeGroup && <div className="group">Group: {safeGroup}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}