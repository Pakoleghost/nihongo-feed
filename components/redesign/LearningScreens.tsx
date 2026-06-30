"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import styles from "./RedesignApp.module.css";
import kanaStyles from "./KanaLearn.module.css";
import {
  getKanaDashboardSections,
  getGrammarLessonCards,
  getGrammarModuleCards,
  getKanjiLessonCards,
  getKanjiModuleCards,
  getVocabLessonCards,
  homeTasks,
  kanaTabs,
  type KanaTabKey,
  type GrammarInteraction,
  type GrammarPattern,
} from "./learning-data";
import {
  useDashboardPercent,
  useStudentDashboardData,
} from "./student-dashboard-state";
import { getWeeklyTopic } from "@/lib/weekly-topics";
import KanaStrokeAnimation from "@/components/KanaStrokeAnimation";
import KanjiStrokeAnimation from "@/components/KanjiStrokeAnimation";
import { KanaQuizScreen } from "./KanaQuizScreen";
import { type GenkiKanjiItem } from "@/lib/genki-kanji-by-lesson";
import { supabase } from "@/lib/supabase";
import {
  CURRICULUM_MODULES,
  getCurrentCurriculumModule,
  getCurriculumModuleByNumber,
} from "@/lib/curriculum-modules";
import { GENKI_LESSON_NAMES } from "@/lib/genki-lesson-names";
import FuriganaText from "@/components/FuriganaText";

type PageHeaderProps = {
  title: string;
  subtitle: string;
};

type BadgeTone = "teal" | "red" | "gray" | "navy";

const badgeToneClass: Record<BadgeTone, string> = {
  teal: styles.badgeTeal,
  red: styles.badgeRed,
  gray: styles.badgeGray,
  navy: styles.badgeNavy,
};

function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <h1 className={styles.pageTitle}>{title}</h1>
      <p className={styles.pageSub}>{subtitle}</p>
    </header>
  );
}

