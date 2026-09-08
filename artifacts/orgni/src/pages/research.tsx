import { ArrowUpRight, FileText } from "lucide-react";
import { Link } from "wouter";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { thesisData } from "@/data/thesis";
import { useSeo } from "@/hooks/use-seo";

const authors = [
  { name: "Lethabo Scofield", role: "Research Scientist" },
  { name: "Alisha Fatima", role: "AI Infrastructure" },
  { name: "Mosa Maseko", role: "Data Engineering" },
  { name: "Emmanuel Stakio", role: "Theoretical Research" },
];

export default function Research() {
  useSeo({
    title: "Research - Orgni",
    description:
      "Research on organisational intelligence, verified context, and reliable infrastructure for AI systems.",
    path: "/research",
    type: "article",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Orgni Research",
      description:
        "Research on organisational intelligence and the infrastructure AI systems need to operate reliably.",
      url: "https://orgni.com/research",
      mainEntity: {
        "@type": "ScholarlyArticle",
        headline: thesisData.title,
        description: thesisData.subtitle,
        url: "https://orgni.com/thesis",
        author: authors.map((author) => ({
          "@type": "Person",
          name: author.name,
          jobTitle: author.role,
        })),
      },
    },
  });

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1 pt-[72px]">
        <section className="orgni-grid border-b border-border">
          <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
            <div className="hidden border-r border-border p-8 lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
              <span className="orgni-index">ORG / R-01</span>
              <span className="font-serif text-7xl leading-none text-primary">
                R
              </span>
            </div>

            <div className="px-6 py-20 md:px-12 md:py-28 lg:col-span-7 lg:py-32">
              <p className="orgni-kicker mb-10">Research programme</p>
              <h1 className="max-w-4xl font-serif text-5xl leading-[0.98] md:text-7xl lg:text-8xl">
                Systems that know,
                <br />
                not guess.
              </h1>
            </div>

            <aside className="flex flex-col justify-end border-t border-border bg-background/90 p-6 md:p-10 lg:col-span-3 lg:border-l lg:border-t-0">
              <p className="orgni-index mb-4">Research focus</p>
              <p className="text-base leading-relaxed text-muted-foreground">
                Organisational intelligence, verified context, and the
                infrastructure AI needs to operate inside real institutions.
              </p>
            </aside>
          </div>
        </section>

        <section className="border-b border-border">
          <article className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
            <aside className="border-b border-border p-6 md:p-10 lg:col-span-3 lg:border-b-0 lg:border-r">
              <div className="mb-14 flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                <span className="orgni-index text-foreground">Paper 001</span>
              </div>

              <dl className="grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-1">
                <div>
                  <dt className="orgni-index mb-2">Status</dt>
                  <dd className="flex items-center gap-2 text-sm font-semibold">
                    <span className="h-2 w-2 bg-emerald-500" />
                    Published
                  </dd>
                </div>
                <div>
                  <dt className="orgni-index mb-2">Sections</dt>
                  <dd className="font-serif text-3xl">
                    {String(thesisData.sections.length).padStart(2, "0")}
                  </dd>
                </div>
                <div>
                  <dt className="orgni-index mb-2">Discipline</dt>
                  <dd className="text-sm leading-relaxed">
                    Organisational intelligence
                  </dd>
                </div>
                <div>
                  <dt className="orgni-index mb-2">Publisher</dt>
                  <dd className="text-sm">Olyxee Research</dd>
                </div>
              </dl>
            </aside>

            <div className="lg:col-span-9">
              <div className="bg-foreground px-6 py-14 text-background md:px-12 md:py-20 lg:px-16">
                <p className="orgni-index mb-8 !text-background/55">
                  Foundational thesis / 2026
                </p>
                <h2 className="max-w-4xl font-serif text-4xl leading-[1.02] md:text-6xl">
                  {thesisData.title}
                </h2>
                <p className="mt-8 max-w-3xl text-lg leading-relaxed text-background/65 md:text-xl">
                  {thesisData.subtitle}
                </p>
              </div>

              <div className="grid md:grid-cols-12">
                <div className="border-b border-border p-6 md:col-span-8 md:border-b-0 md:border-r md:p-12 lg:p-16">
                  <p className="orgni-index mb-6">Abstract</p>
                  <p className="font-serif text-2xl leading-[1.35] md:text-3xl">
                    {thesisData.abstract[0]}
                  </p>
                </div>

                <Link
                  href="/thesis"
                  className="group flex min-h-56 flex-col justify-between bg-primary p-6 text-primary-foreground transition-colors hover:bg-foreground md:col-span-4 md:p-10"
                >
                  <span className="orgni-index !text-primary-foreground/70">
                    Open publication
                  </span>
                  <div className="flex items-end justify-between gap-4">
                    <span className="font-serif text-4xl leading-none">
                      Read
                      <br />
                      paper
                    </span>
                    <ArrowUpRight className="h-8 w-8 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
                  </div>
                </Link>
              </div>
            </div>
          </article>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
            <div className="border-b border-border p-6 md:p-10 lg:col-span-3 lg:border-b-0 lg:border-r">
              <p className="orgni-kicker">Authors</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:col-span-9 lg:grid-cols-4">
              {authors.map((author, index) => (
                <div
                  key={author.name}
                  className="min-h-40 border-b border-border p-6 last:border-b-0 sm:border-r sm:p-8 lg:border-b-0"
                >
                  <span className="orgni-index mb-8 block">
                    A-{String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="font-semibold">{author.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {author.role}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
