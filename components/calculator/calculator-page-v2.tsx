"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useDeferredValue, useMemo, useState, useTransition } from "react";

import { InputPanelV2 } from "@/components/calculator/input-panel-v2";
import { ResultsTableV3 } from "@/components/calculator/results-table-v3";
import { ResultsToolbarV2 } from "@/components/calculator/results-toolbar-v2";
import type { SchoolRecordIdentity } from "@/components/calculator/school-info-editor-panel";
import { SummaryStrip } from "@/components/calculator/summary-strip";
import { useCalculatorSharedState } from "@/src/hooks/use-calculator-shared-state";
import {
  applyPlacementAutoFixUpdates,
  applyOutcomeAverageThresholdOverrides,
  attachAdmissionOutcomes,
  buildAbnormalPlacementAutoFix,
} from "@/src/lib/admission-outcomes";
import {
  calculateResults,
  findSchoolBySelection,
  getComprehensivePlacementRows,
  getSchoolRecordPlacementRows,
} from "@/src/lib/calculation";
import type {
  AdmissionOutcomeDataset,
  CalculatorDataset,
  MockExamInputs,
  SchoolRecord,
  StudentRecordInputs,
  ThresholdSet,
  PlacementTier,
} from "@/src/types/calculator";

const AdminEditorPanel = dynamic(
  () => import("@/components/calculator/admin-editor-panel").then((module) => module.AdminEditorPanel),
  {
    loading: () => (
      <section className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold text-slate-600">관리자 섹션을 불러오는 중...</p>
      </section>
    ),
  },
);

interface CalculatorPageProps {
  admissionOutcomeDataset: AdmissionOutcomeDataset;
  dataset: CalculatorDataset;
  deployMeta: {
    label: string;
    deployedAt: string;
    verifiedAt: string;
  };
  initialAdminOpen?: boolean;
}

function parseNullableNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compareNullableNumber(left: number | null, right: number | null) {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return left - right;
}