function Badge({
  children,
  tone = "gray",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span className={`${styles.badge} ${badgeToneClass[tone]}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className={styles.progressBar} aria-label={`${value}% completado`}>
      <div className={styles.progressFill} style={{ width: `${value}%` }} />
    </div>
  );
}

type ProfilePost = {
  id: string;
  content: string;
  image_url: string | null;
  from_tema: boolean | null;
  likes: number | null;
  created_at: string;
};

function formatPostDate(value: string) {
  try {
    return new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Fecha reciente";
  }
}

function HeroCard({
  glyph,
  title,
  subtitle,
  metric,
  metricLabel,
}: {
  glyph: string;
  title: string;
  subtitle: string;
  metric: string;
  metricLabel: string;
}) {
  return (
    <section className={styles.heroCard}>
      <div className={styles.heroLeft}>
        <div className={styles.heroGlyph}>{glyph}</div>
        <div>
          <div className={styles.heroTitle}>{title}</div>
          <div className={styles.heroSub}>{subtitle}</div>
        </div>
      </div>
      <div className={styles.heroMetric}>
        <strong>{metric}</strong>
        <span>{metricLabel}</span>
      </div>
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className={styles.sectionLabel}>{children}</div>;
}

function GrammarWordOrderInteraction({
  interaction,
}: {
  interaction: Extract<GrammarInteraction, { type: "word-order" }>;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [status, setStatus] = useState<"idle" | "correct" | "wrong">("idle");

  const remaining = interaction.tokens.filter((token, index) => {
    const tokenUseCount = picked.filter((item) => item === token).length;
    const seenBefore = interaction.tokens
      .slice(0, index + 1)
      .filter((item) => item === token).length;
    return seenBefore > tokenUseCount;
  });

  const checkAnswer = () => {
    const isCorrect =
      picked.length === interaction.answer.length &&
      picked.every((token, index) => token === interaction.answer[index]);
    setStatus(isCorrect ? "correct" : "wrong");
  };

  const reset = () => {
    setPicked([]);
    setStatus("idle");
  };

  return (
    <div className={styles.grammarInteraction}>
      <span>Ordena</span>
      <p>{interaction.prompt}</p>
      <div className={styles.grammarBuildLine}>
        {picked.length === 0 ? (
          <em>Toca las palabras en orden</em>
        ) : (
          picked.map((token, index) => (
            <button
              key={`${token}-${index}`}
              type="button"
              onClick={() => {
                setPicked((current) => current.filter((_, i) => i !== index));
                setStatus("idle");
              }}
            >
              {token}
            </button>
          ))
        )}
      </div>
      <div className={styles.grammarTokenRow}>
        {remaining.map((token, index) => (
          <button
            key={`${token}-${index}`}
            type="button"
            onClick={() => {
              setPicked((current) => [...current, token]);
              setStatus("idle");
            }}
          >
            {token}
          </button>
        ))}
      </div>
      <div className={styles.grammarInteractionActions}>
        <button type="button" onClick={checkAnswer} disabled={picked.length === 0}>
          Revisar
        </button>
        <button type="button" onClick={reset}>
          Reiniciar
        </button>
      </div>
      {status === "correct" && (
        <div className={styles.grammarFeedbackOk}>
          {interaction.successMessage ?? "Correcto."}
        </div>
      )}
      {status === "wrong" && (
        <div className={styles.grammarFeedbackNo}>
          Casi. Revisa el orden y vuelve a intentar.
        </div>
      )}
    </div>
  );
}

function GrammarChoiceInteraction({
  interaction,
}: {
  interaction: Extract<GrammarInteraction, { type: "multiple-choice" }>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const isCorrect = selected === interaction.answer;

  return (
    <div className={styles.grammarInteraction}>
      <span>Elige</span>
      <p>{interaction.prompt}</p>
      <div className={styles.grammarChoiceGrid}>
        {interaction.options.map((option) => (
          <button
            key={option}
            type="button"
            className={
              selected === option
                ? isCorrect
                  ? styles.grammarChoiceCorrect
                  : styles.grammarChoiceWrong
                : ""
            }
            onClick={() => setSelected(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {selected && isCorrect && (
        <div className={styles.grammarFeedbackOk}>
          {interaction.successMessage ?? "Correcto."}
        </div>
      )}
      {selected && !isCorrect && (
        <div className={styles.grammarFeedbackNo}>
          Todavía no. Prueba otra opción.
        </div>
      )}
    </div>
  );
}

function GrammarFillBlankInteraction({
  interaction,
}: {
  interaction: Extract<GrammarInteraction, { type: "fill-blank" }>;
}) {
  const [value, setValue] = useState("");
  const [checked, setChecked] = useState(false);
  const isCorrect = value.trim() === interaction.answer;

  return (
    <div className={styles.grammarInteraction}>
      <span>Completa</span>
      <p>{interaction.prompt}</p>
      <div className={styles.grammarFillLine}>
        <strong>{interaction.before}</strong>
        <input
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setChecked(false);
          }}
          placeholder={interaction.placeholder ?? "respuesta"}
        />
        <strong>{interaction.after}</strong>
      </div>
      <div className={styles.grammarInteractionActions}>
        <button type="button" onClick={() => setChecked(true)}>
          Revisar
        </button>
      </div>
      {checked && isCorrect && (
        <div className={styles.grammarFeedbackOk}>
          {interaction.successMessage ?? "Correcto."}
        </div>
      )}
      {checked && !isCorrect && (
        <div className={styles.grammarFeedbackNo}>
          Casi. Cuida espacios y forma.
        </div>
      )}
    </div>
  );
}

function GrammarInteractionBlock({
  interaction,
}: {
  interaction: GrammarInteraction;
}) {
  if (interaction.type === "word-order") {
    return <GrammarWordOrderInteraction interaction={interaction} />;
  }
  if (interaction.type === "multiple-choice") {
    return <GrammarChoiceInteraction interaction={interaction} />;
  }
  return <GrammarFillBlankInteraction interaction={interaction} />;
}

function buildFallbackGrammarInteraction(
  pattern: GrammarPattern,
): GrammarInteraction | null {
  const formationSource = pattern.formation?.[0]?.split("→")[0]?.trim();
  const base = formationSource || pattern.pattern;
  const tokens = base
    .replace(/[。？?]/g, "")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length < 2) return null;

  return {
    type: "word-order",
    prompt: "Acomoda la estructura base del patrón.",
    tokens: [...tokens].reverse(),
    answer: tokens,
    successMessage: "Bien. Esa es la estructura.",
  };
}

export function StudentHomeScreen() {
  const { profile, course, streak, kana, vocab, reviewTotal, lastActivity } =
    useStudentDashboardData();
  const kanaPct = useDashboardPercent(kana);
  const courseModule =
    getCurriculumModuleByNumber(course.currentModuleNumber) ??
    getCurrentCurriculumModule(course.currentLesson);
  const lessonLabel = course.currentLesson
    ? `L${course.currentLesson}`
    : "lección actual";

  return (
    <>
      <PageHeader
        title={`おはよう、${profile.displayName}`}
        subtitle={`${profile.groupName || "Alumno"} · ${lessonLabel}`}
      />

      <div className={styles.homeGrid}>
        <div>
          <section className={styles.greetingCard}>
            <div className={styles.greetingJa}>今日も頑張ろう！</div>
            <div className={styles.greetingName}>
              {profile.groupName || "Tu ruta de japonés"}
            </div>
            <div className={styles.greetingSub}>
              Módulo {courseModule.numero} · {courseModule.nombre}
            </div>
            <div className={styles.statsGrid}>
              <div className={styles.statTile}>
                <strong>{streak || 1}</strong>
                <span>Racha</span>
              </div>
              <div className={styles.statTile}>
                <strong>{kana.practiced}</strong>
                <span>Kana</span>
              </div>
              <div className={styles.statTile}>
                <strong>{vocab.practiced}</strong>
                <span>Palabras</span>
              </div>
              <div className={styles.statTile}>
                <strong>{reviewTotal}</strong>
                <span>Repaso</span>
              </div>
            </div>
          </section>

          <section className={styles.noteCard}>
            <div className={styles.noteLabel}>Pako sensei</div>
            <div className={styles.noteText}>
              Esta semana: verbos de movimiento con て-form. Entrega la tarea de
              escritura antes del viernes y práctica kana todos los días.
            </div>
          </section>

          <SectionLabel>Continúa donde lo dejaste</SectionLabel>
          <section className={`${styles.card} ${styles.rowList}`}>
            <Link href="/dashboard/hiragana" className={styles.rowItem}>
              <span className={styles.rowIcon}>あ</span>
              <span className={styles.rowCopy}>
                <span className={styles.rowTitle}>Hiragana</span>
                <span className={styles.rowSub}>
                  {kana.practiced}/{kana.total} caracteres practicados
                </span>
              </span>
              <span className={styles.rowRight}>
                <ProgressBar value={kanaPct} />
              </span>
            </Link>
            <Link href="/dashboard/vocabulario" className={styles.rowItem}>
              <span className={`${styles.rowIcon} ${styles.rowIconRed}`}>
                語
              </span>
              <span className={styles.rowCopy}>
                <span className={styles.rowTitle}>Vocabulario de clase</span>
                <span className={styles.rowSub}>
                  {vocab.due} pendientes · {vocab.difficult} débiles
                </span>
              </span>
              <span className={styles.rowRight}>
                <Badge tone="red">Nuevo</Badge>
              </span>
            </Link>
            <Link href="/dashboard/gramatica" className={styles.rowItem}>
              <span className={`${styles.rowIcon} ${styles.rowIconNavy}`}>
                文
              </span>
              <span className={styles.rowCopy}>
                <span className={styles.rowTitle}>Gramática · て-form</span>
                <span className={styles.rowSub}>{lessonLabel} · conectar acciones</span>
              </span>
              <span className={styles.rowRight}>
                <Badge tone="navy">{lessonLabel.toUpperCase()}</Badge>
              </span>
            </Link>
          </section>
        </div>

        <div>
          <SectionLabel>Esta semana</SectionLabel>
          <section className={`${styles.card} ${styles.rowList}`}>
            {homeTasks.map((task) => (
              <div key={task.title} className={styles.taskRow}>
                <span
                  className={`${styles.taskCheck} ${task.done ? styles.taskCheckDone : ""}`}
                  aria-hidden="true"
                >
                  {task.done ? "✓" : ""}
                </span>
                <span className={styles.rowCopy}>
                  <span className={styles.rowTitle}>{task.title}</span>
                  <span className={styles.rowSub}>{task.meta}</span>
                </span>
                <Badge
                  tone={
                    task.done
                      ? "teal"
                      : task.state === "Pendiente"
                        ? "red"
                        : "gray"
                  }
                >
                  {task.state}
                </Badge>
              </div>
            ))}
          </section>
        </div>
      </div>
      {lastActivity && (
        <>
          <SectionLabel>Última actividad</SectionLabel>
          <section className={`${styles.card} ${styles.rowList}`}>
            <Link href={lastActivity.path} className={styles.rowItem}>
              <span className={`${styles.rowIcon} ${styles.rowIconNavy}`}>
                続
              </span>
              <span className={styles.rowCopy}>
                <span className={styles.rowTitle}>{lastActivity.label}</span>
                <span className={styles.rowSub}>
                  Retoma justo donde te quedaste
                </span>
              </span>
              <Badge tone="navy">Continuar</Badge>
            </Link>
          </section>
        </>
      )}
    </>
  );
}

export function KanaLearningScreen({
  script,
}: {
  script: "hiragana" | "katakana";
}) {
  const [activeTab, setActiveTab] = useState<KanaTabKey>("basic");
  const [selectedKana, setSelectedKana] = useState(
    script === "hiragana" ? "あ" : "ア",
  );
  const [activeQuiz, setActiveQuiz] = useState<"reading" | "writing" | null>(
    null,
  );
  const isHiragana = script === "hiragana";
  const sections = getKanaDashboardSections(script, activeTab);
  const selectedItem = useMemo(() => {
    for (const section of sections) {
      for (const row of section.rows) {
        const found = row.cells.find((cell) => cell?.kana === selectedKana);
        if (found) return found;
      }
    }
    return sections[0]?.rows[0]?.cells.find(Boolean) ?? null;
  }, [sections, selectedKana]);

  return (
    <>
      <section className={kanaStyles.learnHero}>
        <div className={kanaStyles.learnHeroLeft}>
          <div className={kanaStyles.learnGlyph}>
            {isHiragana ? "あ" : "ア"}
          </div>
          <div>
            <h1>{isHiragana ? "Hiragana" : "Katakana"}</h1>
            <p>
              {isHiragana
                ? "Domina el silabario base del japonés paso a paso."
                : "Practica el silabario usado en préstamos, nombres y énfasis."}
            </p>
          </div>
        </div>
        <div className={kanaStyles.learnHeroStats}>
          <div>
            <strong>46</strong>
            <span>Básicos</span>
          </div>
          <div>
            <strong>2</strong>
            <span>Quizzes</span>
          </div>
        </div>
      </section>

      <section
        className={kanaStyles.learnModeGrid}
        aria-label="Modos de estudio de kana"
      >
        <a
          href="#kana-chart"
          className={`${kanaStyles.learnModeCard} ${kanaStyles.learnModeCardActive}`}
        >
          <span className={kanaStyles.learnModeIcon}>
            {isHiragana ? "あ" : "ア"}
          </span>
          <span>
            <strong>Tabla de kana</strong>
            <em>Tabla interactiva con orden de trazos</em>
          </span>
        </a>
        <button
          type="button"
          onClick={() => setActiveQuiz("reading")}
          className={kanaStyles.learnModeCard}
        >
          <span className={kanaStyles.learnModeIcon}>読</span>
          <span>
            <strong>Quiz de lectura</strong>
            <em>Reconoce kana y elige el romaji correcto</em>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setActiveQuiz("writing")}
          className={kanaStyles.learnModeCard}
        >
          <span className={kanaStyles.learnModeIcon}>書</span>
          <span>
            <strong>Quiz de escritura</strong>
            <em>Lee romaji y elige el kana correcto</em>
          </span>
        </button>
      </section>

      <section className={kanaStyles.kanaLearnPanel} id="kana-chart">
        <div className={kanaStyles.kanaLearnHeader}>
          <span className={kanaStyles.learnModeIcon}>
            {isHiragana ? "あ" : "ア"}
          </span>
          <div>
            <h2>Tabla interactiva de {isHiragana ? "hiragana" : "katakana"}</h2>
            <p>
              Haz click en cualquier carácter para ver su lectura y orden de
              trazos.
            </p>
          </div>
        </div>

        <div className={kanaStyles.kanaGuideBox}>
          <strong>Cómo estudiar esta tabla</strong>
          <span>
            Toca un kana, mira el orden de trazos y repítelo en voz baja.
          </span>
          <span>
            Después haz el quiz de lectura y el quiz de escritura hasta sentirlo
            natural.
          </span>
          <span>Primero Básico, luego Combinaciones, al final Sonoros.</span>
        </div>

        <div className={kanaStyles.kanaQuizRow}>
          <button
            type="button"
            onClick={() => setActiveQuiz("reading")}
            className={kanaStyles.kanaQuizCard}
          >
            <span>読</span>
            <strong>Quiz de lectura</strong>
            <em>Reconoce el kana por lectura</em>
          </button>
          <button
            type="button"
            onClick={() => setActiveQuiz("writing")}
            className={kanaStyles.kanaQuizCard}
          >
            <span>書</span>
            <strong>Quiz de escritura</strong>
            <em>Romaji a kana</em>
          </button>
        </div>

        <div
          className={kanaStyles.kanaLearnTabs}
          role="tablist"
          aria-label="Tipo de kana"
        >
          {kanaTabs.map((tab) => {
            const meta =
              tab.key === "basic"
                ? "46 kana"
                : tab.key === "contracted"
                  ? "33 combos"
                  : "25 kana";
            const icon =
              tab.key === "basic"
                ? isHiragana
                  ? "あ"
                  : "ア"
                : tab.key === "contracted"
                  ? isHiragana
                    ? "き"
                    : "キ"
                  : isHiragana
                    ? "が"
                    : "ガ";
            return (
              <button
                key={tab.key}
                type="button"
                className={`${kanaStyles.kanaLearnTab} ${activeTab === tab.key ? kanaStyles.kanaLearnTabActive : ""}`}
                onClick={() => {
                  setActiveTab(tab.key);
                  const nextSections = getKanaDashboardSections(
                    script,
                    tab.key,
                  );
                  const nextFirst =
                    nextSections[0]?.rows[0]?.cells.find(Boolean);
                  if (nextFirst) setSelectedKana(nextFirst.kana);
                }}
              >
                <span
                  className={
                    tab.key === "contracted" ? kanaStyles.kanaComboIcon : ""
                  }
                >
                  {icon}
                </span>
                <strong>{tab.label}</strong>
                <em>{meta}</em>
              </button>
            );
          })}
        </div>

        <div className={kanaStyles.kanaChartLayout}>
          <div className={kanaStyles.kanaChartCard}>
            <div className={kanaStyles.kanaChartTitleRow}>
              <span className={kanaStyles.learnModeIcon}>
                {selectedItem?.kana ?? (isHiragana ? "あ" : "ア")}
              </span>
              <div>
                <h3>
                  {activeTab === "basic"
                    ? "Caracteres básicos"
                    : activeTab === "contracted"
                      ? "Combinaciones"
                      : "Sonidos con marca"}
                </h3>
                <p>
                  {activeTab === "basic"
                    ? "Tabla gojuuon principal"
                    : activeTab === "contracted"
                      ? "Combinaciones con ゃ/ゅ/ょ"
                      : "Dakuten y handakuten"}
                </p>
              </div>
            </div>

            {sections.map((section) => (
              <div key={section.key} className={kanaStyles.kanaChartSection}>
                {sections.length > 1 && (
                  <div className={kanaStyles.kanaChartSectionTitle}>
                    {section.label}
                  </div>
                )}
                {section.rows.map((row) => (
                  <div key={row.key} className={kanaStyles.kanaChartRow}>
                    <span className={kanaStyles.kanaRowLabel}>{row.label}</span>
                    <div
                      className={kanaStyles.kanaChartGrid}
                      style={{
                        gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))`,
                      }}
                    >
                      {row.cells.map((cell, index) =>
                        cell ? (
                          <button
                            key={cell.id}
                            type="button"
                            className={`${kanaStyles.kanaChartCell} ${selectedKana === cell.kana ? kanaStyles.kanaChartCellSelected : ""}`}
                            onClick={() => setSelectedKana(cell.kana)}
                            aria-label={`${cell.kana}, ${cell.romaji}`}
                          >
                            <span>{cell.kana}</span>
                            <em>{cell.romaji.toUpperCase()}</em>
                          </button>
                        ) : (
                          <span
                            key={`${row.key}-${index}`}
                            className={kanaStyles.kanaChartEmptyCell}
                          />
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <aside className={kanaStyles.kanaStrokePanel}>
            <div className={kanaStyles.kanaStrokeSticky}>
              <div className={kanaStyles.kanaStrokeHeader}>
                <span>{Array.from(selectedItem?.kana ?? selectedKana)[0]}</span>
                <div>
                  <strong>{selectedItem?.romaji.toUpperCase() ?? ""}</strong>
                  <em>Orden de trazos</em>
                </div>
              </div>
              <KanaStrokeAnimation
                kana={selectedItem?.kana ?? selectedKana}
                size={220}
                speed="normal"
              />
              <p>
                Reproduce la animación para estudiar el orden antes de
                practicar.
              </p>
              <button
                type="button"
                onClick={() => setActiveQuiz("writing")}
                className={styles.tealButton}
              >
                Hacer quiz de escritura
              </button>
            </div>
          </aside>
        </div>
      </section>

      {activeQuiz && (
        <div
          className={kanaStyles.quizOverlay}
          role="presentation"
          onClick={() => setActiveQuiz(null)}
        >
          <section
            className={kanaStyles.quizModal}
            role="dialog"
            aria-modal="true"
            aria-label={`${script} ${activeQuiz} quiz`}
            onClick={(event) => event.stopPropagation()}
          >
            <KanaQuizScreen
              script={script}
              mode={activeQuiz}
              presentation="modal"
              onClose={() => setActiveQuiz(null)}
            />
          </section>
        </div>
      )}
    </>
  );
}

type KanjiQuizMode = "reading" | "meaning";
type KanjiStrokeSpeed = "slow" | "normal" | "fast";

const kanjiStrokeSpeeds: Array<{ key: KanjiStrokeSpeed; label: string }> = [
  { key: "slow", label: "Lento" },
  { key: "normal", label: "Normal" },
  { key: "fast", label: "Rápido" },
];

function KanjiHero({
  subtitle,
  primaryMetric,
  primaryLabel,
  secondaryMetric,
  secondaryLabel,
}: {
  subtitle: string;
  primaryMetric: string | number;
  primaryLabel: string;
  secondaryMetric: string | number;
  secondaryLabel: string;
}) {
  return (
    <section className={kanaStyles.learnHero}>
      <div className={kanaStyles.learnHeroLeft}>
        <div className={kanaStyles.learnGlyph}>漢</div>
        <div>
          <h1>Kanji</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className={kanaStyles.learnHeroStats}>
        <div>
          <strong>{primaryMetric}</strong>
          <span>{primaryLabel}</span>
        </div>
        <div>
          <strong>{secondaryMetric}</strong>
          <span>{secondaryLabel}</span>
        </div>
      </div>
    </section>
  );
}

function GrammarHero({
  subtitle,
  primaryMetric,
  primaryLabel,
  secondaryMetric,
  secondaryLabel,
}: {
  subtitle: string;
  primaryMetric: string | number;
  primaryLabel: string;
  secondaryMetric: string | number;
  secondaryLabel: string;
}) {
  return (
    <section className={kanaStyles.learnHero}>
      <div className={kanaStyles.learnHeroLeft}>
        <div className={kanaStyles.learnGlyph}>文</div>
        <div>
          <h1>Gramática</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className={kanaStyles.learnHeroStats}>
        <div>
          <strong>{primaryMetric}</strong>
          <span>{primaryLabel}</span>
        </div>
        <div>
          <strong>{secondaryMetric}</strong>
          <span>{secondaryLabel}</span>
        </div>
      </div>
    </section>
  );
}

type KanjiQuizQuestion = {
  item: GenkiKanjiItem;
  answer: string;
  options: string[];
};

function kanjiItemKey(item: GenkiKanjiItem) {
  return `${item.kanji}-${item.hira}-${item.es}-${item.source_row}`;
}

function shuffleItems<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildKanjiQuestions(
  lessonItems: GenkiKanjiItem[],
  allItems: GenkiKanjiItem[],
  mode: KanjiQuizMode,
): KanjiQuizQuestion[] {
  const questionItems = shuffleItems(lessonItems).slice(
    0,
    Math.min(10, lessonItems.length),
  );
  const optionSource = allItems.length >= 4 ? allItems : lessonItems;

  return questionItems.map((item) => {
    const answer = mode === "reading" ? item.hira : item.es;
    const wrongOptions = shuffleItems(
      optionSource
        .map((option) => (mode === "reading" ? option.hira : option.es))
        .filter(
          (option, index, array) =>
            option !== answer && array.indexOf(option) === index,
        ),
    ).slice(0, 3);

    return {
      item,
      answer,
      options: shuffleItems([answer, ...wrongOptions]).slice(0, 4),
    };
  });
}

function KanjiQuizModal({
  mode,
  lessonLabel,
  items,
  allItems,
  onClose,
}: {
  mode: KanjiQuizMode;
  lessonLabel: string;
  items: GenkiKanjiItem[];
  allItems: GenkiKanjiItem[];
  onClose: () => void;
}) {
  const questions = useMemo(
    () => buildKanjiQuestions(items, allItems, mode),
    [allItems, items, mode],
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const currentQuestion = questions[questionIndex];
  const percentage =
    questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function resetQuiz() {
    setQuestionIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setIsFinished(false);
  }

  function answerQuestion(option: string) {
    if (selectedAnswer || !currentQuestion) return;

    const isCorrect = option === currentQuestion.answer;
    const nextScore = score + (isCorrect ? 1 : 0);
    setSelectedAnswer(option);
    setScore(nextScore);

    window.setTimeout(() => {
      if (questionIndex + 1 >= questions.length) {
        setIsFinished(true);
        return;
      }

      setQuestionIndex((current) => current + 1);
      setSelectedAnswer(null);
    }, 720);
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className={styles.kanjiQuizShell}>
      <div className={styles.kanjiQuizTop}>
        <div className={styles.kanjiQuizTitle}>
          <span>{mode === "reading" ? "読" : "意"}</span>
          <div>
            <h2>
              {mode === "reading"
                ? "Quiz de lectura de kanji"
                : "Quiz de significado de kanji"}
            </h2>
            <p>
              {lessonLabel} · Pregunta{" "}
              {Math.min(questionIndex + 1, questions.length)} de{" "}
              {questions.length}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={styles.kanjiQuizClose}
          onClick={onClose}
          aria-label="Cerrar quiz"
        >
          ×
        </button>
      </div>

      <div className={styles.kanjiQuizProgress} aria-hidden="true">
        <span
          style={{
            width: `${((questionIndex + 1) / questions.length) * 100}%`,
          }}
        />
      </div>

      {isFinished ? (
        <div className={styles.kanjiQuizResult}>
          <strong>{percentage}%</strong>
          <h3>{percentage >= 80 ? "Buen ritmo" : "Vamos otra vez"}</h3>
          <p>
            Tu resultado fue {score}/{questions.length}. Este quiz no guarda
            progreso todavía; es práctica rápida para clase.
          </p>
          <div className={styles.kanjiQuizActions}>
            <button
              type="button"
              className={styles.tealButton}
              onClick={resetQuiz}
            >
              Repetir quiz
            </button>
            <button
              type="button"
              className={styles.lightButton}
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.kanjiQuizPrompt}>
            <span>{currentQuestion.item.kanji}</span>
            <em>
              {mode === "reading"
                ? "Elige la lectura correcta"
                : "Elige el significado correcto"}
            </em>
          </div>
          <div className={styles.kanjiQuizOptions}>
            {currentQuestion.options.map((option) => {
              const isCorrect =
                selectedAnswer && option === currentQuestion.answer;
              const isWrong =
                selectedAnswer === option && option !== currentQuestion.answer;
              return (
                <button
                  key={option}
                  type="button"
                  disabled={Boolean(selectedAnswer)}
                  className={`${styles.kanjiQuizOption} ${isCorrect ? styles.kanjiQuizOptionCorrect : ""} ${
                    isWrong ? styles.kanjiQuizOptionWrong : ""
                  }`}
                  onClick={() => answerQuestion(option)}
                >
                  {option}
                </button>
              );
            })}
          </div>
          <div className={styles.kanjiQuizFooter}>
            {selectedAnswer
              ? selectedAnswer === currentQuestion.answer
                ? "Correcto"
                : `Respuesta: ${currentQuestion.answer}`
              : `${score}/${questionIndex} correctas hasta ahora`}
          </div>
        </>
      )}
    </div>
  );
}

export function KanjiLearningScreen() {
  const lessons = useMemo(() => getKanjiLessonCards(), []);
  const modules = useMemo(() => getKanjiModuleCards(), []);
  const allKanjiItems = useMemo(
    () => lessons.flatMap((lesson) => lesson.items),
    [lessons],
  );
  const [selectedModuleNumber, setSelectedModuleNumber] = useState<
    number | null
  >(null);
  const [activeLessonNumber, setActiveLessonNumber] = useState<number | null>(
    null,
  );
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [quizMode, setQuizMode] = useState<KanjiQuizMode | null>(null);
  const [strokeSpeed, setStrokeSpeed] = useState<KanjiStrokeSpeed>("normal");
  const [showStrokeGrid, setShowStrokeGrid] = useState(true);

  const selectedModule =
    modules.find((module) => module.moduleNumber === selectedModuleNumber) ??
    null;
  const moduleLessons = selectedModule?.lessons ?? [];
  const activeLesson =
    moduleLessons.find((lesson) => lesson.lesson === activeLessonNumber) ??
    null;
  const selectedItem = activeLesson
    ? (activeLesson.items.find((item) => kanjiItemKey(item) === selectedKey) ??
      activeLesson.items[0])
    : null;
  const selectedIndex =
    activeLesson && selectedItem
      ? Math.max(
          activeLesson.items.findIndex(
            (item) => kanjiItemKey(item) === kanjiItemKey(selectedItem),
          ),
          0,
        )
      : 0;
  const availableModules = modules.filter((module) => module.hasKanji);
  const currentStep = activeLesson
    ? "study"
    : selectedModule
      ? "lessons"
      : "modules";
  const heroSubtitle =
    currentStep === "modules"
      ? "Escoge un módulo para ver sus lecciones de kanji."
      : currentStep === "lessons"
        ? `Módulo ${selectedModule?.moduleNumber} · escoge una lección.`
        : `Módulo ${selectedModule?.moduleNumber} · Lección ${activeLesson?.lesson}.`;

  const openModule = (moduleNumber: number) => {
    setSelectedModuleNumber(moduleNumber);
    setActiveLessonNumber(null);
    setSelectedKey(null);
    setQuizMode(null);
  };

  const openLesson = (lessonNumber: number) => {
    const lesson = moduleLessons.find((item) => item.lesson === lessonNumber);
    if (!lesson) return;
    setActiveLessonNumber(lesson.lesson);
    setSelectedKey(kanjiItemKey(lesson.items[0]));
    setQuizMode(null);
  };

  const backToModules = () => {
    setSelectedModuleNumber(null);
    setActiveLessonNumber(null);
    setSelectedKey(null);
    setQuizMode(null);
  };

  const backToLessons = () => {
    setActiveLessonNumber(null);
    setSelectedKey(null);
    setQuizMode(null);
  };

  if (currentStep === "modules") {
    return (
      <>
        <KanjiHero
          subtitle={heroSubtitle}
          primaryMetric={allKanjiItems.length}
          primaryLabel="Kanji"
          secondaryMetric={availableModules.length}
          secondaryLabel="Módulos"
        />

        <section className={styles.kanjiLearnPanel}>
          <div className={styles.kanjiWorkspaceTop}>
            <div>
              <h2>Escoge tu módulo</h2>
              <p>Después eliges una lección y practicas sus kanji.</p>
            </div>
          </div>

          <div className={styles.kanjiModuleGrid}>
            {modules.map((module) => (
              <button
                key={module.moduleNumber}
                type="button"
                disabled={!module.hasKanji}
                className={`${styles.kanjiModuleCard} ${
                  module.isCurrent ? styles.kanjiModuleCardCurrent : ""
                } ${!module.hasKanji ? styles.kanjiModuleCardDisabled : ""}`}
                onClick={() => openModule(module.moduleNumber)}
              >
                <span className={styles.kanjiModuleBadge}>
                  M{module.moduleNumber}
                </span>
                <span className={styles.kanjiModuleGlyph}>漢</span>
                <strong>{module.title}</strong>
                <em>{module.titleJa}</em>
                <span>
                  {module.hasKanji
                    ? `${module.lessonCount} ${
                        module.lessonCount === 1 ? "lección" : "lecciones"
                      } · ${module.kanjiCount} kanji`
                    : "Próximamente"}
                </span>
              </button>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (currentStep === "lessons" && selectedModule) {
    return (
      <>
        <KanjiHero
          subtitle={heroSubtitle}
          primaryMetric={selectedModule.lessonCount}
          primaryLabel="Lecciones"
          secondaryMetric={selectedModule.kanjiCount}
          secondaryLabel="Kanji"
        />

        <section className={styles.kanjiLearnPanel}>
          <div className={styles.kanjiWorkspaceTop}>
            <div>
              <button
                type="button"
                className={styles.kanjiBackButton}
                onClick={backToModules}
              >
                ← Módulos
              </button>
              <h2>
                Módulo {selectedModule.moduleNumber} · {selectedModule.title}
              </h2>
              <p>
                {selectedModule.titleJa} · {selectedModule.jlpt}
              </p>
            </div>
          </div>

          <div className={styles.kanjiLessonChoiceGrid}>
            {moduleLessons.map((lesson) => (
              <button
                key={lesson.lesson}
                type="button"
                className={styles.kanjiLessonChoiceCard}
                onClick={() => openLesson(lesson.lesson)}
              >
                <span>L{lesson.lesson}</span>
                <strong>{lesson.title}</strong>
                <em>{lesson.count} kanji</em>
              </button>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (!selectedModule || !activeLesson || !selectedItem) {
    return null;
  }

  return (
    <>
      <KanjiHero
        subtitle={heroSubtitle}
        primaryMetric={activeLesson.count}
        primaryLabel="Kanji"
        secondaryMetric={`M${selectedModule.moduleNumber}`}
        secondaryLabel="Módulo"
      />

      <section className={styles.kanjiLearnPanel} id="kanji-list">
        <div className={styles.kanjiWorkspaceTop}>
          <div>
            <button
              type="button"
              className={styles.kanjiBackButton}
              onClick={backToLessons}
            >
              ← Lecciones
            </button>
            <h2>
              Lección {activeLesson.lesson} · {activeLesson.title}
            </h2>
            <p>
              {activeLesson.count} kanji aislados para reconocer y practicar
              trazos.
            </p>
          </div>
          <div className={styles.kanjiQuickActions}>
            <button
              type="button"
              className={styles.tealButton}
              onClick={() => setQuizMode("reading")}
            >
              Quiz de lectura
            </button>
            <button
              type="button"
              className={styles.lightButton}
              onClick={() => setQuizMode("meaning")}
            >
              Quiz de significado
            </button>
          </div>
        </div>

        <div
          className={styles.kanjiLessonTabs}
          role="tablist"
          aria-label="Lecciones de kanji"
        >
          {moduleLessons.map((lesson) => (
            <button
              key={lesson.lesson}
              type="button"
              className={`${styles.kanjiLessonTab} ${
                activeLesson.lesson === lesson.lesson
                  ? styles.kanjiLessonTabActive
                  : ""
              }`}
              onClick={() => openLesson(lesson.lesson)}
            >
              <strong>L{lesson.lesson}</strong>
              <span>{lesson.title}</span>
              <em>{lesson.count} kanji</em>
            </button>
          ))}
        </div>

        <div className={styles.kanjiStudyLayout}>
          <div className={styles.kanjiListCard}>
            <div className={styles.kanjiListHeader}>
              <div>
                <h3>Kanji de la lección</h3>
                <p>
                  Selecciona una tarjeta para ver lectura, significado y orden
                  de trazos.
                </p>
              </div>
              {activeLesson.isCurrent && <Badge tone="teal">Actual</Badge>}
            </div>

            <div className={styles.kanjiGrid}>
              {activeLesson.items.map((item) => {
                const key = kanjiItemKey(item);
                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.kanjiCard} ${selectedItem && key === kanjiItemKey(selectedItem) ? styles.kanjiCardSelected : ""}`}
                    onClick={() => setSelectedKey(key)}
                  >
                    <span className={styles.kanjiChar}>{item.kanji}</span>
                    <span className={styles.kanjiMean}>{item.es}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className={styles.kanjiDetailPanel}>
            <div className={styles.kanjiDetailSticky}>
              <span className={styles.kanjiDetailBadge}>
                L{activeLesson.lesson}
              </span>
              <div className={styles.kanjiStrokePreview}>
                <div className={styles.kanjiStrokeTitle}>
                  <span>{selectedItem.kanji}</span>
                  <strong>
                    {selectedIndex + 1}/{activeLesson.count} · Orden de trazos
                  </strong>
                </div>
                <KanjiStrokeAnimation
                  kanji={selectedItem.kanji}
                  size={224}
                  speed={strokeSpeed}
                  showGrid={showStrokeGrid}
                />
                <div className={styles.kanjiStrokeControls}>
                  <div
                    className={styles.kanjiSpeedGroup}
                    aria-label="Velocidad de animación"
                  >
                    {kanjiStrokeSpeeds.map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        className={
                          strokeSpeed === option.key ? styles.activePill : ""
                        }
                        onClick={() => setStrokeSpeed(option.key)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={`${styles.kanjiGridToggle} ${
                      showStrokeGrid ? styles.activePill : ""
                    }`}
                    onClick={() => setShowStrokeGrid((value) => !value)}
                  >
                    Grid {showStrokeGrid ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
              <div className={styles.kanjiDetailReading}>
                {selectedItem.hira}
              </div>
              <div className={styles.kanjiDetailMeaning}>{selectedItem.es}</div>
            </div>
          </aside>
        </div>
      </section>

      {quizMode && (
        <div
          className={kanaStyles.quizOverlay}
          role="presentation"
          onClick={() => setQuizMode(null)}
        >
          <section
            className={kanaStyles.quizModal}
            role="dialog"
            aria-modal="true"
            aria-label={`Kanji ${quizMode} quiz`}
            onClick={(event) => event.stopPropagation()}
          >
            <KanjiQuizModal
              mode={quizMode}
              lessonLabel={`Lección ${activeLesson.lesson}`}
              items={activeLesson.items}
              allItems={allKanjiItems}
              onClose={() => setQuizMode(null)}
            />
          </section>
        </div>
      )}
    </>
  );
}

export function GrammarLearningScreen() {
  const lessons = useMemo(() => getGrammarLessonCards(), []);
  const modules = useMemo(() => getGrammarModuleCards(), []);
  const allPatterns = useMemo(
    () => lessons.flatMap((lesson) => lesson.patterns),
    [lessons],
  );
  const [selectedModuleNumber, setSelectedModuleNumber] = useState<
    number | null
  >(null);
  const [activeLessonNumber, setActiveLessonNumber] = useState<number | null>(
    null,
  );
  const [selectedPatternKey, setSelectedPatternKey] = useState<string | null>(
    null,
  );
  const selectedModule =
    modules.find((module) => module.moduleNumber === selectedModuleNumber) ??
    null;
  const moduleLessons = selectedModule?.lessons ?? [];
  const activeLesson =
    moduleLessons.find((lesson) => lesson.lesson === activeLessonNumber) ??
    null;
  const patternKey = (pattern: GrammarPattern) =>
    `${pattern.pattern}-${pattern.example}`;
  const selectedPattern = activeLesson
    ? (activeLesson.patterns.find(
        (pattern) => patternKey(pattern) === selectedPatternKey,
      ) ?? activeLesson.patterns[0])
    : null;
  const selectedIndex =
    activeLesson && selectedPattern
      ? Math.max(
          activeLesson.patterns.findIndex(
            (pattern) => patternKey(pattern) === patternKey(selectedPattern),
          ),
          0,
        )
      : 0;
  const availableModules = modules.filter((module) => module.hasGrammar);
  const currentStep = activeLesson
    ? "study"
    : selectedModule
      ? "lessons"
      : "modules";
  const heroSubtitle =
    currentStep === "modules"
      ? "Escoge un módulo para ver sus lecciones de gramática."
      : currentStep === "lessons"
        ? `Módulo ${selectedModule?.moduleNumber} · escoge una lección.`
        : `Módulo ${selectedModule?.moduleNumber} · Lección ${activeLesson?.lesson}.`;

  const openModule = (moduleNumber: number) => {
    setSelectedModuleNumber(moduleNumber);
    setActiveLessonNumber(null);
    setSelectedPatternKey(null);
  };

  const openLesson = (lessonNumber: number) => {
    const lesson = moduleLessons.find((item) => item.lesson === lessonNumber);
    if (!lesson) return;
    setActiveLessonNumber(lesson.lesson);
    setSelectedPatternKey(patternKey(lesson.patterns[0]));
  };

  const backToModules = () => {
    setSelectedModuleNumber(null);
    setActiveLessonNumber(null);
    setSelectedPatternKey(null);
  };

  const backToLessons = () => {
    setActiveLessonNumber(null);
    setSelectedPatternKey(null);
  };

  const playGrammarAudio = (audioUrl?: string) => {
    if (!audioUrl) return;
    void new Audio(audioUrl).play();
  };

  if (currentStep === "modules") {
    return (
      <>
        <GrammarHero
          subtitle={heroSubtitle}
          primaryMetric={allPatterns.length}
          primaryLabel="Patrones"
          secondaryMetric={availableModules.length}
          secondaryLabel="Módulos"
        />

        <section className={styles.kanjiLearnPanel}>
          <div className={styles.kanjiWorkspaceTop}>
            <div>
              <h2>Escoge tu módulo</h2>
              <p>Después eliges una lección y estudias sus patrones.</p>
            </div>
          </div>

          <div className={styles.kanjiModuleGrid}>
            {modules.map((module) => (
              <button
                key={module.moduleNumber}
                type="button"
                disabled={!module.hasGrammar}
                className={`${styles.kanjiModuleCard} ${
                  module.isCurrent ? styles.kanjiModuleCardCurrent : ""
                } ${!module.hasGrammar ? styles.kanjiModuleCardDisabled : ""}`}
                onClick={() => openModule(module.moduleNumber)}
              >
                <span className={styles.kanjiModuleBadge}>
                  M{module.moduleNumber}
                </span>
                <span className={styles.kanjiModuleGlyph}>文</span>
                <strong>{module.title}</strong>
                <em>{module.titleJa}</em>
                <span>
                  {module.hasGrammar
                    ? `${module.lessonCount} ${
                        module.lessonCount === 1 ? "lección" : "lecciones"
                      } · ${module.patternCount} patrones`
                    : "Próximamente"}
                </span>
              </button>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (currentStep === "lessons" && selectedModule) {
    return (
      <>
        <GrammarHero
          subtitle={heroSubtitle}
          primaryMetric={selectedModule.lessonCount}
          primaryLabel="Lecciones"
          secondaryMetric={selectedModule.patternCount}
          secondaryLabel="Patrones"
        />

        <section className={styles.kanjiLearnPanel}>
          <div className={styles.kanjiWorkspaceTop}>
            <div>
              <button
                type="button"
                className={styles.kanjiBackButton}
                onClick={backToModules}
              >
                ← Módulos
              </button>
              <h2>
                Módulo {selectedModule.moduleNumber} · {selectedModule.title}
              </h2>
              <p>
                {selectedModule.titleJa} · {selectedModule.jlpt}
              </p>
            </div>
          </div>

          <div className={styles.kanjiLessonChoiceGrid}>
            {moduleLessons.map((lesson) => (
              <button
                key={lesson.lesson}
                type="button"
                className={styles.kanjiLessonChoiceCard}
                onClick={() => openLesson(lesson.lesson)}
              >
                <span>L{lesson.lesson}</span>
                <strong>{lesson.title}</strong>
                <em>{lesson.count ?? lesson.patterns.length} patrones</em>
              </button>
            ))}
          </div>
        </section>
      </>
    );
  }

  if (!selectedModule || !activeLesson || !selectedPattern) {
    return null;
  }

  const compactSentence = (value: string, limit = 118) => {
    const cleaned = value.replace(/\s+/g, " ").trim();
    if (cleaned.length <= limit) return cleaned;
    const sentenceEnd = cleaned.search(/[.!?。！？]/);
    if (sentenceEnd > 38 && sentenceEnd < limit) {
      return cleaned.slice(0, sentenceEnd + 1);
    }
    return `${cleaned.slice(0, limit).trim()}...`;
  };
  const compactFormula = (value: string) => {
    const [beforeArrow] = value.split("→");
    return beforeArrow.trim() || value;
  };
  const conciseExplanation = (selectedPattern.explanation ?? [])
    .slice(0, 3)
    .map((paragraph) => compactSentence(paragraph));
  const formationLines = (selectedPattern.formation ?? [])
    .slice(0, 3)
    .map((line) => compactFormula(line));
  const examples = (
    selectedPattern.examples?.length
      ? selectedPattern.examples
      : [
          {
            jp: selectedPattern.example,
            es: selectedPattern.translation,
          },
        ]
  ).slice(0, 4);
  const dialogueLines = (selectedPattern.dialogue ?? []).slice(0, 4);
  const fallbackInteraction = buildFallbackGrammarInteraction(selectedPattern);
  const interactions = (
    selectedPattern.interactions?.length
      ? selectedPattern.interactions
      : fallbackInteraction
        ? [fallbackInteraction]
        : []
  ).slice(0, 1);
  return (
    <section className={styles.grammarPremiumPage}>
      <div className={styles.grammarPremiumHeader}>
        <div>
          <div className={styles.pageEyebrow}>Aprender</div>
          <h1>Gramática</h1>
          <p>
            Patrón {String(selectedIndex + 1).padStart(2, "0")} de{" "}
            {activeLesson.patterns.length}
          </p>
        </div>
        <div className={styles.grammarHeaderActions}>
          <button
            type="button"
            className={styles.grammarBackButton}
            onClick={backToLessons}
          >
            ← Lecciones
          </button>
          <span className={styles.grammarStreakPill}>🔥 1 día de racha</span>
        </div>
      </div>

      <article className={styles.grammarReader}>
              <header className={styles.grammarReaderHero}>
                <div>
                  <div className={styles.grammarReaderBadges}>
                    <span>JLPT N5</span>
                    <span>40% completado</span>
                  </div>
                  <div className={styles.grammarDetailPattern}>
                    {selectedPattern.pattern}
                  </div>
                  <p className={styles.grammarDetailMeaning}>
                    {selectedPattern.meaning}
                  </p>
                </div>
                <button
                  type="button"
                  className={styles.grammarHeroPlay}
                  aria-label="Reproducir ejemplo del patrón"
                >
                  ▶
                </button>
              </header>
              {formationLines.length ? (
                <div className={styles.grammarFormationBox}>
                  <span>Estructura de la oración</span>
                  {formationLines.map((line) => (
                    <strong key={line}>{line}</strong>
                  ))}
                </div>
              ) : null}
              {conciseExplanation.length ? (
                <div className={styles.grammarExplanationBlock}>
                  <span>Explicación</span>
                  <ul>
                    {conciseExplanation.map((paragraph) => (
                      <li key={paragraph}>{paragraph}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className={styles.grammarExampleBox}>
                <span>
                  Ejemplos <em>{examples.length} frases</em>
                </span>
                {examples.map((example) => (
                  <div className={styles.grammarExampleItem} key={`${example.jp}-${example.es}`}>
                    <strong>
                      <FuriganaText
                        text={example.jpFurigana ?? example.jp}
                      />
                    </strong>
                    <em>{example.es}</em>
                  </div>
                ))}
              </div>
              {interactions.length ? (
                <div className={styles.grammarInlineInteractions}>
                  {interactions.map((interaction, index) => (
                    <GrammarInteractionBlock
                      key={`${interaction.type}-${index}`}
                      interaction={interaction}
                    />
                  ))}
                </div>
              ) : null}
              {dialogueLines.length ? (
                <div className={styles.grammarDialogueBox}>
                  <span>Conversación</span>
                  <div className={styles.grammarDialogueList}>
                    {dialogueLines.map((line, index) => {
                      const isSecondSpeaker = index % 2 === 1;

                      return (
                        <div
                          className={`${styles.grammarDialogueLine} ${
                            isSecondSpeaker
                              ? styles.grammarDialogueLineAlt
                              : ""
                          }`}
                          key={`${line.speaker}-${line.jp}-${index}`}
                        >
                          <div className={styles.grammarDialogueAvatar}>
                            {line.speaker.slice(0, 1)}
                          </div>
                          <div className={styles.grammarDialogueBubble}>
                            <strong>
                              <FuriganaText
                                text={line.jpFurigana ?? line.jp}
                              />
                            </strong>
                            <em>{line.es}</em>
                            <button
                              type="button"
                              disabled={!line.audioUrl}
                              onClick={() => playGrammarAudio(line.audioUrl)}
                              aria-label={`Reproducir línea de ${line.speaker}`}
                            >
                              ▶ Audio
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
      </article>
    </section>
  );
}

export function VocabLearningScreen() {
  const { vocab } = useStudentDashboardData();
  const lessons = getVocabLessonCards();
  const vocabPct = useDashboardPercent(vocab);

  return (
    <>
      <PageHeader
        title="Vocabulario"
        subtitle="Por lección · palabras para clase y práctica"
      />
      <HeroCard
        glyph="語"
        title="Vocabulario"
        subtitle="L1-L8 · listas conectadas al curso"
        metric={`${vocabPct}%`}
        metricLabel="practicado"
      />
      <div className={styles.ctaRow}>
        <Link
          href="/dashboard/vocabulario"
          className={styles.tealButton}
        >
          Flashcards
        </Link>
        <Link
          href="/dashboard/practica"
          className={styles.lightButton}
        >
          Quiz de escritura
        </Link>
      </div>

      {lessons.map((lesson) => (
        <section key={lesson.lesson} className={styles.lessonRow}>
          <div className={styles.lessonHeader}>
            <span
              className={`${styles.lessonNum} ${lesson.isCurrent ? styles.lessonNumCurrent : styles.lessonNumDone}`}
            >
              L{lesson.lesson}
            </span>
            <span className={styles.lessonInfo}>
              <span className={styles.lessonTitle}>
                Lección {lesson.lesson} · {lesson.title}
              </span>
              <span className={styles.lessonSub}>
                {lesson.count} palabras{" "}
                {lesson.isCurrent ? "· lección actual" : ""}
              </span>
            </span>
            <span className={styles.lessonRight}>
              {lesson.isCurrent && <Badge tone="red">Nuevo</Badge>}
              {lesson.completed}/{lesson.count}
            </span>
          </div>
          {lesson.items.map((item) => (
            <div
              key={`${lesson.lesson}-${item.hira}-${item.es}`}
              className={styles.vocabWord}
            >
              <div>
                <div className={styles.vocabJa}>{item.kanji || item.hira}</div>
                <div className={styles.vocabRead}>
                  {item.kanji ? item.hira : ""}
                </div>
              </div>
              <div className={styles.vocabEs}>{item.es}</div>
              <Badge tone={lesson.isCurrent ? "gray" : "teal"}>
                {lesson.isCurrent ? "Nuevo" : "Repaso"}
              </Badge>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}

export function ComingSoonScreen({
  title,
  subtitle,
  glyph = "予",
}: {
  title: string;
  subtitle: string;
  glyph?: string;
}) {
  return (
    <>
      <PageHeader title={title} subtitle="Esta sección está en preparación para tus clases." />
      <section className={styles.heroCard}>
        <div className={styles.heroLeft}>
          <div className={styles.heroGlyph}>{glyph}</div>
          <div>
            <div className={styles.heroTitle}>Próximamente</div>
            <div className={styles.heroSub}>{subtitle}</div>
          </div>
        </div>
        <Link href="/dashboard" className={styles.tealButton}>
          Volver a inicio
        </Link>
      </section>
      <section className={`${styles.card} ${styles.rowList}`}>
        {[
          ["Qué sí puedes usar ya", "Inicio, Hiragana, Katakana, Kanji, Gramática y Vocabulario.", "道"],
          ["Por qué está cerrado", "Prefiero lanzar una app limpia antes de abrir práctica a medias.", "整"],
        ].map(([rowTitle, meta, icon]) => (
          <div key={rowTitle} className={styles.rowItem}>
            <span className={styles.rowIcon}>{icon}</span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>{rowTitle}</span>
              <span className={styles.rowSub}>{meta}</span>
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

export function TasksScreen() {
  return (
    <>
      <PageHeader
        title="Tareas"
        subtitle="Pendientes y entregas de la semana"
      />
      <section className={`${styles.card} ${styles.rowList}`}>
        {homeTasks.map((task) => (
          <div key={task.title} className={styles.taskRow}>
            <span
              className={`${styles.taskCheck} ${task.done ? styles.taskCheckDone : ""}`}
              aria-hidden="true"
            >
              {task.done ? "✓" : ""}
            </span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>{task.title}</span>
              <span className={styles.rowSub}>{task.meta}</span>
            </span>
            <Badge
              tone={
                task.done ? "teal" : task.state === "Pendiente" ? "red" : "gray"
              }
            >
              {task.state}
            </Badge>
          </div>
        ))}
      </section>
    </>
  );
}

export function PlanScreen() {
  const { profile, course, kana, vocab, kanji, reviewTotal } =
    useStudentDashboardData();
  const topic = getWeeklyTopic();
  const lessonLabel = course.currentLesson
    ? `L${course.currentLesson}`
    : "tu lección";
  const plan = [
    {
      title: "Día 1 · Kana y vocabulario",
      meta: `${Math.max(kana.due, 5)} kana por repasar · vocabulario de ${lessonLabel}`,
      href: "/dashboard/practica",
      badge: "20 min",
    },
    {
      title: "Día 2 · Gramática en contexto",
      meta: "て-form + una frase propia para clase",
      href: "/dashboard/gramatica",
      badge: "Clase",
    },
    {
      title: "Día 3 · Lectura breve",
      meta: "Lee una historia corta y marca palabras difíciles",
      href: "/dashboard/lectura",
      badge: "10 min",
    },
    {
      title: "Día 4 · Repaso inteligente",
      meta: `${reviewTotal} tarjetas pendientes entre kana, vocabulario y kanji`,
      href: "/dashboard/repaso",
      badge: "SRS",
    },
  ];

  return (
    <>
      <PageHeader
        title="Mi Plan"
        subtitle={`${profile.groupName || "Alumno"} · ruta sugerida para esta semana`}
      />
      <HeroCard
        glyph="予"
        title="Plan de estudio"
        subtitle="Una ruta simple para complementar la clase, sin saturarte"
        metric={`${reviewTotal}`}
        metricLabel="repasos"
      />

      <SectionLabel>Tema de la semana</SectionLabel>
      <section className={styles.noteCard}>
        <div className={styles.noteLabel}>{topic.kana}</div>
        <div className={styles.noteText}>{topic.prompt}</div>
      </section>

      <SectionLabel>Ruta sugerida</SectionLabel>
      <section className={`${styles.card} ${styles.rowList}`}>
        {plan.map((item) => (
          <Link key={item.title} href={item.href} className={styles.rowItem}>
            <span className={styles.rowIcon}>予</span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>{item.title}</span>
              <span className={styles.rowSub}>{item.meta}</span>
            </span>
            <Badge
              tone={
                item.badge === "Clase"
                  ? "red"
                  : item.badge === "SRS"
                    ? "navy"
                    : "teal"
              }
            >
              {item.badge}
            </Badge>
          </Link>
        ))}
      </section>

      <SectionLabel>Balance</SectionLabel>
      <section className={`${styles.card} ${styles.rowList}`}>
        {[
          [
            "Kana",
            `${kana.practiced}/${kana.total} practicados · ${kana.due} pendientes`,
            "あ",
          ],
          [
            "Vocabulario",
            `${vocab.practiced}/${vocab.total} practicados · ${vocab.due} pendientes`,
            "語",
          ],
          [
            "Kanji",
            `${kanji.practiced}/${kanji.total} practicados · ${kanji.due} pendientes`,
            "漢",
          ],
        ].map(([title, meta, icon]) => (
          <div key={title} className={styles.rowItem}>
            <span className={styles.rowIcon}>{icon}</span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>{title}</span>
              <span className={styles.rowSub}>{meta}</span>
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

export function ProgressScreen() {
  const { course, kana, vocab, kanji } = useStudentDashboardData();
  const kanaPct = useDashboardPercent(kana);
  const vocabPct = useDashboardPercent(vocab);
  const kanjiPct = useDashboardPercent(kanji);
  const courseModule =
    getCurriculumModuleByNumber(course.currentModuleNumber) ??
    getCurrentCurriculumModule(course.currentLesson);
  const totalModules = CURRICULUM_MODULES.length;
  const currentModuleNumber = Math.min(courseModule.numero, totalModules);
  const moduleProgress =
    totalModules > 1
      ? Math.round(((currentModuleNumber - 1) / (totalModules - 1)) * 100)
      : 0;
  const lessonName = course.currentLesson
    ? GENKI_LESSON_NAMES[course.currentLesson]
    : null;

  return (
    <>
      <PageHeader
        title="Mi Progreso"
        subtitle="Tu avance oficial de clase y práctica libre"
      />
      <HeroCard
        glyph="進"
        title={`Módulo ${courseModule.numero} · ${courseModule.nombre}`}
        subtitle={
          course.currentLesson
            ? `Lección ${course.currentLesson}${lessonName ? ` · ${lessonName}` : ""}`
            : "Sincronizado con el avance de tu grupo"
        }
        metric={`${currentModuleNumber}/${totalModules}`}
        metricLabel="módulos"
      />

      <SectionLabel>Avance oficial</SectionLabel>
      <section className={`${styles.card} ${styles.rowList}`}>
        {[
          [
            "Grupo",
            course.groupName || "Grupo pendiente",
            100,
          ],
          [
            "Módulo actual",
            `${courseModule.nombreJa} · ${courseModule.jlpt}`,
            moduleProgress,
          ],
          [
            "Lección actual",
            course.currentLesson
              ? `Lección ${course.currentLesson}${lessonName ? ` · ${lessonName}` : ""}`
              : "Pendiente de sincronizar",
            course.currentLesson ? 100 : 0,
          ],
        ].map(([title, meta, progress]) => (
          <div key={title} className={styles.rowItem}>
            <span className={styles.rowIcon}>道</span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>{title}</span>
              <span className={styles.rowSub}>{meta}</span>
            </span>
            <span className={styles.rowRight}>
              <ProgressBar value={Number(progress)} />
            </span>
          </div>
        ))}
      </section>

      <SectionLabel>Práctica libre</SectionLabel>
      <section className={`${styles.card} ${styles.rowList}`}>
        {[
          [
            "Kana",
            `${kana.practiced}/${kana.total} vistos en esta app`,
            kanaPct,
          ],
          [
            "Vocabulario",
            `${vocab.practiced}/${vocab.total} vistos en esta app`,
            vocabPct,
          ],
          [
            "Kanji",
            `${kanji.practiced}/${kanji.total} vistos en esta app`,
            kanjiPct,
          ],
          [
            "Nota",
            "Esto todavía no cuenta como avance oficial de clase.",
            0,
          ],
        ].map(([title, meta, progress]) => (
          <div key={title} className={styles.rowItem}>
            <span className={styles.rowIcon}>{title === "Nota" ? "＊" : "練"}</span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>{title}</span>
              <span className={styles.rowSub}>{meta}</span>
            </span>
            <span className={styles.rowRight}>
              <ProgressBar value={Number(progress)} />
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

const practiceCards = [
  {
    href: "/dashboard/hiragana/reading",
    icon: "あ",
    title: "Kana rápido",
    meta: "Lectura y reconocimiento · 10 preguntas",
    badge: "5 min",
    tone: "teal" as const,
  },
  {
    href: "/dashboard/vocabulario",
    icon: "語",
    title: "Vocabulario del curso",
    meta: "Palabras conectadas con tu módulo actual",
    badge: "Nuevo",
    tone: "red" as const,
  },
  {
    href: "/dashboard/kanji",
    icon: "漢",
    title: "Kanji por lección",
    meta: "Significado, lectura y selección rápida por módulo",
    badge: "Repaso",
    tone: "navy" as const,
  },
  {
    href: "/dashboard/repaso",
    icon: "復",
    title: "Repaso guardado",
    meta: "Lo que marcaste para volver a ver",
    badge: "SRS",
    tone: "gray" as const,
  },
];

export function PracticeHubScreen() {
  const { kana, vocab, kanji, reviewTotal } = useStudentDashboardData();

  return (
    <>
      <PageHeader
        title="Práctica"
        subtitle="Sesiones cortas para mantener ritmo entre clases"
      />
      <HeroCard
        glyph="練"
        title="Entrena lo de hoy"
        subtitle="Kana, vocabulario, kanji y repaso en una sola ruta"
        metric={`${reviewTotal}`}
        metricLabel="pendientes"
      />

      <SectionLabel>Recomendado para hoy</SectionLabel>
      <section className={`${styles.card} ${styles.rowList}`}>
        {practiceCards.map((item) => (
          <Link key={item.title} href={item.href} className={styles.rowItem}>
            <span
              className={`${styles.rowIcon} ${
                item.tone === "red"
                  ? styles.rowIconRed
                  : item.tone === "navy"
                    ? styles.rowIconNavy
                    : ""
              }`}
            >
              {item.icon}
            </span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>{item.title}</span>
              <span className={styles.rowSub}>{item.meta}</span>
            </span>
            <span className={styles.rowRight}>
              <Badge tone={item.tone}>{item.badge}</Badge>
            </span>
          </Link>
        ))}
      </section>

      <SectionLabel>Resumen de progreso</SectionLabel>
      <section className={`${styles.card} ${styles.rowList}`}>
        {[
          [
            "Kana",
            `${kana.practiced}/${kana.total} practicados`,
            kana.due,
            "あ",
          ],
          [
            "Vocabulario",
            `${vocab.practiced}/${vocab.total} practicados`,
            vocab.due,
            "語",
          ],
          [
            "Kanji",
            `${kanji.practiced}/${kanji.total} practicados`,
            kanji.due,
            "漢",
          ],
        ].map(([title, meta, due, icon]) => (
          <div key={title} className={styles.rowItem}>
            <span className={styles.rowIcon}>{icon}</span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>{title}</span>
              <span className={styles.rowSub}>{meta}</span>
            </span>
            <Badge tone={Number(due) > 0 ? "red" : "teal"}>
              {Number(due)} pendientes
            </Badge>
          </div>
        ))}
      </section>
    </>
  );
}

export function ReadingPracticeScreen() {
  const readings = [
    {
      title: "東京の電車",
      level: "Módulo 3",
      description:
        "Lectura corta con lugares, transporte y acciones en secuencia.",
      status: "Nuevo",
    },
    {
      title: "週末のバーベキュー",
      level: "Lección actual",
      description:
        "Mini historia para practicar vocabulario de planes y comida.",
      status: "Clase",
    },
    {
      title: "家族の写真",
      level: "Repaso L7",
      description:
        "Lectura guiada para repasar familia, gustos y descripciones.",
      status: "Repaso",
    },
  ];

  return (
    <>
      <PageHeader title="Lectura" subtitle="Textos breves con apoyo de clase" />
      <HeroCard
        glyph="読"
        title="Lecturas guiadas"
        subtitle="Furigana, vocabulario clave y preguntas simples"
        metric="3"
        metricLabel="listas"
      />

      <SectionLabel>Lecturas disponibles</SectionLabel>
      <section className={`${styles.card} ${styles.rowList}`}>
        {readings.map((item) => (
          <article key={item.title} className={styles.grammarItem}>
            <div className={styles.grammarMain}>
              <div className={styles.grammarPattern}>{item.title}</div>
              <div className={styles.grammarMeaning}>{item.description}</div>
              <div className={styles.grammarTranslation}>{item.level}</div>
            </div>
            <Badge
              tone={
                item.status === "Nuevo"
                  ? "red"
                  : item.status === "Clase"
                    ? "teal"
                    : "gray"
              }
            >
              {item.status}
            </Badge>
          </article>
        ))}
      </section>
    </>
  );
}

export function ListeningPracticeScreen() {
  const clips = [
    ["Frases de clase", "Saludar, confirmar y pedir repetición", "1:20"],
    ["Ruta a la estación", "Lugares, dirección y transporte", "2:05"],
    ["Planes del fin de semana", "Invitar, aceptar y rechazar", "1:48"],
  ];

  return (
    <>
      <PageHeader
        title="Escucha"
        subtitle="Audio corto para reconocer patrones de clase"
      />
      <HeroCard
        glyph="聴"
        title="Escucha activa"
        subtitle="Primero reconocer, luego responder"
        metric="3"
        metricLabel="clips"
      />

      <SectionLabel>Clips preparados</SectionLabel>
      <section className={`${styles.card} ${styles.rowList}`}>
        {clips.map(([title, meta, duration]) => (
          <div key={title} className={styles.rowItem}>
            <span className={styles.rowIcon}>聴</span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>{title}</span>
              <span className={styles.rowSub}>{meta}</span>
            </span>
            <span className={styles.rowRight}>
              <Badge tone="gray">{duration}</Badge>
            </span>
          </div>
        ))}
      </section>
    </>
  );
}

export function SmartReviewScreen() {
  const { kana, vocab, kanji, reviewTotal } = useStudentDashboardData();
  const queues = [
    [
      "Kana dudoso",
      `${kana.difficult} difíciles · ${kana.due} pendientes`,
      kana.due,
      "red",
    ],
    [
      "Vocabulario",
      `${vocab.difficult} débiles · ${vocab.due} pendientes`,
      vocab.due,
      "teal",
    ],
    [
      "Kanji",
      `${kanji.difficult} débiles · ${kanji.due} pendientes`,
      kanji.due,
      "navy",
    ],
  ] as const;

  return (
    <>
      <PageHeader
        title="Repaso inteligente"
        subtitle="Colas pequeñas para no dejar que se enfríe lo aprendido"
      />
      <HeroCard
        glyph="復"
        title="Tu repaso de hoy"
        subtitle="Prioriza errores recientes y contenido nuevo"
        metric={`${reviewTotal}`}
        metricLabel="tarjetas"
      />

      <SectionLabel>Colas de repaso</SectionLabel>
      <section className={`${styles.card} ${styles.rowList}`}>
        {queues.map(([title, meta, count, tone]) => (
          <Link key={title} href="/dashboard/repaso" className={styles.rowItem}>
            <span
              className={`${styles.rowIcon} ${tone === "red" ? styles.rowIconRed : tone === "navy" ? styles.rowIconNavy : ""}`}
            >
              復
            </span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>{title}</span>
              <span className={styles.rowSub}>{meta}</span>
            </span>
            <span className={styles.rowRight}>
              <Badge tone={tone}>{count}</Badge>
            </span>
          </Link>
        ))}
      </section>
    </>
  );
}

export function ProfileDashboardScreen() {
  const { profile, course, refresh } = useStudentDashboardData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState(profile.displayName);
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ProfilePost | null>(null);
  const initial = profile.displayName.trim()[0]?.toUpperCase() || "A";
  const courseModule =
    getCurriculumModuleByNumber(course.currentModuleNumber) ??
    getCurrentCurriculumModule(course.currentLesson);
  const lessonName = course.currentLesson
    ? GENKI_LESSON_NAMES[course.currentLesson]
    : null;

  useEffect(() => {
    setUsername(profile.displayName);
  }, [profile.displayName]);

  useEffect(() => {
    let alive = true;

    async function loadProfilePosts() {
      if (!profile.userId || profile.userId === "anon") {
        setPosts([]);
        setPostsLoading(false);
        return;
      }

      setPostsLoading(true);
      const { data } = await supabase
        .from("comunidad_posts")
        .select("id, content, image_url, from_tema, likes, created_at")
        .eq("user_id", profile.userId)
        .order("created_at", { ascending: false })
        .limit(24);

      if (!alive) return;
      setPosts((data as ProfilePost[] | null) ?? []);
      setPostsLoading(false);
    }

    void loadProfilePosts();
    return () => {
      alive = false;
    };
  }, [profile.userId]);

  async function saveUsername() {
    const cleanName = username.trim();
    if (!cleanName || profile.userId === "anon") return;
    setSavingName(true);
    setStatus(null);
    const { error } = await supabase
      .from("profiles")
      .update({ username: cleanName })
      .eq("id", profile.userId);

    setSavingName(false);
    if (error) {
      setStatus("No pude guardar el nombre. Intenta otra vez.");
      return;
    }

    setStatus("Nombre actualizado.");
    refresh();
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || profile.userId === "anon") return;

    setUploadingAvatar(true);
    setStatus(null);

    try {
      const extension = file.name.split(".").pop() || "jpg";
      const path = `avatars/${profile.userId}-${Date.now()}.${extension}`;
      const { data, error } = await supabase.storage
        .from("uploads")
        .upload(path, file, { upsert: true });

      if (error || !data?.path) throw error ?? new Error("UPLOAD_FAILED");

      const { data: urlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(data.path);

      const newAvatarUrl = urlData.publicUrl;
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", profile.userId);

      if (updateError) throw updateError;
      setStatus("Foto actualizada.");
      refresh();
    } catch {
      setStatus("No pude subir la foto. Prueba con otra imagen.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Perfil"
        subtitle="Tu identidad dentro de la comunidad de Pako Nihongo"
      />
      <section className={styles.heroCard}>
        <div className={styles.heroLeft}>
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.avatarImageLarge} src={profile.avatarUrl} alt="" />
          ) : (
            <div className={styles.heroGlyph}>{initial}</div>
          )}
          <div>
            <div className={styles.heroTitle}>{profile.displayName}</div>
            <div className={styles.heroSub}>
              {profile.groupName || "Grupo pendiente"} · {profile.roleLabel || "Alumno"}
            </div>
          </div>
        </div>
        <button
          type="button"
          className={styles.tealButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingAvatar}
        >
          {uploadingAvatar ? "Subiendo..." : "Cambiar foto"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className={styles.hiddenInput}
          onChange={handleAvatarChange}
        />
      </section>

      <div className={styles.profileGrid}>
        <section className={`${styles.card} ${styles.profileEditCard}`}>
          <SectionLabel>Datos visibles</SectionLabel>
          <label className={styles.formLabel} htmlFor="profile-username">
            Nombre de usuario
          </label>
          <div className={styles.inlineForm}>
            <input
              id="profile-username"
              className={styles.textInput}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Tu nombre en comunidad"
            />
            <button
              type="button"
              className={styles.tealButton}
              onClick={saveUsername}
              disabled={savingName || !username.trim()}
            >
              {savingName ? "Guardando..." : "Guardar"}
            </button>
          </div>
          {status && <p className={styles.formStatus}>{status}</p>}
        </section>

        <section className={`${styles.card} ${styles.rowList}`}>
          <SectionLabel>Curso actual</SectionLabel>
          {[
            ["Grupo", course.groupName || profile.groupName || "Grupo pendiente", "組"],
            [
              `Módulo ${courseModule.numero}`,
              `${courseModule.nombre} · ${courseModule.nombreJa}`,
              "道",
            ],
            [
              "Lección actual",
              course.currentLesson
                ? `L${course.currentLesson}${lessonName ? ` · ${lessonName}` : ""}`
                : "Pendiente de sincronizar",
              "課",
            ],
          ].map(([title, meta, icon]) => (
            <div key={title} className={styles.rowItem}>
              <span className={styles.rowIcon}>{icon}</span>
              <span className={styles.rowCopy}>
                <span className={styles.rowTitle}>{title}</span>
                <span className={styles.rowSub}>{meta}</span>
              </span>
            </div>
          ))}
        </section>
      </div>

      <SectionLabel>Mis posts en comunidad</SectionLabel>
      <section className={styles.profilePostsGrid}>
        {postsLoading ? (
          <div className={`${styles.card} ${styles.emptyState}`}>Cargando tus posts...</div>
        ) : posts.length === 0 ? (
          <div className={`${styles.card} ${styles.emptyState}`}>
            Todavía no has publicado en comunidad.
          </div>
        ) : (
          posts.map((post) => (
            <button
              key={post.id}
              type="button"
              className={`${styles.card} ${styles.profilePostCard}`}
              onClick={() => setSelectedPost(post)}
            >
              {post.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.image_url} alt="" />
              )}
              <span className={styles.profilePostMeta}>
                {post.from_tema ? "Tema de la semana" : "Comunidad"} · {formatPostDate(post.created_at)}
              </span>
              <strong>{post.content}</strong>
              <span className={styles.profilePostFooter}>
                {post.likes || 0} me gusta · tocar para ver
              </span>
            </button>
          ))
        )}
      </section>

      {selectedPost && (
        <div className={styles.profilePostOverlay} role="presentation" onClick={() => setSelectedPost(null)}>
          <article
            className={styles.profilePostModal}
            role="dialog"
            aria-modal="true"
            aria-label="Post de comunidad"
            onClick={(event) => event.stopPropagation()}
          >
            <header>
              <span>{selectedPost.from_tema ? "Tema de la semana" : "Comunidad"}</span>
              <button type="button" onClick={() => setSelectedPost(null)} aria-label="Cerrar">
                ×
              </button>
            </header>
            {selectedPost.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={selectedPost.image_url} alt="" />
            )}
            <p>{selectedPost.content}</p>
            <footer>
              <span>{formatPostDate(selectedPost.created_at)}</span>
              <Link href="/dashboard" className={styles.lightButton}>
                Ver comunidad
              </Link>
            </footer>
          </article>
        </div>
      )}
    </>
  );
}

type PublicProfileSummary = {
  username: string | null;
  avatar_url: string | null;
  group_name: string | null;
};

export function PublicProfileDashboardScreen({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<PublicProfileSummary | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const initial = profile?.username?.trim()[0]?.toUpperCase() || "A";

  useEffect(() => {
    let alive = true;

    async function loadPublicProfile() {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from("profiles")
          .select("username, avatar_url, group_name")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("comunidad_posts")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
      ]);

      if (!alive) return;
      setProfile(data as PublicProfileSummary | null);
      setPostCount(count ?? 0);
      setLoading(false);
    }

    void loadPublicProfile();
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) {
    return (
      <>
        <PageHeader title="Perfil" subtitle="Cargando alumno..." />
        <section className={styles.card}>Cargando...</section>
      </>
    );
  }

  if (!profile) {
    return (
      <>
        <PageHeader title="Perfil" subtitle="No encontramos este alumno" />
        <section className={`${styles.card} ${styles.rowList}`}>
          <Link href="/dashboard" className={styles.rowItem}>
            <span className={styles.rowIcon}>家</span>
            <span className={styles.rowCopy}>
              <span className={styles.rowTitle}>Volver a inicio</span>
              <span className={styles.rowSub}>Regresa a comunidad</span>
            </span>
          </Link>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Perfil"
        subtitle={profile.group_name ? `${profile.group_name} · Comunidad` : "Comunidad"}
      />
      <section className={styles.heroCard}>
        <div className={styles.heroLeft}>
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.avatarImageLarge} src={profile.avatar_url} alt="" />
          ) : (
            <div className={styles.heroGlyph}>{initial}</div>
          )}
          <div>
            <div className={styles.heroTitle}>{profile.username || "Alumno"}</div>
            <div className={styles.heroSub}>{profile.group_name || "Pako Nihongo"}</div>
          </div>
        </div>
        <div className={styles.heroMetric}>
          <strong>{postCount}</strong>
          <span>posts</span>
        </div>
      </section>
    </>
  );
}
