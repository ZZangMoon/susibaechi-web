"use client";

import { useDeferredValue, useMemo, useState } from "react";

import type { PlacementTier, SchoolRecord } from "@/src/types/calculator";

export interface SchoolRecordIdentity {
  schoolName: string;
  province: string;
  district: string;
}

interface SchoolInfoEditorPanelProps {
  schools: SchoolRecord[];
  onSchoolChange: (
    identity: SchoolRecordIdentity,
    updater: (school: SchoolRecord) => SchoolRecord,
  ) => void;
}

const tierOptions: Array<PlacementTier | ""> = ["", "A", "B", "C", "D", "E"];

function parseNullableNumber(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function SchoolInfoEditorPanel({
  schools,
  onSchoolChange,
}: SchoolInfoEditorPanelProps) {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredSchools = useMemo(() => {
    const keyword = deferredQuery.trim().toLowerCase();
    if (!keyword) {
      return schools.slice(0, 80);
    }

    return schools
      .filter((school) =>
        [school.schoolName, school.province, school.district]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword),
      )
      .slice(0, 80);
  }, [deferredQuery, schools]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-slate-900">학교 정보 관리</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          계산기 좌측 학교 정보 카드에 보이는 위치, 티어, 총점을 수정하면 같은 저장 상태를
          공유하는 계산기 페이지에도 자동으로 반영됩니다.
        </p>
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="학교명 / 시도 / 행정구 검색"
        className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-sky-500"
      />

      <div className="rounded-3xl border border-line bg-white">
        <div className="grid grid-cols-[180px_120px_120px_90px_90px_110px_110px] border-b border-line bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          <div>학교명</div>
          <div>시도</div>
          <div>행정구</div>
          <div>인문 티어</div>
          <div>자연 티어</div>
          <div>인문 총점</div>
          <div>자연 총점</div>
        </div>
        <div className="max-h-[480px] overflow-auto">
          {filteredSchools.map((school) => {
            const identity: SchoolRecordIdentity = {
              schoolName: school.schoolName,
              province: school.province,
              district: school.district,
            };

            return (
              <div
                key={`${school.schoolName}-${school.province}-${school.district}`}
                className="grid grid-cols-[180px_120px_120px_90px_90px_110px_110px] items-center gap-3 border-b border-line/60 px-4 py-3 text-sm"
              >
                <div className="truncate font-medium text-slate-900">{school.schoolName}</div>
                <input
                  value={school.province}
                  onChange={(event) =>
                    onSchoolChange(identity, (current) => ({
                      ...current,
                      province: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                />
                <input
                  value={school.district}
                  onChange={(event) =>
                    onSchoolChange(identity, (current) => ({
                      ...current,
                      district: event.target.value,
                    }))
                  }
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                />
                <select
                  value={school.humanitiesTier}
                  onChange={(event) =>
                    onSchoolChange(identity, (current) => ({
                      ...current,
                      humanitiesTier: event.target.value as PlacementTier | "",
                    }))
                  }
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                >
                  {tierOptions.map((tier) => (
                    <option key={`human-${tier || "blank"}`} value={tier}>
                      {tier || "-"}
                    </option>
                  ))}
                </select>
                <select
                  value={school.naturalTier}
                  onChange={(event) =>
                    onSchoolChange(identity, (current) => ({
                      ...current,
                      naturalTier: event.target.value as PlacementTier | "",
                    }))
                  }
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                >
                  {tierOptions.map((tier) => (
                    <option key={`natural-${tier || "blank"}`} value={tier}>
                      {tier || "-"}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={school.humanitiesTotal ?? ""}
                  onChange={(event) =>
                    onSchoolChange(identity, (current) => ({
                      ...current,
                      humanitiesTotal: parseNullableNumber(event.target.value),
                    }))
                  }
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                />
                <input
                  type="number"
                  step="0.01"
                  value={school.naturalTotal ?? ""}
                  onChange={(event) =>
                    onSchoolChange(identity, (current) => ({
                      ...current,
                      naturalTotal: parseNullableNumber(event.target.value),
                    }))
                  }
                  className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-500"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
