import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { renderMarkdown } from '../../_lib/markdown'
import {
  flattenSidebar,
  getAvailableLocales,
  getDocBySlug,
  getPager,
  getSettings,
  getSidebar,
  parsePath,
  type Locale,
  type SiteSettings,
} from '../../_lib/nav'
import { TopNav } from '../../_components/TopNav'
import { Sidebar } from '../../_components/Sidebar'
import { TocAside } from '../../_components/TocAside'
import { Pager } from '../../_components/Pager'
import { LanguageSync } from '../../_components/LanguageSync'

// 文档内容随后台编辑实时变化，按需动态渲染
export const dynamic = 'force-dynamic'
export const revalidate = 0

type PageProps = { params: Promise<{ slug?: string[] }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug: segments = [] } = await params
  const { locale, slug } = parsePath(segments)
  const settings = await getSettings(locale)
  if (!slug) return { title: settings.siteName, description: settings.description || settings.siteName }

  const doc = await getDocBySlug(slug, locale)
  if (!doc) return { title: settings.siteName, description: settings.description || settings.siteName }

  const availableLocales = await getAvailableLocales(slug)
  const encodedSlug = slug.split('/').map(encodeURIComponent).join('/')
  return {
    title: `${doc.title} | ${settings.siteName}`,
    description: doc.excerpt || settings.description || doc.title,
    alternates: {
      languages: Object.fromEntries(
        availableLocales.map((available) => [available, `/docs/${available}/${encodedSlug}`]),
      ),
    },
  }
}

export default async function DocPage(props: PageProps) {
  const { slug: segments = [] } = await props.params
  const { locale, slug } = parsePath(segments)

  const [sidebar, settings] = await Promise.all([getSidebar(locale), getSettings(locale)])

  // /docs 或 /docs/zh —— 无具体文档时，跳到侧边栏第一篇
  if (!slug) {
    const first = flattenSidebar(sidebar)[0]
    if (first) redirect(first.url)
    return (
      <Shell locale={locale} sidebar={sidebar} settings={settings}>
        <EmptyState locale={locale} />
      </Shell>
    )
  }

  const doc = await getDocBySlug(slug, locale)
  // 文档被取消发布或删除后，读者可能还停留在旧地址。
  // 回到当前语言首页：有其它已发布内容时会继续跳到第一篇；全部下线时显示空状态。
  if (!doc) redirect(`/docs/${locale}`)
  const availableLocales = await getAvailableLocales(slug)

  const { html, toc } = await renderMarkdown(doc.content || '', { locale, slug })
  const { prev, next } = getPager(sidebar, slug)

  return (
    <Shell
      locale={locale}
      sidebar={sidebar}
      settings={settings}
      availableLocales={availableLocales}
      aside={<TocAside items={toc} locale={locale} />}
    >
      <article className="vp-doc">
        <h1 className="vp-doc-title">{doc.title}</h1>
        <div className="vp-doc-content" dangerouslySetInnerHTML={{ __html: html }} />
        <Pager prev={prev} next={next} locale={locale} />
      </article>
    </Shell>
  )
}

function Shell({
  locale,
  sidebar,
  settings,
  availableLocales,
  aside,
  children,
}: {
  locale: Locale
  sidebar: Awaited<ReturnType<typeof getSidebar>>
  settings: SiteSettings
  availableLocales?: Locale[]
  aside?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="vp-layout">
      <LanguageSync locale={locale} />
      <TopNav
        locale={locale}
        siteName={settings.siteName}
        logoMark={settings.logoMark}
        logoUrl={settings.logoUrl}
        availableLocales={availableLocales}
      />
      <div className="vp-body">
        <Sidebar groups={sidebar} />
        <main className="vp-main">{children}</main>
        {aside ?? <aside className="vp-aside" />}
      </div>
    </div>
  )
}

function EmptyState({ locale }: { locale: Locale }) {
  const english = locale === 'en'
  return (
    <article className="vp-doc">
      <h1 className="vp-doc-title">{english ? 'No content yet' : '还没有内容'}</h1>
      <div className="vp-doc-content">
        <p>
          {english ? 'Create a document in the ' : '请先到 '}
          <Link href="/admin">{english ? 'admin panel' : '后台'}</Link>
          {english
            ? ' and add it to the sidebar navigation.'
            : ' 创建文档，并在「侧边栏导航」里配置分组。'}
        </p>
      </div>
    </article>
  )
}
