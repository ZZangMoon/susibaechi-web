"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useTransition } from "react";

import type { SchoolRecordIdentity } from "@/components/calculator/school-info-editor-panel";
import { useCalculatorSharedState } from "@/src/hooks/use-calculator-shared-state";
import {
  applyPlacementAutoFixUpdates,
  attachAdmissionOutcomes,
  buildAbnormalPlacementAutoFix,
} from "@/src/lib/admission-outcomes";
import {
  calculateResults,
  getComprehensivePlacementRows,
  getSchoolRecordPlacementRows,
} from "@/src/lib/calculation";
import type {
  AdmissionOutcomeDataset,
  CalculatorDataset,
  PlacementTier,
  SchoolRecord,
  ThresholdSet,
} from "@/src/types/calculator";

const AdminEditorPanel = dynamic(
  () => import("@/components/calculator/admin-editor-panel").then((module) => module.AdminEditorPanel),
  {
    loading: () => (
      <section className="rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-panel">
        <p className="text-sm font-semibold text-slate-600">관리자 도구를 불러오는 중...</p>
      </section>
    ),
  },
);

interface AdminPageProps {
  admissionOutcomeDataset: AdmissionOutcomeDataset;
  dataset: CalculatorDataset;
  deployMeta: {
    label: string;
    deployedAt: string;
    verifiedAt: string;
  };
}

export function AdminPage({ admissionOutcomeDataset, dataset, deployMeta }: AdminPageProps) {
  const [isPending, startTransition] = useTransition();
  const {
    input,
    setInput,
    schools,
    setSchools,
    admissions,
    setAdmissions,
    comprehensivePlacementTable,
    setComprehensivePlacementTable,
    schoolRecordPlacementTable,
    setSchoolRecordPlacementTable,
    runtimeDataset,
    resetAll,
  } = useCalculatorSharedState(dataset);

  const effectiveComprehensivePlacementTable = useMemo(
    () => getComprehensivePlacementRows(runtimeDataset),
    [runtimeDataset],
  );
  const effectiveSchoolRecordPlacementTable = useMemo(
    () => getSchoolRecordPlacementRows(runtimeDataset),
    [runtimeDataset],
  );

  const calculatedRowsWithOutcomes = useMemo(
    () => attachAdmissionOutcomes(calculateResults(runtimeDataset, input), admissionOutcomeDataset),
    [admissionOutcomeDataset, input, runtimeDataset],
  );

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
            {`배포 라벨 ${deployMeta.label} / 관리자 전용 페이지`}
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            입시위키 수시 배치 계산기
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-900">관리자 페이지</h1>
          {isPending ? (
            <p className="mt-2 text-xs font-semibold text-amber-700">수정 반영 중...</p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Link
            href="/calculator"
            prefetch={false}
            className="rounded-full border border-sky-300 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-800 transition hover:border-sky-400 hover:bg-sky-100"
          >
            계산기 페이지
          </Link>
          <Link
            href="/"
            prefetch={false}
            className="rounded-full border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
          >
            홈으로
          </Link>
        </div>
      </div>

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
    </main>
  );
}
