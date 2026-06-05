"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssignmentTrackerPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/groups");
  }, [router]);

  return null;
}
