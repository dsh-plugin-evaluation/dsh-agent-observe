import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { resolve } from 'node:path'

const evaluationRoot = process.env.DSH_EVALUATION_HOME ?? resolve(process.env.DSH_HOME ?? homedir(), 'evaluation')
export const STANDARDS_ROOT = process.env.DSH_STANDARDS_ROOT ?? resolve(evaluationRoot, 'dsh-plugin-evaluation-standards')
export const DATASET_ROOT = process.env.DSH_DATASET_ROOT ?? resolve(evaluationRoot, 'dsh-security-evaluation-dataset')
export const STANDARDS_VERSION = '1.0.0'

async function readJson(path, read = target => readFile(target, 'utf8')) {
  return JSON.parse(await read(path, 'utf8'))
}

async function loadProfile(entry, { standardsRoot, datasetRoot, read }) {
  const profilePath = entry.source?.profilePath ?? entry.path
  if (typeof profilePath !== 'string') throw new Error(`评测方案 ${entry.id} 缺少 profilePath`)
  const external = entry.source?.type === 'external'
  const profile = await readJson(resolve(external ? datasetRoot : standardsRoot, profilePath), read)
  const cases = await readJson(resolve(external ? datasetRoot : standardsRoot, profile.casesPath), read)
  if (!Array.isArray(cases.cases) || cases.cases.length === 0) throw new Error(`${profile.id} 没有测试用例`)
  return { profile, cases }
}

export async function listEvaluationProfiles({ root = STANDARDS_ROOT, datasetRoot = DATASET_ROOT, read } = {}) {
  const catalog = await readJson(resolve(root, 'catalog.json'), read)
  if (!Array.isArray(catalog.profiles)) throw new Error('评测方案目录格式无效')
  return Promise.all(catalog.profiles.map(async entry => {
    const { profile, cases } = await loadProfile(entry, { standardsRoot: root, datasetRoot, read })
    return {
      id: profile.id,
      name: profile.name,
      version: profile.version,
      description: profile.description,
      metrics: profile.metrics,
      caseCount: cases.cases.length,
      standardVersion: STANDARDS_VERSION,
    }
  }))
}

export async function loadEvaluationProfiles(profileIds, { root = STANDARDS_ROOT, datasetRoot = DATASET_ROOT, read } = {}) {
  if (!Array.isArray(profileIds) || profileIds.length === 0) throw new Error('至少选择一个评测方案')
  const catalog = await readJson(resolve(root, 'catalog.json'), read)
  const entries = new Map((catalog.profiles ?? []).map(entry => [entry.id, entry]))
  const selections = []
  for (const id of profileIds) {
    const entry = entries.get(id)
    if (!entry) throw new Error(`未找到评测方案：${id}`)
    const { profile, cases } = await loadProfile(entry, { standardsRoot: root, datasetRoot, read })
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
