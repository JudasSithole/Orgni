import { Link } from "wouter";
import { Linkedin } from "lucide-react";
import {
  CONTACT_EMAIL,
  CONTACT_URL,
  LINKEDIN_URL,
  LOGIN_URL,
} from "@/lib/links";

const linkClass =
  "text-sm text-neutral-400 transition-colors hover:text-white";

const columns = [
  {
    heading: "Product",
    links: [
      { label: "Use cases", href: "/use-cases" },
      { label: "Documentation", href: "/docs" },
      { label: "Sign in", href: LOGIN_URL },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Pricing", href: "https://www.olyxee.com/pricing", external: true },
      { label: "About Olyxee", href: "https://olyxee.com", external: true },
      { label: "Contact", href: CONTACT_URL },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="dark bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 pb-8 pt-16 md:pt-20">
        <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}orgni-mark.png`}
                alt="Orgni logo"
                className="h-8 w-8 object-contain"
              />
              <span className="font-serif text-2xl leading-none">Orgni</span>
            </Link>
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-neutral-400">
              Operational intelligence for businesses in motion. Built by
              Olyxee.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              <a href={`mailto:${CONTACT_EMAIL}`} className={linkClass}>
                {CONTACT_EMAIL}
              </a>
              <a
                href={LINKEDIN_URL}
                target="_blank"
                rel="noreferrer"
                className={`${linkClass} inline-flex items-center gap-1.5`}
              >
                <Linkedin className="h-3.5 w-3.5" />
                LinkedIn
              </a>
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.heading}>
              <h3 className="mb-5 text-sm font-medium">{column.heading}</h3>
              <ul className="space-y-3">
                {column.links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a href={link.href} className={linkClass}>
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className={linkClass}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-neutral-500 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} Olyxee Ltd. All rights reserved.</p>
          <div className="flex gap-6">
            <a
              href="https://www.olyxee.com/privacy"
              className="transition-colors hover:text-white"
            >
              Privacy policy
            </a>
            <a
              href="https://www.olyxee.com/terms"
              className="transition-colors hover:text-white"
            >
              Terms of service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
