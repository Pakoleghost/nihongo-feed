"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useStudentViewMode } from "@/lib/use-student-view-mode";
import { supabase } from "@/lib/supabase";
import styles from "./AdminDashboardScreen.module.css";

type UserRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  group_name: string | null;
  email: string | null;
  is_approved: boolean | null;
  is_admin?: boolean | null;
  created_at?: string | null;
};

type GroupRow = {
  name: string;
};

function getName(user: UserRow) {
  return user.full_name?.trim() || user.username?.trim() || user.email || "Alumno";
}

function getInitial(user: UserRow) {
  return getName(user).trim()[0]?.toUpperCase() || "A";
}

function getSecondary(user: UserRow) {
  const parts = [
    user.username ? `@${user.username}` : null,
    user.email,
  ].filter(Boolean);
  return parts.join(" · ") || "Sin datos visibles";
}

function Avatar({ user }: { user: UserRow }) {
  if (user.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img className={styles.avatarImage} src={user.avatar_url} alt="" />
    );
  }

  return <span className={styles.avatar}>{getInitial(user)}</span>;
}

type StudentRowProps = {
  user: UserRow;
  groups: GroupRow[];
  busy: boolean;
  onChangeGroup: (userId: string, groupName: string) => void;
  onDelete: (user: UserRow) => void;
};

function StudentRow({ user, groups, busy, onChangeGroup, onDelete }: StudentRowProps) {
  return (
    <article className={styles.studentCard}>
      <Avatar user={user} />
      <div>
        <p className={styles.studentName}>{getName(user)}</p>
        <p className={styles.studentMeta}>{getSecondary(user)}</p>
      </div>
      <div className={styles.studentActions}>
        <select
          className={styles.select}
          value={user.group_name ?? ""}
          onChange={(event) => onChangeGroup(user.id, event.target.value)}
          disabled={busy}
          aria-label={`Grupo de ${getName(user)}`}
        >
          <option value="">Sin grupo</option>
          {groups.map((group) => (
            <option key={group.name} value={group.name}>
              {group.name}
            </option>
          ))}
        </select>
        <button
          className={styles.ghostButton}
          type="button"
          onClick={() => onDelete(user)}
          disabled={busy}
        >
          Eliminar
        </button>
      </div>
    </article>
  );
}

