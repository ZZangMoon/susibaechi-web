import type {
  AdmissionOutcomeDataset,
  AdmissionOutcomeEntry,
  AdmissionOutcomeMatch,
  CalculatedAdmissionRow,
  CalculatedAdmissionRowWithOutcome,
  PlacementTableRow,
  PlacementTier,
  ThresholdSet,
} from "@/src/types/calculator";
import { determineJudgment } from "@/src/lib/calculation";

function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\r?\n/g, " ")
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[·,&/\-]/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

function stripGenericSchoolWords(value: string) {
  return value
    .replace(/학부/g, "")
    .replace(/학과/g, "")
    .replace(/전공/g, "")
    .replace(/계열/g, "")
    .replace(/대학/g, "");
}

function withVariants(values: Iterable<string>) {
  return [...new Set([...values].filter(Boolean))];
}

function admissionGroupForRow(row: CalculatedAdmissionRow) {
  return row.admissionType === "학생부교과" ? "교과" : "종합";
}

function buildAdmissionNameVariants(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  const normalized = normalizeText(raw);

  return withVariants([
    normalized,
    normalized
      .replace(/전형/g, "")
      .replace(/학생부/g, "")
      .replace(/종합/g, "")
      .replace(/교과/g, "")
      .replace(/학종/g, ""),
    normalized
      .replace(/미래인재전형-서류형/g, "미래인재서류")
      .replace(/미래인재전형-면접형/g, "미래인재면접")
      .replace(/미래인재전형서류형/g, "미래인재서류")
      .replace(/미래인재전형면접형/g, "미래인재면접")
      .replace(/미래인재서류형/g, "미래인재서류")
      .replace(/미래인재면접형/g, "미래인재면접")
      .replace(/학생부종합면접형/g, "면접형")
      .replace(/학생부종합서류형/g, "서류형")
      .replace(/학생부종합1/g, "면접형")
      .replace(/학생부종합2/g, "서류형")
      .replace(/학교생활우수자전형/g, "학교생활우수자")
      .replace(/학교장추천자전형/g, "학교장추천자")
      .replace(/지역균형선발전형/g, "지역균형선발")
      .replace(/지역균형전형/g, "지역균형")
      .replace(/학교추천전형/g, "학교추천")
      .replace(/추천형전형/g, "추천형")
      .replace(/국제형전형/g, "국제형")
      .replace(/활동우수형전형/g, "활동우수형")
      .replace(/일반전형/g, "일반")
      .replace(/일반전형/g, "학생부종합")
      .replace(/학생부종합/g, "일반")
      .replace(/학생부종합1/g, "면접형")
      .replace(/학생부종합2/g, "서류형")
      .replace(/학생부종합/g, "")
      .replace(/학교장추천/g, "학교추천")
      .replace(/네오르네상스전형/g, "네오르네상스")
      .replace(/학업우수전형/g, "학업우수")
      .replace(/계열적합전형/g, "계열적합"),
  ]);
}

function buildRecruitmentUnitVariants(value: string | null | undefined) {
  const raw = String(value ?? "").trim();
  const normalized = normalizeText(raw);
  const noParenthetical = normalizeText(raw.replace(/\([^)]*\)/g, " "));
  const parentheticalOnly = withVariants(
    [...raw.matchAll(/\(([^)]*)\)/g)].map((match) => normalizeText(match[1])),
  );
  const stripped = stripGenericSchoolWords(normalized);
  const strippedNoParenthetical = stripGenericSchoolWords(noParenthetical);

  return withVariants([
    normalized,
    noParenthetical,
    ...parentheticalOnly,
    stripped,
    strippedNoParenthetical,
    ...parentheticalOnly.map((item) => stripGenericSchoolWords(item)),
  ]);
}

function diceCoefficient(left: string, right: string) {
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }
  if (left.includes(right) || right.includes(left)) {
    return Math.min(left.length, right.length) / Math.max(left.length, right.length);
  }
  if (left.length < 2 || right.length < 2) {
    return 0;
  }

  const leftBigrams = new Map<string, number>();
  for (let index = 0; index < left.length - 1; index += 1) {
    const gram = left.slice(index, index + 2);
    leftBigrams.set(gram, (leftBigrams.get(gram) ?? 0) + 1);
  }

  let overlap = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const gram = right.slice(index, index + 2);
    const count = leftBigrams.get(gram) ?? 0;
    if (count > 0) {
      overlap += 1;
      leftBigrams.set(gram, count - 1);
    }
  }

  return (2 * overlap) / (left.length + right.length - 2);
}

function bestSimilarity(leftVariants: string[], rightVariants: string[]) {
  let best = 0;

  for (const left of leftVariants) {
    for (const right of rightVariants) {
      best = Math.max(best, diceCoefficient(left, right));
      if (best >= 1) {
        return best;
      }
    }
  }

  return best;
}

