"use client";

import { useDeferredValue, useMemo, useState } from "react";

import {
  SchoolInfoEditorPanel,
  type SchoolRecordIdentity,
} from "@/components/calculator/school-info-editor-panel";
import {
  filterPlacementRowsForAdmission,
  formatDetailTrackLabel,
  getPlacementSearchText,
} from "@/src/lib/calculation";
import type {
  AdmissionRecord,
  PlacementTableRow,
  PlacementTier,
  SchoolRecord,
  ThresholdSet,
} from "@/src/types/calculator";

type PlacementSheetName = "종합배치표" | "교과배치표";
type AdminTab = PlacementSheetName | "결과 상세계열 연결" | "학교 정보 관리";

interface AdminEditorPanelProps {
  comprehensivePlacementTable: PlacementTableRow[];
  schoolRecordPlacementTable: PlacementTableRow[];
  admissions: AdmissionRecord[];
  schools: SchoolRecord[];
  onPlacementThresholdChange: (
    sheet: PlacementSheetName,
    rowKey: string,
    tier: PlacementTier,
    field: keyof ThresholdSet,
    value: number | null,
  ) => void;
  onAdmissionDetailTrackChange: (rowNumber: number, detailTrack: string) => void;
  onSchoolRecordChange: (
    identity: SchoolRecordIdentity,
    updater: (school: SchoolRecord) => SchoolRecord,
  ) => void;
  onAutoFixAbnormalThresholds: () => void;
  onResetRules: () => void;
}

const ADMIN_PASSWORD = "vldhfm26!";
const tierOptions: PlacementTier[] = ["A", "B", "C", "D", "E"];
const tabs: AdminTab[] = ["종합배치표", "교과배치표", "결과 상세계열 연결", "학교 정보 관리"];
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

    return rows.filter((row) => getPlacementSearchText(row).includes(keyword));
  }, [deferredSearch, rows]);

  return (
    <div className="space-y-4">
      <SectionTitle
        title={sheet}
        description="결과 페이지에서 실제로 쓰이는 상세계열만 보여주고, 해당 컷값만 직접 수정합니다."
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="상세계열 / 구간 검색"
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
        />
        <select
          value={selectedTier}
          onChange={(event) => onTierChange(event.target.value as PlacementTier)}
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
        >
          {tierOptions.map((tier) => (
            <option key={tier} value={tier}>
              {tier} 티어 기준
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

    return searchableAdmissions
      .filter(({ searchText }) => searchText.includes(keyword))
      .map(({ row }) => row)
      .slice(0, MAX_MAPPING_ROWS);
  }, [keyword, searchableAdmissions]);

  const matchedCount = useMemo(() => {
    if (!keyword) {
      return 0;
    }

    return searchableAdmissions.filter(({ searchText }) => searchText.includes(keyword)).length;
  }, [keyword, searchableAdmissions]);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="결과 상세계열 연결"
        description="결과 페이지에 실제로 나오는 모집단위만 보여주고, 그 행이 참조할 상세계열만 연결합니다."
      />
      <input
        value={search}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder="대학명 / 전형명 / 모집단위명 / 상세계열 검색"
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
      />
      {!keyword ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm leading-6 text-slate-600">
          검색어를 입력하면 해당하는 결과 행만 불러옵니다.
        </div>
      ) : null}
      {keyword ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          검색 일치 {matchedCount.toLocaleString()}건 중 상위 {filteredAdmissions.length.toLocaleString()}건 표시
        </div>
      ) : null}
      {keyword ? (
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
              const baseOptions =
                row.admissionType === "학생부종합"
                  ? comprehensivePlacementTable
                  : schoolRecordPlacementTable;
              const narrowedOptions = filterPlacementRowsForAdmission(row, baseOptions);
              const optionKeys = Array.from(
                new Set([row.detailTrack, ...narrowedOptions.map((option) => option.key)].filter(Boolean)),
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

export function AdminEditorPanel({
  comprehensivePlacementTable,
  schoolRecordPlacementTable,
  admissions,
  schools,
  onPlacementThresholdChange,
  onAdmissionDetailTrackChange,
  onSchoolRecordChange,
  onAutoFixAbnormalThresholds,
  onResetRules,
}: AdminEditorPanelProps) {
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

  const relevantComprehensiveRows = useMemo(() => {
    const relevantKeys = new Set(
      admissions
        .filter((row) => row.admissionType === "학생부종합")
        .map((row) => row.detailTrack)
        .filter(Boolean),
    );

    return comprehensivePlacementTable.filter((row) => relevantKeys.has(row.key));
  }, [admissions, comprehensivePlacementTable]);

  const relevantSchoolRecordRows = useMemo(() => {
    const relevantKeys = new Set(
      admissions
        .filter((row) => row.admissionType === "학생부교과")
        .map((row) => row.detailTrack)
        .filter(Boolean),
    );

    return schoolRecordPlacementTable.filter((row) => relevantKeys.has(row.key));
  }, [admissions, schoolRecordPlacementTable]);

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
          <h2 className="mt-2 text-2xl font-black text-slate-900">기준표 / 상세계열 / 학교정보 관리</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            결과 페이지에서 실제로 쓰이는 항목만 남겨서 수정 대상과 렌더 부담을 줄였습니다.
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
              관리자 값 초기화
            </button>
          </div>
        ) : null}
      </div>

      {!unlocked ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_96px_120px]">
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
              className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
            />
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
          {passwordError ? (
            <p className="mt-2 text-xs font-semibold text-rose-600">관리자 코드가 일치하지 않습니다.</p>
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
              rows={relevantComprehensiveRows}
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
              rows={relevantSchoolRecordRows}
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
              comprehensivePlacementTable={relevantComprehensiveRows}
              schoolRecordPlacementTable={relevantSchoolRecordRows}
              search={mappingSearch}
              onSearchChange={setMappingSearch}
              onChange={onAdmissionDetailTrackChange}
            />
          ) : null}

          {activeTab === "학교 정보 관리" ? (
            <SchoolInfoEditorPanel schools={schools} onSchoolChange={onSchoolRecordChange} />
          ) : null}
        </>
      ) : null}
    </section>
  );
}
