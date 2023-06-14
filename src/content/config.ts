import { z, defineCollection } from 'astro:content'

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    author: z.string().default('Chen Xi'),
    title: z.string(),
    date: z.date(),
    tags: z.array(z.string()).default(['others']),
    description: z.string().optional(),
    draft: z.boolean().optional()
  })
})

export const collections = { posts }
