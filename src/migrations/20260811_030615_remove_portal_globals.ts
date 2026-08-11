import { type MigrateDownArgs, type MigrateUpArgs, sql } from '@payloadcms/db-postgres'

/**
 * 永久移除已废弃的门户 Globals 数据表。
 *
 * IF EXISTS 同时兼容两类环境：
 * - 旧环境曾部署门户功能，需要物理删除历史表；
 * - 新环境从未创建门户表，迁移仍可安全执行。
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DROP TABLE IF EXISTS "portal_home_stats" CASCADE;
    DROP TABLE IF EXISTS "portal_home_stats_locales" CASCADE;
    DROP TABLE IF EXISTS "portal_home_centers_items_features" CASCADE;
    DROP TABLE IF EXISTS "portal_home_centers_items_features_locales" CASCADE;
    DROP TABLE IF EXISTS "portal_home_centers_items" CASCADE;
    DROP TABLE IF EXISTS "portal_home_centers_items_locales" CASCADE;
    DROP TABLE IF EXISTS "portal_home_values_items" CASCADE;
    DROP TABLE IF EXISTS "portal_home_values_items_locales" CASCADE;
    DROP TABLE IF EXISTS "portal_home_solutions_items" CASCADE;
    DROP TABLE IF EXISTS "portal_home_solutions_items_locales" CASCADE;
    DROP TABLE IF EXISTS "portal_home_more_products_items" CASCADE;
    DROP TABLE IF EXISTS "portal_home_more_products_items_locales" CASCADE;
    DROP TABLE IF EXISTS "portal_home_quick_start_steps" CASCADE;
    DROP TABLE IF EXISTS "portal_home_quick_start_steps_locales" CASCADE;
    DROP TABLE IF EXISTS "portal_home_locales" CASCADE;
    DROP TABLE IF EXISTS "portal_home" CASCADE;
    DROP TABLE IF EXISTS "portal_nav_locales" CASCADE;
    DROP TABLE IF EXISTS "portal_nav" CASCADE;
    DROP TABLE IF EXISTS "portal_footer_locales" CASCADE;
    DROP TABLE IF EXISTS "portal_footer" CASCADE;
  `)
}

// 门户功能已永久删除；回滚不应重新引入其数据模型。
export async function down({}: MigrateDownArgs): Promise<void> {}
