import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export const generateMetadata = legalMetadata("terms");

export default function Page({ params }: PageProps<"/[lang]/terms">) {
  return <LegalPage doc="terms" params={params} />;
}
