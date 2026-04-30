interface ToolbarFilters {
  admissionType: "전체" | "학생부종합" | "학생부교과";
  region: string;
  judgment: "전체" | "안정" | "적정" | "소신" | "상향";
  universityQuery: string;
  recruitmentUnitQuery: string;
  sortKey: "no" | "university" | "score" | "reach" | "fit" | "safe";
}

interface ResultsToolbarProps {
  filters: ToolbarFilters;
  regionOptions: string[];
  resultCount: number;
  onChange: (next: Partial<ToolbarFilters>) => void;
}

export function ResultsToolbar({
  filters,
  regionOptions,
  resultCount,
  onChange,
}: ResultsToolbarProps) {
  return (
    <div className="space-y-4 rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-panel">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            계산기 결과
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-900">결과 테이블</h2>
        </div>
        <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          {resultCount.toLocaleString()}건 표시 중
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-5">
        <input
          value={filters.universityQuery}
          onChange={(event) => onChange({ universityQuery: event.target.value })}
          placeholder="대학명 검색"
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
        />
        <input
          value={filters.recruitmentUnitQuery}
          onChange={(event) => onChange({ recruitmentUnitQuery: event.target.value })}
          placeholder="모집단위명 검색"
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
        />
        <select
          value={filters.admissionType}
          onChange={(event) =>
            onChange({ admissionType: event.target.value as ToolbarFilters["admissionType"] })
          }
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
        >
          <option value="전체">전형유형 전체</option>
          <option value="학생부종합">학생부종합</option>
          <option value="학생부교과">학생부교과</option>
        </select>
        <select
          value={filters.judgment}
          onChange={(event) =>
            onChange({ judgment: event.target.value as ToolbarFilters["judgment"] })
          }
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
        >
          <option value="전체">판정 전체</option>
          <option value="안정">안정</option>
          <option value="적정">적정</option>
          <option value="소신">소신</option>
          <option value="상향">상향</option>
        </select>
        <select
          value={filters.region}
          onChange={(event) => onChange({ region: event.target.value })}
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
        >
          <option value="전체">지역 전체</option>
          {regionOptions.map((region) => (
            <option key={region} value={region}>
              {region}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
          대학명, 모집단위명, 전형유형, 판정값으로 결과를 바로 좁혀볼 수 있습니다.
        </div>
        <select
          value={filters.sortKey}
          onChange={(event) => onChange({ sortKey: event.target.value as ToolbarFilters["sortKey"] })}
          className="rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
        >
          <option value="no">No. 순 정렬</option>
          <option value="university">대학명 순 정렬</option>
          <option value="score">점수 순 정렬</option>
          <option value="reach">상향컷 순 정렬</option>
          <option value="fit">적정컷 순 정렬</option>
          <option value="safe">안정컷 순 정렬</option>
        </select>
      </div>
    </div>
  );
}
