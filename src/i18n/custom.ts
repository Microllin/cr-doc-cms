import type { NestedKeysStripped } from '@payloadcms/translations'

// 后台自定义文案的中英词条。
//
// Payload 自带的 zh/en 只覆盖它自己的界面（Save / Delete / Create New…），
// 我们自己加的页面（Markdown 导入）和自己抛的错误信息不在其中，
// 全写死中文的话，用户在「账户」里把后台切成 English 之后会看到中英混排。
//
// 用法：
//   服务端  req.i18n.t('crDocs:importTitle')
//   客户端  const { t } = useTranslation<CustomTranslationsObject, CustomTranslationsKeys>()
//           t('crDocs:importTitle')
//
// 注意：两个语言的 key 必须完全一致，否则切语言时会漏字。
export const customTranslations = {
  en: {
    crDocs: {
      // —— 通用 ——
      backToAdmin: '← Back to admin',
      loginRequired: 'Please sign in before using this page.',
      loginAction: 'Go to sign in',

      // —— 导入页：页头 ——
      importTitle: 'Import Markdown',
      importSubtitle:
        'Upload Markdown files — images are stored and remapped automatically, no manual media handling. Works for a single file or an entire folder.',
      importNavLabel: 'Markdown import',
      navToolsGroup: 'Tools',
      selectedCount: '{{count}} of {{total}} selected',
      totalCount: '{{total}} items',
      selectAll: 'Select all',
      clearSelection: 'Clear selection',
      editSelected: 'Edit',
      publishSelected: 'Publish',
      unpublishSelected: 'Unpublish',
      deleteSelected: 'Delete selected',
      deleteAll: 'Delete all',
      deleteAllConfirm: 'Delete all {{total}} items? This cannot be undone.',
      confirmDeleteAll: 'Yes, delete all',
      cancel: 'Cancel',
      actionDone: '{{label}}: {{count}} item(s) done',
      opFailed: '{{label}} failed (HTTP {{status}})',
      partialFailed: '{{count}} item(s) could not be processed',
      refusedUnscoped: 'Refused: the request had no scope and would have affected every record. Nothing was changed.',

      // —— 导入页：选择文件 ——
      pickFiles: 'Choose .md files',
      pickFolder: 'Choose a folder',
      picked: '{{md}} markdown, {{img}} images selected',
      pickedOther: ', {{count}} other files (ignored)',
      pickHint:
        'Images are mapped from the relative paths in your Markdown — no manual upload needed. Choosing a folder preserves the directory structure, and slugs follow it (guide/admin/api-keys.md → guide/admin/api-keys). Identical images are stored only once.',

      // —— 导入页：选项 ——
      fieldLocale: 'Language',
      fieldStatus: 'Status after import',
      fieldOnExisting: 'When the slug already exists',
      fieldStripPrefix: 'Root folder to strip (affects slug)',
      stripPrefixPlaceholder: 'Leave empty to keep as is',
      optPublished: 'Published',
      optDraft: 'Draft',
      optUpdate: 'Overwrite',
      optSkip: 'Skip',
      slugPreview: 'Slug preview:',

      // —— 导入页：操作 ——
      dryRun: 'Dry run (no writes)',
      runImport: 'Import',
      working: 'Working…',
      pickFilesFirst: 'Please choose files first',
      importFailed: 'Import failed (HTTP {{status}})',

      // —— 导入页：结果 ——
      resultDryRun: 'Dry-run result (nothing written)',
      resultDone: 'Import complete',
      docsSummary:
        'Documents: {{created}} created · {{updated}} updated · {{skipped}} skipped · {{failed}} failed',
      imagesSummary:
        'Images: {{uploaded}} stored · {{reused}} reused · {{missing}} not found',
      colFile: 'File',
      colSlug: 'Slug',
      colTitle: 'Title',
      colResult: 'Result',
      colImages: 'Images',
      actionCreated: 'Created',
      actionUpdated: 'Updated',
      actionSkipped: 'Skipped',
      actionFailed: 'Failed',
      imageCount: '{{count}} refs',
      imageMissing: '{{count}} missing: {{files}}',
      ignoredFiles: 'Ignored {{count}} non-markdown/image files: {{files}}',
      none: '—',

      // —— 服务端错误 ——
      errLoginRequired: 'Login required',
      errNeedMultipart: 'Please submit as multipart/form-data',
      errFormParse: 'Failed to parse the form — submit it as multipart/form-data',
      errNoFiles: 'No files received',
      errNoMarkdown:
        'No .md files found. For a bulk import, select the Markdown files together with their images (or just pick the whole folder).',
      errNoSlug: 'Cannot derive a slug from the filename — set one explicitly in the frontmatter',
      errDuplicateSlug:
        'Multiple files in this import resolve to the same slug "{{slug}}". Rename the files or set distinct frontmatter slugs.',
      errFileTooLarge:
        'File "{{name}}" is {{size}}, over the {{limit}} per-file limit',
      errTotalTooLarge: 'Total upload is {{size}}, over the {{limit}} limit for one request',
      errDuplicateImage:
        'This image is byte-identical to an existing one ({{filename}}) — reuse that one instead of uploading a copy.',

      // —— Dashboard 快捷入口 ——
      quickActions: 'Quick actions',
      quickWriteDoc: 'New document',
      quickWriteDocHint: 'Write a page in Markdown',
      quickImport: 'Import Markdown',
      quickImportHint: 'Bulk import files or a folder',
      quickSidebar: 'Edit sidebar',
      quickSidebarHint: 'Reorder the docs navigation',
      quickViewSite: 'View site',
      quickViewSiteHint: 'Open the public docs',
    },
  },
  zh: {
    crDocs: {
      // —— 通用 ——
      backToAdmin: '← 返回后台',
      loginRequired: '请先登录后再使用此页面。',
      loginAction: '前往登录',

      // —— 导入页：页头 ——
      importTitle: 'Markdown 导入',
      importSubtitle:
        '上传 Markdown，图片自动入库并映射，无需手动处理 media。支持单个文件与整个文件夹。',
      importNavLabel: 'Markdown 导入',
      navToolsGroup: '工具',
      selectedCount: '已选 {{count}} / {{total}}',
      totalCount: '共 {{total}} 条',
      selectAll: '全选',
      clearSelection: '取消全选',
      editSelected: '编辑',
      publishSelected: '发布',
      unpublishSelected: '取消发布',
      deleteSelected: '删除所选',
      deleteAll: '删除全部',
      deleteAllConfirm: '确定删除全部 {{total}} 条？此操作不可撤销。',
      confirmDeleteAll: '确认删除全部',
      cancel: '取消',
      actionDone: '{{label}}：已处理 {{count}} 条',
      opFailed: '{{label}}失败（HTTP {{status}}）',
      partialFailed: '{{count}} 条未能处理',
      refusedUnscoped: '已拒绝：该请求没有限定范围，执行会波及全部记录。未做任何改动。',

      // —— 导入页：选择文件 ——
      pickFiles: '选择 .md 文件',
      pickFolder: '选择整个文件夹',
      picked: '已选 {{md}} 个 md、{{img}} 张图',
      pickedOther: '、{{count}} 个其它文件（将忽略）',
      pickHint:
        '图片按 md 里的相对路径自动映射，无需手动上传。选文件夹可保留目录层级，slug 会按目录推导（guide/admin/api-keys.md → guide/admin/api-keys）。内容相同的图片只入库一份。',

      // —— 导入页：选项 ——
      fieldLocale: '语言',
      fieldStatus: '导入后状态',
      fieldOnExisting: 'slug 已存在时',
      fieldStripPrefix: '剥离的根目录（影响 slug）',
      stripPrefixPlaceholder: '留空表示不剥离',
      optPublished: '已发布',
      optDraft: '草稿',
      optUpdate: '覆盖更新',
      optSkip: '跳过',
      slugPreview: 'slug 预览：',

      // —— 导入页：操作 ——
      dryRun: '预演（不写库）',
      runImport: '执行导入',
      working: '处理中…',
      pickFilesFirst: '请先选择文件',
      importFailed: '导入失败（HTTP {{status}}）',

      // —— 导入页：结果 ——
      resultDryRun: '预演结果（未写库）',
      resultDone: '导入完成',
      docsSummary:
        '文档：新建 {{created}} · 更新 {{updated}} · 跳过 {{skipped}} · 失败 {{failed}}',
      imagesSummary: '图片：入库 {{uploaded}} · 复用已有 {{reused}} · 找不到 {{missing}}',
      colFile: '文件',
      colSlug: 'slug',
      colTitle: '标题',
      colResult: '结果',
      colImages: '图片',
      actionCreated: '新建',
      actionUpdated: '更新',
      actionSkipped: '跳过',
      actionFailed: '失败',
      imageCount: '{{count}} 处',
      imageMissing: '缺 {{count}}：{{files}}',
      ignoredFiles: '已忽略 {{count}} 个非 md/图片文件：{{files}}',
      none: '—',

      // —— 服务端错误 ——
      errLoginRequired: '需要登录',
      errNeedMultipart: '请以 multipart/form-data 提交',
      errFormParse: '表单解析失败，请以 multipart/form-data 提交',
      errNoFiles: '没有收到文件',
      errNoMarkdown: '没有 .md 文件。批量导入请把 md 和图片一起选上（或直接选整个文件夹）。',
      errNoSlug: '无法从文件名推导 slug，请在 frontmatter 里显式写 slug',
      errDuplicateSlug:
        '本次导入有多个文件得到相同 slug「{{slug}}」，请重命名文件或在 frontmatter 中设置不同 slug。',
      errFileTooLarge: '文件「{{name}}」有 {{size}}，超过单文件 {{limit}} 上限',
      errTotalTooLarge: '本次上传共 {{size}}，超过单次请求 {{limit}} 上限',
      errDuplicateImage: '这张图和已有的「{{filename}}」内容完全相同，请直接复用它，不要重复上传。',

      // —— Dashboard 快捷入口 ——
      quickActions: '快捷入口',
      quickWriteDoc: '新建文档',
      quickWriteDocHint: '用 Markdown 写一篇',
      quickImport: '导入 Markdown',
      quickImportHint: '批量导入文件或文件夹',
      quickSidebar: '编辑侧边栏',
      quickSidebarHint: '调整文档导航顺序',
      quickViewSite: '查看站点',
      quickViewSiteHint: '打开前台文档',
    },
  },
}

export type CustomTranslationsObject = typeof customTranslations.zh
export type CustomTranslationsKeys = NestedKeysStripped<CustomTranslationsObject>
