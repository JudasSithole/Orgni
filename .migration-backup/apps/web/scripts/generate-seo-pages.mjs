import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = join(appRoot, "dist", "public");
const baseHtml = await readFile(join(outputRoot, "index.html"), "utf8");
const siteUrl = (process.env.VITE_SITE_URL || "https://orgni.com").replace(
  /\/$/,
  "",
);
const image = `${siteUrl}/opengraph.jpg`;

const pages = [
  {
    path: "/use-cases",
    title: "Business AI Use Cases for Trusted Operations - Orgni",
    description:
      "See how Orgni turns organisational evidence into trusted answers for finance, procurement, compliance, operations, and AI agents.",
    schemaType: "CollectionPage",
  },
  {
    path: "/infrastructure",
    title: "Organisational Intelligence Infrastructure - Orgni",
    description:
      "Connect business systems, documents, and AI agents through governed organisational context with traceable evidence.",
    schemaType: "WebPage",
  },
  {
    path: "/developers",
    title: "Orgni for Developers and AI Agents",
    description:
      "Give AI agents governed access to organisational identity, relationships, policies, evidence, and operational state.",
    schemaType: "TechArticle",
  },
  {
    path: "/pricing",
    title: "Orgni Pricing - Start with Organisational Intelligence",
    description:
      "Explore Orgni pricing for developers and organisations building trusted business context for AI-enabled execution.",
    schemaType: "WebPage",
  },
  {
    path: "/docs",
    title: "Orgni Documentation and API",
    description:
      "Learn how Orgni turns organisational evidence into structured operational intelligence and how developers build with it.",
    schemaType: "TechArticle",
  },
  {
    path: "/research",
    title: "Organisational Intelligence Research - Orgni",
    description:
      "Research on verified organisational context and reliable infrastructure for AI systems operating inside businesses.",
    schemaType: "CollectionPage",
    type: "article",
  },
  {
    path: "/thesis",
    title: "The Case for Organisational Intelligence Infrastructure - Olyxee",
    description:
      "Research into the infrastructure AI systems need to understand organisational context, evidence, policy, and operational state.",
    schemaType: "ScholarlyArticle",
    type: "article",
  },
  {
    path: "/login",
    title: "Sign in - Orgni",
    description: "Sign in to your private Orgni workspace.",
    robots: "noindex, nofollow, noarchive",
    schemaType: "WebPage",
  },
  {
    path: "/app",
    title: "Orgni Console",
    description: "Private Orgni organisational intelligence workspace.",
    robots: "noindex, nofollow, noarchive",
    schemaType: "WebApplication",
  },
];

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceTitle(html, title) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
}

function replaceMeta(html, attribute, key, content) {
  const pattern = new RegExp(
    `<meta\\s+${attribute}=["']${key}["'][\\s\\S]*?\\/>`,
    "i",
  );
  const tag = `<meta ${attribute}="${key}" content="${escapeHtml(content)}" />`;
  return pattern.test(html)
    ? html.replace(pattern, tag)
    : html.replace("</head>", `    ${tag}\n  </head>`);
}

function replaceCanonical(html, url) {
  return html.replace(
    /<link\s+rel=["']canonical["'][\s\S]*?\/>/i,
    `<link rel="canonical" href="${url}" />`,
  );
}

function pageSchema(page, url) {
  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": page.schemaType,
      name: page.title,
      headline: page.title,
      description: page.description,
      url,
      isPartOf: {
        "@type": "WebSite",
        name: "Orgni",
        url: `${siteUrl}/`,
      },
      publisher: {
        "@type": "Organization",
        name: "Olyxee",
        url: `${siteUrl}/`,
      },
      inLanguage: "en",
    },
  ];

  if (page.path !== "/login" && page.path !== "/app") {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Orgni",
          item: `${siteUrl}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.title.replace(/\s+-\s+(Orgni|Olyxee)$/, ""),
          item: url,
        },
      ],
    });
  }

  return schemas;
}

for (const page of pages) {
  const url = `${siteUrl}${page.path}`;
  const type = page.type || "website";
  const robots =
    page.robots ||
    "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  let html = replaceTitle(baseHtml, page.title);
  html = replaceMeta(html, "name", "description", page.description);
  html = replaceMeta(html, "name", "robots", robots);
  html = replaceMeta(html, "property", "og:type", type);
  html = replaceMeta(html, "property", "og:title", page.title);
  html = replaceMeta(html, "property", "og:description", page.description);
  html = replaceMeta(html, "property", "og:url", url);
  html = replaceMeta(html, "property", "og:image", image);
  html = replaceMeta(html, "property", "og:image:alt", `${page.title} - Orgni`);
  html = replaceMeta(html, "name", "twitter:title", page.title);
  html = replaceMeta(html, "name", "twitter:description", page.description);
  html = replaceMeta(html, "name", "twitter:image", image);
  html = replaceMeta(
    html,
    "name",
    "twitter:image:alt",
    `${page.title} - Orgni`,
  );
  html = replaceCanonical(html, url);
  html = html.replace(
    "</head>",
    `    <script id="route-jsonld" type="application/ld+json">${JSON.stringify(pageSchema(page, url))}</script>\n  </head>`,
  );

  const directory = join(outputRoot, page.path.slice(1));
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "index.html"), html);
}

const notFound = replaceMeta(
  replaceTitle(baseHtml, "Page not found - Orgni"),
  "name",
  "robots",
  "noindex, nofollow",
);
await writeFile(join(outputRoot, "404.html"), notFound);

console.log(`Generated SEO HTML for ${pages.length} routes.`);
