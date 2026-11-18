import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export const generateMetadata = legalMetadata("cookies");

export default function Page({ params }: PageProps<"/[lang]/cookies">) {
  return <LegalPage doc="cookies" params={params} />;
}
