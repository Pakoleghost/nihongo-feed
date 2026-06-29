"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchCoursePosition, type CoursePosition } from "@/lib/course-position";
import { GENKI_KANJI_BY_LESSON } from "@/lib/genki-kanji-by-lesson";
import { GENKI_VOCAB_BY_LESSON } from "@/lib/genki-vocab-by-lesson";
import { KANA_ITEMS } from "@/lib/kana-data";
import { getKanaProgressSummary, loadKanaProgress } from "@/lib/kana-progress";
import { getKanjiLessonSummary, loadKanjiProgress } from "@/lib/kanji-progress";
import type { PracticeProgressSummary } from "@/lib/practice-srs";
import { getStreak, markActiveToday, getLastActivity } from "@/lib/streak";
import {
  readStudentViewGroup,
  readStudentViewPreference,
  STUDENT_VIEW_EVENT,
} from "@/lib/student-view";
import { supabase } from "@/lib/supabase";
import { getVocabLessonSummary, loadVocabProgress } from "@/lib/vocab-progress";

type StudentProfile = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  groupName: string | null;
  isAdmin: boolean;
  roleLabel: string;
};

type LastActivity = {
  label: string;
  path: string;
} | null;

export type DashboardSummary = {
  total: number;
  practiced: number;
  due: number;
  difficult: number;
  mastered: number;
};

export type StudentDashboardState = {
  loaded: boolean;
  profile: StudentProfile;
  course: CoursePosition;
  streak: number;
  lastActivity: LastActivity;
  kana: DashboardSummary;
  vocab: DashboardSummary;
  kanji: DashboardSummary;
  reviewTotal: number;
  refresh: () => void;
};

const emptySummary: DashboardSummary = {
  total: 0,
  practiced: 0,
  due: 0,
  difficult: 0,
  mastered: 0,
};

const defaultState: StudentDashboardState = {
  loaded: false,
  profile: {
    userId: "anon",
    displayName: "Alumno",
    avatarUrl: null,
    groupName: null,
    isAdmin: false,
    roleLabel: "Alumno",
  },
  course: {
    groupName: null,
    resolvedGroupName: null,
    currentLesson: null,
    currentModuleNumber: null,
    source: "fallback",
  },
  streak: 0,
  lastActivity: null,
  kana: emptySummary,
  vocab: emptySummary,
  kanji: emptySummary,
  reviewTotal: 0,
  refresh: () => {},
};

const DashboardDataContext = createContext<StudentDashboardState>(defaultState);

function emptyPracticeSummary(): PracticeProgressSummary {
  return {
    total: 0,
    vistos: 0,
    expuestos: 0,
    practicados: 0,
    solo_expuestos: 0,
    nuevos: 0,
    aprendiendo: 0,
    en_repaso: 0,
    dominados: 0,
    pendientes: 0,
    debiles: 0,
  };
}

function mergePracticeSummary(current: PracticeProgressSummary, next: PracticeProgressSummary) {
  return {
    total: current.total + next.total,
    vistos: current.vistos + next.vistos,
    expuestos: current.expuestos + next.expuestos,
    practicados: current.practicados + next.practicados,
    solo_expuestos: current.solo_expuestos + next.solo_expuestos,
    nuevos: current.nuevos + next.nuevos,
    aprendiendo: current.aprendiendo + next.aprendiendo,
    en_repaso: current.en_repaso + next.en_repaso,
    dominados: current.dominados + next.dominados,
    pendientes: current.pendientes + next.pendientes,
    debiles: current.debiles + next.debiles,
  };
}

function practiceToDashboardSummary(summary: PracticeProgressSummary): DashboardSummary {
  return {
    total: summary.total,
    practiced: summary.practicados,
    due: summary.pendientes,
    difficult: summary.debiles,
    mastered: summary.dominados,
  };
}

