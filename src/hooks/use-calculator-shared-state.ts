"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildSchoolOptions,
  compareThresholds,
  findSchoolBySelection,
  getComprehensivePlacementRows,
  getSchoolRecordPlacementRows,
  normalizeAdmissionsDetailTracks,
} from "@/src/lib/calculation";
import type {
  AdmissionRecord,
  CalculatorDataset,
  CalculatorInput,
  Judgment,
  PlacementTier,
  SchoolRecord,
  ThresholdSet,
} from "@/src/types/calculator";

export interface ToolbarFilters {
  admissionType: "전체" | "학생부종합" | "학생부교과";
  region: string;
  judgment: "전체" | Exclude<Judgment, "">;
  universityQuery: string;
  recruitmentUnitQuery: string;
  sortKey: "university" | "score" | "reach" | "fit" | "safe";
  showRegionColumn: boolean;
}

interface StoredSchoolOverride {
  index: number;
  school: SchoolRecord;
}

interface StoredAdmissionOverride {
  rowNumber: number;
  detailTrack: string;
}

interface StoredThresholdOverride {
  rowKey: string;
  tier: PlacementTier;
  thresholds: ThresholdSet;
}

export interface PersistedCalculatorState {
  input: CalculatorInput;
  filters: ToolbarFilters;
  schoolOverrides: StoredSchoolOverride[];
  admissionOverrides: StoredAdmissionOverride[];
  comprehensiveThresholdOverrides: StoredThresholdOverride[];
  schoolRecordThresholdOverrides: StoredThresholdOverride[];
}

export const initialFilters: ToolbarFilters = {
  admissionType: "전체",
  region: "전체",
  judgment: "전체",
  universityQuery: "",
  recruitmentUnitQuery: "",
  sortKey: "university",
  showRegionColumn: false,
};

export const STORAGE_KEY = "susibaechi-web:calculator-state:v3";

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

