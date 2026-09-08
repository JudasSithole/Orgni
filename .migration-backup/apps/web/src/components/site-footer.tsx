import { Link } from "wouter";
import { LOGIN_URL } from "@/lib/links";

export function SiteFooter({ dark = false }: { dark?: boolean }) {
  const footerClass = `border-t border-border bg-background ${dark ? "dark" : ""}`;

  return (
    <footer className={footerClass}>
      <div className="mx-auto max-w-[1600px] border-x border-border px-6 pb-10 pt-20 md:px-12 md:pt-24">
        <div className="mb-24 grid grid-cols-2 gap-12 md:grid-cols-4 lg:grid-cols-5">
          <div className="col-span-2 lg:col-span-2">
            <span className="orgni-index mb-8 block">ORG / END</span>
            <Link
              href="/"
              className="inline-flex items-center gap-3 mb-6 group"
            >
              <img
                src={`${import.meta.env.BASE_URL}orgni-logo.png`}
                alt="Orgni logo"
                className="h-8 w-8 object-cover"
              />
              <span className="font-serif text-4xl text-foreground">
                Orgni
              </span>
            </Link>
            <p className="text-muted-foreground font-light max-w-sm">
              Organisational intelligence infrastructure developed by Olyxee.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-foreground mb-6">
              Product
            </h3>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/use-cases"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Use Cases
                </Link>
              </li>
              <li>
                <Link
                  href="/infrastructure"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Infrastructure
                </Link>
              </li>
              <li>
                <Link
                  href="/developers"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Developers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-foreground mb-6">
              Resources
            </h3>
            <ul className="space-y-4">
              <li>
                <Link
                  href="/research"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Research
                </Link>
              </li>
              <li>
                <Link
                  href="/docs"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Documentation
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-xs uppercase tracking-widest text-foreground mb-6">
              Company
            </h3>
            <ul className="space-y-4">
              <li>
                <a
                  href="https://www.olyxee.com/pricing"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Pricing
                </a>
              </li>
              <li>
                <a
                  href="https://olyxee.com"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  About Olyxee
                </a>
              </li>
              <li>
                <a
                  href="mailto:hello@olyxee.com"
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Contact Sales
                </a>
              </li>
              <li>
                <a
                  href={LOGIN_URL}
                  className="text-muted-foreground hover:text-foreground transition-colors font-light text-sm"
                >
                  Sign In
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="overflow-hidden border-t border-border pb-20 pt-10">
          <div className="pointer-events-none flex w-full select-none justify-center text-center font-serif text-[15vw] leading-none text-foreground opacity-5">
            Orgni
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 font-mono text-[10px] uppercase text-muted-foreground md:flex-row">
          <p>Copyright {new Date().getFullYear()} Olyxee Ltd.</p>
          <div className="flex gap-6">
            <a
              href="https://www.olyxee.com/privacy"
              className="hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="https://www.olyxee.com/terms"
              className="hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
