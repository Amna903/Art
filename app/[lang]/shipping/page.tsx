import { LegalPage, legalMetadata } from "@/components/legal/LegalPage";

export const generateMetadata = legalMetadata("shipping");

export default function Page({ params }: PageProps<"/[lang]/shipping">) {
  return <LegalPage doc="shipping" params={params} />;
}