function normalizeSchoolSelection(
  dataset: CalculatorDataset,
  schools: SchoolRecord[],
  input: CalculatorInput,
): CalculatorInput {
  const matchedSchool = findSchoolBySelection(
    {
      ...dataset,
      schools,
    },
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

function mergePlacementRows(
  baseRows: CalculatorDataset["comprehensivePlacementTable"],
  overrideRows: CalculatorDataset["comprehensivePlacementTable"],
) {
  return Array.from(
    new Map([...baseRows, ...overrideRows].map((row) => [row.key, row] as const)).values(),
  );
}

function applySchoolOverrides(schools: SchoolRecord[], overrides: StoredSchoolOverride[]) {
  if (overrides.length === 0) {
    return schools;
  }

  const next = cloneDeep(schools);
  for (const override of overrides) {
    if (!next[override.index]) {
      continue;
    }
    next[override.index] = override.school;
  }
  return next;
}

function applyThresholdOverrides(
  rows: CalculatorDataset["comprehensivePlacementTable"],
  overrides: StoredThresholdOverride[],
) {
  if (overrides.length === 0) {
    return rows;
  }

  const overrideMap = new Map(overrides.map((override) => [`${override.rowKey}:${override.tier}`, override] as const));

  return rows.map((row) => {
    let changed = false;
    const thresholdsByTier = { ...row.thresholdsByTier };

    for (const tier of ["A", "B", "C", "D", "E"] as PlacementTier[]) {
      const matched = overrideMap.get(`${row.key}:${tier}`);
      if (!matched) {
        continue;
      }
      thresholdsByTier[tier] = matched.thresholds;
      changed = true;
    }

    return changed ? { ...row, thresholdsByTier } : row;
  });
}

function applyAdmissionOverrides(admissions: AdmissionRecord[], overrides: StoredAdmissionOverride[]) {
  if (overrides.length === 0) {
    return admissions;
  }

  const overrideMap = new Map(overrides.map((override) => [override.rowNumber, override.detailTrack] as const));
  return admissions.map((admission) => {
    const detailTrack = overrideMap.get(admission.rowNumber);
    return detailTrack ? { ...admission, detailTrack } : admission;
  });
}

function buildSchoolOverrides(initialSchools: SchoolRecord[], schools: SchoolRecord[]) {
  const overrides: StoredSchoolOverride[] = [];

  schools.forEach((school, index) => {
    if (JSON.stringify(school) !== JSON.stringify(initialSchools[index])) {
      overrides.push({ index, school });
    }
  });

  return overrides;
}

function buildAdmissionOverrides(initialAdmissions: AdmissionRecord[], admissions: AdmissionRecord[]) {
  const initialMap = new Map(initialAdmissions.map((admission) => [admission.rowNumber, admission.detailTrack] as const));

  return admissions
    .filter((admission) => initialMap.get(admission.rowNumber) !== admission.detailTrack)
    .map((admission) => ({
      rowNumber: admission.rowNumber,
      detailTrack: admission.detailTrack,
    }));
}

function buildThresholdOverrides(
  initialRows: CalculatorDataset["comprehensivePlacementTable"],
  rows: CalculatorDataset["comprehensivePlacementTable"],
) {
  const initialMap = new Map(initialRows.map((row) => [row.key, row] as const));
  const overrides: StoredThresholdOverride[] = [];

  for (const row of rows) {
    const initialRow = initialMap.get(row.key);
    if (!initialRow) {
      continue;
    }

    for (const tier of ["A", "B", "C", "D", "E"] as PlacementTier[]) {
      if (!compareThresholds(initialRow.thresholdsByTier[tier], row.thresholdsByTier[tier])) {
        overrides.push({
          rowKey: row.key,
          tier,
          thresholds: row.thresholdsByTier[tier],
        });
      }
    }
  }

  return overrides;
}

export function useCalculatorSharedState(dataset: CalculatorDataset) {
  const initialSchools = useMemo(() => cloneDeep(dataset.schools), [dataset]);
  const baseInput = useMemo(
    () => normalizeSchoolSelection(dataset, initialSchools, createSingleGradeInput(dataset.defaultInput)),
    [dataset, initialSchools],
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
  const [schools, setSchools] = useState<SchoolRecord[]>(() => initialSchools);
  const [admissions, setAdmissions] = useState<AdmissionRecord[]>(() => normalizedInitialAdmissions);
  const [comprehensivePlacementTable, setComprehensivePlacementTable] = useState(
    () => initialComprehensivePlacementTable,
  );
  const [schoolRecordPlacementTable, setSchoolRecordPlacementTable] = useState(
    () => initialSchoolRecordPlacementTable,
  );
  const [hasRestoredState, setHasRestoredState] = useState(false);

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
      const restoredSchools = applySchoolOverrides(initialSchools, parsed.schoolOverrides ?? []);
      const restoredComprehensivePlacementTable = applyThresholdOverrides(
        initialComprehensivePlacementTable,
        parsed.comprehensiveThresholdOverrides ?? [],
      );
      const restoredSchoolRecordPlacementTable = applyThresholdOverrides(
        initialSchoolRecordPlacementTable,
        parsed.schoolRecordThresholdOverrides ?? [],
      );
      const restoredAdmissions = applyAdmissionOverrides(
        normalizeAdmissionsDetailTracks(
          cloneDeep(dataset.admissions),
          restoredComprehensivePlacementTable,
          restoredSchoolRecordPlacementTable,
        ),
        parsed.admissionOverrides ?? [],
      );

      setSchools(restoredSchools);
      setComprehensivePlacementTable(restoredComprehensivePlacementTable);
      setSchoolRecordPlacementTable(restoredSchoolRecordPlacementTable);
      setAdmissions(restoredAdmissions);

      if (parsed.input) {
        setInput(normalizeSchoolSelection(dataset, restoredSchools, parsed.input));
      }
      if (parsed.filters) {
        setFilters({ ...initialFilters, ...parsed.filters });
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
    initialSchools,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !hasRestoredState) {
      return;
    }

    const nextState: PersistedCalculatorState = {
      input,
      filters,
      schoolOverrides: buildSchoolOverrides(initialSchools, schools),
      admissionOverrides: buildAdmissionOverrides(normalizedInitialAdmissions, admissions),
      comprehensiveThresholdOverrides: buildThresholdOverrides(
        initialComprehensivePlacementTable,
        comprehensivePlacementTable,
      ),
      schoolRecordThresholdOverrides: buildThresholdOverrides(
        initialSchoolRecordPlacementTable,
        schoolRecordPlacementTable,
      ),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [
    admissions,
    comprehensivePlacementTable,
    filters,
    hasRestoredState,
    initialComprehensivePlacementTable,
    initialSchoolRecordPlacementTable,
    initialSchools,
    input,
    normalizedInitialAdmissions,
    schoolRecordPlacementTable,
    schools,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    function handleStorage(event: StorageEvent) {
      if (event.key !== STORAGE_KEY || !event.newValue) {
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as PersistedCalculatorState;
        const restoredSchools = applySchoolOverrides(initialSchools, parsed.schoolOverrides ?? []);
        const restoredComprehensivePlacementTable = applyThresholdOverrides(
          initialComprehensivePlacementTable,
          parsed.comprehensiveThresholdOverrides ?? [],
        );
        const restoredSchoolRecordPlacementTable = applyThresholdOverrides(
          initialSchoolRecordPlacementTable,
          parsed.schoolRecordThresholdOverrides ?? [],
        );
        const restoredAdmissions = applyAdmissionOverrides(
          normalizeAdmissionsDetailTracks(
            cloneDeep(dataset.admissions),
            restoredComprehensivePlacementTable,
            restoredSchoolRecordPlacementTable,
          ),
          parsed.admissionOverrides ?? [],
        );

        setInput(normalizeSchoolSelection(dataset, restoredSchools, parsed.input));
        setFilters({ ...initialFilters, ...parsed.filters });
        setSchools(restoredSchools);
        setAdmissions(restoredAdmissions);
        setComprehensivePlacementTable(restoredComprehensivePlacementTable);
        setSchoolRecordPlacementTable(restoredSchoolRecordPlacementTable);
      } catch {
        // ignore malformed cross-tab updates
      }
    }

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [
    dataset,
    initialComprehensivePlacementTable,
    initialSchoolRecordPlacementTable,
    initialSchools,
  ]);

  const runtimeDataset = useMemo<CalculatorDataset>(
    () => ({
      ...dataset,
      defaultInput: input,
      schools,
      admissions,
      comprehensivePlacementTable,
      schoolRecordPlacementTable,
    }),
    [admissions, comprehensivePlacementTable, dataset, input, schoolRecordPlacementTable, schools],
  );

  const schoolOptions = useMemo(() => buildSchoolOptions(runtimeDataset), [runtimeDataset]);
  const selectedSchool = useMemo(
    () => findSchoolBySelection(runtimeDataset, input.schoolName, input.province, input.district),
    [input.district, input.province, input.schoolName, runtimeDataset],
  );

  function resetAll() {
    setInput(baseInput);
    setFilters(initialFilters);
    setSchools(initialSchools);
    setAdmissions(normalizedInitialAdmissions);
    setComprehensivePlacementTable(cloneDeep(initialComprehensivePlacementTable));
    setSchoolRecordPlacementTable(cloneDeep(initialSchoolRecordPlacementTable));
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }

  return {
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
    hasRestoredState,
    runtimeDataset,
    schoolOptions,
    selectedSchool,
    baseInput,
    normalizedInitialAdmissions,
    initialComprehensivePlacementTable,
    initialSchoolRecordPlacementTable,
    resetAll,
  };
}
