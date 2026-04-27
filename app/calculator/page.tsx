import { CalculatorPage } from "@/components/calculator/calculator-page";
import dataset from "@/src/data/calculator-dataset.json";
import deployMeta from "@/src/data/deploy-meta.json";
import type { CalculatorDataset } from "@/src/types/calculator";

export default function CalculatorRoute() {
  return (
    <CalculatorPage
      dataset={dataset as CalculatorDataset}
      deployMeta={deployMeta as { label: string; deployedAt: string; verifiedAt: string }}
    />
  );
}
