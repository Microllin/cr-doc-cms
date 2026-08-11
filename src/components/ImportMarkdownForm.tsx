'use client'

import React, { useCallback, useMemo, useRef, useState } from 'react'
import { Button, SelectInput, TextInput, useLocale, useTranslation } from '@payloadcms/ui'

import type { CustomTranslationsKeys, CustomTranslationsObject } from '@/i18n/custom'

// Markdown 导入表单。
//
// 批量导入的关键：选文件夹时浏览器会给出 webkitRelativePath，
// 把它一起发给后端，md 里的相对图片路径才解析得准。
// 单文件与批量是同一条管线，区别只是选了几个文件。
//
// 控件一律用 @payloadcms/ui 的原生组件：早先是内联 style 手搓的，
// 和后台其它表单长得不一样，暗色主题下还会因为写死的色值而刺眼。

type ImageOutcome = {
  ref: string
  resolvedPath: string
  status: 'created' | 'missing' | 'reused'
  filename?: string
  url?: string
}

type DocOutcome = {
  path: string
  slug: string
  title: string
  action: 'created' | 'failed' | 'skipped' | 'updated'
  docId?: number | string
  error?: string
  images: ImageOutcome[]
}

type ImportStatus = 'draft' | 'published'

type Report = {
  summary: {
    dryRun: boolean
    locale: string
    status: string
    onExisting: string
    docs: { total: number; created: number; updated: number; skipped: number; failed: number }
    images: { uploaded: number; reused: number; missing: number }
    ignoredFiles: string[]
  }
  results: DocOutcome[]
}

const ACTION_KEY: Record<DocOutcome['action'], CustomTranslationsKeys> = {
  created: 'crDocs:actionCreated',
  failed: 'crDocs:actionFailed',
  skipped: 'crDocs:actionSkipped',
  updated: 'crDocs:actionUpdated',
}

