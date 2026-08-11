import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// media.sha256 升级为唯一索引。
//
// 20260806_000000 当时刻意没加唯一约束，理由是「库里有 15 张内容相同的历史图片」。
// 但那批历史行的 sha256 始终是 NULL —— 而 Postgres 的唯一索引里 NULL 互不相等，
// 所以它们根本不构成障碍，当时的顾虑不成立。
//
// 为什么必须上唯一索引：应用层「先查 sha256、查不到再写」之间有 TOCTOU 窗口，
// 两个并发上传会同时查空、同时写入，去重就漏了。只有数据库层能真正保证唯一。
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  -- 保险起见：万一某个环境已经回填过 sha256 且存在重复，把重复组里 id 较大的置空，
  -- 只留最早的一行。置空不丢任何东西（文件还在，只是这行暂时不参与去重），
  -- 但能保证这支迁移在任何环境都不会卡住部署。
  UPDATE "media" m SET "sha256" = NULL
  WHERE m."sha256" IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM "media" o WHERE o."sha256" = m."sha256" AND o."id" < m."id"
    );

  DROP INDEX IF EXISTS "media_sha256_idx";
  CREATE UNIQUE INDEX IF NOT EXISTS "media_sha256_idx" ON "media" USING btree ("sha256");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  DROP INDEX IF EXISTS "media_sha256_idx";
  CREATE INDEX IF NOT EXISTS "media_sha256_idx" ON "media" USING btree ("sha256");`)
}
