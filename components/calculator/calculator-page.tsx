"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import { InputPanelV2 } from "@/components/calculator/input-panel-v2";
import { ResultsTableV3 } from "@/components/calculator/results-table-v3";
import { RuleEditorPanel } from "@/components/calculator/rule-editor-panel";
import { ResultsToolbarV2 } from "@/components/calculator/results-toolbar-v2";
import { SummaryStrip } from "@/components/calculator/summary-strip";
import {
  applyPlacementAutoFixUpdates,
  applyOutcomeAverageThresholdOverrides,
  attachAdmissionOutcomes,
  buildAbnormalPlacementAutoFix,
} from "@/src/lib/admission-outcomes";
import {
  buildSchoolOptions,
  calculateResults,
  findSchoolBySelection,
  getComprehensivePlacementRows,
  getSchoolRecordPlacementRows,
  normalizeAdmissionsDetailTracks,
} from "@/src/lib/calculation";
import type {
  AdmissionRecord,
  AdmissionOutcomeDataset,
  CalculatorDataset,
  CalculatorInput,
  CalculatedAdmissionRowWithOutcome,
  Judgment,
  MockExamInputs,
  PlacementTableRow,
  PlacementTier,
  StudentRecordInputs,
  ThresholdSet,
} from "@/src/types/calculator";

interface CalculatorPageProps {
  admissionOutcomeDataset: AdmissionOutcomeDataset;
  dataset: CalculatorDataset;
  deployMeta: {
    label: string;
    deployedAt: string;
    verifiedAt: string;
  };
}

interface ToolbarFilters {
  admissionType: "전체" | "학생부종합" | "학생부교과";
  region: string;
  judgment: "전체" | Exclude<Judgment, "">;
  universityQuery: string;
  recruitmentUnitQuery: string;
  sortKey: "university" | "score" | "reach" | "fit" | "safe";
  showRegionColumn: boolean;
}

interface PersistedCalculatorState {
  input: CalculatorInput;
  filters: ToolbarFilters;
  admissions: AdmissionRecord[];
  comprehensivePlacementTable: CalculatorDataset["comprehensivePlacementTable"];
  schoolRecordPlacementTable: CalculatorDataset["schoolRecordPlacementTable"];
}

const initialFilters: ToolbarFilters = {
  admissionType: "전체",
  region: "전체",
  judgment: "전체",
  universityQuery: "",
  recruitmentUnitQuery: "",
  sortKey: "university",
  showRegionColumn: false,
};
const STORAGE_KEY = "susibaechi-web:calculator-state:v1";

function cloneDeep<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createSingleGradeInput(input: CalculatorInput): CalculatorInput {
  const overallAverage = input.grades.coreAll;

  return {
    ...cloneDeep(input),
    grades: {
      coreSocial: overallAverage,
      coreScience: overallAverage,
      coreAll: overallAverage,
      korean: overallAverage,
      math: overallAverage,
      english: overallAverage,
      social: overallAverage,
      science: overallAverage,
    },
  };
}