export function AdminDashboardScreen() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [pending, setPending] = useState<UserRow[]>([]);
  const [approved, setApproved] = useState<UserRow[]>([]);
  const [pendingGroup, setPendingGroup] = useState<Record<string, string>>({});
  const [newGroupName, setNewGroupName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const {
    studentViewActive,
    studentViewGroupName,
    setStudentViewActive,
    setStudentViewGroupName,
  } = useStudentViewMode(true);

  const groupNames = useMemo(() => new Set(groups.map((group) => group.name)), [groups]);
  const ungrouped = useMemo(
    () => approved.filter((user) => !user.group_name || !groupNames.has(user.group_name)),
    [approved, groupNames],
  );
  const groupedStudents = useMemo(
    () => groups.map((group) => ({
      group,
      users: approved.filter((user) => user.group_name === group.name),
    })),
    [approved, groups],
  );

  const loadAdminData = useCallback(async () => {
    setErrorMessage(null);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token ?? null;
    const userId = sessionData.session?.user?.id;

    if (!accessToken || !userId) {
      router.replace("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .maybeSingle();

    if (!profile?.is_admin) {
      router.replace("/dashboard");
      return;
    }

    setToken(accessToken);

    const [{ data: groupsData }, usersResponse] = await Promise.all([
      supabase.from("groups").select("name").order("name"),
      fetch("/api/admin/requests", {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
    ]);

    const nextGroups = (groupsData ?? []) as GroupRow[];
    setGroups(nextGroups);

    if (!usersResponse.ok) {
      setErrorMessage("No pude cargar las solicitudes. Revisa que tu cuenta siga siendo admin.");
      setPending([]);
      setApproved([]);
      return;
    }

    const payload = await usersResponse.json();
    const nextPending = (payload.pending ?? []) as UserRow[];
    const nextApproved = (payload.past ?? []) as UserRow[];
    const fallbackGroup = nextGroups[0]?.name ?? "";

    setPending(nextPending);
    setApproved(nextApproved);
    setPendingGroup((current) => {
      const next = { ...current };
      nextPending.forEach((user) => {
        if (!next[user.id]) next[user.id] = user.group_name || fallbackGroup;
      });
      return next;
    });
  }, [router]);

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      await loadAdminData();
      if (alive) setLoading(false);
    }

    void boot();

    return () => {
      alive = false;
    };
  }, [loadAdminData]);

  async function createGroup() {
    const name = newGroupName.trim();
    if (!name) return;
    setCreatingGroup(true);
    setErrorMessage(null);

    const ok = await patchRequest({
      action: "createGroup",
      groupName: name,
    });

    if (ok) {
      setNewGroupName("");
      setMessage(`Grupo creado: ${name}`);
      await loadAdminData();
    }

    setCreatingGroup(false);
  }

  async function patchRequest(body: Record<string, string | null>) {
    if (!token) return false;
    const response = await fetch("/api/admin/requests", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setErrorMessage(payload?.error || "No pude guardar el cambio.");
      return false;
    }

    return true;
  }

  async function approveUser(user: UserRow) {
    const groupName = pendingGroup[user.id] || groups[0]?.name || "";
    if (!groupName) {
      setErrorMessage("Crea o elige un grupo antes de aprobar.");
      return;
    }

    setBusyId(user.id);
    setErrorMessage(null);

    const ok = await patchRequest({
      action: "approve",
      userId: user.id,
      groupName,
    });

    if (ok) {
      setPending((current) => current.filter((item) => item.id !== user.id));
      setApproved((current) => [
        { ...user, is_approved: true, group_name: groupName },
        ...current,
      ]);
      setMessage(`${getName(user)} ya tiene acceso.`);
    }

    setBusyId(null);
  }

  async function changeGroup(userId: string, groupName: string) {
    setBusyId(userId);
    setErrorMessage(null);

    const ok = await patchRequest({
      action: "changeGroup",
      userId,
      groupName: groupName || null,
    });

    if (ok) {
      setApproved((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, group_name: groupName || null } : user,
        ),
      );
      setMessage("Grupo actualizado.");
    }

    setBusyId(null);
  }

  async function deleteUser(user: UserRow) {
    if (!token) return;
    setBusyId(user.id);
    setErrorMessage(null);

    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setErrorMessage(payload?.error || "No pude eliminar el usuario.");
    } else {
      setPending((current) => current.filter((item) => item.id !== user.id));
      setApproved((current) => current.filter((item) => item.id !== user.id));
      setMessage(`${getName(user)} fue eliminado.`);
    }

    setBusyId(null);
    setDeleteTarget(null);
  }

  if (loading) {
    return (
      <section className={styles.screen}>
        <div className={styles.hero}>
          <p className={styles.eyebrow}>Sensei</p>
          <h1 className={styles.heroTitle}>Cargando administración</h1>
          <p className={styles.heroCopy}>Estoy revisando tus permisos y cargando alumnos.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.screen}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Sensei</p>
        <h1 className={styles.heroTitle}>Administración</h1>
        <p className={styles.heroCopy}>
          Acepta alumnos nuevos, asígnalos a su grupo correcto y revisa de un vistazo quién ya tiene acceso.
        </p>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{pending.length}</span>
          <span className={styles.statLabel}>Solicitudes pendientes</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{approved.length}</span>
          <span className={styles.statLabel}>Alumnos activos</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{ungrouped.length}</span>
          <span className={styles.statLabel}>Sin grupo</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{groups.length}</span>
          <span className={styles.statLabel}>Grupos</span>
        </div>
      </div>

      {message && <div className={styles.message}>{message}</div>}
      {errorMessage && (
        <div className={`${styles.message} ${styles.messageError}`}>{errorMessage}</div>
      )}

      <div className={styles.layout}>
        <div className={styles.column}>
          <section>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Solicitudes</h2>
              <span className={styles.sectionMeta}>{pending.length} pendientes</span>
            </div>

            {pending.length === 0 ? (
              <div className={styles.emptyCard}>No hay alumnos esperando aprobación.</div>
            ) : (
              <div className={styles.studentList}>
                {pending.map((user) => (
                  <article className={styles.studentCard} key={user.id}>
                    <Avatar user={user} />
                    <div>
                      <p className={styles.studentName}>{getName(user)}</p>
                      <p className={styles.studentMeta}>{getSecondary(user)}</p>
                    </div>
                    <div className={styles.pendingActions}>
                      <select
                        className={styles.select}
                        value={pendingGroup[user.id] ?? ""}
                        onChange={(event) =>
                          setPendingGroup((current) => ({
                            ...current,
                            [user.id]: event.target.value,
                          }))
                        }
                        disabled={busyId === user.id}
                        aria-label={`Grupo para aprobar a ${getName(user)}`}
                      >
                        <option value="">Elegir grupo</option>
                        {groups.map((group) => (
                          <option key={group.name} value={group.name}>
                            {group.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className={styles.button}
                        type="button"
                        onClick={() => void approveUser(user)}
                        disabled={busyId === user.id}
                      >
                        Aprobar
                      </button>
                      <button
                        className={styles.dangerButton}
                        type="button"
                        onClick={() => setDeleteTarget(user)}
                        disabled={busyId === user.id}
                      >
                        Rechazar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {ungrouped.length > 0 && (
            <section>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>Sin grupo</h2>
                <span className={styles.sectionMeta}>{ungrouped.length} revisar</span>
              </div>
              <div className={styles.studentList}>
                {ungrouped.map((user) => (
                  <StudentRow
                    key={user.id}
                    user={user}
                    groups={groups}
                    busy={busyId === user.id}
                    onChangeGroup={changeGroup}
                    onDelete={setDeleteTarget}
                  />
                ))}
              </div>
            </section>
          )}

          {groupedStudents.map(({ group, users }) => (
            <section className={styles.groupBlock} key={group.name}>
              <div className={styles.groupHeader}>
                <span>{group.name}</span>
                <span className={styles.groupCount}>
                  {users.length} {users.length === 1 ? "alumno" : "alumnos"}
                </span>
              </div>
              {users.length === 0 ? (
                <div className={styles.emptyCard}>Sin alumnos en este grupo.</div>
              ) : (
                <div className={styles.studentList}>
                  {users.map((user) => (
                    <StudentRow
                      key={user.id}
                      user={user}
                      groups={groups}
                      busy={busyId === user.id}
                      onChangeGroup={changeGroup}
                      onDelete={setDeleteTarget}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>

        <aside className={styles.column}>
          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Vista de estudiante</h2>
              <span className={styles.sectionMeta}>
                {studentViewActive ? "Activa" : "Admin"}
              </span>
            </div>
            <p className={styles.helperText}>
              Elige un grupo para revisar Inicio, Gramática, Vocabulario y progreso como lo vería un alumno.
            </p>
            <div className={styles.viewControls}>
              <select
                className={styles.select}
                value={studentViewGroupName ?? ""}
                onChange={(event) => setStudentViewGroupName(event.target.value || null)}
              >
                <option value="">Elegir grupo</option>
                {groups.map((group) => (
                  <option key={group.name} value={group.name}>
                    {group.name}
                  </option>
                ))}
              </select>
              <button
                className={studentViewActive ? styles.ghostButton : styles.button}
                type="button"
                disabled={!studentViewActive && !studentViewGroupName}
                onClick={() => setStudentViewActive(!studentViewActive)}
              >
                {studentViewActive ? "Salir" : "Activar"}
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Grupos</h2>
              <span className={styles.sectionMeta}>{groups.length}</span>
            </div>
            <div className={styles.createGroup}>
              <input
                className={styles.input}
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void createGroup();
                }}
                placeholder="Nuevo grupo"
              />
              <button
                className={styles.button}
                type="button"
                onClick={() => void createGroup()}
                disabled={creatingGroup || !newGroupName.trim()}
              >
                Crear
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Vista rápida</h2>
            </div>
            <div className={styles.studentList}>
              {groups.map((group) => {
                const count = approved.filter((user) => user.group_name === group.name).length;
                return (
                  <div className={styles.groupHeader} key={group.name}>
                    <span>{group.name}</span>
                    <span className={styles.groupCount}>{count}</span>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={deleteTarget?.is_approved ? "¿Eliminar alumno?" : "¿Rechazar solicitud?"}
        description={
          deleteTarget
            ? `${getName(deleteTarget)} perderá acceso o su solicitud será eliminada.`
            : ""
        }
        confirmLabel={deleteTarget?.is_approved ? "Eliminar" : "Rechazar"}
        destructive
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && void deleteUser(deleteTarget)}
      />
    </section>
  );
}
