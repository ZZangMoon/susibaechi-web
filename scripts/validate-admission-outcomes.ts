import dataset from "../src/data/calculator-dataset.json";
import admissionOutcomes from "../src/data/admission-outcomes.json";
import { attachAdmissionOutcomes } from "../src/lib/admission-outcomes";
import { calculateResults } from "../src/lib/calculation";

const targets = [
  "서울대학교",
  "연세대학교",
  "고려대학교",
  "서강대학교",
  "성균관대학교",
  "한양대학교",
  "중앙대학교",
  "경희대학교",
  "서울시립대학교",
  "한국외국어대학교",
  "이화여자대학교",
  "건국대학교",
  "동국대학교",
  "홍익대학교",
  "숙명여자대학교",
];

const calculated = calculateResults(dataset as any, (dataset as any).defaultInput);
const enriched = attachAdmissionOutcomes(calculated as any, admissionOutcomes as any);

for (const university of targets) {
  const rows = enriched.filter((row) => row.university === university);
  const matched = rows.filter((row) => row.admissionOutcomeMatch);
  const unmatched = rows.filter((row) => !row.admissionOutcomeMatch);

  console.log(`\n## ${university} total:${rows.length} matched:${matched.length} unmatched:${unmatched.length}`);
  console.log(
    JSON.stringify(
      unmatched.slice(0, 12).map((row) => ({
        admissionType: row.admissionType,
        admissionName: row.admissionName,
        recruitmentUnit: row.recruitmentUnit,
      })),
      null,
      2,
    ),
  );
}