function normalizeSchoolSelection(dataset: CalculatorDataset, input: CalculatorInput): CalculatorInput {
  const matchedSchool = findSchoolBySelection(
    dataset,
    input.schoolName,
    input.province,
    input.district,
  );
  if (!matchedSchool) {
    return input;
  }

  return {
    ...input,
    province: matchedSchool.province,
    district: matchedSchool.district,
    schoolName: matchedSchool.schoolName,
  };
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

function mergePlacementRows(
  baseRows: CalculatorDataset["comprehensivePlacementTable"],
  overrideRows: CalculatorDataset["comprehensivePlacementTable"],
) {
  return Array.from(
    new Map([...baseRows, ...overrideRows].map((row) => [row.key, row] as const)).values(),
  );
}

export function CalculatorPage({
  admissionOutcomeDataset,
  dataset,
  deployMeta,
}: CalculatorPageProps) {
  const baseInput = useMemo(
    () => normalizeSchoolSelection(dataset, createSingleGradeInput(dataset.defaultInput)),
    [dataset],
  );
  const normalizedInitialAdmissions = useMemo(
    () =>
      normalizeAdmissionsDetailTracks(
        cloneDeep(dataset.admissions),
        getComprehensivePlacementRows(dataset),
        getSchoolRecordPlacementRows(dataset),
      ),
    [dataset],
  );
  const initialComprehensivePlacementTable = useMemo(
    () => cloneDeep(getComprehensivePlacementRows(dataset)),
    [dataset],
  );
  const initialSchoolRecordPlacementTable = useMemo(
    () => cloneDeep(getSchoolRecordPlacementRows(dataset)),
    [dataset],
  );

  const [input, setInput] = useState<CalculatorInput>(baseInput);
  const [filters, setFilters] = useState<ToolbarFilters>(initialFilters);
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>(() => normalizedInitialAdmissions);
  const [comprehensivePlacementTable, setComprehensivePlacementTable] = useState(() =>
    initialComprehensivePlacementTable,
  );
  const [schoolRecordPlacementTable, setSchoolRecordPlacementTable] = useState(() =>
    initialSchoolRecordPlacementTable,
  );
  const [hasRestoredState, setHasRestoredState] = useState(false);

  const runtimeDataset = useMemo<CalculatorDataset>(
    () => ({
      ...dataset,
      defaultInput: input,
      admissions,
      comprehensivePlacementTable,
      schoolRecordPlacementTable,
    }),
    [admissions, comprehensivePlacementTable, dataset, input, schoolRecordPlacementTable],
  );

  const deferredUniversityQuery = useDeferredValue(filters.universityQuery.trim().toLowerCase());
  const deferredRecruitmentUnitQuery = useDeferredValue(
    filters.recruitmentUnitQuery.trim().toLowerCase(),
  );
  const schoolOptions = useMemo(() => buildSchoolOptions(dataset), [dataset]);

  const selectedSchool = useMemo(
    () => findSchoolBySelection(dataset, input.schoolName, input.province, input.district),
    [dataset, input.district, input.province, input.schoolName],
  );
  const effectiveComprehensivePlacementTable = useMemo(
    () => getComprehensivePlacementRows(runtimeDataset),
    [runtimeDataset],
  );
  const effectiveSchoolRecordPlacementTable = useMemo(
    () => getSchoolRecordPlacementRows(runtimeDataset),
    [runtimeDataset],
  );

  const previewRows = useMemo(() => calculateResults(runtimeDataset, input), [runtimeDataset, input]);
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
  const normalizedRuntimeDataset = useMemo<CalculatorDataset>(
    () => ({
      ...runtimeDataset,
      comprehensivePlacementTable: autoFixedComprehensivePlacementTable,
      schoolRecordPlacementTable: autoFixedSchoolRecordPlacementTable,
    }),
    [
      autoFixedComprehensivePlacementTable,
      autoFixedSchoolRecordPlacementTable,
      runtimeDataset,
    ],
  );
  const calculatedRows = useMemo(
    () => calculateResults(normalizedRuntimeDataset, input),
    [input, normalizedRuntimeDataset],
  );
  const calculatedRowsWithOutcomes = useMemo(
    () =>
      applyOutcomeAverageThresholdOverrides(
        attachAdmissionOutcomes(calculatedRows, admissionOutcomeDataset),
      ),
    [admissionOutcomeDataset, calculatedRows],
  );

  const regionOptions = useMemo(() => {
    return Array.from(new Set(admissions.map((row) => row.region).filter(Boolean))) as string[];
  }, [admissions]);

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setHasRestoredState(true);
        return;
      }

      const parsed = JSON.parse(raw) as Partial<PersistedCalculatorState>;

      if (parsed.input) {
        setInput(normalizeSchoolSelection(dataset, parsed.input));
      }
      if (parsed.filters) {
        setFilters({ ...initialFilters, ...parsed.filters });
      }
      if (parsed.admissions) {
        const restoredComprehensivePlacementTable = parsed.comprehensivePlacementTable
          ? mergePlacementRows(initialComprehensivePlacementTable, parsed.comprehensivePlacementTable)
          : initialComprehensivePlacementTable;
        const restoredSchoolRecordPlacementTable = parsed.schoolRecordPlacementTable
          ? mergePlacementRows(initialSchoolRecordPlacementTable, parsed.schoolRecordPlacementTable)
          : initialSchoolRecordPlacementTable;

        setAdmissions(
          normalizeAdmissionsDetailTracks(
            parsed.admissions,
            restoredComprehensivePlacementTable,
            restoredSchoolRecordPlacementTable,
          ),
        );
      }
      if (parsed.comprehensivePlacementTable) {
        setComprehensivePlacementTable(
          mergePlacementRows(initialComprehensivePlacementTable, parsed.comprehensivePlacementTable),
        );
      }
      if (parsed.schoolRecordPlacementTable) {
        setSchoolRecordPlacementTable(
          mergePlacementRows(initialSchoolRecordPlacementTable, parsed.schoolRecordPlacementTable),
        );
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHasRestoredState(true);
    }
  }, [
    dataset,
    initialComprehensivePlacementTable,
    initialSchoolRecordPlacementTable,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasRestoredState) {
      return;
    }

    const nextState: PersistedCalculatorState = {
      input,
      filters,
      admissions,
      comprehensivePlacementTable,
      schoolRecordPlacementTable,
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }, [
    admissions,
    comprehensivePlacementTable,
    filters,
    hasRestoredState,
    input,
    schoolRecordPlacementTable,
  ]);

  function updateStudentRecord(field: keyof StudentRecordInputs, value: string) {
    setInput((current) => ({
      ...current,
      studentRecord: {
        ...current.studentRecord,
        [field]: value,
      },
    }));
  }

  function updateOverallGrade(value: string) {
    const parsed = parseNullableNumber(value);
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
  }

  function updateMock(field: keyof MockExamInputs, value: string) {
    setInput((current) => ({
      ...current,
      mockExam: {
        ...current.mockExam,
        [field]: parseNullableNumber(value),
      },
    }));
  }

  function updatePlacementThreshold(
    target: "종합배치표" | "교과배치표",
    rowKey: string,
    tier: PlacementTier,
    field: keyof ThresholdSet,
    value: number | null,
  ) {
    const setter = target === "종합배치표" ? setComprehensivePlacementTable : setSchoolRecordPlacementTable;

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
  }

  function updateAdmissionDetailTrack(rowNumber: number, detailTrack: string) {
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
  }

  function resetRules() {
    setAdmissions(normalizedInitialAdmissions);
    setComprehensivePlacementTable(cloneDeep(initialComprehensivePlacementTable));
    setSchoolRecordPlacementTable(cloneDeep(initialSchoolRecordPlacementTable));
  }

  function autoFixAbnormalThresholds() {
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
  }

  return (
    <main className="mx-auto min-h-screen max-w-[1800px] px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <div className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-4 py-1 text-xs font-bold tracking-[0.18em] text-rose-700">
            {`배포 라벨 ${deployMeta.label} / 관리자잠금 적용 / 포터블 배포 지원`}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            입시위키 수시 배치 계산기
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">
            웹기반 배치 결과 조회
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {deployMeta.deployedAt
              ? `마지막 배포 ${deployMeta.deployedAt}`
              : "로컬 개발 모드"}
          </p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
        >
          홈으로
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <InputPanelV2
          input={input}
          schoolOptions={schoolOptions}
          selectedSchool={selectedSchool}
          workbookSummary={dataset.workbookSummary}
          onSchoolChange={(value, school) => {
            const matchedSchool =
              school ?? findSchoolBySelection(dataset, value, input.province, input.district);
            setInput((current) => ({
              ...current,
              schoolName: matchedSchool ? matchedSchool.schoolName : value,
              province: matchedSchool?.province ?? current.province,
              district: matchedSchool?.district ?? current.district,
            }));
          }}
          onStudentRecordChange={updateStudentRecord}
          onGradeChange={(_, value) => updateOverallGrade(value)}
          onMockChange={updateMock}
          onReset={() => {
            setInput(baseInput);
            setFilters(initialFilters);
            resetRules();
            if (typeof window !== "undefined") {
              window.localStorage.removeItem(STORAGE_KEY);
            }
          }}
        />

        <section className="space-y-5">
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-panel">
            <SummaryStrip rows={filteredRows} />
          </div>

          <RuleEditorPanel
            comprehensivePlacementTable={comprehensivePlacementTable}
            schoolRecordPlacementTable={schoolRecordPlacementTable}
            admissions={admissions}
            onPlacementThresholdChange={updatePlacementThreshold}
            onAdmissionDetailTrackChange={updateAdmissionDetailTrack}
            onAutoFixAbnormalThresholds={autoFixAbnormalThresholds}
            onResetRules={resetRules}
          />

          <ResultsToolbarV2
            filters={filters}
            regionOptions={regionOptions}
            resultCount={filteredRows.length}
            onChange={(next) => setFilters((current) => ({ ...current, ...next }))}
          />

          <ResultsTableV3 rows={filteredRows} showRegion={filters.showRegionColumn} />
        </section>
      </div>
    </main>
  );
}
