import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, readFileSync } from 'fs'
import { DB_NAME } from '@shared/constants'

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), DB_NAME)
  db = new Database(dbPath)

  // Performance settings
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  db.pragma('cache_size = -64000') // 64MB

  // Run migrations
  runMigrations(db)

  return db
}

export function getDatabase(): Database.Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `)

  const applied = new Set(
    db
      .prepare('SELECT name FROM migrations')
      .all()
      .map((r: any) => r.name)
  )

  const migrationsDir = join(__dirname, 'migrations')
  const migrations = [
    { name: '001_initial', sql: MIGRATION_001 },
    { name: '002_fts5', sql: MIGRATION_002 },
    { name: '003_snooze', sql: MIGRATION_003 },
    { name: '004_features', sql: MIGRATION_004 },
    { name: '005_dedup', sql: MIGRATION_005 },
    { name: '006_resync_attachments', sql: MIGRATION_006 },
    { name: '007_vault_path', sql: MIGRATION_007 },
    { name: '008_fix_thread_folders', sql: MIGRATION_008 },
    { name: '009_calendar', sql: MIGRATION_009 },
    { name: '010_cloud_storage', sql: MIGRATION_010 },
    { name: '011_drafts', sql: MIGRATION_011 }
  ]

  for (const migration of migrations) {
    if (applied.has(migration.name)) continue
    db.exec(migration.sql)
    db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name)
  }
}

const MIGRATION_001 = `
  CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    imap_host TEXT NOT NULL,
    imap_port INTEGER NOT NULL DEFAULT 993,
    smtp_host TEXT NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    auth_type TEXT NOT NULL DEFAULT 'password',
    tls INTEGER NOT NULL DEFAULT 1,
    color TEXT NOT NULL DEFAULT '#3498DB',
    enabled INTEGER NOT NULL DEFAULT 1,
    last_sync INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'custom',
    imap_path TEXT NOT NULL,
    uidvalidity INTEGER,
    highestmodseq TEXT,
    unread_count INTEGER NOT NULL DEFAULT 0,
    total_count INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_folders_account ON folders(account_id);
  CREATE INDEX IF NOT EXISTS idx_folders_role ON folders(role);

  CREATE TABLE IF NOT EXISTS threads (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    subject TEXT NOT NULL DEFAULT '',
    snippet TEXT NOT NULL DEFAULT '',
    last_message_date INTEGER NOT NULL,
    participants TEXT NOT NULL DEFAULT '[]',
    message_count INTEGER NOT NULL DEFAULT 0,
    unread INTEGER NOT NULL DEFAULT 0,
    starred INTEGER NOT NULL DEFAULT 0,
    has_attachments INTEGER NOT NULL DEFAULT 0,
    snoozed_until INTEGER,
    labels TEXT NOT NULL DEFAULT '[]',
    folder_id TEXT REFERENCES folders(id)
  );

  CREATE INDEX IF NOT EXISTS idx_threads_account ON threads(account_id);
  CREATE INDEX IF NOT EXISTS idx_threads_date ON threads(last_message_date DESC);
  CREATE INDEX IF NOT EXISTS idx_threads_folder ON threads(folder_id);

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    thread_id TEXT REFERENCES threads(id) ON DELETE CASCADE,
    folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
    uid INTEGER,
    message_id_header TEXT,
    in_reply_to TEXT,
    refs TEXT NOT NULL DEFAULT '[]',
    from_address TEXT NOT NULL DEFAULT '',
    from_name TEXT NOT NULL DEFAULT '',
    to_list TEXT NOT NULL DEFAULT '[]',
    cc_list TEXT NOT NULL DEFAULT '[]',
    bcc_list TEXT NOT NULL DEFAULT '[]',
    subject TEXT NOT NULL DEFAULT '',
    snippet TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    body_text TEXT NOT NULL DEFAULT '',
    date INTEGER NOT NULL,
    flags TEXT NOT NULL DEFAULT '[]',
    has_attachments INTEGER NOT NULL DEFAULT 0,
    size INTEGER NOT NULL DEFAULT 0,
    unread INTEGER NOT NULL DEFAULT 1,
    starred INTEGER NOT NULL DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
  CREATE INDEX IF NOT EXISTS idx_messages_folder ON messages(folder_id);
  CREATE INDEX IF NOT EXISTS idx_messages_date ON messages(date DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_msgid ON messages(message_id_header);

  CREATE TABLE IF NOT EXISTS attachments (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL DEFAULT '',
    content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
    size INTEGER NOT NULL DEFAULT 0,
    content_id TEXT,
    local_path TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_attachments_message ON attachments(message_id);

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL DEFAULT '',
    frequency INTEGER NOT NULL DEFAULT 0,
    last_contacted INTEGER,
    UNIQUE(account_id, email)
  );

  CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

  CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#95A5A6',
    type TEXT NOT NULL DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS message_labels (
    message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (message_id, label_id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS split_inbox_rules (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    filter_type TEXT NOT NULL,
    filter_value TEXT NOT NULL
  );
`

const MIGRATION_002 = `
  CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
    subject, body_text, from_name, from_address,
    content='messages', content_rowid='rowid'
  );

  CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, subject, body_text, from_name, from_address)
    VALUES (NEW.rowid, NEW.subject, NEW.body_text, NEW.from_name, NEW.from_address);
  END;

  CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, subject, body_text, from_name, from_address)
    VALUES ('delete', OLD.rowid, OLD.subject, OLD.body_text, OLD.from_name, OLD.from_address);
  END;

  CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE ON messages BEGIN
    INSERT INTO messages_fts(messages_fts, rowid, subject, body_text, from_name, from_address)
    VALUES ('delete', OLD.rowid, OLD.subject, OLD.body_text, OLD.from_name, OLD.from_address);
    INSERT INTO messages_fts(rowid, subject, body_text, from_name, from_address)
    VALUES (NEW.rowid, NEW.subject, NEW.body_text, NEW.from_name, NEW.from_address);
  END;
