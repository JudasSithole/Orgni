import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Menu,
  X,
  ChevronDown,
  ArrowRight,
  Bot,
  Book,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LOGIN_URL } from "@/lib/links";

type NavItem = {
  title: string;
  href: string;
  match?: string[];
  external?: boolean;
  dropdown?: Array<{
    title: string;
    href: string;
    icon: LucideIcon;
    desc: string;
  }>;
};

const navItems: NavItem[] = [
  {
    title: "Product",
    href: "/infrastructure",
    match: ["/infrastructure"],
  },
  {
    title: "Use cases",
    href: "/use-cases",
    match: ["/use-cases"],
  },
  {
    title: "Research",
    href: "/research",
    match: ["/research", "/thesis"],
  },
  {
    title: "Developers",
    href: "/developers",
    match: ["/developers", "/docs", "/api-reference", "/agents"],
    dropdown: [
      {
        title: "Agents",
        href: "/developers",
        icon: Bot,
        desc: "Power your agent with Orgni: API, MCP and SDK quickstart.",
      },
      {
        title: "Documentation",
        href: "/docs",
        icon: Book,
        desc: "Guides, core concepts, and integration walkthroughs.",
      },
    ],
  },
];

export function SiteHeader({ dark }: { dark?: boolean }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [location] = useLocation();

  const closeMobile = () => setMobileOpen(false);

  useEffect(() => {
    setMobileOpen(false);
    setActiveDropdown(null);
  }, [location]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isItemActive = (item: NavItem) => {
    if (location === item.href) return true;
    if (item.match?.some((path: string) => location.startsWith(path)))
      return true;
    return false;
  };

  const headerHeightClass = "h-[72px]";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-300 ${
        dark ? "dark" : ""
      } bg-background/95 backdrop-blur-xl border-border ${
        scrolled || mobileOpen ? "shadow-sm" : ""
      }`}
    >
      <div
        className={`mx-auto flex max-w-[1600px] items-center justify-between border-x border-border px-5 transition-all duration-300 lg:px-8 ${headerHeightClass}`}
        onMouseLeave={() => setActiveDropdown(null)}
      >
        {/* Left side: Logo & Nav */}
        <div className="flex items-center h-full">
          {/* Logo area */}
          <Link
            href="/"
            className="group relative z-50 flex items-center gap-3"
          >
            <span className="flex h-9 w-9 items-center justify-center bg-foreground">
              <img
                src={`${import.meta.env.BASE_URL}orgni-logo.png`}
                alt="Orgni logo"
                className="h-6 w-6 object-cover"
              />
            </span>
            <span className="font-serif text-[28px] leading-none text-foreground transition-colors duration-300 group-hover:text-primary">
              Orgni
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="ml-12 hidden h-full items-center gap-7 lg:flex">
            {navItems.map((item) => {
              const active = isItemActive(item);
              const isHovered = activeDropdown === item.title;

              return (
                <div
                  key={item.title}
                  className="relative h-full flex items-center"
                  onMouseEnter={() => setActiveDropdown(item.title)}
                  onFocus={() =>
                    item.dropdown
                      ? setActiveDropdown(item.title)
                      : setActiveDropdown(null)
                  }
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setActiveDropdown(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setActiveDropdown(null);
                  }}
                >
                  {"external" in item && item.external ? (
                    <a
                      href={item.href}
                      className={`flex h-full items-center gap-1.5 px-1 font-mono text-[11px] font-bold uppercase transition-colors ${
                        isHovered
                          ? "text-foreground"
                          : "text-foreground/70 hover:text-foreground"
                      }`}
                    >
                      {item.title}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      className={`flex h-full items-center gap-1.5 px-1 font-mono text-[11px] font-bold uppercase transition-colors ${
                        active || isHovered
                          ? "text-foreground"
                          : "text-foreground/70 hover:text-foreground"
                      }`}
                      aria-expanded={item.dropdown ? isHovered : undefined}
                      aria-haspopup={item.dropdown ? "menu" : undefined}
                    >
                      {item.title}
                      {item.dropdown && (
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform duration-300 ${isHovered ? "rotate-180 text-foreground" : "text-foreground/40"}`}
                        />
                      )}
                    </Link>
                  )}
                  <span
                    className={`pointer-events-none absolute bottom-0 left-1 right-1 h-0.5 origin-center bg-primary transition-all duration-300 ${
                      active || isHovered
                        ? "scale-x-100 opacity-100"
                        : "scale-x-0 opacity-0"
                    }`}
                    aria-hidden="true"
                  />

                  <AnimatePresence>
                    {item.dropdown && isHovered && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.99 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full left-0 pt-0"
                      >
                        <div className="relative flex w-[380px] flex-col overflow-hidden border border-border bg-card/95 p-2 shadow-2xl backdrop-blur-2xl">
                          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-foreground/10 to-transparent" />

                          {item.dropdown.map((dropItem) => (
                            <Link
                              key={dropItem.href}
                              href={dropItem.href}
                              className="group relative flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors z-10"
                              onClick={() => setActiveDropdown(null)}
                            >
                              <div className="w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center shrink-0 mt-0.5">
                                <dropItem.icon
                                  className="h-4 w-4 text-foreground/70 group-hover:text-foreground transition-colors"
                                  aria-hidden="true"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-[15px] font-semibold tracking-wide text-foreground group-hover:text-primary transition-colors">
                                  {dropItem.title}
                                  <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ease-out" />
                                </div>
                                <p className="text-[13px] text-muted-foreground leading-relaxed">
                                  {dropItem.desc}
                                </p>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Right side: Actions */}
        <div className="relative z-50 flex h-full items-center gap-3 lg:gap-4">
          <Button
            asChild
            className="hidden h-10 rounded-none bg-primary px-5 font-mono text-[11px] font-bold uppercase text-primary-foreground shadow-none transition-colors hover:bg-foreground lg:inline-flex"
          >
            <a href={LOGIN_URL}>Request demo</a>
          </Button>

          {/* Mobile menu toggle */}
          <button
            type="button"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center border border-border text-foreground/70 transition-colors hover:border-foreground hover:text-foreground lg:hidden"
          >
            <motion.div
              animate={{ rotate: mobileOpen ? 90 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {mobileOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </motion.div>
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 top-[64px] z-40 bg-background/95 backdrop-blur-xl border-t border-border flex flex-col overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-8 flex flex-col gap-0">
              {navItems.map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.05,
                    duration: 0.3,
                    ease: "easeOut",
                  }}
                  className="flex flex-col border-b border-border py-5 last:border-0"
                >
                  {"external" in item && item.external ? (
                    <a
                      href={item.href}
                      onClick={closeMobile}
                      className="text-xl font-semibold tracking-wide text-foreground hover:text-primary transition-colors flex items-center justify-between group"
                    >
                      {item.title}
                      <ArrowRight className="h-5 w-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      onClick={closeMobile}
                      className="text-xl font-semibold tracking-wide text-foreground hover:text-primary transition-colors flex items-center justify-between group"
                    >
                      {item.title}
                      <ArrowRight className="h-5 w-5 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                    </Link>
                  )}
                  {item.dropdown && (
                    <div className="mt-5 flex flex-col gap-4 pl-4 border-l-2 border-border">
                      {item.dropdown.map((drop) => (
                        <Link
                          key={drop.href}
                          href={drop.href}
                          onClick={closeMobile}
                          className="flex items-center gap-2.5 text-[15px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <drop.icon
                            className="h-4 w-4 text-muted-foreground"
                            aria-hidden="true"
                          />
                          {drop.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="p-6 border-t border-border bg-muted/30 pb-8"
            >
              <Button
                asChild
                className="w-full h-12 text-[15px] font-semibold tracking-wide bg-foreground text-background hover:bg-primary hover:text-primary-foreground shadow-none rounded-md transition-all duration-300"
              >
                <a href={LOGIN_URL}>Request a Demo</a>
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
