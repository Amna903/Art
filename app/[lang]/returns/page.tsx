import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export const generateMetadata = legalMetadata("returns");

export default function Page({ params }: PageProps<"/[lang]/returns">) {
  return <LegalPage doc="returns" params={params} />;
}