function buildEntryIndex(entries: AdmissionOutcomeEntry[]) {
  const index = new Map<string, AdmissionOutcomeEntry[]>();

  for (const entry of entries) {
    const existing = index.get(entry.university) ?? [];
    existing.push(entry);
    index.set(entry.university, existing);
  }

  return index;
}

function scoreMatch(row: CalculatedAdmissionRow, entry: AdmissionOutcomeEntry): AdmissionOutcomeMatch | null {
  const rowGroup = admissionGroupForRow(row);

  const rowAdmissionNameVariants = buildAdmissionNameVariants(row.admissionName);
  const entryAdmissionNameVariants = buildAdmissionNameVariants(entry.admissionName);
  const admissionSimilarity = bestSimilarity(rowAdmissionNameVariants, entryAdmissionNameVariants);

  if (admissionSimilarity < 0.55) {
    return null;
  }

  const rowRecruitmentVariants = buildRecruitmentUnitVariants(row.recruitmentUnit);
  const entryRecruitmentVariants = buildRecruitmentUnitVariants(entry.recruitmentUnit);
  const recruitmentSimilarity = bestSimilarity(rowRecruitmentVariants, entryRecruitmentVariants);

  if (recruitmentSimilarity < 0.5) {
    return null;
  }

  const groupScore =
    entry.admissionGroup && rowGroup
      ? entry.admissionGroup.includes(rowGroup)
        ? 0.06
        : -0.08
      : 0;

  const trackBonus =
    entry.track && row.track && String(entry.track).includes(String(row.track).replace("통합", ""))
      ? 0.03
      : 0;

  const score =
    recruitmentSimilarity * 0.62 + admissionSimilarity * 0.35 + trackBonus + groupScore;

  return {
    entry,
    score,
    matchedBy:
      recruitmentSimilarity >= 0.99 && admissionSimilarity >= 0.99
        ? "exact-normalized"
        : recruitmentSimilarity >= 0.9 && admissionSimilarity >= 0.8
          ? "high-similarity"
          : "fuzzy",
  };
}

function matchAdmissionOutcomeFromCandidates(
  row: CalculatedAdmissionRow,
  candidates: AdmissionOutcomeEntry[],
) {
  let bestMatch: AdmissionOutcomeMatch | null = null;

  for (const entry of candidates) {
    const scored = scoreMatch(row, entry);
    if (!scored) {
      continue;
    }

    if (!bestMatch || scored.score > bestMatch.score) {
      bestMatch = scored;
    }
  }

  if (!bestMatch) {
    return null;
  }

  if (bestMatch.score < 0.72) {
    return null;
  }

  return bestMatch;
}

export function matchAdmissionOutcome(
  row: CalculatedAdmissionRow,
  dataset: AdmissionOutcomeDataset,
): AdmissionOutcomeMatch | null {
  const candidates = buildEntryIndex(dataset.entries).get(row.university ?? "") ?? [];
  return matchAdmissionOutcomeFromCandidates(row, candidates);
}

export function attachAdmissionOutcomes(
  rows: CalculatedAdmissionRow[],
  dataset: AdmissionOutcomeDataset,
): CalculatedAdmissionRowWithOutcome[] {
  const byUniversity = buildEntryIndex(dataset.entries);

  return rows.map((row) => {
    return {
      ...row,
      admissionOutcomeMatch: matchAdmissionOutcomeFromCandidates(
        row,
        byUniversity.get(row.university ?? "") ?? [],
      ),
    };
  });
}

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
}

function roundGrade(value: number) {
  return Number(value.toFixed(2));
}

function isValidGrade(value: number | null | undefined) {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 1;
}

export function isAbnormalThresholdSet(thresholds: ThresholdSet) {
  if (!isValidGrade(thresholds.reach) || !isValidGrade(thresholds.fit) || !isValidGrade(thresholds.safe)) {
    return true;
  }

  return (
    (thresholds.safe as number) > (thresholds.fit as number) ||
    (thresholds.fit as number) > (thresholds.reach as number)
  );
}

function buildOutcomeThresholdSuggestion(rows: CalculatedAdmissionRowWithOutcome[]): ThresholdSet | null {
  const year25Fit = rows
    .map((row) => row.admissionOutcomeMatch?.entry.year25.p70)
    .filter((value): value is number => isValidGrade(value));
  const year24Fit = rows
    .map((row) => row.admissionOutcomeMatch?.entry.year24.p70)
    .filter((value): value is number => isValidGrade(value));
  const year25Safe = rows
    .map((row) => row.admissionOutcomeMatch?.entry.year25.p50)
    .filter((value): value is number => isValidGrade(value));
  const year24Safe = rows
    .map((row) => row.admissionOutcomeMatch?.entry.year24.p50)
    .filter((value): value is number => isValidGrade(value));

  const fitBase = median(year25Fit) ?? median(year24Fit) ?? median([...year25Fit, ...year24Fit]);
  if (fitBase === null) {
    return null;
  }

  const safeBase =
    median(year25Safe) ?? median(year24Safe) ?? median([...year25Safe, ...year24Safe]);

  const safeGap =
    safeBase !== null ? Math.max(0.08, Math.min(0.28, fitBase - safeBase)) : 0.15;
  const safe = roundGrade(
    Math.max(1, Math.min(safeBase ?? fitBase - 0.15, fitBase - 0.08, fitBase - safeGap)),
  );
  const reach = roundGrade(Math.max(fitBase + 0.08, fitBase + Math.max(0.08, Math.min(0.25, fitBase - safe))));
  const fit = roundGrade(Math.max(1, fitBase));

  return {
    reach: Math.max(reach, fit),
    fit,
    safe: Math.min(safe, fit),
  };
}

