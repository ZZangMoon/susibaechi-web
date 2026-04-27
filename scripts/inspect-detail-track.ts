import dataset from "../src/data/calculator-dataset.json";
import { calculateResults } from "../src/lib/calculation";

const targets = [
  "서울대학교",
  "연세대학교",
  "고려대학교",
  "성균관대학교",
  "서강대학교",
  "한양대학교",
  "중앙대학교",
  "서울시립대학교",
  "한국외국어대학교",
  "경희대학교",
  "건국대학교",
  "동국대학교",
  "홍익대학교",
  "숙명여자대학교",
];

const results = calculateResults(dataset as any, (dataset as any).defaultInput);

for (const university of targets) {
  const rows = results.filter((row) => row.university === university);
  const unresolved = rows.filter((row) => !row.detailTrack || row.computedThresholds.fit === null);
  const grouped = new Map<string, number>();

  for (const row of unresolved) {
    const key = `${row.admissionType} / ${row.admissionName}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }

  console.log(`\n## ${university} total:${rows.length} unresolved:${unresolved.length}`);
  for (const [key, count] of [...grouped.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`${count}\t${key}`);
  }
}

const kyungheeSample = results
  .filter(
    (row) =>
      row.university === "경희대학교" &&
      row.admissionType === "학생부종합" &&
      row.admissionName === "네오르네상스전형" &&
      row.computedThresholds.fit === null,
  )
  .slice(0, 20)
  .map((row) => ({
    recruitmentUnit: row.recruitmentUnit,
    detailTrack: row.detailTrack,
    fit: row.computedThresholds.fit,
  }));

console.log("\n## 경희대학교-샘플");
console.log(JSON.stringify(kyungheeSample, null, 2));
