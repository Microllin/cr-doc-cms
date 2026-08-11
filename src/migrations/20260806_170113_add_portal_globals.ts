import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "portal_home_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "portal_home_stats_locales" (
  	"value" varchar NOT NULL,
  	"label" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "portal_home_centers_items_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "portal_home_centers_items_features_locales" (
  	"text" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "portal_home_centers_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL
  );
  
  CREATE TABLE "portal_home_centers_items_locales" (
  	"tab" varchar,
  	"label" varchar,
  	"desc" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "portal_home_values_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "portal_home_values_items_locales" (
  	"title" varchar NOT NULL,
  	"desc" varchar,
  	"desc_long" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "portal_home_solutions_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL
  );
  
  CREATE TABLE "portal_home_solutions_items_locales" (
  	"title" varchar,
  	"scene" varchar,
  	"solution" varchar,
  	"centers" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "portal_home_more_products_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL
  );
  
  CREATE TABLE "portal_home_more_products_items_locales" (
  	"name" varchar,
  	"desc" varchar,
  	"status" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "portal_home_quick_start_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "portal_home_quick_start_steps_locales" (
  	"title" varchar,
  	"desc" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "portal_home" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "portal_home_locales" (
  	"hero_badge" varchar,
  	"hero_line1" varchar,
  	"hero_line2" varchar,
  	"hero_subtitle" varchar,
  	"hero_title" varchar,
  	"hero_cta_start" varchar,
  	"hero_cta_demo" varchar,
  	"hero_cta_explore" varchar,
  	"hero_cta_contact" varchar,
  	"centers_title" varchar,
  	"centers_subtitle" varchar,
  	"values_title" varchar,
  	"values_subtitle" varchar,
  	"solutions_title" varchar,
  	"solutions_subtitle" varchar,
  	"more_products_title" varchar,
  	"more_products_subtitle" varchar,
  	"quick_start_title" varchar,
  	"quick_start_subtitle" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "portal_nav" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "portal_nav_locales" (
  	"home" varchar,
  	"products" varchar,
  	"pricing" varchar,
  	"about" varchar,
  	"contact" varchar,
  	"login" varchar,
  	"console" varchar,
  	"more_products" varchar,
  	"cloudrouter_hub" varchar,
  	"stage_evaluate" varchar,
  	"stage_access" varchar,
  	"stage_govern" varchar,
  	"stage_scenario" varchar,
  	"stage_worker" varchar,
  	"cloudrouter" varchar,
  	"accesscenter" varchar,
  	"seccenter" varchar,
  	"opscenter" varchar,
  	"modelarena" varchar,
  	"chatportal" varchar,
  	"skillhub" varchar,
  	"devagent" varchar,
  	"vulnhunter" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "portal_footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "portal_footer_locales" (
  	"description" varchar,
  	"products" varchar,
  	"centers" varchar,
  	"more" varchar,
  	"company" varchar,
  	"resources" varchar,
  	"status" varchar,
  	"docs" varchar,
  	"copyright" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  -- 下面两条由 payload migrate:create 生成时重复带入（20260806_000000 / _010000 已应用过，
  -- 但那两个迁移是手写的、没同步 schema 快照，所以生成器又算了一次差异）。
  -- doc_id DROP NOT NULL 是幂等的，保留无害；media.sha256 若直接 ADD 会报
  -- "column already exists" 让整条迁移失败，故改成 IF NOT EXISTS。
  ALTER TABLE "navigation_groups_items" ALTER COLUMN "doc_id" DROP NOT NULL;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "sha256" varchar;
  ALTER TABLE "portal_home_stats" ADD CONSTRAINT "portal_home_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_stats_locales" ADD CONSTRAINT "portal_home_stats_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home_stats"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_centers_items_features" ADD CONSTRAINT "portal_home_centers_items_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home_centers_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_centers_items_features_locales" ADD CONSTRAINT "portal_home_centers_items_features_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home_centers_items_features"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_centers_items" ADD CONSTRAINT "portal_home_centers_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_centers_items_locales" ADD CONSTRAINT "portal_home_centers_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home_centers_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_values_items" ADD CONSTRAINT "portal_home_values_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_values_items_locales" ADD CONSTRAINT "portal_home_values_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home_values_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_solutions_items" ADD CONSTRAINT "portal_home_solutions_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_solutions_items_locales" ADD CONSTRAINT "portal_home_solutions_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home_solutions_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_more_products_items" ADD CONSTRAINT "portal_home_more_products_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_more_products_items_locales" ADD CONSTRAINT "portal_home_more_products_items_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home_more_products_items"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_quick_start_steps" ADD CONSTRAINT "portal_home_quick_start_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_quick_start_steps_locales" ADD CONSTRAINT "portal_home_quick_start_steps_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home_quick_start_steps"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_home_locales" ADD CONSTRAINT "portal_home_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_nav_locales" ADD CONSTRAINT "portal_nav_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_nav"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "portal_footer_locales" ADD CONSTRAINT "portal_footer_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."portal_footer"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "portal_home_stats_order_idx" ON "portal_home_stats" USING btree ("_order");
  CREATE INDEX "portal_home_stats_parent_id_idx" ON "portal_home_stats" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "portal_home_stats_locales_locale_parent_id_unique" ON "portal_home_stats_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "portal_home_centers_items_features_order_idx" ON "portal_home_centers_items_features" USING btree ("_order");
  CREATE INDEX "portal_home_centers_items_features_parent_id_idx" ON "portal_home_centers_items_features" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "portal_home_centers_items_features_locales_locale_parent_id_" ON "portal_home_centers_items_features_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "portal_home_centers_items_order_idx" ON "portal_home_centers_items" USING btree ("_order");
  CREATE INDEX "portal_home_centers_items_parent_id_idx" ON "portal_home_centers_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "portal_home_centers_items_locales_locale_parent_id_unique" ON "portal_home_centers_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "portal_home_values_items_order_idx" ON "portal_home_values_items" USING btree ("_order");
  CREATE INDEX "portal_home_values_items_parent_id_idx" ON "portal_home_values_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "portal_home_values_items_locales_locale_parent_id_unique" ON "portal_home_values_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "portal_home_solutions_items_order_idx" ON "portal_home_solutions_items" USING btree ("_order");
  CREATE INDEX "portal_home_solutions_items_parent_id_idx" ON "portal_home_solutions_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "portal_home_solutions_items_locales_locale_parent_id_unique" ON "portal_home_solutions_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "portal_home_more_products_items_order_idx" ON "portal_home_more_products_items" USING btree ("_order");
  CREATE INDEX "portal_home_more_products_items_parent_id_idx" ON "portal_home_more_products_items" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "portal_home_more_products_items_locales_locale_parent_id_uni" ON "portal_home_more_products_items_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "portal_home_quick_start_steps_order_idx" ON "portal_home_quick_start_steps" USING btree ("_order");
  CREATE INDEX "portal_home_quick_start_steps_parent_id_idx" ON "portal_home_quick_start_steps" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "portal_home_quick_start_steps_locales_locale_parent_id_uniqu" ON "portal_home_quick_start_steps_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "portal_home_locales_locale_parent_id_unique" ON "portal_home_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "portal_nav_locales_locale_parent_id_unique" ON "portal_nav_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "portal_footer_locales_locale_parent_id_unique" ON "portal_footer_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX IF NOT EXISTS "media_sha256_idx" ON "media" USING btree ("sha256");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "portal_home_stats" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_stats_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_centers_items_features" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_centers_items_features_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_centers_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_centers_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_values_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_values_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_solutions_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_solutions_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_more_products_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_more_products_items_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_quick_start_steps" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_quick_start_steps_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_home_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_nav" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_nav_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_footer" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "portal_footer_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "portal_home_stats" CASCADE;
  DROP TABLE "portal_home_stats_locales" CASCADE;
  DROP TABLE "portal_home_centers_items_features" CASCADE;
  DROP TABLE "portal_home_centers_items_features_locales" CASCADE;
  DROP TABLE "portal_home_centers_items" CASCADE;
  DROP TABLE "portal_home_centers_items_locales" CASCADE;
  DROP TABLE "portal_home_values_items" CASCADE;
  DROP TABLE "portal_home_values_items_locales" CASCADE;
  DROP TABLE "portal_home_solutions_items" CASCADE;
  DROP TABLE "portal_home_solutions_items_locales" CASCADE;
  DROP TABLE "portal_home_more_products_items" CASCADE;
  DROP TABLE "portal_home_more_products_items_locales" CASCADE;
  DROP TABLE "portal_home_quick_start_steps" CASCADE;
  DROP TABLE "portal_home_quick_start_steps_locales" CASCADE;
  DROP TABLE "portal_home" CASCADE;
  DROP TABLE "portal_home_locales" CASCADE;
  DROP TABLE "portal_nav" CASCADE;
  DROP TABLE "portal_nav_locales" CASCADE;
  DROP TABLE "portal_footer" CASCADE;
  DROP TABLE "portal_footer_locales" CASCADE;`)
  // 刻意不在此处回滚 media.sha256 与 navigation_groups_items.doc_id：
  // 它们分属 20260806_000000 / _010000 两个迁移，各自的 down 已负责。
  // 尤其 doc_id 若在这里被 SET NOT NULL，会把「文档删不掉」那个 bug 直接复活。
}
