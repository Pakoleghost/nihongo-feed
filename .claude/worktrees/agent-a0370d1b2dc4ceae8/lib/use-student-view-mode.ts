"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readStudentViewGroup,
  readStudentViewPreference,
  STUDENT_VIEW_EVENT,
  writeStudentViewGroup,
  writeStudentViewPreference,
} from "@/lib/student-view";

export function useStudentViewMode(isAdmin: boolean) {
  const [storedActive, setStoredActive] = useState(false);
  const [storedGroupName, setStoredGroupName] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      setStoredActive(false);
      setStoredGroupName(null);
      return;
    }

    const sync = () => {
      setStoredActive(readStudentViewPreference());
      setStoredGroupName(readStudentViewGroup());
    };
    sync();

    window.addEventListener("storage", sync);
    window.addEventListener(STUDENT_VIEW_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(STUDENT_VIEW_EVENT, sync);
    };
  }, [isAdmin]);

  const setStudentViewActive = useCallback(
    (active: boolean) => {
      if (!isAdmin && active) return;
      writeStudentViewPreference(active);
      setStoredActive(active);
    },
    [isAdmin],
  );

  const setStudentViewGroupName = useCallback(
    (groupName: string | null) => {
      if (!isAdmin) return;
      writeStudentViewGroup(groupName);
      setStoredGroupName(groupName?.trim() || null);
    },
    [isAdmin],
  );

  const studentViewActive = isAdmin && storedActive;

  return {
    studentViewActive,
    studentViewGroupName: isAdmin ? storedGroupName : null,
    effectiveIsAdmin: isAdmin && !studentViewActive,
    setStudentViewActive,
    setStudentViewGroupName,
  };
}
