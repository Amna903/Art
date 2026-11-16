import type { ComponentProps, ReactNode } from "react";
import Link from "@/components/i18n/Link";

/**
 * The one button for the whole site. Every call to action, form submit and
 * admin action uses this, so they share shape, type, spacing and states.
 *
 * - variant "primary": solid charcoal, turns red on hover (default)
 * - variant "accent":  solid NUA red, for the single most important action
 * - variant "secondary": outlined, for the alternative next to a primary
 * - variant "inverse": outlined in white, for dark or photographic backgrounds
 * - size "md" (default, 48px tall, page CTAs) or "sm" (40px, toolbars/admin)
 *
 * Pass `href` to render a link that looks like a button; internal paths go
 * through the language-aware Link, "#anchors" and full URLs stay plain <a>.
 */
export type ButtonVariant = "primary" | "outline" | "accent" | "secondary" | "inverse";
export type ButtonSize = "sm" | "md";

// These reproduce the two button styles the site already had, so moving a
// button onto this component does not change how it looks:
// - label style (primary, outline): uppercase navigation type, wide tracking
// - call-to-action style (accent, secondary, inverse): sentence case at body
//   size on page CTAs, small uppercase in compact (sm) admin/editor toolbars
const BASE =
  "inline-flex items-center justify-center gap-2 text-center transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-50";

const LABEL = "font-navigation text-navigation uppercase tracking-widest";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: `${LABEL} bg-primary text-on-primary hover:bg-secondary`,
  outline: `${LABEL} border border-primary hover:bg-primary hover:text-beige`,
  accent: "btn-primary font-semibold",
  secondary: "btn-secondary",
  inverse:
    "border border-[var(--nua-white)]/85 text-[var(--nua-white)] hover:bg-[var(--nua-white)] hover:text-[var(--nua-charcoal)]",
};

const CTA_TYPE: Record<ButtonSize, string> = {
  md: "text-base",
  sm: "text-xs uppercase tracking-[0.2em]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-5 py-2",
  md: "min-h-[48px] px-8 py-2",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  full = false,
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; className?: string } = {}) {
  const cta = variant === "accent" || variant === "secondary" || variant === "inverse";
  return [BASE, VARIANTS[variant], cta ? CTA_TYPE[size] : "", SIZES[size], full ? "w-full" : "", className]
    .filter(Boolean)
    .join(" ");
}

type Common = { variant?: ButtonVariant; size?: ButtonSize; full?: boolean; className?: string; children: ReactNode };
type AsButton = Common & Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };
type AsLink = Common & Omit<ComponentProps<"a">, "className" | "children" | "href"> & { href: string };

export function Button(props: AsButton | AsLink) {
  const { variant, size, full, className, children, ...rest } = props;
  const cls = buttonClass({ variant, size, full, className });
  if (rest.href !== undefined) {
    const { href, ...anchor } = rest as AsLink;
    if (href.startsWith("#") || /^[a-z]+:/i.test(href)) {
      return (
        <a href={href} className={cls} {...anchor}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls} {...(anchor as Omit<ComponentProps<typeof Link>, "href">)}>
        {children}
      </Link>
    );
  }
  const { type = "button", ...button } = rest as AsButton;
  return (
    <button type={type} className={cls} {...button}>
      {children}
    </button>
  );
}
