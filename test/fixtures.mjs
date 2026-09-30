import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

/** Allocate an exclusive project-local test directory and remove it after teardown. */
export function testDirectory(t) {
  const dir = join(process.cwd(), '.test-work', randomUUID())
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}
