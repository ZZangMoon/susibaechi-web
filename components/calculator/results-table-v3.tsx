"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { formatDetailTrackLabel } from "@/src/lib/calculation";
import { formatNumber } from "@/src/lib/format";
import type { CalculatedAdmissionRowWithOutcome } from "@/src/types/calculator";

interface ResultsTableProps {
  rows: CalculatedAdmissionRowWithOutcome[];
  showRegion: boolean;
}

const baseColumns = [
  { key: "region", label: "지역", width: "86px" },
  { key: "university", label: "대학", width: "124px" },
  { key: "admissionType", label: "전형유형", width: "96px" },
  { key: "admissionName", label: "전형명", width: "124px" },
  { key: "recruitmentUnit", label: "모집단위명", width: "174px" },
  { key: "quota", label: "인원", width: "58px" },
  { key: "judgment", label: "판정", width: "72px" },
  { key: "reach", label: "상향컷", width: "72px" },
  { key: "fit", label: "적정컷", width: "72px" },
  { key: "safe", label: "안정컷", width: "72px" },
  { key: "score", label: "점수", width: "72px" },
  { key: "track", label: "계열", width: "66px" },
  { key: "detailTrack", label: "상세계열", width: "130px" },
  { key: "year25p50", label: "25 50%", width: "82px" },
  { key: "year25p70", label: "25 70%", width: "82px" },
  { key: "year24p50", label: "24 50%", width: "82px" },
  { key: "year24p70", label: "24 70%", width: "82px" },
  { key: "year25min", label: "25 최저", width: "148px" },
  { key: "year24min", label: "24 최저", width: "148px" },
] as const;

function judgmentTone(judgment: CalculatedAdmissionRowWithOutcome["computedJudgment"]) {
  switch (judgment) {
    case "안정":
      return "bg-emerald-50 text-emerald-700";
    case "적정":
      return "bg-sky-50 text-sky-700";
    case "소신":
      return "bg-amber-50 text-amber-700";
    case "상향":
      return "bg-rose-50 text-rose-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
}

function cellClass(isNumeric = false) {
  return [
    "px-2 py-3 text-sm text-slate-700",
    isNumeric ? "text-right tabular-nums" : "text-left",
  ].join(" ");
}

function formatRequirement(value: string | null | undefined) {
  return value?.trim() ? value : "-";
}

export function ResultsTableV3({ rows, showRegion }: ResultsTableProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);
  const columns = showRegion
    ? baseColumns
    : baseColumns.filter((column) => column.key !== "region");
  const gridTemplateColumns = columns.map((column) => column.width).join(" ");

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52,
    overscan: 12,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/95 shadow-panel">
      <div ref={parentRef} className="h-[720px] overflow-auto">
        <div className="min-w-[1760px]">
          <div
            className="sticky top-0 z-20 grid border-b border-line/70 bg-[#f8fafb] text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
            style={{ gridTemplateColumns }}
          >
            {columns.map((column) => (
              <div key={column.key} className="px-2 py-4">
                {column.label}
              </div>
            ))}
          </div>

          <div
            style={{
              height: rowVirtualizer.getTotalSize(),
              position: "relative",
            }}
          >
            {virtualRows.map((virtualRow) => {
              const row = rows[virtualRow.index];

              return (
                <div
                  key={`${row.no ?? virtualRow.index}-${row.rowNumber}`}
                  className="grid items-center border-b border-line/60 bg-white"
                  style={{
                    gridTemplateColumns,
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {showRegion ? <div className={cellClass()}>{row.region ?? "-"}</div> : null}
                  <div className={cellClass()}>{row.university ?? "-"}</div>
                  <div className={cellClass()}>{row.admissionType}</div>
                  <div className={cellClass()}>{row.admissionName ?? "-"}</div>
                  <div className={cellClass()}>{row.recruitmentUnit ?? "-"}</div>
                  <div className={cellClass(true)}>{row.quota ?? "-"}</div>
                  <div className="px-2 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${judgmentTone(
                        row.computedJudgment,
                      )}`}
                    >
                      {row.computedJudgment || "-"}
                    </span>
                  </div>
                  <div className={cellClass(true)}>{formatNumber(row.computedThresholds.reach)}</div>
                  <div className={cellClass(true)}>{formatNumber(row.computedThresholds.fit)}</div>
                  <div className={cellClass(true)}>{formatNumber(row.computedThresholds.safe)}</div>
                  <div className={cellClass(true)}>{formatNumber(row.computedScore)}</div>
                  <div className={cellClass()}>{row.track || "-"}</div>
                  <div className={cellClass()}>{formatDetailTrackLabel(row.detailTrack)}</div>
                  <div className={cellClass(true)}>
                    {formatNumber(row.admissionOutcomeMatch?.entry.year25.p50)}
                  </div>
                  <div className={cellClass(true)}>
                    {formatNumber(row.admissionOutcomeMatch?.entry.year25.p70)}
                  </div>
                  <div className={cellClass(true)}>
                    {formatNumber(row.admissionOutcomeMatch?.entry.year24.p50)}
                  </div>
                  <div className={cellClass(true)}>
                    {formatNumber(row.admissionOutcomeMatch?.entry.year24.p70)}
                  </div>
                  <div className={cellClass()}>
                    {formatRequirement(row.admissionOutcomeMatch?.entry.year25.minimumRequirement)}
                  </div>
                  <div className={cellClass()}>
                    {formatRequirement(row.admissionOutcomeMatch?.entry.year24.minimumRequirement)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
