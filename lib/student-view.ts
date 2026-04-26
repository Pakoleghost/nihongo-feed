export const STUDENT_VIEW_STORAGE_KEY = "nihongo-student-view";
export const STUDENT_VIEW_EVENT = "nihongo-student-view-change";

export function readStudentViewPreference() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STUDENT_VIEW_STORAGE_KEY) === "true";
}

export function writeStudentViewPreference(active: boolean) {
  if (typeof window === "undefined") return;
  if (active) {
    window.localStorage.setItem(STUDENT_VIEW_STORAGE_KEY, "true");
  } else {
    window.localStorage.removeItem(STUDENT_VIEW_STORAGE_KEY);
  }
  window.dispatchEvent(new CustomEvent(STUDENT_VIEW_EVENT, { detail: { active } }));
}
