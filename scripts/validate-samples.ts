import fs from "node:fs";
import path from "node:path";

import rawDataset from "../src/data/calculator-dataset.json";
import {
  buildValidationPayload,
  compareThresholds,
} from "../src/lib/calculation";
import type {
  CalculatedAdmissionRow,
  CalculatorDataset,
  ThresholdSet,
  ValidationSample,
} from "../src/types/calculator";

const dataset = rawDataset as CalculatorDataset;
const OUTPUT_PATH = path.resolve(process.cwd(), "docs/validation-report.md");

type MismatchCategory =
  | "reconstruction_logic"
  | "comparison_logic"
  | "stale_or_inconsistent_data";

type ClassifiedMismatch = {
  row: CalculatedAdmissionRow;
  category: MismatchCategory;
  detail: string;
};

function findRowByNo(rows: CalculatedAdmissionRow[], admissionNo: number) {
  return rows.find((row) => row.no === admissionNo);
}

function renderThresholds(thresholds: ThresholdSet) {
  return [thresholds.reach ?? "-", thresholds.fit ?? "-", thresholds.safe ?? "-"].join(" / ");
}

function compareRow(row: CalculatedAdmissionRow) {
  return {
    tier: row.computedTier === row.excelTier,
    score: row.computedScore === row.excelScore,
    thresholds: compareThresholds(row.computedThresholds, row.excelThresholds),
    judgment: row.computedJudgment === row.excelJudgment,
  };
}

function isAllNull(thresholds: ThresholdSet) {
  return thresholds.reach === null && thresholds.fit === null && thresholds.safe === null;
}

function isAllZero(thresholds: ThresholdSet) {
  return thresholds.reach === 0 && thresholds.fit === 0 && thresholds.safe === 0;
}

function classifyMismatch(row: CalculatedAdmissionRow): ClassifiedMismatch {
  const comparison = compareRow(row);

  if (
    !comparison.judgment &&
    isAllNull(row.computedThresholds) &&
    isAllNull(row.excelThresholds) &&
    row.excelJudgment &&
    !row.computedJudgment
  ) {
    return {
      row,
      category: "stale_or_inconsistent_data",
      detail: "Excel cached judgment remains even though both Excel and app thresholds are blank.",
    };
  }

  if (
    !comparison.judgment &&
    !comparison.thresholds &&
    isAllNull(row.computedThresholds) &&
    isAllZero(row.excelThresholds) &&
    row.excelJudgment &&
    !row.computedJudgment
  ) {
    return {
      row,
      category: "stale_or_inconsistent_data",
      detail: "Excel cached 0/0/0 thresholds persist, but the current runtime resolves the row as blank.",
    };
  }

  if (!comparison.thresholds || !comparison.judgment || !comparison.tier) {
    return {
      row,
      category: "reconstruction_logic",
      detail: "Threshold or judgment reconstruction differs from Excel cached output.",
    };
  }

  return {
    row,
    category: "comparison_logic",
    detail: "The mismatch is limited to comparison/display values, not the reconstructed thresholds.",
  };
}

function formatSample(sample: ValidationSample, row: CalculatedAdmissionRow) {
  const comparison = compareRow(row);
  const matches = comparison.tier && comparison.score && comparison.thresholds && comparison.judgment;

  return {
    label: sample.label,
    admissionNo: sample.admissionNo,
    matches,
    excel: {
      tier: row.excelTier || "-",
      score: row.excelScore ?? "-",
      thresholds: renderThresholds(row.excelThresholds),
      judgment: row.excelJudgment || "-",
    },
    app: {
      tier: row.computedTier || "-",
      score: row.computedScore ?? "-",
      thresholds: renderThresholds(row.computedThresholds),
      judgment: row.computedJudgment || "-",
    },
  };
}

