/**
 * Central entity config for the CMS admin. Each config drives the generic
 * EntityManager UI. Fields listed here are the ones exposed in the editor
 * sheet — DB columns not listed still exist but are not editable from here
 * (they're either system-managed or edited via the visual block builder).
 */
import type { EntityConfig } from "@/components/cms/EntityManager";

const seoField = { key: "seo", label: "SEO (JSON)", type: "json" as const, placeholder: `{"description":"...","keywords":[]}` };
const blocksField = (key: string, label = "Blocks (JSON)") => ({
  key, label, type: "json" as const, placeholder: `[{"id":"b1","type":"hero","data":{"title":"..."}}]`,
});

export const PAGE_CONFIG: EntityConfig = {
  table: "cms_pages",
  singular: "Page",
  plural: "Pages",
  titleField: "title",
  hasStatus: true,
  publicPath: (r) => (r.path as string) ?? "/",
  fields: [
    { key: "title", label: "Title", required: true },
    { key: "slug", label: "Slug", required: true, placeholder: "about-us" },
    { key: "path", label: "Path", required: true, placeholder: "/about-us" },
    { key: "template", label: "Template", placeholder: "default" },
    blocksField("blocks"),
    { key: "og_image_url", label: "Social share image URL", type: "url" },
    seoField,
  ],
};

export const POST_CONFIG: EntityConfig = {
  table: "cms_blog_posts",
  singular: "Post",
  plural: "Blog posts",
  titleField: "title",
  hasStatus: true,
  publicPath: (r) => `/blog/${r.slug}`,
  fields: [
    { key: "title", label: "Title", required: true },
    { key: "slug", label: "Slug", required: true },
    { key: "excerpt", label: "Excerpt", type: "textarea" },
    { key: "cover_url", label: "Cover image URL", type: "url" },
    { key: "reading_minutes", label: "Reading minutes", type: "number" },
    { key: "body_text", label: "Body (plain text fallback)", type: "textarea" },
    blocksField("body_blocks", "Body blocks (JSON)"),
    seoField,
  ],
};

export const DOCTOR_CONFIG: EntityConfig = {
  table: "cms_doctors",
  singular: "Doctor",
  plural: "Doctors",
  titleField: "name",
  hasStatus: true,
  publicPath: (r) => `/doctors/${r.slug}`,
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "slug", label: "Slug", required: true },
    { key: "title", label: "Title", placeholder: "Consultant Dermatologist" },
    { key: "bio", label: "Bio", type: "textarea" },
    { key: "photo_url", label: "Photo URL", type: "url" },
    { key: "years_experience", label: "Years experience", type: "number" },
    { key: "specialties", label: "Specialties (JSON array)", type: "json", placeholder: `["Trichology","Dermatology"]` },
    { key: "credentials", label: "Credentials (JSON array)", type: "json", placeholder: `["MBBS","MD"]` },
    { key: "languages", label: "Languages (JSON array)", type: "json", placeholder: `["English","Hindi"]` },
    { key: "clinics", label: "Clinics (JSON)", type: "json" },
    seoField,
  ],
};

export const TREATMENT_CONFIG: EntityConfig = {
  table: "cms_treatments",
  singular: "Treatment",
  plural: "Treatments",
  titleField: "name",
  hasStatus: true,
  publicPath: (r) => `/treatments/${r.slug}`,
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "slug", label: "Slug", required: true },
    { key: "category", label: "Category" },
    { key: "summary", label: "Summary", type: "textarea" },
    { key: "cover_url", label: "Cover image URL", type: "url" },
    { key: "price_from", label: "Price from", type: "number" },
    { key: "price_to", label: "Price to", type: "number" },
    { key: "price_currency", label: "Currency", placeholder: "INR" },
    { key: "duration_minutes", label: "Duration (minutes)", type: "number" },
    blocksField("description_blocks"),
    { key: "benefits", label: "Benefits (JSON)", type: "json" },
    { key: "faq", label: "FAQ (JSON)", type: "json" },
    seoField,
  ],
};

export const FRANCHISE_CONFIG: EntityConfig = {
  table: "cms_franchise_offers",
  singular: "Franchise tier",
  plural: "Franchise tiers",
  titleField: "title",
  hasStatus: true,
  publicPath: () => "/franchise",
  fields: [
    { key: "title", label: "Title", required: true },
    { key: "slug", label: "Slug", required: true },
    { key: "tier", label: "Tier label" },
    { key: "summary", label: "Summary", type: "textarea" },
    { key: "investment_min", label: "Investment min", type: "number" },
    { key: "investment_max", label: "Investment max", type: "number" },
    { key: "currency", label: "Currency", placeholder: "INR" },
    { key: "area_sqft_min", label: "Area min (sqft)", type: "number" },
    { key: "area_sqft_max", label: "Area max (sqft)", type: "number" },
    { key: "brochure_url", label: "Brochure URL", type: "url" },
    { key: "cover_url", label: "Cover image URL", type: "url" },
    blocksField("description_blocks"),
    { key: "benefits", label: "Benefits (JSON)", type: "json" },
    seoField,
  ],
};