export function buildAbnormalPlacementAutoFix(
  rows: CalculatedAdmissionRowWithOutcome[],
  placementRows: PlacementTableRow[],
) {
  const byDetailTrack = new Map<string, CalculatedAdmissionRowWithOutcome[]>();

  for (const row of rows) {
    if (!row.detailTrack || !row.admissionOutcomeMatch) {
      continue;
    }

    const current = byDetailTrack.get(row.detailTrack) ?? [];
    current.push(row);
    byDetailTrack.set(row.detailTrack, current);
  }

  const updates: Array<{
    rowKey: string;
    tier: PlacementTier;
    nextThresholds: ThresholdSet;
  }> = [];

  for (const placementRow of placementRows) {
    const sourceRows = byDetailTrack.get(placementRow.key);
    if (!sourceRows || sourceRows.length === 0) {
      continue;
    }

    const suggestion = buildOutcomeThresholdSuggestion(sourceRows);
    if (!suggestion) {
      continue;
    }

    (["A", "B", "C", "D", "E"] as PlacementTier[]).forEach((tier) => {
      const current = placementRow.thresholdsByTier[tier];
      if (!isAbnormalThresholdSet(current)) {
        return;
      }

      updates.push({
        rowKey: placementRow.key,
        tier,
        nextThresholds: suggestion,
      });
    });
  }

  return updates;
}

export function applyPlacementAutoFixUpdates(
  placementRows: PlacementTableRow[],
  updates: Array<{
    rowKey: string;
    tier: PlacementTier;
    nextThresholds: ThresholdSet;
  }>,
) {
  if (updates.length === 0) {
    return placementRows;
  }

  const updateMap = new Map(
    updates.map((update) => [`${update.rowKey}:${update.tier}`, update.nextThresholds] as const),
  );

  return placementRows.map((row) => {
    const thresholdsByTier = { ...row.thresholdsByTier };
    let changed = false;

    (["A", "B", "C", "D", "E"] as PlacementTier[]).forEach((tier) => {
      const nextThresholds = updateMap.get(`${row.key}:${tier}`);
      if (!nextThresholds) {
        return;
      }

      thresholdsByTier[tier] = nextThresholds;
      changed = true;
    });

    return changed
      ? {
          ...row,
          thresholdsByTier,
        }
      : row;
  });
}

const OUTCOME_OVERRIDE_TARGET_UNIVERSITIES = new Set([
  "서울대학교",
  "연세대학교",
  "고려대학교",
  "서강대학교",
  "성균관대학교",
  "한양대학교",
  "중앙대학교",
  "경희대학교",
  "한국외국어대학교",
  "건국대학교",
  "동국대학교",
  "홍익대학교",
  "숙명여자대학교",
]);

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildPerRowOutcomeAverageThresholds(row: CalculatedAdmissionRowWithOutcome): ThresholdSet | null {
  if (!OUTCOME_OVERRIDE_TARGET_UNIVERSITIES.has(row.university ?? "")) {
    return null;
  }

  const entry = row.admissionOutcomeMatch?.entry;
  if (!entry) {
    return null;
  }

  const validP70 = [entry.year25.p70, entry.year24.p70].filter(
    (value): value is number => isValidGrade(value),
  );
  const averageP70 = average(validP70);
  if (averageP70 === null) {
    return null;
  }

  const fit = roundGrade(Math.max(1, averageP70));
  const spreadBase = row.admissionType === "학생부교과" ? 0.1 : 0.18;
  const yearSpread =
    validP70.length === 2 ? Math.abs(validP70[0] - validP70[1]) / 2 : 0;
  const spread = Math.max(spreadBase, roundGrade(yearSpread));

  return {
    safe: roundGrade(Math.max(1, fit - spread)),
    fit,
    reach: roundGrade(fit + spread),
  };
}

export function applyOutcomeAverageThresholdOverrides(
  rows: CalculatedAdmissionRowWithOutcome[],
): CalculatedAdmissionRowWithOutcome[] {
  return rows.map((row) => {
    const overrideThresholds = buildPerRowOutcomeAverageThresholds(row);
    if (!overrideThresholds) {
      return row;
    }

    return {
      ...row,
      computedThresholds: overrideThresholds,
      computedJudgment: determineJudgment(row.computedScore, overrideThresholds),
    };
  });
}
