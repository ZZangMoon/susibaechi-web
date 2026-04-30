import dataset from '../src/data/calculator-dataset.json';
import { calculateResults } from '../src/lib/calculation';
const results = calculateResults(dataset as any, (dataset as any).defaultInput);
const targets = ['중앙대학교','서강대학교','서울대학교','연세대학교'];
for (const university of targets) {
  console.log(`\n## ${university}`);
  const rows = results.filter((row) => row.university === university && row.computedThresholds.fit === null).slice(0, 25).map((row) => ({
    admissionType: row.admissionType,
    admissionName: row.admissionName,
    recruitmentUnit: row.recruitmentUnit,
    track: row.track,
    detailTrack: row.detailTrack,
  }));
  console.log(JSON.stringify(rows, null, 2));
}
