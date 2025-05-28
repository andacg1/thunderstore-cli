import * as z from "zod/v4";

export const ReviewStatusSchema = z.enum(["rejected", "unreviewed"]);
export type ReviewStatus = z.infer<typeof ReviewStatusSchema>;

export const CommunityListingSchema = z.object({
  has_nsfw_content: z.boolean(),
  categories: z.array(z.string()),
  community: z.string(),
  review_status: ReviewStatusSchema,
});
export type CommunityListing = z.infer<typeof CommunityListingSchema>;

export const LatestSchema = z.object({
  namespace: z.string(),
  name: z.string(),
  version_number: z.templateLiteral([
    z.number(),
    ".",
    z.number(),
    ".",
    z.number(),
  ]),
  full_name: z.string(),
  description: z.string(),
  icon: z.string(),
  dependencies: z.array(z.any()),
  download_url: z.string(),
  downloads: z.number(),
  date_created: z.coerce.date(),
  website_url: z.string(),
  is_active: z.boolean(),
});
export type Latest = z.infer<typeof LatestSchema>;

export const PackageSchema = z.object({
  namespace: z.string(),
  name: z.string(),
  full_name: z.string(),
  owner: z.string(),
  package_url: z.string(),
  date_created: z.coerce.date(),
  date_updated: z.coerce.date(),
  rating_score: z.number(),
  is_pinned: z.boolean(),
  is_deprecated: z.boolean(),
  total_downloads: z.number(),
  latest: LatestSchema,
  community_listings: z.array(CommunityListingSchema),
});
export type Package = z.infer<typeof PackageSchema>;
