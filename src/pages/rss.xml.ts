import rss from '@astrojs/rss'
import sanitizeHtml from 'sanitize-html'
import MarkdownIt from 'markdown-it'

const parser = new MarkdownIt()
import { getCollection } from 'astro:content'

import { SITE } from '@/config'

export async function get() {
  const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
    (a, b) => a.data.pubDate.valueOf() - b.data.pubDate.valueOf()
  )

  return rss({
    title: SITE.title,
    description: SITE.description,
    site: SITE.website,
    items: posts.map((post) => ({
      link: `posts/${post.slug}`,
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(post.data.pubDate),
      content: sanitizeHtml(parser.render(post.body))
    }))
  })
}
