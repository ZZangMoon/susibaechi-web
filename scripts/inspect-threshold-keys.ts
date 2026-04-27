import dataset from "../src/data/calculator-dataset.json";
import {
  getComprehensivePlacementRows,
  getSchoolRecordPlacementRows,
} from "../src/lib/calculation";

const keys = [
  "서울일반사범",
  "서울지균자전공통",
  "연세교과자전공통",
  "연세교과자전인문",
  "연세교과자전자연",
  "연세활동자전공통",
  "연세활동자전인문",
  "연세활동자전자연",
  "고려학업자전공통",
  "고려학업자전인문",
  "고려학업자전자연",
  "서강일반1자전공통",
  "서강일반1자전인문",
  "서강일반1자전자연",
  "서강교과자전공통",
  "서강교과자전인문",
  "서강교과자전자연",
  "중앙교과자전공통",
  "중앙교과자전인문",
  "중앙교과자전자연",
];

const rows = [...getComprehensivePlacementRows(dataset as any), ...getSchoolRecordPlacementRows(dataset as any)];

for (const key of keys) {
  const row = rows.find((item) => item.key === key);
  console.log(`\n## ${key}`);
  console.log(JSON.stringify(row ?? null, null, 2));
}
