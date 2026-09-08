import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CONTACT_URL, LOGIN_URL } from "@/lib/links";

type NavItem = {
  title: string;
  href: string;
  match?: string[];
  external?: boolean;
};

const navItems: NavItem[] = [
  {
    title: "Use cases",
    href: "/use-cases",
    match: ["/use-cases"],
  },
  {
    title: "Contact",
    href: CONTACT_URL,
    match: [CONTACT_URL],
  },
];

const linkBase =
  "inline-flex h-9 items-center rounded-full px-4 text-sm font-medium transition-colors";

export function SiteHeader({ dark }: { dark?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isItemActive = (item: NavItem) =>
    location === item.href ||
    (item.match?.some((path) => location.startsWith(path)) ?? false);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        dark ? "dark" : ""
      } ${
        scrolled || mobileOpen
          ? "border-b border-border bg-background/90 shadow-[0_1px_0_0_hsl(var(--border))] backdrop-blur-xl"
          : "border-b border-transparent bg-background/70 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-10">
          <Link href="/" className="group flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}orgni-mark.png`}
              alt="Orgni logo"
              className="h-8 w-8 object-contain"
            />
            <span className="font-serif text-2xl leading-none text-foreground">
              Orgni
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = isItemActive(item);
              const cls = `${linkBase} ${
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`;
              return item.external ? (
                <a key={item.title} href={item.href} className={cls}>
                  {item.title}
                </a>
              ) : (
                <Link key={item.title} href={item.href} className={cls}>
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={LOGIN_URL}
            className="hidden h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-primary lg:inline-flex"
          >
            Request demo
            <ArrowUpRight className="h-4 w-4" />
          </a>

          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 top-[72px] z-40 flex flex-col bg-background lg:hidden"
          >
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-6 py-6">
              {navItems.map((item) => {
                const cls =
                  "flex items-center justify-between rounded-xl px-4 py-4 text-lg font-medium text-foreground transition-colors hover:bg-muted";
                return item.external ? (
                  <a key={item.title} href={item.href} onClick={closeMobile} className={cls}>
                    {item.title}
                    <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                  </a>
                ) : (
                  <Link key={item.title} href={item.href} onClick={closeMobile} className={cls}>
                    {item.title}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-border p-6">
              <a
                href={LOGIN_URL}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-foreground text-sm font-medium text-background transition-colors hover:bg-primary"
              >
                Request demo
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
