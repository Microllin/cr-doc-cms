import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// 修复「文档删不掉」：navigation_groups_items.doc_id 原本是 NOT NULL，
// 但它的外键是 ON DELETE SET NULL —— 删除被侧边栏引用的文档时，
// Postgres 试图把 doc_id 置空，违反非空约束，整个删除事务回滚。
// 由于 scripts/set-nav.ts 把所有文档都登记进了导航，等于每一篇都删不掉。
//
// 与之配套：src/globals/Navigation.ts 里 doc 字段去掉了 required，
// 这样 Payload 生成的 schema 与本迁移一致，不产生漂移。
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "navigation_groups_items" ALTER COLUMN "doc_id" DROP NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // 回滚前必须先清掉空行，否则 SET NOT NULL 会失败
  await db.execute(sql`
  DELETE FROM "navigation_groups_items" WHERE "doc_id" IS NULL;
  ALTER TABLE "navigation_groups_items" ALTER COLUMN "doc_id" SET NOT NULL;`)
}
