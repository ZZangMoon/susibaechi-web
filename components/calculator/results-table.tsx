"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { formatNumber } from "@/src/lib/format";
import type { CalculatedAdmissionRow } from "@/src/types/calculator";

interface ResultsTableProps {
  rows: CalculatedAdmissionRow[];
}

const columns = [
  { key: "no", label: "No.", width: "88px" },
  { key: "region", label: "지역", width: "96px" },
  { key: "university", label: "대학", width: "156px" },
  { key: "admissionType", label: "전형유형", width: "120px" },
  { key: "admissionName", label: "전형명", width: "148px" },
  { key: "recruitmentUnit", label: "모집단위명", width: "184px" },
  { key: "track", label: "계열", width: "80px" },
  { key: "detailTrack", label: "상세계열", width: "148px" },
  { key: "quota", label: "인원", width: "72px" },
  { key: "score", label: "점수", width: "88px" },
  { key: "reach", label: "상향컷", width: "88px" },
  { key: "fit", label: "적정컷", width: "88px" },
  { key: "safe", label: "안정컷", width: "88px" },
  { key: "judgment", label: "판정", width: "88px" },
] as const;

const gridTemplateColumns = columns.map((column) => column.width).join(" ");

function judgmentTone(judgment: CalculatedAdmissionRow["computedJudgment"]) {
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
    "px-3 py-3 text-sm text-slate-700",
    isNumeric ? "text-right tabular-nums" : "text-left",
  ].join(" ");
}

export function ResultsTable({ rows }: ResultsTableProps) {
  const parentRef = useRef<HTMLDivElement | null>(null);

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
        <div className="min-w-[1600px]">
          <div
            className="sticky top-0 z-20 grid border-b border-line/70 bg-[#f8fafb] text-xs font-semibold uppercase tracking-[0.18em] text-slate-500"
            style={{ gridTemplateColumns }}
          >
            {columns.map((column) => (
              <div key={column.key} className="px-3 py-4">
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
                  <div className={cellClass(true)}>{row.no ?? "-"}</div>
                  <div className={cellClass()}>{row.region ?? "-"}</div>
                  <div className={cellClass()}>{row.university ?? "-"}</div>
                  <div className={cellClass()}>{row.admissionType}</div>
                  <div className={cellClass()}>{row.admissionName ?? "-"}</div>
                  <div className={cellClass()}>{row.recruitmentUnit ?? "-"}</div>
                  <div className={cellClass()}>{row.track || "-"}</div>
                  <div className={cellClass()}>{row.detailTrack}</div>
                  <div className={cellClass(true)}>{row.quota ?? "-"}</div>
                  <div className={cellClass(true)}>{formatNumber(row.computedScore)}</div>
                  <div className={cellClass(true)}>{formatNumber(row.computedThresholds.reach)}</div>
                  <div className={cellClass(true)}>{formatNumber(row.computedThresholds.fit)}</div>
                  <div className={cellClass(true)}>{formatNumber(row.computedThresholds.safe)}</div>
                  <div className="px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${judgmentTone(
                        row.computedJudgment,
                      )}`}
                    >
                      {row.computedJudgment || "-"}
                    </span>
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