function readKanaSummary(userId: string): DashboardSummary {
  const userProgress = loadKanaProgress(userId);
  const anonProgress = loadKanaProgress("anon");
  const progress = Object.keys(userProgress).length > 0 ? userProgress : anonProgress;
  const summary = getKanaProgressSummary(KANA_ITEMS, progress);

  return {
    total: KANA_ITEMS.length,
    practiced: summary.practiced,
    due: summary.due,
    difficult: summary.difficult,
    mastered: KANA_ITEMS.filter((item) => progress[item.id]?.level >= 5).length,
  };
}

function readVocabSummary(): DashboardSummary {
  const progress = loadVocabProgress("anon");
  const summary = Object.entries(GENKI_VOCAB_BY_LESSON)
    .filter(([lesson]) => Number(lesson) <= 8)
    .reduce((current, [lesson, items]) => (
      mergePracticeSummary(current, getVocabLessonSummary(Number(lesson), items, progress))
    ), emptyPracticeSummary());

  return practiceToDashboardSummary(summary);
}

function readKanjiSummary(): DashboardSummary {
  const progress = loadKanjiProgress("anon");
  const summary = Object.entries(GENKI_KANJI_BY_LESSON)
    .filter(([lesson]) => Number(lesson) <= 8)
    .reduce((current, [lesson, items]) => (
      mergePracticeSummary(current, getKanjiLessonSummary(Number(lesson), items, progress))
    ), emptyPracticeSummary());

  return practiceToDashboardSummary(summary);
}

function getDisplayName(profile: { username?: string | null; full_name?: string | null } | null | undefined) {
  return profile?.username?.trim() || profile?.full_name?.trim() || "Alumno";
}

export function StudentDashboardDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudentDashboardState>(defaultState);

  useEffect(() => {
    let alive = true;

    async function loadDashboardState() {
      markActiveToday();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const userId = session?.user?.id ?? "anon";
      let profile: StudentProfile = {
        userId,
        displayName: session?.user?.email?.split("@")[0] || "Alumno",
        avatarUrl: null,
        groupName: null,
        isAdmin: false,
        roleLabel: "Alumno",
      };

      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("username, full_name, avatar_url, group_name, is_admin")
          .eq("id", session.user.id)
          .maybeSingle();
        const isAdmin = data?.is_admin === true;
        const studentViewActive = isAdmin && readStudentViewPreference();
        const studentViewGroup =
          studentViewActive ? readStudentViewGroup() : null;

        profile = {
          userId,
          displayName: getDisplayName(data),
          avatarUrl: data?.avatar_url ?? null,
          groupName: studentViewGroup ?? data?.group_name ?? null,
          isAdmin,
          roleLabel: studentViewActive ? "Alumno" : isAdmin ? "Sensei" : "Alumno",
        };
      }

      const [course, kana, vocab, kanji] = await Promise.all([
        fetchCoursePosition(profile.groupName),
        Promise.resolve(readKanaSummary(userId)),
        Promise.resolve(readVocabSummary()),
        Promise.resolve(readKanjiSummary()),
      ]);

      if (!alive) return;
      setState({
        loaded: true,
        profile,
        course,
        streak: getStreak(),
        lastActivity: getLastActivity(),
        kana,
        vocab,
        kanji,
        reviewTotal: kana.due + vocab.due + kanji.due,
        refresh: refreshDashboardState,
      });
    }

    function refreshDashboardState() {
      void loadDashboardState();
    }

    refreshDashboardState();

    const refresh = () => {
      refreshDashboardState();
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(STUDENT_VIEW_EVENT, refresh);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      alive = false;
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(STUDENT_VIEW_EVENT, refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return (
    <DashboardDataContext.Provider value={state}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useStudentDashboardData() {
  return useContext(DashboardDataContext);
}

export function useDashboardPercent(summary: DashboardSummary) {
  return useMemo(() => (
    summary.total > 0 ? Math.round((summary.practiced / summary.total) * 100) : 0
  ), [summary.practiced, summary.total]);
}
