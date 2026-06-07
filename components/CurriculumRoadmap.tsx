"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CURRICULUM_MODULES,
  getCurriculumModuleByNumber,
  getCurrentCurriculumModule,
  type CurriculumModule,
} from "@/lib/curriculum-modules";

type RoadmapPoint = {
  cx: number;
  cy: number;
  side: "left" | "right";
};

type CurriculumRoadmapProps = {
  currentLesson: number | null;
  currentModuleNumber?: number | null;
};

function moduleLessonsLabel(module: CurriculumModule) {
  const first = module.lecciones[0];
  const last = module.lecciones[module.lecciones.length - 1];
  return first === last ? `L${first}` : `L${first}-L${last}`;
}

function moduleTrackLabel(module: CurriculumModule) {
  return `${module.cefr}/${module.jlpt}`;
}

function moduleNumber(module: CurriculumModule, fallbackIndex: number) {
  return String(module.numero || fallbackIndex + 1);
}

function makePath(points: RoadmapPoint[], rowH: number) {
  return points.map((p, i) => {
    if (i === 0) return `M ${p.cx} ${p.cy}`;
    const prev = points[i - 1];
    const cpY = rowH * 0.54;
    return `C ${prev.cx} ${prev.cy + cpY}, ${p.cx} ${p.cy - cpY}, ${p.cx} ${p.cy}`;
  }).join(" ");
}

