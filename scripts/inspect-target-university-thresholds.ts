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
import type {
  AdmissionOutcomeDataset,
  CalculatorDataset,
  CalculatedAdmissionRow,
  ThresholdSet,
} from "@/src/types/calculator";

const TARGET_UNIVERSITIES = [
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
] as const;

function isAbnormalThreshold(thresholds: ThresholdSet) {
  if (
    thresholds.reach === null ||
    thresholds.fit === null ||
    thresholds.safe === null ||
    thresholds.reach < 1 ||
    thresholds.fit < 1 ||
    thresholds.safe < 1
  ) {
    return true;
  }

  return thresholds.safe > thresholds.fit || thresholds.fit > thresholds.reach;
}

function summarize(rows: CalculatedAdmissionRow[]) {
  return TARGET_UNIVERSITIES.map((university) => {
    const universityRows = rows.filter((row) => row.university === university);
    const abnormalRows = universityRows.filter((row) => isAbnormalThreshold(row.computedThresholds));
    const comprehensiveRows = abnormalRows.filter((row) => row.admissionType === "학생부종합");
    const schoolRecordRows = abnormalRows.filter((row) => row.admissionType === "학생부교과");

    return {
      university,
      total: universityRows.length,
      abnormal: abnormalRows.length,
      comprehensive: comprehensiveRows.length,
      schoolRecord: schoolRecordRows.length,
      sample: abnormalRows.slice(0, 8).map((row) => ({
        admissionType: row.admissionType,
        admissionName: row.admissionName,
        recruitmentUnit: row.recruitmentUnit,
        detailTrack: row.detailTrack,
        thresholds: row.computedThresholds,
      })),
    };
  });
}

function main() {
  const typedDataset = dataset as CalculatorDataset;
  const typedOutcomes = admissionOutcomes as AdmissionOutcomeDataset;

  const previewRows = calculateResults(typedDataset, typedDataset.defaultInput);
  const previewRowsWithOutcomes = attachAdmissionOutcomes(previewRows, typedOutcomes);
  const effectiveComprehensiveRows = getComprehensivePlacementRows(typedDataset);
  const effectiveSchoolRecordRows = getSchoolRecordPlacementRows(typedDataset);
  const comprehensiveUpdates = buildAbnormalPlacementAutoFix(
    previewRowsWithOutcomes,
    effectiveComprehensiveRows,
  );
  const schoolRecordUpdates = buildAbnormalPlacementAutoFix(
    previewRowsWithOutcomes,
    effectiveSchoolRecordRows,
  );

  const normalizedDataset: CalculatorDataset = {
    ...typedDataset,
    comprehensivePlacementTable: applyPlacementAutoFixUpdates(
      effectiveComprehensiveRows,
      comprehensiveUpdates,
    ),
    schoolRecordPlacementTable: applyPlacementAutoFixUpdates(
      effectiveSchoolRecordRows,
      schoolRecordUpdates,
    ),
  };

  const finalRows = calculateResults(normalizedDataset, normalizedDataset.defaultInput);
  const finalRowsWithOutcomes = applyOutcomeAverageThresholdOverrides(
    attachAdmissionOutcomes(finalRows, typedOutcomes),
  );

  console.log(JSON.stringify(summarize(finalRowsWithOutcomes), null, 2));
}

main();
