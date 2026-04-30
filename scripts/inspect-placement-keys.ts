import dataset from "../src/data/calculator-dataset.json";
import {
  calculateResults,
  getComprehensivePlacementRows,
  getSchoolRecordPlacementRows,
} from "../src/lib/calculation";

const universities = [
  "중앙대학교",
  "서강대학교",
  "서울대학교",
  "연세대학교",
  "고려대학교",
];

const comprehensiveRows = getComprehensivePlacementRows(dataset as any);
const schoolRecordRows = getSchoolRecordPlacementRows(dataset as any);
const results = calculateResults(dataset as any, (dataset as any).defaultInput);

for (const university of universities) {
  console.log(`\n## ${university}`);

  const rows = results.filter((row) => row.university === university);
  const unresolved = rows.filter((row) => row.computedThresholds.fit === null);

  console.log(`total=${rows.length} unresolved=${unresolved.length}`);

  const prefixes = new Set<string>();
  for (const row of rows) {
    if (row.detailTrack) {
      prefixes.add(row.detailTrack);
    }
  }

  console.log("assigned detail tracks:");
  console.log([...prefixes].sort().slice(0, 120).join("\n"));

  const allPlacementKeys = [...comprehensiveRows, ...schoolRecordRows]
    .map((row) => row.key)
    .filter((key) => {
      if (university === "중앙대학교") return key.startsWith("중앙");
      if (university === "서강대학교") return key.startsWith("서강");
      if (university === "서울대학교") return key.startsWith("서울");
      if (university === "연세대학교") return key.startsWith("연세");
      if (university === "고려대학교") return key.startsWith("고려");
      return false;
    });

  console.log("placement keys:");
  console.log([...new Set(allPlacementKeys)].sort().join("\n"));

  console.log("unresolved sample:");
  console.log(
    JSON.stringify(
      unresolved.slice(0, 20).map((row) => ({
        admissionType: row.admissionType,
        admissionName: row.admissionName,
        recruitmentUnit: row.recruitmentUnit,
        track: row.track,
        detailTrack: row.detailTrack,
      })),
      null,
      2,
    ),
  );
}
