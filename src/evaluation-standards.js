import { access, mkdir, readFile } from 'node:fs/promises'
import { constants } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'

const evaluationRoot = process.env.DSH_EVALUATION_HOME ?? resolve(process.env.DSH_HOME ?? homedir(), 'evaluation')
export const STANDARDS_ROOT = process.env.DSH_STANDARDS_ROOT ?? resolve(evaluationRoot, 'dsh-plugin-evaluation-standards')
export const DATASET_ROOT = process.env.DSH_DATASET_ROOT ?? resolve(evaluationRoot, 'dsh-security-evaluation-dataset')
export const STANDARDS_VERSION = '1.0.0'
export const STANDARDS_SOURCE = {
  repository: 'https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards.git',
  ref: 'main',
}

async function readJson(path, read = target => readFile(target, 'utf8')) {
  return JSON.parse(await read(path, 'utf8'))
}

function run(command, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.once('error', reject)
    child.once('close', code => code === 0 ? resolvePromise() : reject(new Error(`${command} 退出码：${code}`)))
  })
}

async function directoryExists(path) {
  try {
    await access(path, constants.R_OK)
    return true
  } catch {
    return false
  }
}

export async function ensureEvaluationSource({ root, repository, ref, execute = run } = {}) {
  if (await directoryExists(resolve(root, '.git'))) return root
  await mkdir(resolve(root, '..'), { recursive: true })
  await execute('git', ['clone', '--depth', '1', '--branch', ref, repository, root])
  return root
}

async function loadProfile(entry, { standardsRoot, datasetRoot, read, execute }) {
  const external = entry.source?.type === 'external'
  if (external && !read) {
    await ensureEvaluationSource({
      root: datasetRoot,
      repository: `${entry.source.repository}.git`,
      ref: entry.source.ref,
      execute,
    })
  }
  const profilePath = entry.source?.profilePath ?? entry.path
  if (typeof profilePath !== 'string') throw new Error(`评测方案 ${entry.id} 缺少 profilePath`)
  const sourceRoot = external ? datasetRoot : standardsRoot
  const profile = await readJson(resolve(sourceRoot, profilePath), read)
  const cases = await readJson(resolve(sourceRoot, profile.casesPath), read)
  if (!Array.isArray(cases.cases) || cases.cases.length === 0) throw new Error(`${profile.id} 没有测试用例`)
  return { profile, cases }
}

export async function listEvaluationProfiles({ root = STANDARDS_ROOT, datasetRoot = DATASET_ROOT, read, execute } = {}) {
  if (!read) await ensureEvaluationSource({ root, ...STANDARDS_SOURCE, execute })
  const catalog = await readJson(resolve(root, 'catalog.json'), read)
  if (!Array.isArray(catalog.profiles)) throw new Error('评测方案目录格式无效')
  return catalog.profiles.map(entry => ({
    id: entry.id,
    name: entry.name,
    version: entry.version,
    description: entry.description,
    metrics: entry.metrics,
    caseCount: entry.caseCount,
    standardVersion: STANDARDS_VERSION,
  }))
}

export async function loadEvaluationProfiles(profileIds, { root = STANDARDS_ROOT, datasetRoot = DATASET_ROOT, read, execute } = {}) {
  if (!Array.isArray(profileIds) || profileIds.length === 0) throw new Error('至少选择一个评测方案')
  if (!read) await ensureEvaluationSource({ root, ...STANDARDS_SOURCE, execute })
  const catalog = await readJson(resolve(root, 'catalog.json'), read)
  const entries = new Map((catalog.profiles ?? []).map(entry => [entry.id, entry]))
  const selections = []
  for (const id of profileIds) {
    const entry = entries.get(id)
    if (!entry) throw new Error(`未找到评测方案：${id}`)
    const { profile, cases } = await loadProfile(entry, { standardsRoot: root, datasetRoot, read, execute })
    selections.push({
      id: profile.id,
      name: profile.name,
      version: profile.version,
      standardVersion: STANDARDS_VERSION,
      metrics: profile.metrics,
      cases: cases.cases.map(item => ({ ...item, profileId: profile.id, profileName: profile.name, profileVersion: profile.version })),
    })
  }
  return selections
}