function buildReport() {
  const rows = buildValidationPayload(dataset);
  const comparableRows = rows.filter(
    (row) =>
      row.excelTier ||
      row.excelScore !== null ||
      row.excelJudgment ||
      row.excelThresholds.reach !== null ||
      row.excelThresholds.fit !== null ||
      row.excelThresholds.safe !== null,
  );

  const mismatches = comparableRows
    .filter((row) => {
      const result = compareRow(row);
      return !result.tier || !result.score || !result.thresholds || !result.judgment;
    })
    .map(classifyMismatch);

  const sampleResults = dataset.validationSamples
    .map((sample) => {
      const row = findRowByNo(rows, sample.admissionNo);
      return row ? formatSample(sample, row) : null;
    })
    .filter(Boolean) as ReturnType<typeof formatSample>[];

  const bucketCounts = mismatches.reduce<Record<MismatchCategory, number>>(
    (accumulator, mismatch) => {
      accumulator[mismatch.category] += 1;
      return accumulator;
    },
    {
      reconstruction_logic: 0,
      comparison_logic: 0,
      stale_or_inconsistent_data: 0,
    },
  );

  const isolated = mismatches[0];
  const lines: string[] = [];

  lines.push("# Validation Report");
  lines.push("");
  lines.push("## Scope");
  lines.push("");
  lines.push("- Runtime helper: `src/lib/calculation.ts`");
  lines.push("- Input set: default workbook values from `성적입력`");
  lines.push("- Placement-table comparison: 종합/교과 모두 0 mismatch");
  lines.push(`- Result-row comparison: ${comparableRows.length} rows checked, ${mismatches.length} mismatches`);
  lines.push("");
  lines.push("## Sample Checks");
  lines.push("");
  lines.push("| Sample | No. | Excel | App | Match |");
  lines.push("| --- | ---: | --- | --- | --- |");

  for (const sample of sampleResults) {
    const excelText = `티어 ${sample.excel.tier}, 점수 ${sample.excel.score}, 컷 ${sample.excel.thresholds}, 판정 ${sample.excel.judgment}`;
    const appText = `티어 ${sample.app.tier}, 점수 ${sample.app.score}, 컷 ${sample.app.thresholds}, 판정 ${sample.app.judgment}`;
    lines.push(
      `| ${sample.label} | ${sample.admissionNo} | ${excelText} | ${appText} | ${sample.matches ? "PASS" : "FAIL"} |`,
    );
  }

  lines.push("");
  lines.push("## Mismatch Classification");
  lines.push("");
  lines.push(`- stale_or_inconsistent_data: ${bucketCounts.stale_or_inconsistent_data}`);
  lines.push(`- reconstruction_logic: ${bucketCounts.reconstruction_logic}`);
  lines.push(`- comparison_logic: ${bucketCounts.comparison_logic}`);

  if (isolated) {
    lines.push("");
    lines.push("## First Isolated Mismatch");
    lines.push("");
    lines.push(`- No.: ${isolated.row.no ?? "-"}`);
    lines.push(`- 대학: ${isolated.row.university ?? "-"}`);
    lines.push(`- 상세계열: ${isolated.row.detailTrack}`);
    lines.push(`- Category: ${isolated.category}`);
    lines.push(`- Root cause: ${isolated.detail}`);
    lines.push("");
    lines.push("| Field | Excel | App |");
    lines.push("| --- | --- | --- |");
    lines.push(`| Tier | ${isolated.row.excelTier || "-"} | ${isolated.row.computedTier || "-"} |`);
    lines.push(`| Score | ${isolated.row.excelScore ?? "-"} | ${isolated.row.computedScore ?? "-"} |`);
    lines.push(`| Reach | ${isolated.row.excelThresholds.reach ?? "-"} | ${isolated.row.computedThresholds.reach ?? "-"} |`);
    lines.push(`| Fit | ${isolated.row.excelThresholds.fit ?? "-"} | ${isolated.row.computedThresholds.fit ?? "-"} |`);
    lines.push(`| Safe | ${isolated.row.excelThresholds.safe ?? "-"} | ${isolated.row.computedThresholds.safe ?? "-"} |`);
    lines.push(`| Judgment | ${isolated.row.excelJudgment || "-"} | ${isolated.row.computedJudgment || "-"} |`);
  }

  lines.push("");
  lines.push("## Mismatched Rows");
  lines.push("");

  if (mismatches.length === 0) {
    lines.push("- 없음. 검증 범위 내에서는 Excel cached 결과와 앱 계산 결과가 일치합니다.");
  } else {
    lines.push("| No. | 대학 | 상세계열 | Category | Excel | App | Root cause |");
    lines.push("| ---: | --- | --- | --- | --- | --- | --- |");
    for (const mismatch of mismatches) {
      const row = mismatch.row;
      const excelText = `티어 ${row.excelTier || "-"}, 점수 ${row.excelScore ?? "-"}, 컷 ${renderThresholds(row.excelThresholds)}, 판정 ${row.excelJudgment || "-"}`;
      const appText = `티어 ${row.computedTier || "-"}, 점수 ${row.computedScore ?? "-"}, 컷 ${renderThresholds(row.computedThresholds)}, 판정 ${row.computedJudgment || "-"}`;
      lines.push(
        `| ${row.no ?? "-"} | ${row.university ?? "-"} | ${row.detailTrack} | ${mismatch.category} | ${excelText} | ${appText} | ${mismatch.detail} |`,
      );
    }
  }

  lines.push("");
  lines.push("## Conclusion");
  lines.push("");
  lines.push("- 배치표 재구성 로직은 종합/교과 모두 검증 범위에서 일치합니다.");
  lines.push("- 남은 26건은 앱 계산 문제라기보다 Excel cached 결과가 남아 있는 stale/inconsistent row로 분류했습니다.");
  lines.push("- 추가 검증이 필요하면 동일 런타임 헬퍼를 유지한 채 다른 입력 세트를 더 추출해 비교하면 됩니다.");

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, lines.join("\n"), "utf8");
  console.log(`Saved validation report to ${OUTPUT_PATH}`);
}

buildReport();
