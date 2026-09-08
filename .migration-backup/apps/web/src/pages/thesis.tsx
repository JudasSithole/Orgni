import { useEffect, useState } from "react";
import { motion, useScroll, useSpring, useReducedMotion } from "framer-motion";
import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { thesisData } from "@/data/thesis";
import { List, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Figure1,
  Figure2,
  Table1,
  Table2,
  FormulaAttention,
  FormulaMoE,
  FormulaConfidence,
} from "@/components/thesis-assets";

function parseText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderContent(content: string[]) {
  const elements: React.ReactNode[] = [];
  let currentList: string[] | null = null;
  let inCode = false;
  let codeLines: string[] = [];

  const flushList = (key: string | number) => {
    if (currentList) {
      elements.push(
        <ul key={`list-${key}`} className="my-8 space-y-3 pl-2 md:pl-4">
          {currentList.map((item, j) => (
            <li key={j} className="flex items-start">
              <span className="text-primary mr-4 mt-2.5 h-1.5 w-1.5 rounded-none shrink-0 bg-primary"></span>
              <span className="text-foreground/90">{parseText(item)}</span>
            </li>
          ))}
        </ul>,
      );
      currentList = null;
    }
  };

  for (let i = 0; i < content.length; i++) {
    const line = content[i];

    if (line === "```") {
      if (inCode) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="my-8 p-6 bg-muted/50 border border-border rounded-none font-mono text-sm md:text-base leading-relaxed text-foreground/90 overflow-x-auto whitespace-pre"
          >
            {codeLines.join("\n")}
          </pre>,
        );
        codeLines = [];
        inCode = false;
      } else {
        flushList(i);
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("* ")) {
      if (!currentList) currentList = [];
      currentList.push(line.slice(2));
    } else {
      if (currentList) {
        elements.push(
          <ul key={`list-${i}`} className="my-8 space-y-3 pl-2 md:pl-4">
            {currentList.map((item, j) => (
              <li key={j} className="flex items-start">
                <span className="text-primary mr-4 mt-2.5 h-1.5 w-1.5 rounded-none shrink-0 bg-primary"></span>
                <span className="text-foreground/90">{parseText(item)}</span>
              </li>
            ))}
          </ul>,
        );
        currentList = null;
      }

      if (!line) {
        continue;
      }

      if (line === "{{FIGURE_1}}") {
        elements.push(<Figure1 key={`fig1-${i}`} />);
      } else if (line === "{{FIGURE_2}}") {
        elements.push(<Figure2 key={`fig2-${i}`} />);
      } else if (line === "{{TABLE_1}}") {
        elements.push(<Table1 key={`tab1-${i}`} />);
      } else if (line === "{{TABLE_2}}") {
        elements.push(<Table2 key={`tab2-${i}`} />);
      } else if (line === "{{FORMULA_ATTENTION}}") {
        elements.push(<FormulaAttention key={`form-att-${i}`} />);
      } else if (line === "{{FORMULA_MOE}}") {
        elements.push(<FormulaMoE key={`form-moe-${i}`} />);
      } else if (line === "{{FORMULA_CONFIDENCE}}") {
        elements.push(<FormulaConfidence key={`form-conf-${i}`} />);
      } else if (line.startsWith("### ")) {
        const text = line.slice(4);
        const subId = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        elements.push(
          <h3
            id={subId}
            key={`h3-${i}`}
            className="text-2xl md:text-3xl font-serif mt-16 mb-6 text-foreground scroll-mt-32"
          >
            {text}
          </h3>,
        );
      } else if (line.startsWith("> ")) {
        elements.push(
          <blockquote
            key={`bq-${i}`}
            className="border-l-2 border-primary pl-6 md:pl-8 py-2 my-10 text-xl md:text-2xl font-serif italic text-foreground/90 bg-primary/5"
          >
            {parseText(line.slice(2))}
          </blockquote>,
        );
      } else {
        elements.push(
          <p key={`p-${i}`} className="mb-6 text-foreground/90">
            {parseText(line)}
          </p>,
        );
      }
    }
  }

  if (currentList) {
    elements.push(
      <ul key={`list-end`} className="my-8 space-y-3 pl-2 md:pl-4">
        {currentList.map((item, j) => (
          <li key={j} className="flex items-start">
            <span className="text-primary mr-4 mt-2.5 h-1.5 w-1.5 rounded-none shrink-0 bg-primary"></span>
            <span className="text-foreground/90">{parseText(item)}</span>
          </li>
        ))}
      </ul>,
    );
  }

  return elements;
}

