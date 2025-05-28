import {z} from 'zod/v4'

export const UrlSchema = z.url()
export type Url = z.infer<typeof UrlSchema>
