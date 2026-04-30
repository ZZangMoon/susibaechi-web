"use client";

import { useDeferredValue, useMemo, useState } from "react";
import {
  filterPlacementRowsForAdmission,
  formatDetailTrackLabel,
  getPlacementSearchText,
} from "@/src/lib/calculation";

import type {
  AdmissionRecord,
  PlacementTableRow,
  PlacementTier,
  ThresholdSet,
} from "@/src/types/calculator";

type PlacementSheetName = "종합배치표" | "교과배치표";
type AdminTab = PlacementSheetName | "결과 상세계열 연결";

interface RuleEditorPanelProps {
  comprehensivePlacementTable: PlacementTableRow[];
  schoolRecordPlacementTable: PlacementTableRow[];
  admissions: AdmissionRecord[];
  onPlacementThresholdChange: (
    sheet: PlacementSheetName,
    rowKey: string,
    tier: PlacementTier,
    field: keyof ThresholdSet,
    value: number | null,
  ) => void;
  onAdmissionDetailTrackChange: (rowNumber: number, detailTrack: string) => void;
  onAutoFixAbnormalThresholds: () => void;
  onResetRules: () => void;
}

const ADMIN_PASSWORD = "vldhfm26!";
const tierOptions: PlacementTier[] = ["A", "B", "C", "D", "E"];
const tabs: AdminTab[] = ["종합배치표", "교과배치표", "결과 상세계열 연결"];
const MAX_MAPPING_ROWS = 120;

function parseNullableNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function PlacementEditor({
  sheet,
  rows,
  selectedTier,
  search,
  onSearchChange,
  onTierChange,
  onChange,
}: {
  sheet: PlacementSheetName;
  rows: PlacementTableRow[];
  selectedTier: PlacementTier;
  search: string;
  onSearchChange: (value: string) => void;
  onTierChange: (value: PlacementTier) => void;
  onChange: (
    rowKey: string,
    tier: PlacementTier,
    field: keyof ThresholdSet,
    value: number | null,
  ) => void;
}) {
  const deferredSearch = useDeferredValue(search);

  const filteredRows = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    if (!keyword) {
      return rows;
    }

    return rows.filter((row) => {
      return getPlacementSearchText(row).includes(keyword);
    });
  }, [deferredSearch, rows]);

  return (
    <div className="space-y-4">
      <SectionTitle
        title={sheet}
        description="상세계열별 컷값을 직접 수정하면 결과 테이블 판정에 바로 반영됩니다."
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="상세계열/구간 검색"
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
        />
        <select
          value={selectedTier}
          onChange={(event) => onTierChange(event.target.value as PlacementTier)}
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
        >
          {tierOptions.map((tier) => (
            <option key={tier} value={tier}>
              {tier} 티어 편집
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-3xl border border-line bg-white">
        <div className="grid grid-cols-[minmax(0,1.3fr)_170px_90px_120px_120px_120px] border-b border-line bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <div>상세계열</div>
          <div>구간</div>
          <div>계열</div>
          <div>상향컷</div>
          <div>적정컷</div>
          <div>안정컷</div>
        </div>
        <div className="max-h-[420px] overflow-auto">
          {filteredRows.map((row) => {
            const threshold = row.thresholdsByTier[selectedTier];
            return (
              <div
                key={`${sheet}-${row.key}`}
                className="grid grid-cols-[minmax(0,1.3fr)_170px_90px_120px_120px_120px] items-center gap-3 border-b border-line/60 px-4 py-3 text-sm"
              >
                <div className="font-medium text-slate-900">{formatDetailTrackLabel(row.key)}</div>
                <div className="text-slate-600">{row.section}</div>
                <div className="text-slate-600">{row.track}</div>
                {(["reach", "fit", "safe"] as const).map((field) => (
                  <input
                    key={field}
                    type="number"
                    step="0.0001"
                    value={threshold[field] ?? ""}
                    onChange={(event) =>
                      onChange(row.key, selectedTier, field, parseNullableNumber(event.target.value))
                    }
                    className="rounded-2xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AdmissionMappingEditor({
  admissions,
  comprehensivePlacementTable,
  schoolRecordPlacementTable,
  search,
  onSearchChange,
  onChange,
}: {
  admissions: AdmissionRecord[];
  comprehensivePlacementTable: PlacementTableRow[];
  schoolRecordPlacementTable: PlacementTableRow[];
  search: string;
  onSearchChange: (value: string) => void;
  onChange: (rowNumber: number, detailTrack: string) => void;
}) {
  const deferredSearch = useDeferredValue(search);
  const keyword = deferredSearch.trim().toLowerCase();
  const searchableAdmissions = useMemo(
    () =>
      admissions.map((row) => ({
        row,
        searchText: [
          row.university,
          row.recruitmentUnit,
          row.detailTrack,
          row.admissionName,
          row.admissionType,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      })),
    [admissions],
  );

  const filteredAdmissions = useMemo(() => {
    if (!keyword) {
      return [];
    }

    const matched = searchableAdmissions
      .filter(({ searchText }) => searchText.includes(keyword))
      .map(({ row }) => row);

    return matched.slice(0, MAX_MAPPING_ROWS);
  }, [keyword, searchableAdmissions]);

  const matchedCount = useMemo(() => {
    if (!keyword) {
      return 0;
    }

    return searchableAdmissions.filter(({ searchText }) => searchText.includes(keyword)).length;
  }, [keyword, searchableAdmissions]);

  const hasKeyword = keyword.length > 0;

  return (
    <div className="space-y-4">
      <SectionTitle
        title="결과 상세계열 연결"
        description="대학 + 전형명 + 모집단위 기준으로 각 결과 행이 어떤 상세계열 키를 참조할지 관리자 전용으로 수정할 수 있습니다."
      />

      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="대학명 / 전형명 / 모집단위명 / 상세계열 검색"
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
      />

      {!hasKeyword ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-600">
          검색어를 입력하면 해당하는 결과 행만 불러옵니다. 전체 5천여 행을 한 번에 그리면 브라우저가 멈출 수 있어 검색 기반으로 제한했습니다.
        </div>
      ) : null}

      {hasKeyword ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          검색 일치 {matchedCount.toLocaleString()}건 중 상위 {filteredAdmissions.length.toLocaleString()}건 표시
        </div>
      ) : null}

      {hasKeyword ? (
        <div className="rounded-3xl border border-line bg-white">
          <div className="grid grid-cols-[88px_140px_140px_140px_minmax(0,1fr)_220px] border-b border-line bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <div>No.</div>
            <div>대학</div>
            <div>전형유형</div>
            <div>전형명</div>
            <div>모집단위명</div>
            <div>상세계열 연결</div>
          </div>
          <div className="max-h-[420px] overflow-auto">
            {filteredAdmissions.map((row) => {
              const baseOptions = row.admissionType === "학생부종합"
                ? comprehensivePlacementTable
                : schoolRecordPlacementTable;
              const narrowedOptions = filterPlacementRowsForAdmission(row, baseOptions);
              const optionKeys = Array.from(
                new Set(
                  [row.detailTrack, ...narrowedOptions.map((option) => option.key)].filter(Boolean),
                ),
              );

              return (
                <div
                  key={`admission-${row.rowNumber}`}
                  className="grid grid-cols-[88px_140px_140px_140px_minmax(0,1fr)_220px] items-center gap-3 border-b border-line/60 px-4 py-3 text-sm"
                >
                  <div className="text-slate-700">{row.no ?? "-"}</div>
                  <div className="truncate text-slate-700">{row.university ?? "-"}</div>
                  <div className="text-slate-700">{row.admissionType}</div>
                  <div className="truncate text-slate-700">{row.admissionName ?? "-"}</div>
                  <div className="truncate text-slate-700">{row.recruitmentUnit ?? "-"}</div>
                  <select
                    value={row.detailTrack}
                    onChange={(event) => onChange(row.rowNumber, event.target.value)}
                    className="rounded-2xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                  >
                    {optionKeys.map((optionKey) => (
                      <option key={`${row.rowNumber}-${optionKey}`} value={optionKey}>
                        {formatDetailTrackLabel(optionKey)}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RuleEditorPanel({
  comprehensivePlacementTable,
  schoolRecordPlacementTable,
  admissions,
  onPlacementThresholdChange,
  onAdmissionDetailTrackChange,
  onAutoFixAbnormalThresholds,
  onResetRules,
}: RuleEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("종합배치표");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PlacementTier>("A");
  const [placementSearches, setPlacementSearches] = useState<Record<PlacementSheetName, string>>({
    종합배치표: "",
    교과배치표: "",
  });
  const [mappingSearch, setMappingSearch] = useState("");

  function unlockAdmin() {
    const matched = password === ADMIN_PASSWORD;
    setUnlocked(matched);
    setPasswordError(!matched);
  }

  return (
    <section className="space-y-5 rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            관리자 섹션
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">
            기준표 / 상세계열 연결 관리
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            일반 사용자에게는 숨겨지고, 관리자 비밀번호 입력 시에만 기준표와 대학 + 전형명 + 모집단위 기준 상세계열 연결을 수정할 수 있습니다.
          </p>
        </div>
        {unlocked ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onAutoFixAbnormalThresholds}
              className="rounded-full border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition hover:border-amber-400 hover:bg-amber-100"
            >
              비정상 컷 자동 보정
            </button>
            <button
              type="button"
              onClick={onResetRules}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              관리자 값 원복
            </button>
          </div>
        ) : null}
      </div>

      {unlocked ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-900">
          자동 보정은 현재 결과행에 매칭된 25/24학년도 70%·50% 입결을 참고해서, 상향/적정/안정컷이
          비어 있거나 1.0 미만이거나 순서가 뒤집힌 행만 보정합니다. 정상값은 건드리지 않습니다.
        </p>
      ) : null}

      {!unlocked ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_96px_120px]">
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (passwordError) {
                    setPasswordError(false);
                  }
                }}
                placeholder="관리자 코드 입력"
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 pr-14 text-sm outline-none transition focus:border-sky-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              {showPassword ? "숨기기" : "보기"}
            </button>
            <button
              type="button"
              onClick={unlockAdmin}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              열기
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            관리자 메뉴는 승인된 사용자만 열 수 있습니다.
          </p>
          {passwordError ? (
            <p className="mt-2 text-xs font-semibold text-rose-600">
              관리자 코드가 일치하지 않습니다.
            </p>
          ) : null}
        </div>
      ) : null}

      {unlocked ? (
        <>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  activeTab === tab
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700 hover:border-slate-400",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "종합배치표" ? (
            <PlacementEditor
              sheet="종합배치표"
              rows={comprehensivePlacementTable}
              selectedTier={selectedTier}
              search={placementSearches.종합배치표}
              onSearchChange={(value) =>
                setPlacementSearches((current) => ({ ...current, 종합배치표: value }))
              }
              onTierChange={setSelectedTier}
              onChange={(rowKey, tier, field, value) =>
                onPlacementThresholdChange("종합배치표", rowKey, tier, field, value)
              }
            />
          ) : null}

          {activeTab === "교과배치표" ? (
            <PlacementEditor
              sheet="교과배치표"
              rows={schoolRecordPlacementTable}
              selectedTier={selectedTier}
              search={placementSearches.교과배치표}
              onSearchChange={(value) =>
                setPlacementSearches((current) => ({ ...current, 교과배치표: value }))
              }
              onTierChange={setSelectedTier}
              onChange={(rowKey, tier, field, value) =>
                onPlacementThresholdChange("교과배치표", rowKey, tier, field, value)
              }
            />
          ) : null}

          {activeTab === "결과 상세계열 연결" ? (
            <AdmissionMappingEditor
              admissions={admissions}
              comprehensivePlacementTable={comprehensivePlacementTable}
              schoolRecordPlacementTable={schoolRecordPlacementTable}
              search={mappingSearch}
              onSearchChange={setMappingSearch}
              onChange={onAdmissionDetailTrackChange}
            />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
