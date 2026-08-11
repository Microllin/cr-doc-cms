'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Button,
  EditMany,
  toast,
  useConfig,
  useLocale,
  useSelection,
  useTranslation,
} from '@payloadcms/ui'

import type { CustomTranslationsKeys, CustomTranslationsObject } from '@/i18n/custom'

// 列表页顶部的常驻操作条（文档 / 媒体）。
//
// Payload 原生把批量操作藏在选择行为后面：不勾选就完全看不到，勾选之后又只是
// 右上角一排没有边框的纯文字，「删除」和「编辑」长得一模一样，看不出哪个会毁数据。
//
// 这里把全部批量操作收拢到一处：常驻可见、没选中时置灰而不是消失、危险操作走红色，
// 并补上原生没有的「删除全部」。原生那一排由 custom.scss 隐藏，避免两套入口并存。
//
// 「编辑」直接复用 Payload 的 EditMany —— 它背后是一整个字段选择抽屉，
// 自己重写一遍既无必要也容易和官方行为跑偏；发布/取消发布/删除都只是改状态或删行，
// 自己实现反而能完整控制禁用态与错误提示。
export function ListToolbar({
  collectionSlug,
  hasDrafts,
}: {
  collectionSlug: string
  hasDrafts?: boolean
}) {
  const { t } = useTranslation<CustomTranslationsObject, CustomTranslationsKeys>()
  const { count, selectAll, selectedIDs, toggleAll, totalDocs } = useSelection()
  const { getEntityConfig } = useConfig()
  const locale = useLocale()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [busy, setBusy] = useState(false)
  // 删除全部不可撤销，做成两步：先点开，再确认。避免手滑一下清空整站。
  const [confirmingAll, setConfirmingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const collection = getEntityConfig({ collectionSlug })

  async function run(method: 'DELETE' | 'PATCH', query: string, label: string, body?: unknown) {
    // 安全闸门：绝不发出「没有 where 条件」的批量请求。
    //
    // Payload 的 REST 批量接口把「没有 where」理解为「命中整张表」，
    // 于是一次本该只动几条的操作会变成删光/改光所有内容。
    // 这类请求只要发出去就无法挽回，所以宁可什么都不做并报错，
    // 也不允许它带着空条件出门。
    if (!query || !query.includes('where')) {
      setError(t('crDocs:refusedUnscoped'))
      toast.error(t('crDocs:refusedUnscoped'))
      return
    }

    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/${collectionSlug}?${query}`, {
        ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
        credentials: 'include',
        method,
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        const msg = json?.errors?.[0]?.message || t('crDocs:opFailed', { label, status: res.status })
        setError(msg)
        toast.error(msg)
        return
      }
      // 即使整体 200，Payload 也可能带回逐条的失败原因，别当成全成功
      const failed = Array.isArray(json?.errors) ? json.errors.length : 0
      const done = Array.isArray(json?.docs) ? json.docs.length : 0
      if (failed > 0) {
        setError(json.errors[0]?.message || t('crDocs:partialFailed', { count: failed }))
        toast.error(t('crDocs:partialFailed', { count: failed }))
      } else {
        // 成功也要给回执。发布/取消发布不改变列表条数，界面上没有任何变化，
        // 不提示的话人无法判断到底生效了没有 —— 只能反复点。
        toast.success(t('crDocs:actionDone', { count: done, label }))
      }
      setConfirmingAll(false)
      toggleAll(false)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setError(msg)
      toast.error(msg)
    } finally {
      setBusy(false)
    }
  }

  const selectedQuery = () =>
    selectedIDs.map((id) => `where[id][in][]=${encodeURIComponent(String(id))}`).join('&')

  /**
   * 「所选」到底指哪些行 —— 这里必须跟着 selectAll 走，不能一律用 selectedIDs。
   *
   * Payload 的 toggleAll(true) 有两个动作：把 selectAll 置为 'allAvailable'
   * （语义是「命中当前查询下的所有行，跨页」），但 selected 里**只放当前这一页**的 id。
   * count 又是按 allAvailable 报 totalDocs 的。
   * 于是 99 篇分 10 页时，界面显示「已选 99 / 99、删除所选 (99)」，
   * 而 selectedIDs 里只有 10 个 —— 点下去只处理 10 条，界面却承诺了 99 条。
   * 说到做不到，在删除上就是灾难。
   *
   * 所以跨页全选时改用「当前筛选条件」本身作为范围，与 count 显示的数字严格一致。
   */
  const scopeQuery = () => (selectAll === 'allAvailable' ? allQuery() : selectedQuery())

  const deleteSelected = () => run('DELETE', scopeQuery(), t('crDocs:deleteSelected'))

  const setStatus = async (status: 'draft' | 'published', label: string) => {
    const query = scopeQuery()
    if (!query || !query.includes('where')) {
      setError(t('crDocs:refusedUnscoped'))
      toast.error(t('crDocs:refusedUnscoped'))
      return
    }

    setBusy(true)
    setError(null)
    try {
      // 发布状态必须按每篇文档真实存在的语言更新，不能让默认中文 locale
      // 去校验英文文档，否则混合选择时会报「标题无效」。
      let ids = selectedIDs
      if (selectAll === 'allAvailable') {
        const response = await fetch(`/api/${collectionSlug}?${query}&limit=0&depth=0`, {
          credentials: 'include',
        })
        const result = await response.json()
        if (!response.ok) throw new Error(t('crDocs:opFailed', { label, status: response.status }))
        ids = Array.isArray(result?.docs) ? result.docs.map((doc: { id: number | string }) => doc.id) : []
      }

      const response = await fetch('/api/bulk-doc-status', {
        body: JSON.stringify({ ids, locale: locale?.code, status }),
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      })
      const result = await response.json().catch(() => null)
      const failed = Array.isArray(result?.errors) ? result.errors.length : 0
      const done = Array.isArray(result?.docs) ? result.docs.length : 0
      if (!response.ok || failed > 0) {
        const message = result?.errors?.[0]?.message || result?.error || t('crDocs:partialFailed', { count: failed })
        setError(message)
        toast.error(message)
      } else {
        toast.success(t('crDocs:actionDone', { count: done, label }))
      }
      toggleAll(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  // 「全部」= 当前筛选下的全部，而不是无视筛选的整表。
  //
  // 这点必须对齐：确认文案里的条数来自 totalDocs，而 totalDocs 是「符合当前
  // 搜索/过滤条件的总数」。如果删除时一律用 exists=true，那么在筛选状态下
  // 就会出现「提示删 5 条、实际删光 40 条」—— 对不可撤销的操作来说是致命的。
  // 所以这里把地址栏里的 where 条件原样带上，删的正是列表当下展示的那批。
  const allQuery = () => {
    const where = Array.from(searchParams.entries()).filter(([k]) => k.startsWith('where'))
    if (where.length > 0) {
      return where.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&')
    }
    // 没有任何筛选时，exists=true 命中所有行（Payload 要求删除必须带 where）
    return 'where[id][exists]=true'
  }

  const none = count === 0

  return (
    <div className="cr-toolbar">
      <div className="cr-toolbar__row">
        <span className="cr-toolbar__count">
          {count > 0
            ? t('crDocs:selectedCount', { count, total: totalDocs })
            : t('crDocs:totalCount', { total: totalDocs })}
        </span>

        <Button
          buttonStyle="secondary"
          disabled={busy || totalDocs === 0}
          onClick={() => toggleAll(count !== totalDocs)}
          size="small"
        >
          {count === totalDocs && totalDocs > 0
            ? t('crDocs:clearSelection')
            : t('crDocs:selectAll')}
        </Button>

        {/* 未选中时给一个禁用的占位按钮，保证工具条布局稳定、动作始终可见；
            选中后再换上 Payload 真正的批量编辑抽屉 */}
        {none || !collection ? (
          <Button buttonStyle="secondary" disabled size="small">
            {t('crDocs:editSelected')}
          </Button>
        ) : (
          <span className="cr-toolbar__editmany">
            <EditMany collection={collection} />
          </span>
        )}

        {hasDrafts && (
          <>
            <Button
              buttonStyle="secondary"
              disabled={busy || none}
              onClick={() => setStatus('published', t('crDocs:publishSelected'))}
              size="small"
            >
              {t('crDocs:publishSelected')}
            </Button>
            <Button
              buttonStyle="secondary"
              disabled={busy || none}
              onClick={() => setStatus('draft', t('crDocs:unpublishSelected'))}
              size="small"
            >
              {t('crDocs:unpublishSelected')}
            </Button>
          </>
        )}

        <Button
          buttonStyle="error"
          className="cr-toolbar__danger"
          disabled={busy || none}
          onClick={deleteSelected}
          size="small"
        >
          {t('crDocs:deleteSelected')}
          {count > 0 ? ` (${count})` : ''}
        </Button>

        <span className="cr-toolbar__spacer" />

        {confirmingAll ? (
          <span className="cr-toolbar__confirm">
            <strong>{t('crDocs:deleteAllConfirm', { total: totalDocs })}</strong>
            <Button
              buttonStyle="error"
              className="cr-toolbar__danger"
              disabled={busy}
              onClick={() => run('DELETE', allQuery(), t('crDocs:deleteAll'))}
              size="small"
            >
              {busy ? t('crDocs:working') : t('crDocs:confirmDeleteAll')}
            </Button>
            <Button
              buttonStyle="secondary"
              disabled={busy}
              onClick={() => setConfirmingAll(false)}
              size="small"
            >
              {t('crDocs:cancel')}
            </Button>
          </span>
        ) : (
          <Button
            buttonStyle="secondary"
            className="cr-toolbar__danger-outline"
            disabled={busy || totalDocs === 0}
            onClick={() => setConfirmingAll(true)}
            size="small"
          >
            {t('crDocs:deleteAll')}
          </Button>
        )}
      </div>

      {error && (
        <div className="cr-toolbar__error" role="alert">
          {error}
        </div>
      )}
    </div>
  )
}

export function DocsListToolbar() {
  return <ListToolbar collectionSlug="docs" hasDrafts />
}

export function MediaListToolbar() {
  // 媒体没开 versions.drafts，发布 / 取消发布对它没有意义
  return <ListToolbar collectionSlug="media" />
}
