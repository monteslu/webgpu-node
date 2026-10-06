// Packs the npm tarball, installs it into a scratch project next to the
// native-dawn that is installed here, and runs a consumer script.
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { root, run } from './common.mjs'

const npm = process.env.npm_execpath
if (!npm) throw new Error('Run this through npm run test:package')
function npmRun(args, options = {}) {
  const result = spawnSync(process.execPath, [npm, ...args], { cwd: root, stdio: 'inherit', ...options })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`npm ${args[0]} failed (${result.status})`)
  return result
}
const nativeDawn = await fs.realpath(path.dirname(createRequire(import.meta.url).resolve('native-dawn/package.json')))
const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'webgpu-node-consumer-'))
try {
  const packed = npmRun(['pack', '--json', '--pack-destination', temporary], { stdio: 'pipe', encoding: 'utf8' })
  const [metadata] = JSON.parse(packed.stdout)
  const leaked = metadata.files.filter(f => /^(node_modules|test)\//.test(f.path))
  if (leaked.length) throw new Error(`npm package includes ${leaked.map(f => f.path).join(', ')}`)
  await fs.writeFile(path.join(temporary, 'package.json'), '{"name":"webgpu-node-consumer","private":true,"type":"module"}\n')
  // native-dawn is linked rather than installed, so its native build is reused.
  npmRun(['install', '--omit=dev', '--no-audit', '--no-fund', '--install-links=false', nativeDawn, path.join(temporary, metadata.filename)], { cwd: temporary })
  await fs.copyFile(path.join(root, 'test/consumer.mjs'), path.join(temporary, 'consumer.mjs'))
  run(process.execPath, ['consumer.mjs'], { cwd: temporary })
  console.log('Packed npm consumer passed')
} finally { await fs.rm(temporary, { recursive: true, force: true }) }