`

const MIGRATION_003 = `
  CREATE TABLE IF NOT EXISTS snooze_queue (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
    snoozed_at INTEGER NOT NULL,
    wake_at INTEGER NOT NULL,
    original_folder_id TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_snooze_wake ON snooze_queue(wake_at);
`

const MIGRATION_004 = `
  CREATE TABLE IF NOT EXISTS scheduled_sends (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL,
    send_at INTEGER NOT NULL,
    from_address TEXT NOT NULL DEFAULT '',
    to_list TEXT NOT NULL DEFAULT '[]',
    cc_list TEXT NOT NULL DEFAULT '[]',
    bcc_list TEXT NOT NULL DEFAULT '[]',
    subject TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    body_text TEXT NOT NULL DEFAULT '',
    in_reply_to TEXT,
    refs TEXT NOT NULL DEFAULT '[]',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_scheduled_send_at ON scheduled_sends(send_at);

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    remind_at INTEGER NOT NULL,
    reason TEXT NOT NULL DEFAULT 'no_reply',
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_reminders_at ON reminders(remind_at);

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL DEFAULT '',
    body_html TEXT NOT NULL DEFAULT '',
    body_text TEXT NOT NULL DEFAULT '',
    shortcut TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`

const MIGRATION_005 = `
  -- Remove duplicate messages keeping only the first inserted per (folder_id, uid)
  DELETE FROM messages WHERE rowid NOT IN (
    SELECT MIN(rowid) FROM messages GROUP BY folder_id, uid
  );

  -- Add unique constraint to prevent future duplicates
  CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_folder_uid ON messages(folder_id, uid);

  -- Rebuild threads: recalculate message_count from actual messages
  UPDATE threads SET message_count = (
    SELECT COUNT(*) FROM messages WHERE messages.thread_id = threads.id
  );

  -- Delete orphaned threads with no messages
  DELETE FROM threads WHERE id NOT IN (SELECT DISTINCT thread_id FROM messages WHERE thread_id IS NOT NULL);
`

const MIGRATION_006 = `
  -- Reset sync state so all messages get re-fetched with attachment content saved to disk
  -- Delete all existing data and let sync rebuild it
  DELETE FROM attachments;
  DELETE FROM messages;
  DELETE FROM threads;
  UPDATE folders SET highestmodseq = NULL;
`

const MIGRATION_007 = `
  ALTER TABLE accounts ADD COLUMN vault_path TEXT DEFAULT NULL;
`

const MIGRATION_008 = `
  -- Fix threads stuck in archive/sent: prefer inbox folder_id
  -- For any thread that has messages in an inbox folder, set thread folder_id to that inbox folder
  UPDATE threads SET folder_id = (
    SELECT m.folder_id FROM messages m
    JOIN folders f ON m.folder_id = f.id
    WHERE m.thread_id = threads.id AND f.role = 'inbox'
    ORDER BY m.date DESC LIMIT 1
  )
  WHERE EXISTS (
    SELECT 1 FROM messages m
    JOIN folders f ON m.folder_id = f.id
    WHERE m.thread_id = threads.id AND f.role = 'inbox'
  );
`

const MIGRATION_009 = `
  -- CalDAV calendar accounts (separate from mail accounts; the same provider
  -- may run both but the credentials and URLs differ).
  CREATE TABLE IF NOT EXISTS calendar_accounts (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,         -- 'caldav' | 'icloud' | 'nextcloud' | 'google'
    display_name TEXT NOT NULL,
    server_url TEXT NOT NULL,       -- principal URL
    username TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    color TEXT DEFAULT '#3498DB',
    last_sync INTEGER,
    last_error TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  -- Individual calendars discovered under an account.
  CREATE TABLE IF NOT EXISTS calendars (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES calendar_accounts(id) ON DELETE CASCADE,
    url TEXT NOT NULL,              -- CalDAV collection URL
    display_name TEXT NOT NULL,
    color TEXT,
    ctag TEXT,                      -- collection ETag for change detection
    enabled INTEGER NOT NULL DEFAULT 1,
    UNIQUE(account_id, url)
  );

  -- Materialized events. We re-parse the raw ICS to fill these columns so
  -- queries are fast; the source of truth stays the ics text on the server.
  CREATE TABLE IF NOT EXISTS calendar_events (
    id TEXT PRIMARY KEY,
    calendar_id TEXT NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
    uid TEXT NOT NULL,
    ics_url TEXT NOT NULL,          -- href of the .ics resource on CalDAV
    etag TEXT,
    summary TEXT,
    description TEXT,
    location TEXT,
    organizer TEXT,
    start_ts INTEGER NOT NULL,      -- epoch ms, expanded for recurring instances
    end_ts INTEGER NOT NULL,
    all_day INTEGER NOT NULL DEFAULT 0,
    rrule TEXT,
    raw_ics TEXT,
    UNIQUE(calendar_id, uid)
  );

  CREATE INDEX IF NOT EXISTS idx_events_window ON calendar_events(start_ts, end_ts);
  CREATE INDEX IF NOT EXISTS idx_events_calendar ON calendar_events(calendar_id);
`

const MIGRATION_010 = `
  -- Cloud-storage providers for the "upload large attachments instead of
  -- bouncing them through SMTP" workflow. We keep this separate from mail
  -- accounts so the same Nextcloud server can host calendars AND uploads
  -- without one entry per role.
  CREATE TABLE IF NOT EXISTS cloud_storage_accounts (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,         -- 'nextcloud' | 'google_drive'
    display_name TEXT NOT NULL,
    server_url TEXT,                -- nextcloud only
    username TEXT,                  -- nextcloud only
    upload_path TEXT DEFAULT '/mail_attachments/',
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`

const MIGRATION_011 = `
  -- Compose-window draft autosave (sprint #5). The renderer persists
  -- in-progress messages here every ~1.2s of idle typing so a stray Cmd+W
  -- doesn't lose work. Deleted on successful send.
  CREATE TABLE IF NOT EXISTS local_drafts (
    id TEXT PRIMARY KEY,
    account_id TEXT,
    mode TEXT NOT NULL,                 -- 'new' | 'reply' | 'reply-all' | 'forward'
    reply_to_thread_id TEXT,            -- the source thread, if any
    to_list TEXT NOT NULL DEFAULT '[]', -- JSON arrays of recipient strings
    cc_list TEXT NOT NULL DEFAULT '[]',
    bcc_list TEXT NOT NULL DEFAULT '[]',
    subject TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
  CREATE INDEX IF NOT EXISTS idx_drafts_mode_thread
    ON local_drafts(mode, reply_to_thread_id);
`
