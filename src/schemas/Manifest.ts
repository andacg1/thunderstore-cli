import * as z from "zod";

export const ManifestSchema = z.object({
  name: z.string(),
  version_number: z.string(),
  website_url: z.string(),
  description: z.string(),
  dependencies: z.array(z.string()),
});
export type Manifest = z.infer<typeof ManifestSchema>;
