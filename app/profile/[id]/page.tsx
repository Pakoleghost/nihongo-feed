"use client";

import React from "react";

type ProfileHeaderClientProps = {
  isOwn: boolean;
  profileId: string;
  username: string;
  avatarUrl: string | null;
  bio: string;
  level: string;
  group: string;
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
  return (
    <div style={{ padding: 20 }}>
      <div className="profile-header">
        <div
          className="avatar"
          style={{ width: 96, height: 96, borderRadius: "50%", overflow: "hidden" }}
          aria-label="Profile avatar"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={username} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 48, lineHeight: "96px", display: "block", textAlign: "center" }}>
              {username[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>

        <div className="profile-info" style={{ marginLeft: 16 }}>
          <div
            className="username"
            style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}
          >
            @{username}
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

          {(bio || level || group) && (
            <div className="profile-meta" style={{ marginTop: 12, fontSize: 14 }}>
              {bio && <div className="bio">{bio}</div>}
              {level && <div className="level">Level: {level}</div>}
              {group && <div className="group">Group: {group}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}