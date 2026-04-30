import admissionOutcomes from "@/src/data/admission-outcomes.json";
import dataset from "@/src/data/calculator-dataset.json";
import {
  applyPlacementAutoFixUpdates,
  applyOutcomeAverageThresholdOverrides,
  attachAdmissionOutcomes,
  buildAbnormalPlacementAutoFix,
} from "@/src/lib/admission-outcomes";
import {
  calculateResults,
  getComprehensivePlacementRows,
  getSchoolRecordPlacementRows,
} from "@/src/lib/calculation";
import type { AdmissionOutcomeDataset, CalculatorDataset } from "@/src/types/calculator";

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function main() {
  const typedDataset = dataset as CalculatorDataset;
  const typedOutcomes = admissionOutcomes as AdmissionOutcomeDataset;
  const effectiveComprehensiveRows = getComprehensivePlacementRows(typedDataset);
  const effectiveSchoolRecordRows = getSchoolRecordPlacementRows(typedDataset);
  const previewRows = calculateResults(typedDataset, typedDataset.defaultInput);
  const previewRowsWithOutcomes = attachAdmissionOutcomes(previewRows, typedOutcomes);

  const normalizedDataset: CalculatorDataset = {
    ...typedDataset,
    comprehensivePlacementTable: applyPlacementAutoFixUpdates(
      effectiveComprehensiveRows,
      buildAbnormalPlacementAutoFix(previewRowsWithOutcomes, effectiveComprehensiveRows),
    ),
    schoolRecordPlacementTable: applyPlacementAutoFixUpdates(
      effectiveSchoolRecordRows,
      buildAbnormalPlacementAutoFix(previewRowsWithOutcomes, effectiveSchoolRecordRows),
    ),
  };

  const rows = applyOutcomeAverageThresholdOverrides(
    attachAdmissionOutcomes(
      calculateResults(normalizedDataset, normalizedDataset.defaultInput),
      typedOutcomes,
    ),
  );

  const sample = rows
    .filter(
      (row) =>
        row.university === "경희대학교" &&
        row.admissionType === "학생부종합" &&
        row.admissionName?.includes("네오르네상스"),
    )
    .slice(0, 12)
    .map((row) => {
      const p70Values = [
        row.admissionOutcomeMatch?.entry.year25.p70,
        row.admissionOutcomeMatch?.entry.year24.p70,
      ].filter((value): value is number => typeof value === "number");

      return {
        recruitmentUnit: row.recruitmentUnit,
        detailTrack: row.detailTrack,
        average70: average(p70Values),
        year25p70: row.admissionOutcomeMatch?.entry.year25.p70 ?? null,
        year24p70: row.admissionOutcomeMatch?.entry.year24.p70 ?? null,
        thresholds: row.computedThresholds,
      };
    });

  console.log(JSON.stringify(sample, null, 2));
}

main();
