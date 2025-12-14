diff --git a/app/page.tsx b/app/page.tsx
index 207f7939db8b8bd1ba6fe8c93466f2cf486442a6..2500a952e431788c10f83ceadbc771e6d61b0fb5 100644
--- a/app/page.tsx
+++ b/app/page.tsx
@@ -1,28 +1,29 @@
 "use client";
 
 import { useEffect, useMemo, useState } from "react";
+import { requireSession } from "@/lib/authGuard";
 import { supabase } from "@/lib/supabase";
 import Link from "next/link";
 
 type DbPostRow = {
   id: string;
   content: string | null;
   created_at: string;
   user_id: string;
   image_url?: string | null;
   profiles:
     | { username: string | null; avatar_url: string | null }
     | { username: string | null; avatar_url: string | null }[]
     | null;
 };
 
 type Post = {
   id: string;
   content: string;
   created_at: string;
   user_id: string;
   username: string; // "" si no hay
   avatar_url: string | null;
   image_url: string | null;
   likes: number;
   likedByMe: boolean;
@@ -49,50 +50,55 @@ type Comment = {
   created_at: string;
   username: string; // "" si no hay
   avatar_url: string | null;
 };
 
 function normalizeProfile(p: any): { username: string; avatar_url: string | null } {
   const obj = Array.isArray(p) ? p?.[0] : p;
 
   const raw = (obj?.username ?? "").toString().trim().toLowerCase();
 
   // Si no hay username real, NO generes link
   const username = raw && raw !== "unknown" ? raw : "";
 
   return {
     username,
     avatar_url: obj?.avatar_url ?? null,
   };
 }
 
 export default function HomePage() {
   const [userId, setUserId] = useState<string | null>(null);
 
   // LOGIN UI
   const [email, setEmail] = useState("");
   const [authBusy, setAuthBusy] = useState(false);
+  const [password, setPassword] = useState("");
+  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
+  const [authMessage, setAuthMessage] = useState<string>("");
+  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState<string | null>(null);
+  const [resendBusy, setResendBusy] = useState(false);
 
   // USERNAME GATE
   const [checkingProfile, setCheckingProfile] = useState(true);
   const [needsUsername, setNeedsUsername] = useState(false);
   const [newUsername, setNewUsername] = useState("");
   const [saveBusy, setSaveBusy] = useState(false);
 
   // feed composer
   const [text, setText] = useState("");
   const [imageFile, setImageFile] = useState<File | null>(null);
   const [busy, setBusy] = useState(false);
 
   // feed
   const [posts, setPosts] = useState<Post[]>([]);
   const [loading, setLoading] = useState(true);
 
   // my profile
   const [myUsername, setMyUsername] = useState<string>("unknown");
   const [myAvatarUrl, setMyAvatarUrl] = useState<string | null>(null);
   const [avatarBusy, setAvatarBusy] = useState(false);
 
   // comments
   const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
   const [commentText, setCommentText] = useState("");
   const [commentBusy, setCommentBusy] = useState(false);
@@ -152,95 +158,193 @@ export default function HomePage() {
     }
 
     const u = (data?.username ?? "").toString().trim();
     const a = data?.avatar_url ?? null;
 
     setMyUsername(u || "unknown");
     setMyAvatarUrl(a);
     setNeedsUsername(!u); // only gate if empty username
     setCheckingProfile(false);
 
     // load feed once we pass gate
     if (u) void loadAll(uid);
   }
 
   const normalizedNewUsername = useMemo(() => newUsername.trim().toLowerCase(), [newUsername]);
 
   const usernameError = useMemo(() => {
     if (!normalizedNewUsername) return "Type a username.";
     if (normalizedNewUsername.length < 3) return "Minimum 3 characters.";
     if (normalizedNewUsername.length > 20) return "Maximum 20 characters.";
     if (!/^[a-z0-9_]+$/.test(normalizedNewUsername)) return "Use only a-z, 0-9, underscore (_).";
     return "";
   }, [normalizedNewUsername]);
 
   async function saveUsername() {
-    if (!userId) return;
     if (saveBusy) return;
     if (usernameError) return;
 
+    const activeUserId = userId ?? (await requireSession());
+    if (!activeUserId) return;
+
     setSaveBusy(true);
 
     const { error } = await supabase.from("profiles").upsert({
-      id: userId,
+      id: activeUserId,
       username: normalizedNewUsername,
       avatar_url: myAvatarUrl,
     });
 
     setSaveBusy(false);
 
     if (error) {
       alert(error.message);
       return;
     }
 
     setMyUsername(normalizedNewUsername);
     setNeedsUsername(false);
-    await loadAll(userId);
+    await loadAll(activeUserId);
   }
 
-  async function sendMagicLink() {
+  async function loginWithPassword() {
     if (authBusy) return;
-    if (!email.trim()) return;
+    if (!email.trim() || !password) return;
 
+    setAuthMessage("");
     setAuthBusy(true);
 
-    const { error } = await supabase.auth.signInWithOtp({
+    const { error } = await supabase.auth.signInWithPassword({
       email: email.trim(),
+      password,
+    });
+
+    setAuthBusy(false);
+
+    if (error) {
+      const trimmedEmail = email.trim();
+      const lower = error.message.toLowerCase();
+
+      if (lower.includes("email") && lower.includes("confirm")) {
+        setPendingEmailConfirmation(trimmedEmail || pendingEmailConfirmation);
+        setAuthMessage(
+          "Email not confirmed. Check your inbox or resend the confirmation email."
+        );
+        if (trimmedEmail) void resendConfirmation(trimmedEmail);
+        return;
+      }
+
+      setAuthMessage(error.message);
+      return;
+    }
+
+    setPassword("");
+    setPendingEmailConfirmation(null);
+    setAuthMessage("");
+  }
+
+  async function signUpWithPassword() {
+    if (authBusy) return;
+    if (!email.trim() || !password) return;
+
+    setAuthMessage("");
+    setAuthBusy(true);
+
+    const { data, error } = await supabase.auth.signUp({
+      email: email.trim(),
+      password,
       options: { emailRedirectTo: SITE_URL },
     });
 
     setAuthBusy(false);
 
-    if (error) alert(error.message);
-    else alert("Check your email.");
+    if (error) {
+      setAuthMessage(error.message);
+      return;
+    }
+
+    const trimmedEmail = email.trim();
+    setPassword("");
+
+    if (data.session || data.user?.email_confirmed_at) {
+      setAuthMode("login");
+      setAuthMessage("Account created. You can now log in with your password.");
+      setPendingEmailConfirmation(null);
+      return;
+    }
+
+    const { error: resendError } = await supabase.auth.resend({
+      type: "signup",
+      email: trimmedEmail,
+      options: { emailRedirectTo: SITE_URL },
+    });
+
+    if (resendError) {
+      setAuthMessage(
+        `Check your email to confirm your account, then log in. Resend failed: ${resendError.message}`
+      );
+      setPendingEmailConfirmation(trimmedEmail);
+      return;
+    }
+
+    setPendingEmailConfirmation(trimmedEmail);
+    setAuthMessage(
+      "Check your email to confirm your account. We just sent another confirmation email."
+    );
+  }
+
+  async function resendConfirmation(targetEmail?: string) {
+    if (resendBusy) return;
+
+    const emailToSend = (targetEmail ?? pendingEmailConfirmation ?? email).trim();
+    if (!emailToSend) {
+      setAuthMessage("Enter your email first.");
+      return;
+    }
+
+    setResendBusy(true);
+    const { error } = await supabase.auth.resend({
+      type: "signup",
+      email: emailToSend,
+      options: { emailRedirectTo: SITE_URL },
+    });
+    setResendBusy(false);
+
+    if (error) {
+      setAuthMessage(`Could not resend confirmation email: ${error.message}`);
+      return;
+    }
+
+    setPendingEmailConfirmation(emailToSend);
+    setAuthMessage("Sent another confirmation email. Check your inbox and spam folder.");
   }
 
   async function logout() {
     await supabase.auth.signOut();
     setUserId(null);
     setEmail("");
+    setPassword("");
     setNeedsUsername(false);
     setNewUsername("");
     setPosts([]);
   }
 
   async function loadAll(uid: string) {
     setLoading(true);
 
     const { data, error } = await supabase
       .from("posts")
       .select("id, content, created_at, user_id, image_url, profiles(username, avatar_url)")
       .order("created_at", { ascending: false });
 
     if (error) {
       alert(error.message);
       setLoading(false);
       return;
     }
 
     const normalized: Post[] =
       (data as unknown as DbPostRow[] | null)?.map((row) => {
         const prof = normalizeProfile(row.profiles as any);
         return {
           id: row.id,
           content: (row.content ?? "").toString(),
@@ -278,275 +382,354 @@ export default function HomePage() {
         const v = likeMap.get(p.id);
         if (v) {
           p.likes = v.count;
           p.likedByMe = v.mine;
         }
       });
     }
 
     if (postIds.length) {
       const { data: commentRows } = await supabase.from("comments").select("post_id").in("post_id", postIds);
 
       const countMap = new Map<string, number>();
       for (const pid of postIds) countMap.set(pid, 0);
       (commentRows ?? []).forEach((r: any) => {
         countMap.set(r.post_id, (countMap.get(r.post_id) ?? 0) + 1);
       });
 
       normalized.forEach((p) => (p.commentCount = countMap.get(p.id) ?? 0));
     }
 
     setPosts(normalized);
     setLoading(false);
   }
 
   async function createPost() {
-    if (!userId) return alert("Log in first.");
     if (busy) return;
     if (!text.trim() && !imageFile) return;
 
+    const activeUserId = userId ?? (await requireSession());
+    if (!activeUserId) return;
+
     setBusy(true);
 
     const { data: post, error: postError } = await supabase
       .from("posts")
-      .insert({ content: text.trim(), user_id: userId })
+      .insert({ content: text.trim(), user_id: activeUserId })
       .select("id")
       .single();
 
     if (postError || !post) {
       setBusy(false);
       alert(postError?.message ?? "Post error");
       return;
     }
 
     if (imageFile) {
       const ext = (imageFile.name.split(".").pop() || "jpg").toLowerCase();
       const path = `posts/${post.id}.${ext}`;
 
       const { error: uploadError } = await supabase.storage
         .from("post-images")
         .upload(path, imageFile, { upsert: true });
 
       if (uploadError) {
         setBusy(false);
         alert(uploadError.message);
         return;
       }
 
       const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);
 
       const { error: updateError } = await supabase.from("posts").update({ image_url: pub.publicUrl }).eq("id", post.id);
 
       if (updateError) {
         setBusy(false);
         alert(updateError.message);
         return;
       }
     }
 
     setText("");
     setImageFile(null);
     setBusy(false);
-    void loadAll(userId);
+    void loadAll(activeUserId);
   }
 
   async function toggleLike(postId: string) {
-    if (!userId) return alert("Log in first.");
+    const activeUserId = userId ?? (await requireSession());
+    if (!activeUserId) return;
 
     const p = posts.find((x) => x.id === postId);
     if (!p) return;
 
     setPosts((prev) =>
       prev.map((x) =>
         x.id === postId
           ? { ...x, likedByMe: !x.likedByMe, likes: x.likedByMe ? x.likes - 1 : x.likes + 1 }
           : x
       )
     );
 
     if (p.likedByMe) {
-      const { error } = await supabase.from("reactions").delete().eq("post_id", postId).eq("user_id", userId);
+      const { error } = await supabase
+        .from("reactions")
+        .delete()
+        .eq("post_id", postId)
+        .eq("user_id", activeUserId);
       if (error) {
         alert(error.message);
-        void loadAll(userId);
+        void loadAll(activeUserId);
       }
     } else {
-      const { error } = await supabase.from("reactions").insert({ post_id: postId, user_id: userId });
+      const { error } = await supabase.from("reactions").insert({ post_id: postId, user_id: activeUserId });
       if (error) {
         alert(error.message);
-        void loadAll(userId);
+        void loadAll(activeUserId);
       }
     }
   }
 
   async function deletePost(postId: string) {
-    if (!userId) return alert("Log in first.");
+    const activeUserId = userId ?? (await requireSession());
+    if (!activeUserId) return;
     const ok = confirm("Delete this post?");
     if (!ok) return;
 
-    const { error } = await supabase.from("posts").delete().eq("id", postId).eq("user_id", userId);
+    const { error } = await supabase
+      .from("posts")
+      .delete()
+      .eq("id", postId)
+      .eq("user_id", activeUserId);
     if (error) return alert(error.message);
 
     if (openCommentsFor === postId) setOpenCommentsFor(null);
-    void loadAll(userId);
+    void loadAll(activeUserId);
   }
 
   async function loadComments(postId: string) {
     const { data, error } = await supabase
       .from("comments")
       .select("id, post_id, user_id, content, created_at, profiles(username, avatar_url)")
       .eq("post_id", postId)
       .order("created_at", { ascending: true });
 
     if (error) return alert(error.message);
 
     const normalized: Comment[] =
       (data as unknown as CommentRow[] | null)?.map((row) => {
         const prof = normalizeProfile(row.profiles as any);
         return {
           id: row.id,
           post_id: row.post_id,
           user_id: row.user_id,
           content: row.content,
           created_at: row.created_at,
           username: prof.username, // "" si no hay
           avatar_url: prof.avatar_url,
         };
       }) ?? [];
 
     setCommentsByPost((prev) => ({ ...prev, [postId]: normalized }));
   }
 
   async function addComment(postId: string) {
-    if (!userId) return alert("Log in first.");
+    const activeUserId = userId ?? (await requireSession());
+    if (!activeUserId) return;
     if (commentBusy) return;
     if (!commentText.trim()) return;
 
     setCommentBusy(true);
 
     const { error } = await supabase.from("comments").insert({
       post_id: postId,
-      user_id: userId,
+      user_id: activeUserId,
       content: commentText.trim(),
     });
 
     setCommentBusy(false);
 
     if (error) return alert(error.message);
 
     setCommentText("");
     await loadComments(postId);
-    await loadAll(userId);
+    await loadAll(activeUserId);
   }
 
   async function openComments(postId: string) {
     const next = openCommentsFor === postId ? null : postId;
     setOpenCommentsFor(next);
     setCommentText("");
     if (next) await loadComments(next);
   }
 
   async function uploadMyAvatar(file: File) {
-    if (!userId) return alert("Log in first.");
+    const activeUserId = userId ?? (await requireSession());
+    if (!activeUserId) return;
     if (avatarBusy) return;
 
     setAvatarBusy(true);
 
     const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
-    const path = `avatars/${userId}.${ext}`;
+    const path = `avatars/${activeUserId}.${ext}`;
 
     const { error: uploadError } = await supabase.storage
       .from("post-images")
       .upload(path, file, { upsert: true });
 
     if (uploadError) {
       setAvatarBusy(false);
       return alert(uploadError.message);
     }
 
     const { data: pub } = supabase.storage.from("post-images").getPublicUrl(path);
 
     const { error: updateError } = await supabase.from("profiles").upsert({
-      id: userId,
+      id: activeUserId,
       username: myUsername === "unknown" ? normalizedNewUsername || null : myUsername,
       avatar_url: pub.publicUrl,
     });
 
     setAvatarBusy(false);
 
     if (updateError) return alert(updateError.message);
 
     setMyAvatarUrl(pub.publicUrl);
-    void loadAll(userId);
+    void loadAll(activeUserId);
   }
 
   const headerAvatarInitial = useMemo(() => (myUsername?.[0] || "?").toUpperCase(), [myUsername]);
 
   const linkStyle: React.CSSProperties = { color: "inherit", textDecoration: "none" };
 
   // --------- SCREENS ---------
 
   if (!userId) {
     return (
       <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
         <div style={{ width: 360, background: "#111", color: "#fff", borderRadius: 16, padding: 18 }}>
           <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>フィード</div>
-          <div style={{ opacity: 0.7, marginTop: 6, marginBottom: 14, fontSize: 13 }}>Log in with email</div>
+          <div style={{ opacity: 0.7, marginTop: 6, marginBottom: 14, fontSize: 13 }}>
+            Log in with email and password
+          </div>
 
           <input
             value={email}
             onChange={(e) => setEmail(e.target.value)}
             placeholder="email"
             style={{
               width: "100%",
               padding: 12,
               borderRadius: 12,
               border: "1px solid rgba(255,255,255,.15)",
               background: "rgba(255,255,255,.06)",
               color: "#fff",
               outline: "none",
               marginBottom: 10,
             }}
           />
 
+          <input
+            type="password"
+            value={password}
+            onChange={(e) => setPassword(e.target.value)}
+            placeholder="password"
+            style={{
+              width: "100%",
+              padding: 12,
+              borderRadius: 12,
+              border: "1px solid rgba(255,255,255,.15)",
+              background: "rgba(255,255,255,.06)",
+              color: "#fff",
+              outline: "none",
+              marginBottom: 10,
+            }}
+          />
+
           <button
-            onClick={sendMagicLink}
-            disabled={authBusy || !email.trim()}
+            onClick={authMode === "login" ? loginWithPassword : signUpWithPassword}
+            disabled={authBusy || !email.trim() || !password}
             style={{
               width: "100%",
               padding: 12,
               borderRadius: 12,
               border: "0",
               background: "#fff",
               color: "#111",
               fontWeight: 800,
               cursor: "pointer",
-              opacity: authBusy || !email.trim() ? 0.6 : 1,
+              opacity: authBusy || !email.trim() || !password ? 0.6 : 1,
+            }}
+          >
+            {authBusy
+              ? "…"
+              : authMode === "login"
+                ? "Log in"
+                : "Create account"}
+          </button>
+
+          {pendingEmailConfirmation ? (
+            <button
+              onClick={() => void resendConfirmation(pendingEmailConfirmation)}
+              disabled={resendBusy}
+              style={{
+                marginTop: 8,
+                width: "100%",
+                padding: 10,
+                borderRadius: 12,
+                border: "1px solid rgba(255,255,255,.12)",
+                background: "rgba(255,255,255,.05)",
+                color: "#fff",
+                cursor: resendBusy ? "not-allowed" : "pointer",
+              }}
+            >
+              {resendBusy ? "Resending…" : "Resend confirmation email"}
+            </button>
+          ) : null}
+
+          <button
+            onClick={() => setAuthMode((prev) => (prev === "login" ? "signup" : "login"))}
+            style={{
+              width: "100%",
+              padding: 10,
+              borderRadius: 10,
+              border: "1px solid rgba(255,255,255,.1)",
+              background: "transparent",
+              color: "#fff",
+              fontWeight: 600,
+              cursor: "pointer",
+              marginTop: 10,
             }}
           >
-            {authBusy ? "Sending…" : "Send link"}
+            {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Log in"}
           </button>
+
+          {authMessage ? (
+            <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.4, color: "#cfd4ff" }}>
+              {authMessage}
+            </div>
+          ) : null}
         </div>
       </main>
     );
   }
 
   if (checkingProfile) {
     return <div style={{ padding: 24, color: "#777" }}>Loading…</div>;
   }
 
   if (needsUsername) {
     return (
       <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
         <div style={{ width: 360, background: "#111", color: "#fff", borderRadius: 16, padding: 18 }}>
           <div style={{ fontSize: 18, fontWeight: 900 }}>Choose a username</div>
           <div style={{ opacity: 0.7, marginTop: 6, marginBottom: 14, fontSize: 13 }}>This will show on your posts.</div>
 
           <input
             value={newUsername}
             onChange={(e) => setNewUsername(e.target.value)}
             placeholder="username"
             style={{
               width: "100%",
               padding: 12,
               borderRadius: 12,
               border: "1px solid rgba(255,255,255,.15)",