function relPathOf(f: File): string {
  return (f.webkitRelativePath || f.name).replace(/^\.?\//, '')
}

/**
 * 选文件夹时浏览器会带上被选中文件夹自身的名字（选 docs/ 得到 docs/guide/x.md）。
 * 不剥掉的话 slug 会多一层。只在所有文件共享同一首段时才判定为多余根目录。
 */
function autoCommonRoot(paths: string[]): string {
  if (!paths.length) return ''
  const first = paths[0].split('/')
  if (first.length < 2) return ''
  const root = first[0]
  return paths.every((p) => p.startsWith(`${root}/`)) ? root : ''
}

export function ImportMarkdownForm() {
  const { t } = useTranslation<CustomTranslationsObject, CustomTranslationsKeys>()
  const adminLocale = useLocale()

  const [files, setFiles] = useState<File[]>([])
  // 只使用 Payload 后台顶部的内容语言，不再提供第二个可能互相冲突的语言选择器。
  const locale = adminLocale?.code === 'en' ? 'en' : 'zh'
  // 导入默认先进入草稿，检查内容、图片和链接后再从文档列表发布。
  const [status, setStatus] = useState<ImportStatus>('draft')
  const [onExisting, setOnExisting] = useState('update')
  const [stripPrefix, setStripPrefix] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dirInputRef = useRef<HTMLInputElement>(null)

  const counts = useMemo(() => {
    const md = files.filter((f) => /\.(md|markdown)$/i.test(f.name)).length
    const img = files.filter((f) =>
      /\.(apng|avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i.test(f.name),
    ).length
    return { img, md, other: files.length - md - img }
  }, [files])

  const pick = useCallback((list: FileList | null) => {
    if (!list) return
    const arr = Array.from(list)
    setFiles(arr)
    // 自动填入待剥离的根目录，但留给用户改 —— slug 层级由它决定，不该藏着
    setStripPrefix(autoCommonRoot(arr.map(relPathOf)))
    setReport(null)
    setError(null)
  }, [])

  async function submit(dryRun: boolean) {
    if (!files.length) {
      setError(t('crDocs:pickFilesFirst'))
      return
    }
    setBusy(true)
    setError(null)
    setReport(null)
    try {
      const fd = new FormData()
      for (const f of files) {
        fd.append('files', f)
        fd.append('paths', relPathOf(f))
      }
      fd.append('locale', locale)
      // 发布必须是明确选择的结果；SelectInput 的空值/异常值绝不能使导入上线。
      fd.append('status', status === 'published' ? 'published' : 'draft')
      fd.append('onExisting', onExisting)
      fd.append('stripPrefix', stripPrefix)
      if (dryRun) fd.append('dryRun', '1')

      const res = await fetch('/api/import-md', {
        body: fd,
        credentials: 'include',
        method: 'POST',
      })
      const json = await res.json()
      if (!res.ok) {
        setError(json?.error || t('crDocs:importFailed', { status: res.status }))
        return
      }
      setReport(json as Report)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const s = report?.summary

  const slugPreviews = useMemo(
    () =>
      files
        .filter((f) => /\.(md|markdown)$/i.test(f.name))
        .slice(0, 3)
        .map((f) => {
          const rel = relPathOf(f)
          const stripped =
            stripPrefix && rel.startsWith(`${stripPrefix}/`)
              ? rel.slice(stripPrefix.length + 1)
              : rel
          return stripped.replace(/\.(md|markdown)$/i, '').replace(/\/(index|readme)$/i, '')
        }),
    [files, stripPrefix],
  )

  return (
    <div className="cr-import__body">
      <section className="cr-card">
        <div className="cr-card__row">
          <Button
            buttonStyle="secondary"
            disabled={busy}
            onClick={() => {
              if (!fileInputRef.current) return
              // 同一个文件连续选择两次时浏览器不会触发 change，先清空原值。
              fileInputRef.current.value = ''
              fileInputRef.current.click()
            }}
            size="small"
          >
            {t('crDocs:pickFiles')}
          </Button>
          <Button
            buttonStyle="secondary"
            disabled={busy}
            onClick={() => {
              if (!dirInputRef.current) return
              // 允许修正选项后重新选择并导入同一个文件夹。
              dirInputRef.current.value = ''
              dirInputRef.current.click()
            }}
            size="small"
          >
            {t('crDocs:pickFolder')}
          </Button>

          <input
            accept=".md,.markdown,image/*"
            className="cr-visually-hidden"
            multiple
            onChange={(e) => pick(e.target.files)}
            ref={fileInputRef}
            type="file"
          />
          <input
            {...{ directory: '', webkitdirectory: '' }}
            className="cr-visually-hidden"
            multiple
            onChange={(e) => pick(e.target.files)}
            ref={dirInputRef}
            type="file"
          />

          {files.length > 0 && (
            <span className="cr-muted">
              {t('crDocs:picked', { img: counts.img, md: counts.md })}
              {counts.other > 0 && t('crDocs:pickedOther', { count: counts.other })}
            </span>
          )}
        </div>

        <p className="cr-hint">{t('crDocs:pickHint')}</p>

        <div className="cr-card__fields">
          <div className="field-type text" id="field-locale">
            <div className="field-label">{t('crDocs:fieldLocale')}</div>
            <div
              className="cr-import__locale value-container"
              title={locale === 'en' ? 'English' : '中文'}
            >
              {locale === 'en' ? 'English' : '中文'}
              <span className="cr-muted">
                {locale === 'en'
                  ? ' (follows the admin content locale)'
                  : '（跟随后台顶部内容语言）'}
              </span>
            </div>
          </div>
          <SelectInput
            isClearable={false}
            label={t('crDocs:fieldStatus')}
            name="status"
            onChange={(opt) =>
              setStatus((opt as { value?: string })?.value === 'published' ? 'published' : 'draft')
            }
            options={[
              { label: t('crDocs:optPublished'), value: 'published' },
              { label: t('crDocs:optDraft'), value: 'draft' },
            ]}
            path="status"
            value={status}
          />
          <SelectInput
            isClearable={false}
            label={t('crDocs:fieldOnExisting')}
            name="onExisting"
            onChange={(opt) => setOnExisting((opt as { value?: string })?.value ?? 'update')}
            options={[
              { label: t('crDocs:optUpdate'), value: 'update' },
              { label: t('crDocs:optSkip'), value: 'skip' },
            ]}
            path="onExisting"
            value={onExisting}
          />
          <TextInput
            label={t('crDocs:fieldStripPrefix')}
            // 显式标注：TextInput 的 onChange 是个联合类型（hasMany 与否两套签名），
            // 不写就推不出 e 的类型
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStripPrefix(e.target.value)}
            path="stripPrefix"
            placeholder={t('crDocs:stripPrefixPlaceholder')}
            value={stripPrefix}
          />
        </div>

        {slugPreviews.length > 0 && (
          <p className="cr-hint">
            {t('crDocs:slugPreview')}{' '}
            {slugPreviews.map((slug) => (
              <code key={slug}>{slug}</code>
            ))}
            {counts.md > slugPreviews.length && ' …'}
          </p>
        )}

        <div className="cr-card__actions">
          <Button buttonStyle="secondary" disabled={busy} onClick={() => submit(true)}>
            {busy ? t('crDocs:working') : t('crDocs:dryRun')}
          </Button>
          <Button buttonStyle="primary" disabled={busy} onClick={() => submit(false)}>
            {busy ? t('crDocs:working') : t('crDocs:runImport')}
          </Button>
        </div>
      </section>

      {error && (
        <div className="cr-card cr-card--error" role="alert">
          {error}
        </div>
      )}

      {s && report && (
        <section className="cr-card">
          <h3 className="cr-card__title">
            {s.dryRun ? t('crDocs:resultDryRun') : t('crDocs:resultDone')}
          </h3>
          <p className="cr-summary">
            {t('crDocs:docsSummary', {
              created: s.docs.created,
              failed: s.docs.failed,
              skipped: s.docs.skipped,
              updated: s.docs.updated,
            })}
            <br />
            {t('crDocs:imagesSummary', {
              missing: s.images.missing,
              reused: s.images.reused,
              uploaded: s.images.uploaded,
            })}
          </p>

          <div className="cr-table-wrap">
            <table className="cr-table">
              <thead>
                <tr>
                  <th>{t('crDocs:colFile')}</th>
                  <th>{t('crDocs:colSlug')}</th>
                  <th>{t('crDocs:colTitle')}</th>
                  <th>{t('crDocs:colResult')}</th>
                  <th>{t('crDocs:colImages')}</th>
                </tr>
              </thead>
              <tbody>
                {report.results.map((r) => {
                  const missing = r.images.filter((i) => i.status === 'missing')
                  return (
                    <tr key={r.path}>
                      <td>
                        <code>{r.path}</code>
                      </td>
                      <td>
                        <code>{r.slug}</code>
                      </td>
                      <td>{r.title}</td>
                      <td>
                        <span className={`cr-badge cr-badge--${r.action}`}>
                          {t(ACTION_KEY[r.action])}
                        </span>
                        {r.error && <div className="cr-error-text">{r.error}</div>}
                      </td>
                      <td>
                        {r.images.length === 0 ? (
                          <span className="cr-muted">{t('crDocs:none')}</span>
                        ) : (
                          <>
                            {t('crDocs:imageCount', { count: r.images.length })}
                            {missing.length > 0 && (
                              <div className="cr-error-text">
                                {t('crDocs:imageMissing', {
                                  count: missing.length,
                                  files: missing.map((m) => m.resolvedPath).join(' · '),
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {s.ignoredFiles.length > 0 && (
            <p className="cr-hint">
              {t('crDocs:ignoredFiles', {
                count: s.ignoredFiles.length,
                files:
                  s.ignoredFiles.slice(0, 5).join(' · ') +
                  (s.ignoredFiles.length > 5 ? ' …' : ''),
              })}
            </p>
          )}
        </section>
      )}
    </div>
  )
}
