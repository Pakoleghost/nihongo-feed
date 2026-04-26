export const STUDENT_VIEW_STORAGE_KEY = "nihongo-student-view";
export const STUDENT_VIEW_GROUP_STORAGE_KEY = "nihongo-student-view-group";
export const STUDENT_VIEW_EVENT = "nihongo-student-view-change";

export function readStudentViewPreference() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STUDENT_VIEW_STORAGE_KEY) === "true";
}

export function readStudentViewGroup() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STUDENT_VIEW_GROUP_STORAGE_KEY);
  return value?.trim() || null;
}

function notifyStudentViewChange() {
  window.dispatchEvent(
    new CustomEvent(STUDENT_VIEW_EVENT, {
      detail: {
        active: readStudentViewPreference(),
        groupName: readStudentViewGroup(),
      },
    }),
  );
}

export function writeStudentViewPreference(active: boolean) {
  if (typeof window === "undefined") return;
  if (active) {
    window.localStorage.setItem(STUDENT_VIEW_STORAGE_KEY, "true");
  } else {
    window.localStorage.removeItem(STUDENT_VIEW_STORAGE_KEY);
  }
  notifyStudentViewChange();
}

export function writeStudentViewGroup(groupName: string | null) {
  if (typeof window === "undefined") return;
  const cleanGroupName = groupName?.trim();
  if (cleanGroupName) {
    window.localStorage.setItem(STUDENT_VIEW_GROUP_STORAGE_KEY, cleanGroupName);
  } else {
    window.localStorage.removeItem(STUDENT_VIEW_GROUP_STORAGE_KEY);
  }
  notifyStudentViewChange();
}
