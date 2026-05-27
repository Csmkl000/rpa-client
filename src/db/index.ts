import { drizzle } from 'drizzle-orm/bun-sqlite'
import { Database } from 'bun:sqlite'
import { mkdirSync } from 'fs'
import { dirname } from 'path'
import * as schema from './schema'

const DB_PATH = process.env.RPA_DB_PATH || './data/rpa.db'

// 确保目录存在
mkdirSync(dirname(DB_PATH), { recursive: true })

const sqlite = new Database(DB_PATH)
sqlite.exec('PRAGMA journal_mode = WAL')
sqlite.exec('PRAGMA foreign_keys = ON')

// 自动建表
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    steps TEXT NOT NULL,
    inputs TEXT NOT NULL DEFAULT '{}',
    error_policy TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    status TEXT NOT NULL,
    inputs TEXT NOT NULL DEFAULT '{}',
    step_logs TEXT NOT NULL DEFAULT '[]',
    ai_patches TEXT NOT NULL DEFAULT '[]',
    error TEXT,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    duration INTEGER
  );

  CREATE TABLE IF NOT EXISTS patches (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    original_step TEXT NOT NULL,
    fixed_step TEXT NOT NULL,
    error TEXT NOT NULL,
    screenshot TEXT,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    workflow_id TEXT NOT NULL,
    cron TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1,
    inputs TEXT NOT NULL DEFAULT '{}',
    last_run_at INTEGER,
    next_run_at INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS configs (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`)

export const db = drizzle(sqlite, { schema })

export type DB = typeof db
