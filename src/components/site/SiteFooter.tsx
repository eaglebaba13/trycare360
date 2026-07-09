import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";

const INITIAL_YEAR = 2026;

function useCurrentYear() {
  const [year, setYear] = useState(INITIAL_YEAR);
  useEffect(() => setYear(new Date().getFullYear()), []);
  return year;
}

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4 lg:px-6">
        <div className="md:col-span-1">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-display text-base font-semibold tracking-tight">
              TryCare<span className="text-[color:var(--gold)]">360</span>
            </span>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Integrated healthcare — clinics, treatments, products and expert doctors under one network.
          </p>
        </div>

        <FooterCol
          heading="Care"
          links={[
            { to: "/treatments", label: "Treatments" },
            { to: "/doctors", label: "Doctors" },
            { to: "/book", label: "Book appointment" },
            { to: "/products", label: "Products" },
          ]}
        />
        <FooterCol
          heading="Company"
          links={[
            { to: "/about", label: "About" },
            { to: "/franchise", label: "Franchise" },
            { to: "/academy", label: "Academy" },
            { to: "/blog", label: "Blog" },
            { to: "/contact", label: "Contact" },
          ]}
        />
        <FooterCol
          heading="Legal"
          links={[
            { to: "/p/privacy", label: "Privacy policy" },
            { to: "/p/terms", label: "Terms of use" },
            { to: "/p/refund-policy", label: "Refund policy" },
          ]}
        />
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground lg:px-6">
          <div>© {useCurrentYear()} TryCare360. All rights reserved.</div>
          <div>Made with care in India.</div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ heading, links }: { heading: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">{heading}</div>
      <ul className="space-y-2 text-sm">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
