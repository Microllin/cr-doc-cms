import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// media.sha256：文件内容哈希，供 Markdown 导入按内容去重。
// 刻意「不」加唯一约束 —— 库里已存在 15 张内容完全相同的历史图片，
// 加 UNIQUE 会让迁移直接失败。去重在导入逻辑里按 sha256 查询实现。
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sha256" varchar;
  CREATE INDEX IF NOT EXISTS "media_sha256_idx" ON "media" USING btree ("sha256");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "media_sha256_idx";
  ALTER TABLE "media" DROP COLUMN IF EXISTS "sha256";`)
}
