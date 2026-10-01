"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV = [
  { href: "/artists", label: "Artists" },
  { href: "/virtual-gallery", label: "Galleries" },
  { href: "/collections", label: "Collections" },
  { href: "/exhibitions", label: "Exhibitions" },
  { href: "/journal", label: "Journal" },
] as const;

function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const scrolled = useScrolled();
  const isHome = pathname === "/";
  const transparent = isHome && !scrolled;

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    setSearchOpen(false);
    setQuery("");
  };

  const shellClass = transparent
    ? "bg-[var(--brand-marfim)]/30 backdrop-blur-xl backdrop-saturate-150 border-b border-[var(--brand-cinza)]/20"
    : "bg-[var(--brand-marfim)]/70 backdrop-blur-xl backdrop-saturate-150 border-b border-[var(--brand-cinza)]/40";

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${shellClass}`}>
      <nav
        className={`w-full px-4 sm:px-6 lg:px-8 max-w-container-max mx-auto transition-all duration-300 ${
          scrolled ? "py-2" : "py-3"
        } flex items-center justify-between gap-4 lg:gap-8`}
      >
        {/* Left — logo */}
        <div className="flex items-center justify-start shrink-0">
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/images/ChatGPT%20Image%20Sep%2028,%202026,%2010_18_38%20PM.png"
              alt="NUA-ARTE"
              width={1103}
              height={1426}
              priority
              className={`w-auto object-contain transition-all duration-300 ${scrolled ? "h-8" : "h-10"}`}
            />
          </Link>
        </div>

        {/* Center — primary nav */}
        <div className="hidden lg:flex items-center justify-center shrink-0 gap-3 xl:gap-6 2xl:gap-8">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                className={
                  "relative whitespace-nowrap font-navigation text-navigation uppercase transition-colors duration-300 " +
                  (active ? "text-secondary" : "text-on-surface hover:text-secondary")
                }
              >
                {t(item.label)}
                {active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-px w-4 bg-secondary" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right — search / lang / auth */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 xl:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setSearchOpen((v) => !v);
            }}
            aria-label={searchOpen ? t("Close search") : t("Search")}
            aria-expanded={searchOpen}
            className="material-symbols-outlined w-10 h-10 flex items-center justify-center text-on-surface hover:text-secondary transition-colors shrink-0"
          >
            {searchOpen ? "close" : "search"}
          </button>

          <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>

          <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
            {user ? (
              <>
                <div className="flex flex-col items-end leading-tight">
                  <Link
                    href="/dashboard"
                    className="font-navigation text-navigation uppercase text-on-surface hover:text-secondary whitespace-nowrap"
                  >
                    {t("Dashboard")}
                  </Link>
                  {role === "admin" ? (
                    <Link
                      href="/admin"
                      className="font-label-caps text-[9px] uppercase tracking-widest text-secondary hover:text-primary"
                    >
                      {t("Admin")}
                    </Link>
                  ) : role ? (
                    <span className="font-label-caps text-[9px] uppercase tracking-widest text-on-surface-variant">
                      {role}
                    </span>
                  ) : null}
                </div>
                <button
                  onClick={() => signOut().then(() => router.push("/"))}
                  className="bg-primary text-on-primary px-3.5 xl:px-4 py-2 font-navigation text-navigation uppercase whitespace-nowrap"
                >
                  {t("Sign out")}
                </button>
              </>
            ) : (
              <Link
                href="/auth"
                className="bg-primary text-on-primary px-3.5 xl:px-5 py-2 font-navigation text-navigation uppercase hover:scale-[0.97] duration-200 transition-transform whitespace-nowrap"
              >
                {t("Join the Circle")}
              </Link>
            )}
          </div>

          <div className="flex lg:hidden shrink-0">
            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setMobileOpen((v) => !v);
              }}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="material-symbols-outlined w-10 h-10 flex items-center justify-center text-on-surface hover:text-secondary transition-colors"
            >
              {mobileOpen ? "close" : "menu"}
            </button>
          </div>
        </div>
      </nav>

      {searchOpen && (
        <div className="border-t border-[var(--brand-cinza)]/30 bg-[var(--brand-marfim)]/95 backdrop-blur-xl">
          <form
            onSubmit={submitSearch}
            className="max-w-container-max mx-auto px-gutter-page py-4 flex items-center gap-3"
          >
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Search artists, countries, artworks…")}
              className="flex-1 bg-transparent border-b border-primary/30 focus:border-secondary outline-none py-2 font-body-md text-lg text-primary placeholder:text-on-surface-variant/40 transition-colors"
            />
            <button
              type="submit"
              className="font-navigation text-navigation uppercase tracking-widest text-secondary hover:text-primary shrink-0"
            >
              {t("Search")}
            </button>
          </form>
        </div>
      )}

      {mobileOpen && (
        <div className="lg:hidden border-t border-[var(--brand-cinza)]/30 bg-[var(--brand-marfim)]/95 backdrop-blur-xl">
          <div className="max-w-container-max mx-auto px-gutter-page py-6 flex flex-col gap-1">
            {NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={
                    "min-h-[44px] flex items-center font-navigation text-navigation uppercase tracking-widest transition-colors " +
                    (active ? "text-secondary" : "text-on-surface hover:text-secondary")
                  }
                >
                  {t(item.label)}
                </Link>
              );
            })}

            <div className="my-4 border-t border-[var(--brand-cinza)]/30" />

            <div className="flex items-center justify-between min-h-[44px]">
              <span className="font-navigation text-navigation uppercase tracking-widest text-on-surface-variant">
                {t("Language")}
              </span>
              <LanguageSwitcher />
            </div>

            <div className="flex items-center justify-between min-h-[44px]">
              <span className="font-navigation text-navigation uppercase tracking-widest text-on-surface-variant">
                {t("Theme")}
              </span>
              <ThemeToggle />
            </div>

            <div className="mt-2 flex flex-col gap-3">
              {user ? (
                <>
                  <div className="flex flex-col">
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="min-h-[44px] flex items-center font-navigation text-navigation uppercase tracking-widest text-on-surface hover:text-secondary"
                    >
                      {t("Dashboard")}
                    </Link>
                    {role === "admin" ? (
                      <Link
                        href="/admin"
                        onClick={() => setMobileOpen(false)}
                        className="min-h-[36px] flex items-center pl-4 font-label-caps text-[10px] uppercase tracking-widest text-secondary hover:text-primary"
                      >
                        {t("Admin")}
                      </Link>
                    ) : role ? (
                      <span className="min-h-[36px] flex items-center pl-4 font-label-caps text-[10px] uppercase tracking-widest text-on-surface-variant">
                        {role}
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      signOut().then(() => router.push("/"));
                    }}
                    className="min-h-[44px] bg-primary text-on-primary px-4 font-navigation text-navigation uppercase tracking-widest"
                  >
                    {t("Sign out")}
                  </button>
                </>
              ) : (
                <Link
                  href="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="min-h-[44px] flex items-center justify-center bg-primary text-on-primary px-5 font-navigation text-navigation uppercase tracking-widest"
                >
                  {t("Join the Circle")}
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
