import { notFound } from "next/navigation";
import { isEnabledLocale, isLocale, type Language } from "./config";
import { createTranslator, type Dictionary, type Translator } from "./translate";

const loaders: Record<Exclude<Language, "en">, () => Promise<{ default: Dictionary }>> = {
  fr: () => import("./dictionaries/fr"),
  pt: () => import("./dictionaries/pt"),
  es: () => import("./dictionaries/es"),
  it: () => import("./dictionaries/it"),
};

/** The dictionary for one language. English has none: keys are English. */
export async function getDictionary(lang: Language): Promise<Dictionary> {
  if (lang === "en") return {};
  return (await loaders[lang]()).default;
}

/** Resolves the [lang] route param, 404ing on unknown or disabled languages. */
export function resolveLang(param: string): Language {
  if (!isLocale(param) || !isEnabledLocale(param)) notFound();
  return param;
}

/** Server-component translator: `const t = await getT(lang)`. */
export async function getT(lang: Language): Promise<Translator> {
  return createTranslator(await getDictionary(lang));
}

/** For pages: `const { lang, t } = await getI18n(params)`. */
export async function getI18n(params: Promise<{ lang: string }>): Promise<{ lang: Language; t: Translator }> {
  const lang = resolveLang((await params).lang);
  return { lang, t: await getT(lang) };
}