export default function Thesis() {
  useSeo({
    title: `${thesisData.title} - Olyxee`,
    description: thesisData.subtitle,
    path: "/thesis",
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ScholarlyArticle",
      headline: thesisData.title,
      description: thesisData.subtitle,
      author: [
        {
          "@type": "Person",
          name: "Lethabo Scofield",
          jobTitle: "Research Scientist",
        },
        {
          "@type": "Person",
          name: "Alisha Fatima",
          jobTitle: "Founding AI Infrastructure Engineer",
        },
        {
          "@type": "Person",
          name: "Mosa Maseko",
          jobTitle: "Founding Data Engineer",
        },
        {
          "@type": "Person",
          name: "Emmanuel Stakio",
          jobTitle: "Theoretical Research Scientist",
        },
      ],
      publisher: {
        "@type": "Organization",
        name: "Olyxee",
        url: "https://www.olyxee.com",
      },
      about: [
        "business context",
        "AI execution",
        "organizational intelligence",
      ],
      url: "https://orgni.com/thesis",
      isPartOf: { "@type": "WebSite", name: "Orgni", url: "https://orgni.com" },
    },
  });

  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const [activeSection, setActiveSection] = useState("");
  const [tocOpen, setTocOpen] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top,
          );
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-10% 0px -80% 0px" },
    );

    const observeEl = (id: string) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    };

    observeEl("abstract");
    thesisData.sections.forEach((s) => {
      observeEl(s.id);
      s.content
        .filter((line) => line.startsWith("### "))
        .forEach((line) => {
          const text = line.slice(4);
          const subId = text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
          observeEl(subId);
        });
    });
    observeEl("references");

    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({
        top: y,
        behavior: shouldReduceMotion ? "auto" : "smooth",
      });
      setTocOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      {/* Progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-primary origin-left z-50"
        style={{ scaleX: shouldReduceMotion ? scrollYProgress : scaleX }}
      />

      <SiteHeader />

      {/* Hero Header */}
      <header className="pt-24 pb-16 md:pt-40 md:pb-24 px-6 md:px-12 max-w-[1600px] mx-auto border-b border-border">
        <div className="max-w-4xl">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-[1px] w-12 bg-primary"></div>
            <p className="text-xs font-mono tracking-widest uppercase text-primary">
              The research paper
            </p>
          </div>

          <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-serif leading-[1.05] tracking-tight mb-8 text-foreground">
            {thesisData.title}
          </h1>
          <p className="text-xl md:text-3xl text-muted-foreground leading-snug font-light max-w-3xl">
            {thesisData.subtitle}
          </p>
          <div className="mt-16 pt-12 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
            <div className="flex flex-col gap-2">
              <span className="font-serif text-2xl text-foreground">
                Lethabo Scofield
              </span>
              <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase leading-relaxed">
                Research Scientist
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-serif text-2xl text-foreground">
                Alisha Fatima
              </span>
              <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase leading-relaxed">
                Founding AI
                <br />
                Infrastructure Engineer
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-serif text-2xl text-foreground">
                Mosa Maseko
              </span>
              <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase leading-relaxed">
                Founding Data Engineer
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-serif text-2xl text-foreground">
                Emmanuel Stakio
              </span>
              <span className="text-xs font-mono text-muted-foreground tracking-widest uppercase leading-relaxed">
                Theoretical Research Scientist
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] px-6 md:px-12 mx-auto py-16 md:py-32 relative flex flex-col lg:flex-row gap-12 lg:gap-24">
        {/* Mobile TOC Toggle */}
        <button
          onClick={() => setTocOpen(true)}
          className="lg:hidden sticky top-[88px] z-40 bg-background/90 backdrop-blur border border-border px-4 py-4 rounded-none flex items-center justify-between w-full font-mono text-sm uppercase tracking-wider"
        >
          <span>Table of Contents</span>
          <List className="w-4 h-4" />
        </button>

        {/* Desktop / Mobile TOC */}
        <aside
          className={`
          fixed inset-0 z-50 bg-background/95 backdrop-blur-xl p-6 overflow-y-auto transition-transform duration-300
          lg:static lg:block lg:w-1/4 lg:max-w-[280px] lg:h-[calc(100vh-8rem)] lg:sticky lg:top-32 lg:bg-transparent lg:p-0 lg:z-0 lg:overflow-y-auto lg:scrollbar-none lg:translate-x-0
          ${tocOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
        >
          <div className="flex justify-between items-center lg:hidden mb-12">
            <span className="font-mono font-bold tracking-widest uppercase text-sm">
              Contents
            </span>
            <button
              onClick={() => setTocOpen(false)}
              className="p-3 border border-border rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="flex flex-col gap-5 font-mono text-xs pb-12 lg:pb-0 tracking-widest uppercase">
            <button
              onClick={() => scrollTo("abstract")}
              className={`text-left transition-colors py-1 ${activeSection === "abstract" || activeSection === "" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              Abstract
            </button>
            {thesisData.sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`text-left transition-colors py-1 leading-relaxed ${activeSection === s.id ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {s.title}
              </button>
            ))}
            {thesisData.references.length > 0 && (
              <button
                onClick={() => scrollTo("references")}
                className={`text-left transition-colors py-1 ${activeSection === "references" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                References
              </button>
            )}
          </nav>
        </aside>

        {/* Content */}
        <main className="w-full lg:w-3/4 max-w-[70ch] pb-32">
          <section id="abstract" className="mb-32 scroll-mt-32">
            <div className="mb-8 flex items-center gap-4 border-b border-border pb-4">
              <div className="h-[1px] w-8 bg-primary"></div>
              <h2 className="text-xs font-mono tracking-widest uppercase text-primary">
                Abstract
              </h2>
            </div>
            <div className="text-xl md:text-[1.65rem] leading-snug font-serif text-foreground">
              {renderContent(thesisData.abstract)}
            </div>
          </section>

          {thesisData.sections.map((s) => (
            <section key={s.id} id={s.id} className="mb-32 scroll-mt-32">
              <h2 className="text-3xl md:text-5xl font-serif leading-tight tracking-tight mb-8 text-foreground pb-6 border-b border-border">
                {s.title}
              </h2>
              <div className="text-lg md:text-xl leading-relaxed text-foreground">
                {renderContent(s.content)}
              </div>
            </section>
          ))}

          {thesisData.references.length > 0 && (
            <section
              id="references"
              className="mb-32 scroll-mt-32 pt-16 border-t border-border"
            >
              <h2 className="text-2xl md:text-3xl font-serif tracking-tight mb-10 text-foreground">
                References
              </h2>
              <div className="text-sm leading-relaxed text-muted-foreground space-y-6">
                {thesisData.references.map((r, i) => (
                  <p key={i} id={`ref-${i + 1}`} className="pl-6 relative">
                    <span className="absolute left-0 top-0 font-mono text-xs">
                      {i + 1}.
                    </span>
                    {parseText(r)}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* CTA Footer */}
          <div className="mt-32 pt-16 border-t border-border flex flex-col items-start bg-muted/30 p-8 md:p-16 rounded-none border-l-2 border-l-primary">
            <h2 className="text-3xl md:text-4xl font-serif mb-6 text-foreground tracking-tight">
              Give your AI the context it needs.
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-xl font-light">
              Orgni continuously learns how your organisation operates,
              preserving your operational memory and making it available via
              API.
            </p>
            <Button
              asChild
              size="lg"
              className="h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground text-base font-medium rounded-md shadow-none transition-all group"
            >
              <a href="https://www.olyxee.com/signup?tool=api">
                Request access
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