export function CalculatorPageV2({
  admissionOutcomeDataset,
  dataset,
  deployMeta,
  initialAdminOpen = false,
}: CalculatorPageProps) {
  const [showAdminSection, setShowAdminSection] = useState(initialAdminOpen);
  const [isPending, startTransition] = useTransition();
  const {
    input,
    setInput,
    filters,
    setFilters,
    schools,
    setSchools,
    admissions,
    setAdmissions,
    comprehensivePlacementTable,
    setComprehensivePlacementTable,
    schoolRecordPlacementTable,
    setSchoolRecordPlacementTable,
    runtimeDataset,
    schoolOptions,
    selectedSchool,
    resetAll,
  } = useCalculatorSharedState(dataset);

  const deferredInput = useDeferredValue(input);
  const deferredRuntimeDataset = useDeferredValue(runtimeDataset);
  const deferredUniversityQuery = useDeferredValue(filters.universityQuery.trim().toLowerCase());
  const deferredRecruitmentUnitQuery = useDeferredValue(
    filters.recruitmentUnitQuery.trim().toLowerCase(),
  );

  const effectiveComprehensivePlacementTable = useMemo(
    () => getComprehensivePlacementRows(deferredRuntimeDataset),
    [deferredRuntimeDataset],
  );
  const effectiveSchoolRecordPlacementTable = useMemo(
    () => getSchoolRecordPlacementRows(deferredRuntimeDataset),
    [deferredRuntimeDataset],
  );

  const previewRows = useMemo(
    () => calculateResults(deferredRuntimeDataset, deferredInput),
    [deferredInput, deferredRuntimeDataset],
  );
  const previewRowsWithOutcomes = useMemo(
    () => attachAdmissionOutcomes(previewRows, admissionOutcomeDataset),
    [admissionOutcomeDataset, previewRows],
  );

  const autoFixedComprehensivePlacementTable = useMemo(() => {
    const updates = buildAbnormalPlacementAutoFix(
      previewRowsWithOutcomes,
      effectiveComprehensivePlacementTable,
    );
    return applyPlacementAutoFixUpdates(effectiveComprehensivePlacementTable, updates);
  }, [effectiveComprehensivePlacementTable, previewRowsWithOutcomes]);

  const autoFixedSchoolRecordPlacementTable = useMemo(() => {
    const updates = buildAbnormalPlacementAutoFix(
      previewRowsWithOutcomes,
      effectiveSchoolRecordPlacementTable,
    );
    return applyPlacementAutoFixUpdates(effectiveSchoolRecordPlacementTable, updates);
  }, [effectiveSchoolRecordPlacementTable, previewRowsWithOutcomes]);

  const normalizedRuntimeDataset = useMemo(
    () => ({
      ...deferredRuntimeDataset,
      comprehensivePlacementTable: autoFixedComprehensivePlacementTable,
      schoolRecordPlacementTable: autoFixedSchoolRecordPlacementTable,
    }),
    [
      autoFixedComprehensivePlacementTable,
      autoFixedSchoolRecordPlacementTable,
      deferredRuntimeDataset,
    ],
  );

  const calculatedRows = useMemo(
    () => calculateResults(normalizedRuntimeDataset, deferredInput),
    [deferredInput, normalizedRuntimeDataset],
  );
  const calculatedRowsWithOutcomes = useMemo(
    () =>
      applyOutcomeAverageThresholdOverrides(
        attachAdmissionOutcomes(calculatedRows, admissionOutcomeDataset),
      ),
    [admissionOutcomeDataset, calculatedRows],
  );

  const regionOptions = useMemo(
    () => Array.from(new Set(admissions.map((row) => row.region).filter(Boolean))) as string[],
    [admissions],
  );

  const filteredRows = useMemo(() => {
    const next = calculatedRowsWithOutcomes.filter((row) => {
      if (filters.admissionType !== "전체" && row.admissionType !== filters.admissionType) {
        return false;
      }
      if (filters.region !== "전체" && row.region !== filters.region) {
        return false;
      }
      if (filters.judgment !== "전체" && row.computedJudgment !== filters.judgment) {
        return false;
      }
      if (
        deferredUniversityQuery &&
        !(row.university ?? "").toLowerCase().includes(deferredUniversityQuery)
      ) {
        return false;
      }
      if (
        deferredRecruitmentUnitQuery &&
        !(row.recruitmentUnit ?? "").toLowerCase().includes(deferredRecruitmentUnitQuery)
      ) {
        return false;
      }
      return true;
    });

    next.sort((left, right) => {
      switch (filters.sortKey) {
        case "university":
          return (left.university ?? "").localeCompare(right.university ?? "", "ko");
        case "score":
          return compareNullableNumber(left.computedScore, right.computedScore);
        case "reach":
          return compareNullableNumber(left.computedThresholds.reach, right.computedThresholds.reach);
        case "fit":
          return compareNullableNumber(left.computedThresholds.fit, right.computedThresholds.fit);
        case "safe":
          return compareNullableNumber(left.computedThresholds.safe, right.computedThresholds.safe);
        default:
          return compareNullableNumber(left.no, right.no);
      }
    });

    return next;
  }, [calculatedRowsWithOutcomes, deferredRecruitmentUnitQuery, deferredUniversityQuery, filters]);

  function updateStudentRecord(field: keyof StudentRecordInputs, value: string) {
    startTransition(() => {
      setInput((current) => ({
        ...current,
        studentRecord: {
          ...current.studentRecord,
          [field]: value,
        },
      }));
    });
  }

  function updateOverallGrade(value: string) {
    const parsed = parseNullableNumber(value);
    startTransition(() => {
      setInput((current) => ({
        ...current,
        grades: {
          coreSocial: parsed,
          coreScience: parsed,
          coreAll: parsed,
          korean: parsed,
          math: parsed,
          english: parsed,
          social: parsed,
          science: parsed,
        },
      }));
    });
  }

  function updateMock(field: keyof MockExamInputs, value: string) {
    startTransition(() => {
      setInput((current) => ({
        ...current,
        mockExam: {
          ...current.mockExam,
          [field]: parseNullableNumber(value),
        },
      }));
    });
  }

  function updatePlacementThreshold(
    target: "종합배치표" | "교과배치표",
    rowKey: string,
    tier: PlacementTier,
    field: keyof ThresholdSet,
    value: number | null,
  ) {
    const setter = target === "종합배치표" ? setComprehensivePlacementTable : setSchoolRecordPlacementTable;

    startTransition(() => {
      setter((current) =>
        current.map((row) =>
          row.key === rowKey
            ? {
                ...row,
                thresholdsByTier: {
                  ...row.thresholdsByTier,
                  [tier]: {
                    ...row.thresholdsByTier[tier],
                    [field]: value,
                  },
                },
              }
            : row,
        ),
      );
    });
  }

  function updateAdmissionDetailTrack(rowNumber: number, detailTrack: string) {
    startTransition(() => {
      setAdmissions((current) =>
        current.map((row) =>
          row.rowNumber === rowNumber
            ? {
                ...row,
                detailTrack,
              }
            : row,
        ),
      );
    });
  }

  function updateSchoolRecord(
    identity: SchoolRecordIdentity,
    updater: (school: SchoolRecord) => SchoolRecord,
  ) {
    let updatedSchool: SchoolRecord | null = null;

    startTransition(() => {
      setSchools((current) =>
        current.map((school) => {
          const matched =
            school.schoolName === identity.schoolName &&
            school.province === identity.province &&
            school.district === identity.district;

          if (!matched) {
            return school;
          }

          updatedSchool = updater(school);
          return updatedSchool;
        }),
      );

      if (
        updatedSchool &&
        input.schoolName === identity.schoolName &&
        input.province === identity.province &&
        input.district === identity.district
      ) {
        setInput((current) => ({
          ...current,
          schoolName: updatedSchool?.schoolName ?? current.schoolName,
          province: updatedSchool?.province ?? current.province,
          district: updatedSchool?.district ?? current.district,
        }));
      }
    });
  }

  function autoFixAbnormalThresholds() {
    startTransition(() => {
      setComprehensivePlacementTable(() =>
        applyPlacementAutoFixUpdates(
          effectiveComprehensivePlacementTable,
          buildAbnormalPlacementAutoFix(calculatedRowsWithOutcomes, effectiveComprehensivePlacementTable),
        ),
      );
      setSchoolRecordPlacementTable(() =>
        applyPlacementAutoFixUpdates(
          effectiveSchoolRecordPlacementTable,
          buildAbnormalPlacementAutoFix(calculatedRowsWithOutcomes, effectiveSchoolRecordPlacementTable),
        ),
      );
    });
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1800px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-xs font-bold tracking-[0.18em] text-rose-700">
            {`배포 라벨 ${deployMeta.label} / 관리자 통합 적용`}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            입시위키 수시 배치 계산기
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            웹기반 배치 결과 조회
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {deployMeta.deployedAt ? `마지막 배포 ${deployMeta.deployedAt}` : "로컬 개발 모드"}
          </p>
          {isPending ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">계산 반영 중...</p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setShowAdminSection((current) => !current)}
            className="rounded-full border border-sky-300 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100"
          >
            {showAdminSection ? "관리자 섹션 닫기" : "관리자 섹션 열기"}
          </button>
          <Link
            href="/"
            prefetch={false}
            className="rounded-full border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
          >
            홈으로
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <InputPanelV2
          input={input}
          schoolOptions={schoolOptions}
          selectedSchool={selectedSchool}
          workbookSummary={dataset.workbookSummary}
          onSchoolChange={(value, school) => {
            startTransition(() => {
              const matchedSchool =
                school ?? findSchoolBySelection(runtimeDataset, value, input.province, input.district);
              setInput((current) => ({
                ...current,
                schoolName: matchedSchool ? matchedSchool.schoolName : value,
                province: matchedSchool?.province ?? current.province,
                district: matchedSchool?.district ?? current.district,
              }));
            });
          }}
          onStudentRecordChange={updateStudentRecord}
          onGradeChange={(_, value) => updateOverallGrade(value)}
          onMockChange={updateMock}
          onReset={resetAll}
        />

        <section className="space-y-5">
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-panel">
            <SummaryStrip rows={filteredRows} />
          </div>

          <ResultsToolbarV2
            filters={filters}
            regionOptions={regionOptions}
            resultCount={filteredRows.length}
            onChange={(next) => setFilters((current) => ({ ...current, ...next }))}
          />

          <ResultsTableV3 rows={filteredRows} showRegion={filters.showRegionColumn} />

          {showAdminSection ? (
            <AdminEditorPanel
              comprehensivePlacementTable={comprehensivePlacementTable}
              schoolRecordPlacementTable={schoolRecordPlacementTable}
              admissions={admissions}
              schools={schools}
              onPlacementThresholdChange={updatePlacementThreshold}
              onAdmissionDetailTrackChange={updateAdmissionDetailTrack}
              onSchoolRecordChange={updateSchoolRecord}
              onAutoFixAbnormalThresholds={autoFixAbnormalThresholds}
              onResetRules={resetAll}
            />
          ) : null}
        </section>
      </div>
    </main>
  );
}
