"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readStudentViewPreference,
  STUDENT_VIEW_EVENT,
  writeStudentViewPreference,
} from "@/lib/student-view";

export function useStudentViewMode(isAdmin: boolean) {
  const [storedActive, setStoredActive] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      setStoredActive(false);
      return;
    }

    const sync = () => setStoredActive(readStudentViewPreference());
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

  const studentViewActive = isAdmin && storedActive;

  return {
    studentViewActive,
    effectiveIsAdmin: isAdmin && !studentViewActive,
    setStudentViewActive,
  };
}
