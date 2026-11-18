import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export const generateMetadata = legalMetadata("privacy");

export default function Page({ params }: PageProps<"/[lang]/privacy">) {
  return <LegalPage doc="privacy" params={params} />;
}
