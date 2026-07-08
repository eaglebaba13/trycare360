import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { FileText, Users, Stethoscope, Store, GraduationCap, ShoppingBag, Image as ImageIcon, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cms/")({
  component: CmsOverview,
});

const CARDS = [
  { to: "/cms/pages", icon: FileText, title: "Pages", body: "Landing pages and long-form pages built from reusable blocks." },
  { to: "/cms/blog", icon: FileText, title: "Blog", body: "Publish articles, guides and clinical explainers." },
  { to: "/cms/doctors", icon: Users, title: "Doctors", body: "Public doctor profiles with specialties and clinics." },
  { to: "/cms/treatments", icon: Stethoscope, title: "Treatments", body: "Treatment catalog with pricing and linked doctors." },
  { to: "/cms/products", icon: ShoppingBag, title: "Products", body: "Doctor-formulated products for the shop." },
  { to: "/cms/franchise", icon: Store, title: "Franchise", body: "Franchise tiers, investment ranges and brochures." },
  { to: "/cms/academy", icon: GraduationCap, title: "Academy", body: "Certification programs and course listings." },
  { to: "/cms/media", icon: ImageIcon, title: "Media library", body: "Central asset library with alt text and focal points." },
  { to: "/cms/appointments", icon: Inbox, title: "Appointment inbox", body: "Leads captured from the public booking widget." },
];

function CmsOverview() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Enterprise CMS</h1>
        <p className="mt-2 text-muted-foreground">
          Everything visible on the public website — pages, blog, catalog, media and site settings.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <Link key={c.to} to={c.to} className="group">
            <Card className="p-5 h-full transition-shadow hover:shadow-elev-2">
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <c.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold group-hover:text-primary">{c.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