export default function CurriculumRoadmap({ currentLesson, currentModuleNumber }: CurriculumRoadmapProps) {
  const currentModule = getCurriculumModuleByNumber(currentModuleNumber) ?? getCurrentCurriculumModule(currentLesson);
  const currentModuleIndex = Math.max(0, CURRICULUM_MODULES.findIndex((module) => module.id === currentModule.id));
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedIndex = CURRICULUM_MODULES.findIndex((module) => module.id === selectedId);
  const selectedModule = selectedIndex >= 0 ? CURRICULUM_MODULES[selectedIndex] : null;
  const progressPct = Math.round(((currentModuleIndex + 1) / CURRICULUM_MODULES.length) * 100);

  const geometry = useMemo(() => {
    const rowH = 178;
    const padTop = 136;
    const padBottom = 260;
    const canvasH = padTop + (CURRICULUM_MODULES.length - 1) * rowH + padBottom;
    const positions = CURRICULUM_MODULES.map((_, i) => ({
      cx: i % 2 === 0 ? 24 : 76,
      cy: padTop + i * rowH,
      side: (i % 2 === 0 ? "right" : "left") as "right" | "left",
    }));

    return {
      rowH,
      canvasH,
      positions,
      fullPath: makePath(positions, rowH),
      donePath: currentModuleIndex > 0
        ? makePath(positions.slice(0, currentModuleIndex + 1), rowH)
        : "",
    };
  }, [currentModuleIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setSelectedId(null);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="roadmap-shell">
      <div className="roadmap-bg" aria-hidden="true">
        <div className="roadmap-base" />
        <div className="roadmap-glow roadmap-glow-top" />
        <div className="roadmap-glow roadmap-glow-bottom" />
        <div className="roadmap-dots" />
        <div className="roadmap-vignette" />
      </div>

      <div className="roadmap-content">
        <header className="roadmap-header">
          <Link href="/" className="roadmap-back">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Inicio</span>
          </Link>

          <div className="roadmap-title-row">
            <div>
              <h1>Mi Camino</h1>
              <p>{currentModule.nombreJa}</p>
            </div>
            <button
              type="button"
              className="roadmap-current-pill"
              onClick={() => setSelectedId(currentModule.id)}
            >
              Ver módulo
            </button>
          </div>

          <button
            type="button"
            className="roadmap-unit-card"
            onClick={() => setSelectedId(currentModule.id)}
            aria-label={`Abrir información completa de ${currentModule.nombre}`}
          >
            <div>
              <span>Módulo actual</span>
              <strong>{currentModule.nombre}</strong>
              <em>{currentModule.nombreJa}</em>
              <small>{currentModule.cefr}/{currentModule.jlpt} · clases {moduleLessonsLabel(currentModule)}</small>
            </div>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M8 6h10M8 12h10M8 18h10M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>

          <div className="roadmap-progress">
            <div>
              <span>Progreso modular</span>
              <strong>{currentModuleIndex + 1} / {CURRICULUM_MODULES.length}</strong>
            </div>
            <div className="roadmap-progress-track">
              <div style={{ width: `${progressPct}%` }} />
            </div>
            <p>{currentLesson ? `Última clase registrada: L${currentLesson}` : "Todavía no hay clases registradas"}</p>
          </div>
        </header>

        <section className="roadmap-track-label" aria-label="Camino A1">
          <span />
          <div>
            <strong>Camino A1 · N5</strong>
            <small>módulos 1–4</small>
          </div>
          <span />
        </section>

        <main className="roadmap-canvas" style={{ height: geometry.canvasH }}>
          <svg
            viewBox={`0 0 100 ${geometry.canvasH}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            className="roadmap-path-svg"
          >
            <defs>
              <filter id="studentPathGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <path className="roadmap-path roadmap-path-future" d={geometry.fullPath} />
            <path className="roadmap-path roadmap-path-shadow" d={geometry.fullPath} />
            {geometry.donePath ? (
              <>
                <path className="roadmap-path roadmap-path-done-glow" d={geometry.donePath} filter="url(#studentPathGlow)" />
                <path className="roadmap-path roadmap-path-done" d={geometry.donePath} />
              </>
            ) : null}
          </svg>

          {CURRICULUM_MODULES.map((module, index) => {
            const pos = geometry.positions[index];
            const isCurrent = index === currentModuleIndex;
            const isCompleted = index < currentModuleIndex;
            const isFuture = !isCurrent && !isCompleted;
            const isA2Start = index > 0 && CURRICULUM_MODULES[index - 1].nivel === 1 && module.nivel === 2;
            const radius = isCurrent ? 44 : 34;
            const diameter = radius * 2;
            const labelRight = pos.side === "right";

            return (
              <div key={module.id}>
                {isA2Start ? (
                  <section
                    className="roadmap-track-label roadmap-track-label-a2"
                    aria-label="Camino A2"
                    style={{ top: pos.cy - geometry.rowH / 2 - 24 }}
                  >
                    <span />
                    <div>
                      <strong>Camino A2 · N4</strong>
                      <small>módulos 5–8</small>
                    </div>
                    <span />
                  </section>
                ) : null}

                {isCurrent ? (
                  <>
                    <div className="roadmap-now-badge" style={{ left: `${pos.cx}%`, top: pos.cy - radius - 40 }}>
                      Ahora
                    </div>
                    <div className="roadmap-current-halo" style={{ left: `${pos.cx}%`, top: pos.cy, width: diameter + 68, height: diameter + 68 }} />
                    <div className="roadmap-current-ring" style={{ left: `${pos.cx}%`, top: pos.cy, width: diameter + 20, height: diameter + 20 }} />
                  </>
                ) : null}

                <button
                  type="button"
                  className={[
                    "roadmap-node",
                    module.nivel === 2 ? "roadmap-node-a2" : "roadmap-node-a1",
                    isCurrent ? "roadmap-node-current" : "",
                    isCompleted ? "roadmap-node-completed" : "",
                    isFuture ? "roadmap-node-future" : "",
                  ].filter(Boolean).join(" ")}
                  style={{ left: `${pos.cx}%`, top: pos.cy, width: diameter, height: diameter }}
                  onClick={() => setSelectedId(module.id)}
                  aria-label={`Abrir módulo ${moduleNumber(module, index)}: ${module.nombre}`}
                  aria-expanded={selectedId === module.id}
                >
                  {isCompleted ? (
                    <svg width="27" height="27" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <>
                      <strong>{moduleNumber(module, index)}</strong>
                      <span>{moduleTrackLabel(module)}</span>
                    </>
                  )}
                </button>

                <div
                  className={[
                    "roadmap-module-label",
                    labelRight ? "roadmap-module-label-right" : "roadmap-module-label-left",
                    isFuture ? "roadmap-module-label-future" : "",
                  ].filter(Boolean).join(" ")}
                  style={{
                    top: pos.cy - 31,
                    ...(labelRight
                      ? { left: `calc(${pos.cx}% + ${radius + 20}px)`, right: 18 }
                      : { left: 18, right: `calc(${100 - pos.cx}% + ${radius + 20}px)` }),
                  }}
                >
                  <p>Módulo {moduleNumber(module, index)} · {moduleTrackLabel(module)} · clases {moduleLessonsLabel(module)}</p>
                  <strong>{module.nombre}</strong>
                  <em>{module.nombreJa}</em>
                  {isCurrent ? <button type="button" onClick={() => setSelectedId(module.id)}>Ver detalle</button> : null}
                </div>
              </div>
            );
          })}
        </main>
      </div>

      {selectedModule ? (
        <div className="roadmap-sheet-layer" role="presentation" onClick={() => setSelectedId(null)}>
          <article
            className="roadmap-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={`Información completa del módulo ${selectedIndex + 1}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="roadmap-sheet-handle" aria-hidden="true" />
            <div className="roadmap-sheet-head">
              <div>
                <p>Módulo {moduleNumber(selectedModule, selectedIndex)} · {moduleTrackLabel(selectedModule)} · clases {moduleLessonsLabel(selectedModule)}</p>
                <h2>{selectedModule.nombre}</h2>
                <strong>{selectedModule.nombreJa}</strong>
              </div>
              <button type="button" onClick={() => setSelectedId(null)} aria-label="Cerrar detalle del módulo">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <section className="roadmap-sheet-section">
              <h3>Al terminar podrás...</h3>
              <p>{selectedModule.canDo}</p>
            </section>

            <section className="roadmap-sheet-section">
              <h3>Temas</h3>
              <div className="roadmap-chip-grid">
                {selectedModule.vocabTemas.map((topic) => (
                  <span key={topic}>{topic}</span>
                ))}
              </div>
            </section>

            <section className="roadmap-sheet-section">
              <h3>Competencias</h3>
              <div className="roadmap-chip-grid roadmap-chip-grid-teal">
                {selectedModule.competencias.map((competence) => (
                  <span key={competence}>{competence}</span>
                ))}
              </div>
            </section>

            <section className="roadmap-sheet-section">
              <h3>Proyectos del módulo</h3>
              <div className="roadmap-project-list">
                {selectedModule.proyectos.map((project, projectIndex) => (
                  <details key={project.id} className="roadmap-project" open={projectIndex === 0}>
                    <summary>
                      <span>{projectIndex + 1}</span>
                      <div>
                        <strong>{project.nombre}</strong>
                        <em>{project.nombreJa}</em>
                      </div>
                    </summary>
                    <p>{project.definicion}</p>
                    <small>{project.formato} · {project.evalTipo === "interaccion" ? "interacción" : "producción"}</small>
                    <ul>
                      {project.checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
            </section>

            <section className="roadmap-sheet-section">
              <h3>Listo para avanzar cuando...</h3>
              <ul className="roadmap-criteria">
                {selectedModule.criteriosAvance.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </section>
          </article>
        </div>
      ) : null}

      <style>{`
        .roadmap-shell {
          position: relative;
          min-height: 100dvh;
          overflow-x: hidden;
          font-family: var(--font-plus-jakarta), system-ui, sans-serif;
          color: #ffffff;
          background: #0D0D1A;
          padding-bottom: calc(140px + env(safe-area-inset-bottom, 0px));
        }

        .roadmap-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        .roadmap-base {
          position: absolute;
          inset: 0;
          background: #0D0D1A;
        }

        .roadmap-glow {
          position: absolute;
          border-radius: 999px;
        }

        .roadmap-glow-top {
          top: -120px;
          left: -100px;
          width: 360px;
          height: 360px;
          background: radial-gradient(circle, rgba(78, 205, 196, 0.20) 0%, rgba(78, 205, 196, 0) 68%);
          filter: blur(8px);
        }

        .roadmap-glow-bottom {
          right: -120px;
          bottom: 40px;
          width: 340px;
          height: 340px;
          background: radial-gradient(circle, rgba(230, 57, 70, 0.13) 0%, rgba(230, 57, 70, 0) 70%);
          filter: blur(8px);
        }

        .roadmap-dots {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255, 255, 255, 0.065) 1px, transparent 1px);
          background-size: 22px 22px;
        }

        .roadmap-vignette {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at center, transparent 42%, rgba(0, 0, 0, 0.32) 100%);
        }

        .roadmap-content {
          position: relative;
          z-index: 1;
        }

        .roadmap-header {
          padding: calc(env(safe-area-inset-top, 20px) + 20px) 18px 20px;
        }

        .roadmap-back {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 22px;
          color: rgba(255, 255, 255, 0.55);
          text-decoration: none;
          font-size: 13px;
          font-weight: 750;
        }

        .roadmap-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }

        .roadmap-title-row h1 {
          margin: 0 0 6px;
          color: #ffffff;
          font-size: 42px;
          font-weight: 950;
          line-height: 1;
          letter-spacing: 0;
        }

        .roadmap-title-row p {
          margin: 0 0 16px;
          color: #4ecdc4;
          font-size: 20px;
          font-weight: 900;
          line-height: 1.2;
        }

        .roadmap-current-pill,
        .roadmap-module-label button {
          border: 1px solid rgba(78, 205, 196, 0.3);
          border-radius: 999px;
          background: rgba(78, 205, 196, 0.12);
          color: #4ecdc4;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          white-space: nowrap;
        }

        .roadmap-current-pill {
          padding: 9px 12px;
        }

        .roadmap-unit-card {
          position: relative;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 14px;
          width: 100%;
          margin: 2px 0 18px;
          padding: 17px 18px;
          text-align: left;
          color: #1a1a2e;
          border: 0;
          border-radius: 18px;
          background: linear-gradient(155deg, #6fe3db 0%, #4ecdc4 52%, #34a7a0 100%);
          box-shadow: 0 14px 28px rgba(0, 0, 0, 0.32), inset 0 -5px 0 rgba(0, 0, 0, 0.14);
        }

        .roadmap-unit-card span,
        .roadmap-unit-card small {
          display: block;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          opacity: 0.62;
        }

        .roadmap-unit-card strong {
          display: block;
          margin-top: 6px;
          font-size: 24px;
          font-weight: 950;
          line-height: 1.05;
        }

        .roadmap-unit-card em {
          display: block;
          margin-top: 3px;
          font-style: normal;
          font-size: 18px;
          font-weight: 900;
          opacity: 0.72;
        }

        .roadmap-unit-card small {
          margin-top: 10px;
          letter-spacing: 0.05em;
        }

        .roadmap-unit-card svg {
          align-self: center;
          opacity: 0.76;
        }

        .roadmap-progress > div:first-child {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 8px;
        }

        .roadmap-progress span {
          color: rgba(255, 255, 255, 0.38);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .roadmap-progress strong {
          color: #4ecdc4;
          font-size: 13px;
          font-weight: 900;
          white-space: nowrap;
        }

        .roadmap-progress-track {
          height: 8px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.34);
        }

        .roadmap-progress-track div {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #4ECDC4, #38B0A7);
          box-shadow: 0 0 8px rgba(78,205,196,0.4);
        }

        .roadmap-progress p {
          margin: 7px 0 0;
          color: rgba(255, 255, 255, 0.38);
          font-size: 11px;
          font-weight: 750;
        }

        .roadmap-track-label {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 18px 0;
        }

        .roadmap-track-label-a2 {
          position: absolute;
          left: 0;
          right: 0;
          z-index: 1;
          padding-top: 0;
        }

        .roadmap-track-label span {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.18));
        }

        .roadmap-track-label span:last-child {
          background: linear-gradient(to left, transparent, rgba(255, 255, 255, 0.18));
        }

        .roadmap-track-label div {
          text-align: center;
        }

        .roadmap-track-label strong {
          display: block;
          color: #4ecdc4;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .roadmap-track-label-a2 strong {
          color: #818cf8;
        }

        .roadmap-track-label small {
          display: block;
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.32);
          font-size: 11px;
          font-weight: 650;
        }

        .roadmap-canvas {
          position: relative;
          width: 100%;
          margin-top: 6px;
        }

        .roadmap-path-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .roadmap-path {
          fill: none;
          stroke-linecap: round;
          vector-effect: non-scaling-stroke;
        }

        .roadmap-path-future {
          stroke: rgba(255, 255, 255, 0.1);
          stroke-width: 8;
          stroke-dasharray: 2 12;
        }

        .roadmap-path-shadow {
          stroke: rgba(255, 255, 255, 0.04);
          stroke-width: 8;
        }

        .roadmap-path-done-glow {
          stroke: rgba(78, 205, 196, 0.24);
          stroke-width: 16;
        }

        .roadmap-path-done {
          stroke: rgba(78, 205, 196, 0.72);
          stroke-width: 8;
        }

        .roadmap-now-badge {
          position: absolute;
          z-index: 5;
          transform: translateX(-50%);
          padding: 6px 14px;
          border-radius: 999px;
          background: #4ecdc4;
          color: #1a1a2e;
          box-shadow: 0 4px 16px rgba(78, 205, 196, 0.5), 0 0 0 4px rgba(78, 205, 196, 0.08);
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          pointer-events: none;
        }

        .roadmap-now-badge::after {
          content: "";
          position: absolute;
          bottom: -4px;
          left: 50%;
          width: 8px;
          height: 8px;
          transform: translateX(-50%) rotate(45deg);
          background: #4ecdc4;
        }

        .roadmap-current-halo,
        .roadmap-current-ring {
          position: absolute;
          z-index: 1;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          pointer-events: none;
        }

        .roadmap-current-halo {
          background: radial-gradient(circle, rgba(78, 205, 196, 0.18) 0%, rgba(78, 205, 196, 0) 70%);
          animation: roadmapPulse 2.4s ease-in-out infinite;
        }

        .roadmap-current-ring {
          border: 2px solid rgba(78, 205, 196, 0.58);
        }

        .roadmap-node {
          position: absolute;
          z-index: 4;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          transform: translate(-50%, -50%);
          border: 0;
          border-radius: 999px;
          color: #1a1a2e;
          font: inherit;
          box-shadow: 0 9px 22px rgba(0, 0, 0, 0.42), inset 0 -5px 10px rgba(0, 0, 0, 0.16);
          transition: transform 160ms ease, filter 160ms ease, box-shadow 160ms ease;
        }

        .roadmap-node:active {
          transform: translate(-50%, -50%) scale(0.94);
        }

        .roadmap-node-a1 {
          background: linear-gradient(150deg, #5fe0d6 0%, #2ba59c 100%);
        }

        .roadmap-node-a2 {
          color: #ffffff;
          background: linear-gradient(150deg, #8ea0ff 0%, #6677f5 100%);
        }

        .roadmap-node-current {
          outline: 3px solid rgba(78, 205, 196, 0.88);
          outline-offset: 5px;
        }

        .roadmap-node-completed {
          outline: 2px solid rgba(78, 205, 196, 0.24);
          outline-offset: 2px;
        }

        .roadmap-node-future {
          color: rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.055);
          outline: 2px dashed rgba(255, 255, 255, 0.18);
          outline-offset: 2px;
          box-shadow: none;
        }

        .roadmap-node strong {
          font-size: 18px;
          font-weight: 950;
          line-height: 1;
        }

        .roadmap-node span {
          margin-top: 5px;
          color: currentColor;
          opacity: 0.7;
          font-size: 8px;
          font-weight: 950;
          text-transform: uppercase;
        }

        .roadmap-module-label {
          position: absolute;
          z-index: 3;
          pointer-events: none;
        }

        .roadmap-module-label-left {
          text-align: right;
        }

        .roadmap-module-label-right {
          text-align: left;
        }

        .roadmap-module-label p {
          margin: 0 0 4px;
          color: rgba(78, 205, 196, 0.78);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.1em;
          line-height: 1.3;
          text-transform: uppercase;
        }

        .roadmap-module-label strong {
          display: block;
          color: #ffffff;
          font-size: 15px;
          font-weight: 920;
          line-height: 1.2;
        }

        .roadmap-module-label em {
          display: block;
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.54);
          font-style: normal;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.2;
        }

        .roadmap-module-label button {
          margin-top: 9px;
          padding: 6px 10px;
          pointer-events: auto;
        }

        .roadmap-module-label-future p,
        .roadmap-module-label-future strong,
        .roadmap-module-label-future em {
          color: rgba(255, 255, 255, 0.28);
        }

        .roadmap-sheet-layer {
          position: fixed;
          inset: 0;
          z-index: 30;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 16px;
          background: rgba(10, 10, 22, 0.48);
          animation: roadmapFadeIn 160ms ease both;
        }

        .roadmap-sheet {
          width: min(720px, 100%);
          max-height: calc(100dvh - 84px);
          overflow: auto;
          padding: 8px 18px calc(22px + env(safe-area-inset-bottom, 0px));
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 26px 26px 20px 20px;
          background: #16161F;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.25);
          animation: roadmapSheetUp 210ms cubic-bezier(0.2, 0.75, 0.2, 1) both;
        }

        .roadmap-sheet-handle {
          width: 42px;
          height: 4px;
          margin: 4px auto 16px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.22);
        }

        .roadmap-sheet-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
        }

        .roadmap-sheet-head p {
          margin: 0 0 7px;
          color: #4ecdc4;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.14em;
          line-height: 1.35;
          text-transform: uppercase;
        }

        .roadmap-sheet-head h2 {
          margin: 0;
          color: #ffffff;
          font-size: 32px;
          font-weight: 950;
          line-height: 1.05;
          letter-spacing: 0;
        }

        .roadmap-sheet-head strong {
          display: block;
          margin-top: 5px;
          color: rgba(255, 255, 255, 0.62);
          font-size: 23px;
          font-weight: 900;
          line-height: 1.14;
        }

        .roadmap-sheet-head button {
          display: grid;
          flex-shrink: 0;
          width: 40px;
          height: 40px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.13);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          color: rgba(255, 255, 255, 0.76);
        }

        .roadmap-sheet-section {
          margin-top: 20px;
        }

        .roadmap-sheet-section h3 {
          margin: 0 0 10px;
          color: rgba(255, 255, 255, 0.38);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.15em;
          line-height: 1.25;
          text-transform: uppercase;
        }

        .roadmap-sheet-section p {
          margin: 0;
          color: rgba(255, 255, 255, 0.82);
          font-size: 15.5px;
          font-weight: 720;
          line-height: 1.48;
        }

        .roadmap-chip-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
        }

        .roadmap-chip-grid span {
          padding: 7px 11px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;
          background: rgba(255,255,255,0.07);
          color: rgba(255,255,255,0.55);
          font-size: 12.5px;
          font-weight: 740;
        }

        .roadmap-chip-grid-teal span {
          border-color: rgba(78,205,196,0.40);
          background: rgba(78,205,196,0.15);
          color: #4ecdc4;
        }

        .roadmap-project-list {
          display: grid;
          gap: 10px;
        }

        .roadmap-project {
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          background: #16161F;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 20px rgba(0,0,0,0.25);
          overflow: hidden;
        }

        .roadmap-project summary {
          display: grid;
          grid-template-columns: 30px minmax(0, 1fr);
          gap: 11px;
          align-items: center;
          padding: 13px;
          cursor: pointer;
          list-style: none;
        }

        .roadmap-project summary::-webkit-details-marker {
          display: none;
        }

        .roadmap-project summary span {
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          border-radius: 11px;
          background: rgba(78, 205, 196, 0.16);
          color: #4ecdc4;
          font-size: 12px;
          font-weight: 950;
        }

        .roadmap-project summary strong {
          display: block;
          color: #ffffff;
          font-size: 14.5px;
          font-weight: 920;
          line-height: 1.25;
        }

        .roadmap-project summary em {
          display: block;
          margin-top: 2px;
          color: rgba(255, 255, 255, 0.52);
          font-style: normal;
          font-size: 12px;
          font-weight: 800;
          line-height: 1.25;
        }

        .roadmap-project > p,
        .roadmap-project > small,
        .roadmap-project > ul {
          margin-left: 13px;
          margin-right: 13px;
        }

        .roadmap-project > p {
          margin-top: 0;
          margin-bottom: 9px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 13.5px;
          font-weight: 650;
          line-height: 1.46;
        }

        .roadmap-project > small {
          display: block;
          margin-bottom: 9px;
          color: rgba(78, 205, 196, 0.82);
          font-size: 11px;
          font-weight: 850;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .roadmap-project > ul,
        .roadmap-criteria {
          padding: 0 0 2px 18px;
          color: rgba(255, 255, 255, 0.76);
          font-size: 13px;
          font-weight: 680;
          line-height: 1.42;
        }

        .roadmap-project > ul {
          margin-top: 0;
          margin-bottom: 14px;
        }

        .roadmap-project li,
        .roadmap-criteria li {
          margin: 7px 0;
          padding-left: 2px;
        }

        .roadmap-criteria {
          margin: 0;
        }

        @keyframes roadmapFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes roadmapSheetUp {
          from {
            opacity: 0;
            transform: translateY(26px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes roadmapPulse {
          0%, 100% {
            opacity: 0.75;
            transform: translate(-50%, -50%) scale(0.98);
          }
          50% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.05);
          }
        }

        @media (min-width: 720px) {
          .roadmap-header,
          .roadmap-track-label,
          .roadmap-track-label-a2 {
            max-width: 920px;
            margin-left: auto;
            margin-right: auto;
          }

          .roadmap-canvas {
            max-width: 940px;
            margin-left: auto;
            margin-right: auto;
          }

          .roadmap-sheet-layer {
            align-items: center;
          }

          .roadmap-sheet {
            border-radius: 26px;
            max-height: calc(100dvh - 48px);
          }
        }

        @media (max-width: 380px) {
          .roadmap-title-row h1 {
            font-size: 36px;
          }

          .roadmap-unit-card strong {
            font-size: 21px;
          }

          .roadmap-module-label p {
            font-size: 9px;
          }

          .roadmap-module-label strong {
            font-size: 13px;
          }

          .roadmap-module-label em {
            font-size: 11.5px;
          }
        }
      `}</style>
    </div>
  );
}
