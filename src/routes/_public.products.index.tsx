import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { listProducts } from "@/lib/api/cms.functions";

export const Route = createFileRoute("/_public/products/")({
  component: ProductsIndex,
  head: () => ({
    meta: [
      { title: "Shop products — TryCare360" },
      { name: "description", content: "Doctor-formulated hair, skin, nail and wellness products." },
      { property: "og:title", content: "Shop products — TryCare360" },
      { property: "og:description", content: "Doctor-formulated hair, skin, nail and wellness products." },
    ],
    links: [{ rel: "canonical", href: "https://trycare360.lovable.app/products" }],
  }),
});

function ProductsIndex() {
  const fn = useServerFn(listProducts);
  const { data: rows = [] } = useQuery({ queryKey: ["pub-products"], queryFn: () => fn() });
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6">
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">Shop</div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">Products</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Doctor-formulated care you can trust.</p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((p) => (
          <Link key={p.slug} to="/products/$slug" params={{ slug: p.slug }} className="group">
            <Card className="overflow-hidden h-full">
              {p.cover_url ? (
                <img src={p.cover_url} alt={p.name} className="aspect-square w-full object-cover" />
              ) : (
                <div className="aspect-square w-full bg-gradient-to-br from-primary/10 to-accent/10" />
              )}
              <div className="p-4">
                {p.brand && <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.brand}</div>}
                <div className="mt-1 font-semibold group-hover:text-primary">{p.name}</div>
                {p.price != null && <div className="mt-2 text-sm font-medium text-primary">{p.currency ?? "INR"} {p.price}</div>}
              </div>
            </Card>
          </Link>
        ))}
        {rows.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed p-16 text-center text-sm text-muted-foreground">
            No products published yet.
          </div>
        )}
      </div>
    </div>
  );
}
