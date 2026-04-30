import { CalculatorPageV2 } from "@/components/calculator/calculator-page-v2";
import admissionOutcomes from "@/src/data/admission-outcomes.json";
import dataset from "@/src/data/calculator-dataset.json";
import deployMeta from "@/src/data/deploy-meta.json";
import type { AdmissionOutcomeDataset, CalculatorDataset } from "@/src/types/calculator";

export default function AdminRoute() {
  return (
    <CalculatorPageV2
      admissionOutcomeDataset={admissionOutcomes as AdmissionOutcomeDataset}
      dataset={dataset as CalculatorDataset}
      deployMeta={deployMeta as { label: string; deployedAt: string; verifiedAt: string }}
      initialAdminOpen
    />
  );
}
