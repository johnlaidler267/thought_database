#!/usr/bin/env node

/**
 * Script to switch between development and production environment modes
 * Usage: node scripts/switch-mode.js [dev|prod]
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

const mode = process.argv[2] || 'dev'

if (!['dev', 'prod'].includes(mode)) {
  console.error('Error: Mode must be "dev" or "prod"')
  process.exit(1)
}

const configs = {
  backend: {
    dev: path.join(rootDir, 'backend', '.env.dev'),
    prod: path.join(rootDir, 'backend', '.env.prod'),
    current: path.join(rootDir, 'backend', '.env')
  },
  frontend: {
    dev: path.join(rootDir, 'frontend', '.env.dev'),
    prod: path.join(rootDir, 'frontend', '.env.prod'),
    current: path.join(rootDir, 'frontend', '.env')
  }
}

let switched = false

// Switch backend .env
if (fs.existsSync(configs.backend[mode])) {
  fs.copyFileSync(configs.backend[mode], configs.backend.current)
  console.log(`✓ Backend switched to ${mode} mode`)
  switched = true
} else {
  console.warn(`⚠ Backend .env.${mode} not found, skipping`)
}

// Switch frontend .env
if (fs.existsSync(configs.frontend[mode])) {
  fs.copyFileSync(configs.frontend[mode], configs.frontend.current)
  console.log(`✓ Frontend switched to ${mode} mode`)
  switched = true
} else {
  console.warn(`⚠ Frontend .env.${mode} not found, skipping`)
}

if (switched) {
  console.log(`\n✅ Successfully switched to ${mode} mode`)
  console.log('⚠️  Restart your dev servers for changes to take effect')
} else {
  console.error('\n❌ No environment files found. Please create .env.dev and .env.prod files first.')
  process.exit(1)
}
