diff --git a/lib/supabase.ts b/lib/supabase.ts
index 9bb28b86912736b68019d5df7fc5a33ca20cd082..dcf031d8da649bfeda97c909b6fa78ce44c61166 100644
--- a/lib/supabase.ts
+++ b/lib/supabase.ts
@@ -1,6 +1,12 @@
 import { createClient } from "@supabase/supabase-js";
 
 const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
 const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
 
-export const supabase = createClient(supabaseUrl, supabaseAnonKey);
\ No newline at end of file
+export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
+  auth: {
+    persistSession: true,
+    autoRefreshToken: true,
+    detectSessionInUrl: true,
+  },
+});
\ No newline at end of file
