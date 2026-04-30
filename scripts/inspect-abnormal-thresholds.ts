import admissionOutcomes from "@/src/data/admission-outcomes.json";
import dataset from "@/src/data/calculator-dataset.json";
import {
  attachAdmissionOutcomes,
  buildAbnormalPlacementAutoFix,
  isAbnormalThresholdSet,
} from "@/src/lib/admission-outcomes";
import {
  calculateResults,
  getComprehensivePlacementRows,
  getSchoolRecordPlacementRows,
} from "@/src/lib/calculation";
import type {
  AdmissionOutcomeDataset,
  CalculatorDataset,
  PlacementTableRow,
  PlacementTier,
} from "@/src/types/calculator";

function countAbnormalRows(rows: PlacementTableRow[]) {
  let abnormalTierCount = 0;
  let abnormalRowCount = 0;

  for (const row of rows) {
    let rowHasAbnormal = false;

    (["A", "B", "C", "D", "E"] as PlacementTier[]).forEach((tier) => {
      if (isAbnormalThresholdSet(row.thresholdsByTier[tier])) {
        abnormalTierCount += 1;
        rowHasAbnormal = true;
      }
    });

    if (rowHasAbnormal) {
      abnormalRowCount += 1;
    }
  }

  return { abnormalTierCount, abnormalRowCount };
}

function applyUpdates(
  rows: PlacementTableRow[],
  updates: Array<{
    rowKey: string;
    tier: PlacementTier;
    nextThresholds: PlacementTableRow["thresholdsByTier"][PlacementTier];
  }>,
) {
  const updateMap = new Map(
    updates.map((update) => [`${update.rowKey}:${update.tier}`, update.nextThresholds] as const),
  );

  return rows.map((row) => {
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

function main() {
  const typedDataset = dataset as CalculatorDataset;
  const typedOutcomes = admissionOutcomes as AdmissionOutcomeDataset;

  const calculatedRows = calculateResults(typedDataset, typedDataset.defaultInput);
  const rowsWithOutcomes = attachAdmissionOutcomes(calculatedRows, typedOutcomes);
  const effectiveComprehensiveRows = getComprehensivePlacementRows(typedDataset);
  const effectiveSchoolRecordRows = getSchoolRecordPlacementRows(typedDataset);

  const comprehensiveBefore = countAbnormalRows(effectiveComprehensiveRows);
  const schoolRecordBefore = countAbnormalRows(effectiveSchoolRecordRows);

  const comprehensiveUpdates = buildAbnormalPlacementAutoFix(
    rowsWithOutcomes,
    effectiveComprehensiveRows,
  );
  const schoolRecordUpdates = buildAbnormalPlacementAutoFix(
    rowsWithOutcomes,
    effectiveSchoolRecordRows,
  );
  const comprehensiveAfter = countAbnormalRows(
    applyUpdates(effectiveComprehensiveRows, comprehensiveUpdates),
  );
  const schoolRecordAfter = countAbnormalRows(
    applyUpdates(effectiveSchoolRecordRows, schoolRecordUpdates),
  );

  console.log(
    JSON.stringify(
      {
        comprehensive: {
          before: comprehensiveBefore,
          after: comprehensiveAfter,
          autoFixTargets: comprehensiveUpdates.length,
          sample: comprehensiveUpdates.slice(0, 10),
        },
        schoolRecord: {
          before: schoolRecordBefore,
          after: schoolRecordAfter,
          autoFixTargets: schoolRecordUpdates.length,
          sample: schoolRecordUpdates.slice(0, 10),
        },
      },
      null,
      2,
    ),
  );
}

main();
