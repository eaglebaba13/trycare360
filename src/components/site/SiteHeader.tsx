import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Menu, X, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/treatments", label: "Treatments" },
  { to: "/doctors", label: "Doctors" },
  { to: "/dr-hair", label: "Dr Hair" },
  { to: "/products", label: "Products" },
  { to: "/franchise", label: "Franchise" },
  { to: "/academy", label: "Academy" },
  { to: "/blog", label: "Blog" },
  { to: "/about", label: "About" },
] as const;


export function SiteHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-elev-1">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-base font-semibold tracking-tight">
              TryCare<span className="text-[color:var(--gold)]">360</span>
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Healthcare Network</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              activeProps={{ className: "text-foreground bg-muted" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/contact">
            <Button variant="ghost" size="sm">Contact</Button>
          </Link>
          <Link to="/book">
            <Button size="sm">Book appointment</Button>
          </Link>
        </div>

        <button
          type="button"
          className="rounded-md p-2 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t bg-background lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-2 flex gap-2 pt-2">
              <Link to="/contact" onClick={() => setOpen(false)} className="flex-1">
                <Button variant="outline" className="w-full">Contact</Button>
              </Link>
              <Link to="/book" onClick={() => setOpen(false)} className="flex-1">
                <Button className="w-full">Book</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
