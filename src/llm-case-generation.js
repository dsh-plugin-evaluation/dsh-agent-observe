import { BlockAssembler, createUserMessage } from '@deepseek-ai/dsh-llm'
import { parseGeneratedCases } from './plugin-validation-runner.js'

function promptFor({ pluginId, manifest, count }) {
  const plugin = JSON.stringify({
    name: manifest.name ?? pluginId,
    description: manifest.description ?? '',
    keywords: manifest.keywords ?? [],
    dsh: manifest.dsh ?? {},
  })
  return `为 DSH 插件生成 ${count} 条可执行的中文测试用例。\n插件 manifest：${plugin}\n\n只返回 JSON 数组，不要 Markdown。每项必须包含：\n- title：简短用例名称\n- prompt：给 DSH Agent 的完整中文指令，应明确要求使用插件能力\n- expected：可人工验证的预期结果\n\n只生成与 manifest 可推断功能相关的用例；不确定插件能力时，生成验证其公开描述或可观测行为的用例。`
}

async function generateText(ctx, prompt, system, maxTokens, selectedModel, allowTruncated = false) {
  const route = selectedModel ?? ctx.agentDefaultModel.currentSelection()
  if (!route?.provider || !route?.model) throw new Error('当前 DSH 未配置默认模型')
  const assembler = new BlockAssembler()
  const messages = [createUserMessage({
    content: [{ type: 'text', text: prompt }],
    source: { kind: 'plugin', plugin: 'dsh-agent-observe' },
  })]
  for await (const chunk of ctx.llm.stream({ provider: route.provider, model: route.model, messages, system, maxTokens })) assembler.push(chunk)
  if (assembler.finish?.kind === 'error' || assembler.finish?.kind === 'aborted') {
    throw new Error(assembler.finish.failure.message)
  }
  if (assembler.finish?.kind === 'max-tokens' && !allowTruncated) throw new Error('模型输出达到长度上限')
  if (assembler.finish?.kind === 'tool-calls') throw new Error('模型意外请求了工具调用')
  const text = assembler.blocks().filter(block => block.type === 'text').map(block => block.text).join('')
  if (!text.trim()) throw new Error(`模型未返回文本（结束状态：${assembler.finish?.kind ?? 'unknown'}）`)
  return text
}

export async function generatePluginCases(ctx, request) {
  const text = await generateText(ctx, promptFor(request), '你是插件测试工程师。输出必须严格是 JSON 数组，不能使用 Markdown 或解释文字。', 4096, request.model)
  try {
    return parseGeneratedCases(text, request.count)
  } catch {
    const repaired = await generateText(ctx,
      `将以下模型输出转换为严格 JSON 数组。数组每项必须包含非空字符串 title、prompt、expected；保留原意，不要添加说明或 Markdown。\n\n原始输出：\n${text}`,
      '只输出 JSON 数组。',
      4096,
      request.model,
    )
    try {
      return parseGeneratedCases(repaired, request.count)
    } catch {
      const initialShape = text.trim().length === 0 ? '为空' : text.includes('[') ? '包含数组标记但无法解析' : '不包含数组标记'
      const repairedShape = repaired.trim().length === 0 ? '为空' : repaired.includes('[') ? '包含数组标记但无法解析' : '不包含数组标记'
      throw new Error(`模型输出格式无效（首次：${initialShape}；修复：${repairedShape}）`)
    }
  }
}

export async function judgePluginCase(ctx, { expected, output, model }) {
  const text = await generateText(ctx,
    `预期：${expected}\n实际：${output}\n\n结论：`,
    '判断实际结果是否满足预期。只能输出 PASS 或 FAIL 其中一个词，禁止推理、解释、Markdown、标点和其他任何内容。',
    256,
    model,
    true,
  )
  return /\bPASS\b/i.test(text) || /结论\s*[：:]?\s*通过/.test(text)
}
