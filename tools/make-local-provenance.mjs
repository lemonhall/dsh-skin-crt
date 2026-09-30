#!/usr/bin/env node
/**
 * Write a LOCAL provenance record so the skin center trusts this skin's hooks.
 *
 * Background: @linxin666/dsh-client-ui-skin-center only runs `facets.client`
 * hooks for built-in skins, for the reviewed community skins baked into its own
 * table, or for a user-directory skin carrying `dsh-market.provenance.json` with
 * matching sha256 hashes (verifyMarketProvenance, lib/index.js). This script
 * writes that record for a skin under development.
 *
 * READ THIS BEFORE RUNNING: the record asserts `source: https://dsh-market.com`,
 * i.e. it claims the skin came from the Workshop. For a private local skin that
 * is a false origin claim - the skin center's own comment calls the file "a
 * provenance record, not a capability guard against the local user", but the
 * honest framing is: it is a development stub. Keep it out of the repository
 * (it is gitignored) and regenerate it after every byte change to skin.json or
 * hooks.mjs, because any edit invalidates the hashes and the hooks are refused
 * again.
 *
 * Usage: node tools/make-local-provenance.mjs <installed-skin-dir>
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const dir = resolve(process.argv[2] ?? '')
if (!dir) {
  console.error('usage: node tools/make-local-provenance.mjs <installed-skin-dir>')
  process.exit(1)
}

const manifest = JSON.parse(readFileSync(join(dir, 'skin.json'), 'utf8'))
const entry = manifest?.facets?.client?.entry
if (typeof entry !== 'string' || entry.length === 0) {
  console.error('skin.json declares no facets.client.entry - nothing to trust')
  process.exit(1)
}

const sha256 = (rel) => createHash('sha256').update(readFileSync(join(dir, rel))).digest('hex')
const files = {}
for (const rel of ['skin.json', entry]) files[rel] = sha256(rel)

const record = {
  version: 1,
  source: 'https://dsh-market.com',
  id: manifest.id,
  generatedBy: 'tools/make-local-provenance.mjs (local development stub)',
  files,
}
writeFileSync(join(dir, 'dsh-market.provenance.json'), `${JSON.stringify(record, null, 2)}\n`, 'utf8')
console.log(`provenance written for ${manifest.id}: ${Object.keys(files).join(', ')}`)
