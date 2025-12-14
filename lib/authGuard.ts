diff --git a/lib/authGuard.ts b/lib/authGuard.ts
new file mode 100644
index 0000000000000000000000000000000000000000..f1a3ba9816d1cdd06db7cc1e5c1325dd55b8a38a
--- /dev/null
+++ b/lib/authGuard.ts
@@ -0,0 +1,13 @@
+import { supabase } from "./supabase";
+
+export async function requireSession(): Promise<string | null> {
+  const { data } = await supabase.auth.getSession();
+  const uid = data.session?.user?.id ?? null;
+
+  if (!uid) {
+    alert("Session expired. Please log in again.");
+    return null;
+  }
+
+  return uid;
+}
