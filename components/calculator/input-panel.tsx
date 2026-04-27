import { useEffect, useMemo, useState } from "react";

import type {
  CalculatorInput,
  GradeInputs,
  MockExamInputs,
  SchoolRecord,
  StudentRecordInputs,
  WorkbookSummary,
} from "@/src/types/calculator";
import { formatNumber } from "@/src/lib/format";

interface InputPanelProps {
  input: CalculatorInput;
  schoolOptions: SchoolRecord[];
  selectedSchool?: SchoolRecord;
  workbookSummary: WorkbookSummary;
  onSchoolChange: (value: string, school?: SchoolRecord) => void;
  onStudentRecordChange: (field: keyof StudentRecordInputs, value: string) => void;
  onGradeChange: (field: keyof GradeInputs, value: string) => void;
  onMockChange: (field: keyof MockExamInputs, value: string) => void;
  onReset: () => void;
}

const gradeFields: Array<{ key: keyof GradeInputs; label: string }> = [
  { key: "coreAll", label: "전교과평균" },
];

const mockFields: Array<{ key: keyof MockExamInputs; label: string }> = [
  { key: "korean", label: "국어" },
  { key: "calculus", label: "미적분" },
  { key: "statistics", label: "확통" },
  { key: "english", label: "영어" },
  { key: "history", label: "한국사" },
  { key: "social1", label: "사탐1" },
  { key: "social2", label: "사탐2" },
  { key: "science1", label: "과탐1" },
  { key: "science2", label: "과탐2" },
];

export function InputPanel({
  input,
  schoolOptions,
  selectedSchool,
  workbookSummary,
  onSchoolChange,
  onStudentRecordChange,
  onGradeChange,
  onMockChange,
  onReset,
}: InputPanelProps) {
  const [schoolQuery, setSchoolQuery] = useState(input.schoolName);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);

  useEffect(() => {
    setSchoolQuery(input.schoolName);
  }, [input.schoolName]);

  const filteredSchoolOptions = useMemo(() => {
    const keyword = schoolQuery.trim().toLowerCase();
    if (!keyword) {
      return schoolOptions.slice(0, 12);
    }

    return schoolOptions
      .filter((school) => school.schoolName.toLowerCase().includes(keyword))
      .slice(0, 12);
  }, [schoolOptions, schoolQuery]);

  return (
    <aside className="space-y-6 rounded-[28px] border border-white/80 bg-white/90 p-6 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            성적입력
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">입력 패널</h2>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          기본값 복원
        </button>
      </div>

      <label className="block space-y-2">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          학교 검색
        </div>
        <div className="relative">
          <input
            value={schoolQuery}
            onChange={(event) => {
              const nextValue = event.target.value;
              setSchoolQuery(nextValue);
              setIsSuggestionOpen(true);
              onSchoolChange(nextValue);
            }}
            onFocus={() => setIsSuggestionOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setIsSuggestionOpen(false), 120);
            }}
            placeholder="학교명을 검색하세요"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500"
          />
          {isSuggestionOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-72 overflow-auto rounded-2xl border border-line bg-white shadow-lg">
              {filteredSchoolOptions.map((school) => (
                <button
                  key={`${school.schoolName}-${school.province}-${school.district}`}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setSchoolQuery(school.schoolName);
                    setIsSuggestionOpen(false);
                    onSchoolChange(school.schoolName, school);
                  }}
                  className="flex w-full items-start justify-between gap-3 border-b border-line/60 px-4 py-3 text-left transition hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-900">{school.schoolName}</span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {school.province}/{school.district}
                  </span>
                </button>
              ))}
              {filteredSchoolOptions.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500">검색 결과가 없습니다.</div>
              ) : null}
            </div>
          ) : null}
        </div>
        <p className="text-xs leading-5 text-slate-500">
          입력값은 학교명만 유지하고, 같은 이름 학교는 후보 목록에서 `시도/행정구`로 구분합니다.
        </p>
      </label>

      <section className="rounded-3xl border border-line bg-[#f8fafb] p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          학교 정보
        </div>
        <div className="mt-3 grid gap-3 text-sm text-slate-700">
          <div className="rounded-2xl bg-white px-4 py-3">
            <div className="text-xs text-slate-500">선택 학교 위치</div>
            <div className="mt-1 font-semibold text-slate-900">
              {selectedSchool ? `${selectedSchool.province} / ${selectedSchool.district}` : "-"}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-xs text-slate-500">인문 티어</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {selectedSchool?.humanitiesTier || "-"}
              </div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-xs text-slate-500">자연 티어</div>
              <div className="mt-1 text-lg font-bold text-slate-900">
                {selectedSchool?.naturalTier || "-"}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-xs text-slate-500">인문 총점</div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatNumber(selectedSchool?.humanitiesTotal)}
              </div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3">
              <div className="text-xs text-slate-500">자연 총점</div>
              <div className="mt-1 font-semibold text-slate-900">
                {formatNumber(selectedSchool?.naturalTotal)}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            생기부 관련 입력
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            원본 입력 셀을 보존했습니다. 현재 확인된 계산기 결과행에서는 직접 참조가 드러나지 않아 상태값으로 유지합니다.
          </p>
        </div>
        <div className="grid gap-3">
          <input
            value={input.studentRecord.academicCompetency}
            onChange={(event) => onStudentRecordChange("academicCompetency", event.target.value)}
            placeholder="학업역량"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
          />
          <input
            value={input.studentRecord.careerCompetency}
            onChange={(event) => onStudentRecordChange("careerCompetency", event.target.value)}
            placeholder="진로역량"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
          />
          <input
            value={input.studentRecord.communityCompetency}
            onChange={(event) => onStudentRecordChange("communityCompetency", event.target.value)}
            placeholder="공동체역량"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
          />
          <input
            value={input.studentRecord.focusTrack}
            onChange={(event) => onStudentRecordChange("focusTrack", event.target.value)}
            placeholder="희망계열 / 특이사항"
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            내신 성적
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            웹 계산기에서는 내신 기준값을 전교과평균 1개 입력으로 단순화해 반영합니다.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {gradeFields.map((field) => (
            <label key={field.key} className="space-y-2">
              <div className="text-sm font-medium text-slate-700">{field.label}</div>
              <input
                type="number"
                step="0.0001"
                value={input.grades[field.key] ?? ""}
                onChange={(event) => onGradeChange(field.key, event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          모의고사 등급
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {mockFields.map((field) => (
            <label key={field.key} className="space-y-2">
              <div className="text-sm font-medium text-slate-700">{field.label}</div>
              <input
                type="number"
                step="0.1"
                value={input.mockExam[field.key] ?? ""}
                onChange={(event) => onMockChange(field.key, event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-[#fffdfa] p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          시트 분석 요약
        </div>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {workbookSummary.sheetRoles.slice(0, 4).map((sheet) => (
            <li key={sheet.name}>
              <span className="font-semibold text-slate-900">{sheet.name}</span>{" "}
              {sheet.role}
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
