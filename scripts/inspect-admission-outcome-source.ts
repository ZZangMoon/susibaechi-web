import json from "../src/data/admission-outcomes.json";

const targets = ["서강대학교", "이화여자대학교", "한국외국어대학교"];

for (const university of targets) {
  const rows = (json as any).entries.filter((entry: any) => entry.university === university);
  console.log(`\n## ${university} rows=${rows.length}`);
  const samples = rows.slice(0, 20).map((entry: any) => ({
    admissionGroup: entry.admissionGroup,
    admissionName: entry.admissionName,
    recruitmentUnit: entry.recruitmentUnit,
  }));
  console.log(JSON.stringify(samples, null, 2));
}
