import * as migration_20260715_123712_initial from './20260715_123712_initial';
import * as migration_20260715_132725_add_settings from './20260715_132725_add_settings';
import * as migration_20260717_024452_add_logo_favicon from './20260717_024452_add_logo_favicon';
import * as migration_20260806_000000_add_media_sha256 from './20260806_000000_add_media_sha256';
import * as migration_20260806_010000_fix_nav_doc_nullable from './20260806_010000_fix_nav_doc_nullable';
import * as migration_20260806_170113_add_portal_globals from './20260806_170113_add_portal_globals';
import * as migration_20260807_000000_media_sha256_unique from './20260807_000000_media_sha256_unique';

export const migrations = [
  {
    up: migration_20260715_123712_initial.up,
    down: migration_20260715_123712_initial.down,
    name: '20260715_123712_initial',
  },
  {
    up: migration_20260715_132725_add_settings.up,
    down: migration_20260715_132725_add_settings.down,
    name: '20260715_132725_add_settings',
  },
  {
    up: migration_20260717_024452_add_logo_favicon.up,
    down: migration_20260717_024452_add_logo_favicon.down,
    name: '20260717_024452_add_logo_favicon',
  },
  {
    up: migration_20260806_000000_add_media_sha256.up,
    down: migration_20260806_000000_add_media_sha256.down,
    name: '20260806_000000_add_media_sha256',
  },
  {
    up: migration_20260806_010000_fix_nav_doc_nullable.up,
    down: migration_20260806_010000_fix_nav_doc_nullable.down,
    name: '20260806_010000_fix_nav_doc_nullable',
  },
  {
    up: migration_20260806_170113_add_portal_globals.up,
    down: migration_20260806_170113_add_portal_globals.down,
    name: '20260806_170113_add_portal_globals'
  },
  {
    up: migration_20260807_000000_media_sha256_unique.up,
    down: migration_20260807_000000_media_sha256_unique.down,
    name: '20260807_000000_media_sha256_unique',
  },
];