export const COURSE_CONFIG: EntityConfig = {
  table: "cms_academy_courses",
  singular: "Course",
  plural: "Academy courses",
  titleField: "title",
  hasStatus: true,
  publicPath: () => "/academy",
  fields: [
    { key: "title", label: "Title", required: true },
    { key: "slug", label: "Slug", required: true },
    { key: "subtitle", label: "Subtitle" },
    { key: "level", label: "Level" },
    { key: "duration", label: "Duration" },
    { key: "summary", label: "Summary", type: "textarea" },
    { key: "price", label: "Price", type: "number" },
    { key: "currency", label: "Currency", placeholder: "INR" },
    { key: "cover_url", label: "Cover image URL", type: "url" },
    { key: "brochure_url", label: "Brochure URL", type: "url" },
    { key: "outline", label: "Outline (JSON)", type: "json" },
    { key: "faculty", label: "Faculty (JSON)", type: "json" },
    seoField,
  ],
};

export const PRODUCT_CONFIG: EntityConfig = {
  table: "cms_products",
  singular: "Product",
  plural: "Products",
  titleField: "name",
  hasStatus: true,
  publicPath: (r) => `/products/${r.slug}`,
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "slug", label: "Slug", required: true },
    { key: "brand", label: "Brand" },
    { key: "category", label: "Category" },
    { key: "short_description", label: "Short description", type: "textarea" },
    { key: "cover_url", label: "Cover image URL", type: "url" },
    { key: "price", label: "Price", type: "number" },
    { key: "compare_at_price", label: "Compare-at price", type: "number" },
    { key: "currency", label: "Currency", placeholder: "INR" },
    { key: "cta_url", label: "Buy CTA URL", type: "url" },
    { key: "usage", label: "How to use", type: "textarea" },
    blocksField("description_blocks"),
    { key: "ingredients", label: "Ingredients (JSON)", type: "json" },
    { key: "benefits", label: "Benefits (JSON)", type: "json" },
    seoField,
  ],
};

export const MEDIA_CONFIG: EntityConfig = {
  table: "cms_media_assets",
  singular: "Asset",
  plural: "Media assets",
  titleField: "title" as unknown as "title", // uses storage_path fallback
  fields: [
    { key: "storage_path", label: "Storage path / URL", required: true, type: "url" },
    { key: "alt_text", label: "Alt text", required: true },
    { key: "caption", label: "Caption" },
    { key: "folder", label: "Folder" },
    { key: "mime_type", label: "MIME type", placeholder: "image/jpeg" },
    { key: "width", label: "Width", type: "number" },
    { key: "height", label: "Height", type: "number" },
  ],
};

export const MENU_CONFIG: EntityConfig = {
  table: "cms_navigation_menus",
  singular: "Menu",
  plural: "Menus",
  titleField: "name",
  fields: [
    { key: "name", label: "Name", required: true },
    { key: "location", label: "Location", required: true, placeholder: "header | footer | mega" },
    { key: "items", label: "Items (JSON)", type: "json", placeholder: `[{"label":"Home","href":"/"}]` },
  ],
};

export const REDIRECT_CONFIG: EntityConfig = {
  table: "cms_redirects",
  singular: "Redirect",
  plural: "Redirects",
  titleField: "title" as unknown as "title",
  fields: [
    { key: "from_path", label: "From path", required: true, placeholder: "/old-url" },
    { key: "to_path", label: "To path", required: true, placeholder: "/new-url" },
    { key: "status_code", label: "Status code", type: "number", placeholder: "301" },
    { key: "notes", label: "Notes", type: "textarea" },
  ],
};

export const APPOINTMENT_CONFIG: EntityConfig = {
  table: "cms_appointment_requests",
  singular: "Appointment request",
  plural: "Appointment requests",
  titleField: "title" as unknown as "title",
  fields: [
    { key: "full_name", label: "Full name", required: true },
    { key: "phone", label: "Phone", required: true },
    { key: "email", label: "Email" },
    { key: "city", label: "City" },
    { key: "treatment_slug", label: "Treatment slug" },
    { key: "doctor_slug", label: "Doctor slug" },
    { key: "message", label: "Message", type: "textarea" },
    { key: "status", label: "Status", placeholder: "new | contacted | scheduled | cancelled | converted" },
  ],
};
