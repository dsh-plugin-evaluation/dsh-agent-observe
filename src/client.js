window.__ModuleLoader__.load({
  id: 'dsh-agent-observe',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    const React = require('react')
    const { Modal, Button, IconChecklistOutline14, Toast } = require('@deepseek-ai/dsh-client-ui-primitives')

    const NS = 'agent-observe'
    const zh = {
      'view.observe': '观测',
      'view.evaluation': '评测',
      'summary.title': 'Session 观测',
      'summary.subtitle': '基于完整会话日志的行为、成本与可靠性视图',
      'metric.turns': 'Turns',
      'metric.steps': 'Steps',
      'metric.tools': '工具调用',
      'metric.cost': '估算成本',
      'metric.perTurn': '平均 {value} 步 / Turn',
      'metric.errors': '{value} 次错误',
      'metric.tokens': '{value} Tokens',
      'duration.title': '执行耗时',
      'duration.llm': '模型推理',
      'duration.tools': '工具执行',
      'duration.other': '其他',
      'tokens.title': 'Token 与成本',
      'tokens.input': '输入 Token',
      'tokens.output': '输出 Token',
      'tokens.cache': '缓存读取',
      'tokens.costNote': '成本按观察插件价格表估算，仅供参考。',
      'tools.title': '工具质量',
      'tools.name': '工具',
      'tools.calls': '调用数',
      'tools.errors': '错误数',
      'tools.success': '成功率',
      'tools.average': '平均耗时',
      'tools.empty': '当前 Session 尚无工具调用',
      'anomalies.title': '异常提示',
      'anomalies.clean': '暂未检测到明显异常',
      'anomalies.turnErrors': 'Session 中有 {value} 个 Turn 以错误或中止结束',
      'anomalies.toolErrors': '工具调用失败 {value} 次，建议在轨迹中核对输入与错误结果',
      'anomalies.approvalDenied': '有 {value} 次审批被拒绝，可能影响任务完成路径',
      'anomalies.stepDensity': '平均每 Turn {value} 步，高于建议关注阈值',
      'anomalies.modelMissing': '尚未记录模型路由，成本使用默认价格估算',
      'failures.title': '工具失败证据',
      'failures.subtitle': '最近失败来自原始 Session 事件；候选需人工准入后才能进入回归集。',
      'failures.empty': '当前 Session 没有可下钻的工具失败证据',
      'failures.turnStep': 'Turn {turn} · Step {step}',
      'failures.arguments': '调用参数',
      'failures.result': '错误结果',
      'failures.trajectory': '在轨迹中定位',
      'failures.candidate': '创建评测样本候选',
      'candidate.title': '创建 Badcase 候选',
      'candidate.notice': '只保存待审核候选，不会创建可运行回归用例。',
      'candidate.name': '候选标题',
      'candidate.category': '根因分类',
      'candidate.expected': '期望处理',
      'candidate.note': '人工备注',
      'candidate.cancel': '取消',
      'candidate.save': '保存候选',
      'candidate.saved': '候选已保存，等待人工准入',
      'approval.title': '审批',
      'approval.requested': '请求',
      'approval.denied': '拒绝',
      'model.title': '当前模型',
      'model.unknown': '尚未识别',
      'status.attention': '需要关注',
      'status.healthy': '运行正常',
    }
    const en = {
      'view.observe': 'Observe',
      'view.evaluation': 'Evaluation',
      'summary.title': 'Session observability',
      'summary.subtitle': 'Behavior, cost, and reliability derived from the complete session log',
      'metric.turns': 'Turns',
      'metric.steps': 'Steps',
      'metric.tools': 'Tool calls',
      'metric.cost': 'Estimated cost',
      'metric.perTurn': '{value} steps / turn',
      'metric.errors': '{value} errors',
      'metric.tokens': '{value} tokens',
      'duration.title': 'Execution time',
      'duration.llm': 'Model',
      'duration.tools': 'Tools',
      'duration.other': 'Other',
      'tokens.title': 'Tokens and cost',
      'tokens.input': 'Input tokens',
      'tokens.output': 'Output tokens',
      'tokens.cache': 'Cache reads',
      'tokens.costNote': 'Cost is estimated from the observe plugin pricing table.',
      'tools.title': 'Tool quality',
      'tools.name': 'Tool',
      'tools.calls': 'Calls',
      'tools.errors': 'Errors',
      'tools.success': 'Success rate',
      'tools.average': 'Average duration',
      'tools.empty': 'No tool calls in this session yet',
      'anomalies.title': 'Signals',
      'anomalies.clean': 'No obvious anomalies detected',
      'anomalies.turnErrors': '{value} turns ended in an error or abort',
      'anomalies.toolErrors': '{value} tool calls failed; inspect their input and results in Trajectory',
      'anomalies.approvalDenied': '{value} approvals were rejected and may have changed the completion path',
      'anomalies.stepDensity': '{value} average steps per turn is above the attention threshold',
      'anomalies.modelMissing': 'No model route recorded yet; cost uses fallback pricing',
      'failures.title': 'Tool failure evidence',
      'failures.subtitle': 'Recent failures come from raw Session events; candidates need human admission before regression.',
      'failures.empty': 'No tool failure evidence is available in this session',
      'failures.turnStep': 'Turn {turn} · Step {step}',
      'failures.arguments': 'Arguments',
      'failures.result': 'Error result',
      'failures.trajectory': 'Locate in Trajectory',
      'failures.candidate': 'Create evaluation candidate',
      'candidate.title': 'Create Badcase candidate',
      'candidate.notice': 'This only saves a review candidate; it does not create a runnable regression case.',
      'candidate.name': 'Candidate title',
      'candidate.category': 'Root-cause category',
      'candidate.expected': 'Expected handling',
      'candidate.note': 'Human note',
      'candidate.cancel': 'Cancel',
      'candidate.save': 'Save candidate',
      'candidate.saved': 'Candidate saved for human admission',
      'approval.title': 'Approvals',
      'approval.requested': 'Requested',
      'approval.denied': 'Denied',
      'model.title': 'Current model',
      'model.unknown': 'Not detected',
      'status.attention': 'Needs attention',
      'status.healthy': 'Healthy',
    }

    const STYLE_ID = 'dsh-agent-observe/client'
    const CSS = `
      .aob-root{height:100%;overflow:auto;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-sizing:border-box;padding:28px 32px calc(var(--dsh-composer-height,152px) + 28px)}
      .aob-shell{width:min(1060px,100%);margin:0 auto;display:flex;flex-direction:column;gap:22px}
      .aob-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.aob-heading h1{font-size:24px;line-height:1.25;margin:0 0 6px;font-weight:650}.aob-heading p{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px}.aob-status{border:1px solid var(--dsw-alias-stroke-subtle);border-radius:999px;padding:6px 11px;font-size:12px;white-space:nowrap}.aob-status[data-alert=true]{color:var(--dsw-alias-status-warning);background:color-mix(in srgb,var(--dsw-alias-status-warning) 10%,transparent)}
      .aob-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.aob-card,.aob-panel{border:1px solid var(--dsw-alias-stroke-subtle);background:var(--dsw-alias-bg-layer-2);border-radius:14px;box-shadow:0 1px 2px rgba(0,0,0,.05)}.aob-card{padding:16px;min-height:86px}.aob-label{color:var(--dsw-alias-label-secondary);font-size:12px;margin-bottom:9px}.aob-value{font-size:23px;line-height:1;font-weight:650;letter-spacing:-.02em}.aob-meta{margin-top:9px;color:var(--dsw-alias-label-tertiary);font-size:11px}
      .aob-grid{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(280px,.65fr);gap:14px}.aob-panel{padding:18px}.aob-panel h2{font-size:15px;margin:0 0 16px}.aob-bars{display:flex;flex-direction:column;gap:13px}.aob-barRow{display:grid;grid-template-columns:84px minmax(0,1fr) 58px;gap:10px;align-items:center;font-size:12px}.aob-track{height:8px;border-radius:999px;background:var(--dsw-alias-bg-layer-3);overflow:hidden}.aob-fill{height:100%;min-width:2px;border-radius:inherit;background:linear-gradient(90deg,#168cff,#55c2ff)}.aob-fill.tool{background:linear-gradient(90deg,#6865ff,#9f8cff)}.aob-fill.other{background:var(--dsw-alias-label-tertiary)}.aob-barValue{text-align:right;color:var(--dsw-alias-label-secondary)}
      .aob-facts{display:grid;grid-template-columns:1fr 1fr;gap:12px}.aob-fact{padding:12px;border-radius:10px;background:var(--dsw-alias-bg-layer-3)}.aob-fact strong{display:block;font-size:17px;margin-top:5px}.aob-note{font-size:11px;color:var(--dsw-alias-label-tertiary);margin:13px 0 0;line-height:1.5}
      .aob-signals{display:flex;flex-direction:column;gap:9px}.aob-signal{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid var(--dsw-alias-stroke-subtle);border-radius:10px;font-size:12px;line-height:1.5}.aob-dot{width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-status-warning);margin-top:5px;flex:0 0 auto}.aob-clean .aob-dot{background:var(--dsw-alias-status-success)}
      .aob-tableWrap{overflow-x:auto}.aob-table{width:100%;border-collapse:collapse;font-size:12px}.aob-table th{text-align:left;color:var(--dsw-alias-label-secondary);font-weight:500;padding:0 12px 10px;border-bottom:1px solid var(--dsw-alias-stroke-subtle)}.aob-table td{padding:12px;border-bottom:1px solid var(--dsw-alias-stroke-subtle)}.aob-table tr:last-child td{border-bottom:0}.aob-code{font-family:var(--dsw-font-family-mono,monospace);font-size:11px;background:var(--dsw-alias-bg-layer-3);padding:3px 7px;border-radius:6px}.aob-empty{color:var(--dsw-alias-label-secondary);font-size:12px;padding:12px 0}.aob-danger{color:var(--dsw-alias-status-danger)}
      .aob-subtitle{margin:-8px 0 14px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}.aob-failures{display:flex;flex-direction:column;gap:9px}.aob-failure{border:1px solid color-mix(in srgb,var(--dsw-alias-status-danger) 35%,var(--dsw-alias-stroke-subtle));border-radius:11px;overflow:hidden}.aob-failure summary{cursor:pointer;list-style:none;padding:13px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px}.aob-failure summary::-webkit-details-marker{display:none}.aob-failureTitle{display:flex;align-items:center;gap:9px;min-width:0}.aob-failureMessage{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aob-badge{font-size:10px;color:var(--dsw-alias-status-danger);background:color-mix(in srgb,var(--dsw-alias-status-danger) 10%,transparent);padding:3px 7px;border-radius:999px;white-space:nowrap}.aob-evidence{border-top:1px solid var(--dsw-alias-stroke-subtle);padding:13px 14px}.aob-evidenceMeta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.aob-pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto;background:var(--dsw-alias-bg-layer-3);border-radius:8px;padding:10px;font:11px/1.5 var(--dsw-font-family-mono,monospace);margin:5px 0 11px}.aob-actions{display:flex;gap:8px;flex-wrap:wrap}.aob-button{appearance:none;border:1px solid var(--dsw-alias-stroke-subtle);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);border-radius:8px;padding:7px 10px;font-size:12px;cursor:pointer}.aob-button.primary{background:#168cff;border-color:#168cff;color:#fff}.aob-button.danger{color:var(--dsw-alias-status-danger)}.aob-overlay{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:24px}.aob-modal{width:min(700px,100%);max-height:calc(100vh - 48px);overflow:auto;border:1px solid var(--dsw-alias-stroke-subtle);background:var(--dsw-alias-bg-layer-2);border-radius:15px;padding:21px;box-shadow:0 18px 60px rgba(0,0,0,.3)}.aob-modal.wide{width:min(1120px,100%)}.aob-modal h2{margin:0 0 8px;font-size:19px}.aob-notice{padding:10px 12px;margin:12px 0;border-radius:8px;font-size:12px;line-height:1.5;color:var(--dsw-alias-status-warning);background:color-mix(in srgb,var(--dsw-alias-status-warning) 10%,transparent)}.aob-form{display:grid;gap:12px}.aob-field{display:grid;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}.aob-field input,.aob-field select,.aob-field textarea{box-sizing:border-box;width:100%;border:1px solid var(--dsw-alias-stroke-subtle);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:9px 10px;font:inherit}.aob-field textarea{min-height:76px;resize:vertical}.aob-modalActions{display:flex;justify-content:flex-end;gap:8px}.aob-toast{font-size:12px;color:var(--dsw-alias-status-success);padding:0 2px}
      .aev-root{height:100%;overflow:auto;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-sizing:border-box;padding:22px 26px calc(var(--dsh-composer-height,152px) + 24px)}.aev-root.workspace{padding-bottom:28px}.aev-shell{width:min(1280px,100%);margin:0 auto}.aev-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:18px}.aev-header h1{margin:0 0 5px;font-size:24px}.aev-header p{margin:0;color:var(--dsw-alias-label-secondary);font-size:12px}.aev-nav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}.aev-nav button,.aev-subnav button{border:1px solid var(--dsw-alias-stroke-subtle);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border-radius:9px;padding:8px 12px;cursor:pointer}.aev-nav button.active,.aev-subnav button.active{background:#168cff;border-color:#168cff;color:#fff}.aev-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:16px}.aev-stat{border:1px solid var(--dsw-alias-stroke-subtle);background:var(--dsw-alias-bg-layer-2);border-radius:12px;padding:14px}.aev-stat span{display:block;color:var(--dsw-alias-label-secondary);font-size:11px}.aev-stat strong{display:block;font-size:22px;margin-top:7px}.aev-panel{border:1px solid var(--dsw-alias-stroke-subtle);background:var(--dsw-alias-bg-layer-2);border-radius:13px;padding:16px;margin-bottom:14px}.aev-panelHead{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:13px}.aev-panelHead h2{margin:0;font-size:15px}.aev-subnav{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}.aev-metricsCompact{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.aev-metricsCompact span{width:100%;margin-bottom:-3px}.aev-metricsCompact label{display:inline-flex;align-items:center;gap:3px;color:var(--dsw-alias-label-primary)}.aev-tableWrap{overflow:auto}.aev-table{width:100%;border-collapse:collapse;font-size:12px;min-width:840px}.aev-table th,.aev-table td{text-align:left;padding:10px;border-bottom:1px solid var(--dsw-alias-stroke-subtle);vertical-align:top}.aev-table th{color:var(--dsw-alias-label-secondary);font-weight:500}.aev-pill{display:inline-block;border-radius:999px;padding:3px 7px;font-size:10px;background:var(--dsw-alias-bg-layer-3);margin:0 4px 4px 0}.aev-pill.warn{color:#4096ff;background:color-mix(in srgb,#1677ff 12%,var(--dsw-alias-bg-layer-3))}.aev-pill.ok{color:var(--dsw-alias-status-success);background:color-mix(in srgb,var(--dsw-alias-status-success) 12%,var(--dsw-alias-bg-layer-3))}.aev-pill.bad{color:var(--dsw-alias-status-danger);background:color-mix(in srgb,var(--dsw-alias-status-danger) 12%,var(--dsw-alias-bg-layer-3))}.aev-recordAction{border-color:transparent}.aev-recordAction.draft{background:#1677ff;border-color:#1677ff;color:#fff}.aev-recordAction.failed{color:var(--dsw-alias-status-danger)}.aev-recordAction.passed{color:var(--dsw-alias-status-success)}.aev-empty{padding:30px 10px;text-align:center;color:var(--dsw-alias-label-secondary);font-size:12px}.aev-toolbar{display:flex;gap:8px;flex-wrap:wrap}.aev-toolbar input,.aev-toolbar select{border:1px solid var(--dsw-alias-stroke-subtle);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:8px;padding:7px 9px}.aev-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.aev-card{border:1px solid var(--dsw-alias-stroke-subtle);background:var(--dsw-alias-bg-layer-3);border-radius:10px;padding:13px}.aev-card h3{margin:0 0 7px;font-size:13px}.aev-card p{margin:0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.55}.aev-traceGrid{display:grid;grid-template-columns:280px minmax(0,1fr);gap:12px}.aev-timeline{border-right:1px solid var(--dsw-alias-stroke-subtle);padding-right:12px}.aev-step{padding:9px;border-left:2px solid var(--dsw-alias-stroke-subtle);margin-bottom:8px}.aev-step.error{border-color:var(--dsw-alias-status-danger)}.aev-checks{display:grid;gap:7px}.aev-check{display:flex;justify-content:space-between;padding:9px;border-radius:8px;background:var(--dsw-alias-bg-layer-3);font-size:12px}.aev-workspaceOverlay{position:fixed;inset:0;z-index:900;background:var(--dsw-alias-bg-layer-1);overflow:hidden}.aev-launcher{display:flex;align-items:center;gap:8px;width:calc(100% + 8px);height:34px;margin:4px -4px 4px;padding:6px 2px 6px 10px;box-sizing:border-box;border:0;border-radius:12px;background:transparent;color:var(--dsw-alias-label-primary);cursor:pointer;overflow:hidden;font:14px/22px inherit;text-align:left}.aev-launcher:hover{background:var(--dsw-alias-interactive-bg-hover)}.aev-launcherLabel{overflow:hidden;white-space:nowrap}.aev-launcher[data-compact=true]{justify-content:center;gap:0;width:36px;height:36px;margin:8px 0 10px;padding:0;border-radius:50%}
      .aev-createModal{width:min(680px,100%)}.aev-createForm{gap:16px}.aev-createForm .aob-field{gap:7px;font-size:13px}.aev-control{box-sizing:border-box;width:100%;height:36px;padding:7px 11px;border:1px solid var(--dsw-alias-stroke-subtle);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit;line-height:20px;transition:border-color .2s,box-shadow .2s}.aev-control:hover{border-color:#4096ff}.aev-control:focus{border-color:#1677ff;outline:0;box-shadow:0 0 0 2px rgba(5,145,255,.12)}.aev-control:disabled{cursor:not-allowed;color:var(--dsw-alias-label-tertiary);background:var(--dsw-alias-bg-layer-3)}.aev-selectWrap{position:relative}.aev-select{appearance:none;padding-right:35px;cursor:pointer}.aev-selectArrow{position:absolute;right:12px;top:50%;color:var(--dsw-alias-label-secondary);font-size:16px;line-height:1;pointer-events:none;transform:translateY(-58%)}.aev-select:disabled{cursor:not-allowed}.aev-select:disabled+.aev-selectArrow{opacity:.5}.aev-profileModal{width:min(680px,100%)}.aev-profilePicker{display:grid;gap:10px}.aev-profileOption{display:flex;gap:10px;align-items:flex-start;padding:12px;border:1px solid var(--dsw-alias-stroke-subtle);border-radius:9px;background:var(--dsw-alias-bg-layer-3);cursor:pointer}.aev-profileOption:hover,.aev-profileOption[data-checked=true]{border-color:#4096ff}.aev-profileOption[data-checked=true]{background:color-mix(in srgb,#1677ff 8%,var(--dsw-alias-bg-layer-3))}.aev-profileOption input{width:15px;height:15px;margin:2px 0 0;accent-color:#1677ff}.aev-profileOption span{display:grid;gap:4px}.aev-profileOption strong{font-size:13px}.aev-profileOption small{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.45}.aev-selectedProfiles{display:flex;flex-wrap:wrap;gap:6px}.aev-selectedProfiles span,.aev-profileEmpty{font-size:11px}.aev-selectedProfiles span{padding:4px 7px;border-radius:999px;color:#4096ff;background:color-mix(in srgb,#1677ff 12%,var(--dsw-alias-bg-layer-3))}.aev-profileEmpty{color:var(--dsw-alias-label-secondary)}.aev-caseGroups,.aev-resultGroups{display:grid;gap:14px}.aev-caseGroup,.aev-resultGroup{border:1px solid var(--dsw-alias-stroke-subtle);border-radius:10px;overflow:hidden}.aev-caseGroup .aev-tableWrap{padding:0 10px}.aev-caseGroupHead{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;background:var(--dsw-alias-bg-layer-3);border-bottom:1px solid var(--dsw-alias-stroke-subtle);font-size:12px}.aev-caseGroupHead span{color:var(--dsw-alias-label-secondary);font-size:11px}.aev-resultGroup{padding:0 10px 10px}.aev-resultGroup .aev-caseGroupHead{margin:0 -10px 9px}.aev-caseGroups+.aob-actions{margin-top:14px}@media(max-width:600px){.aev-metricGroup{grid-template-columns:1fr}}
      .aev-pagination{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:14px;color:var(--dsw-alias-label-secondary);font-size:12px}.aev-pagination button{min-width:30px;height:30px;border:1px solid var(--dsw-alias-stroke-subtle);border-radius:7px;background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-primary);cursor:pointer}.aev-pagination button:hover:not(:disabled){border-color:#4096ff;color:#4096ff}.aev-pagination button:disabled{cursor:not-allowed;opacity:.45}.aev-pagination span{margin-right:4px}
      .aev-resultSummary{display:grid;grid-template-columns:minmax(180px,1.25fr) repeat(3,minmax(100px,.75fr));gap:10px;margin-bottom:14px}.aev-resultHero,.aev-resultStat{border:1px solid var(--dsw-alias-stroke-subtle);border-radius:10px;padding:13px;background:var(--dsw-alias-bg-layer-3)}.aev-resultHero.bad{border-color:color-mix(in srgb,var(--dsw-alias-status-danger) 50%,var(--dsw-alias-stroke-subtle));background:color-mix(in srgb,var(--dsw-alias-status-danger) 8%,var(--dsw-alias-bg-layer-3))}.aev-resultHero.ok{border-color:color-mix(in srgb,var(--dsw-alias-status-success) 50%,var(--dsw-alias-stroke-subtle));background:color-mix(in srgb,var(--dsw-alias-status-success) 8%,var(--dsw-alias-bg-layer-3))}.aev-resultHero strong{display:block;font-size:16px;margin-bottom:4px}.aev-resultHero span,.aev-resultStat span{display:block;color:var(--dsw-alias-label-secondary);font-size:11px}.aev-resultStat strong{display:block;margin-top:6px;font-size:20px}.aev-resultStat.ok{border-color:color-mix(in srgb,var(--dsw-alias-status-success) 45%,var(--dsw-alias-stroke-subtle));background:color-mix(in srgb,var(--dsw-alias-status-success) 7%,var(--dsw-alias-bg-layer-3))}.aev-resultStat.ok strong{color:var(--dsw-alias-status-success)}.aev-resultStat.bad{border-color:color-mix(in srgb,var(--dsw-alias-status-danger) 45%,var(--dsw-alias-stroke-subtle));background:color-mix(in srgb,var(--dsw-alias-status-danger) 7%,var(--dsw-alias-bg-layer-3))}.aev-resultStat.bad strong{color:var(--dsw-alias-status-danger)}.aev-resultList{display:grid;gap:9px}.aev-resultCase{border:1px solid color-mix(in srgb,var(--dsw-alias-status-success) 40%,var(--dsw-alias-stroke-subtle));border-left:3px solid var(--dsw-alias-status-success);border-radius:9px;background:color-mix(in srgb,var(--dsw-alias-status-success) 6%,var(--dsw-alias-bg-layer-3));padding:12px}.aev-resultCase.failed{border-color:color-mix(in srgb,var(--dsw-alias-status-danger) 40%,var(--dsw-alias-stroke-subtle));border-left-color:var(--dsw-alias-status-danger);background:color-mix(in srgb,var(--dsw-alias-status-danger) 6%,var(--dsw-alias-bg-layer-3))}.aev-resultCaseHead{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.aev-resultCase h3{margin:0;font-size:13px}.aev-resultCase p{margin:6px 0 0;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.55}.aev-resultCase .aev-resultError{color:var(--dsw-alias-status-danger)}.aev-resultCase details{margin-top:9px}.aev-resultCase summary{cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px}.aev-resultCase pre{max-height:220px;margin:8px 0 0;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;border-radius:7px;padding:10px;background:var(--dsw-alias-bg-layer-1);font:11px/1.5 var(--dsw-font-family-mono,monospace)}@media(max-width:760px){.aev-resultSummary{grid-template-columns:repeat(2,minmax(0,1fr))}.aev-resultHero{grid-column:1/-1}}
      .aev-running{display:flex;align-items:flex-start;gap:11px;margin-top:13px;padding:12px;border:1px solid color-mix(in srgb,#168cff 40%,var(--dsw-alias-stroke-subtle));border-radius:10px;background:color-mix(in srgb,#168cff 8%,var(--dsw-alias-bg-layer-2))}.aev-spinner{width:16px;height:16px;flex:0 0 auto;border:2px solid color-mix(in srgb,#168cff 25%,transparent);border-top-color:#168cff;border-radius:50%;animation:aev-spin .8s linear infinite;margin-top:1px}.aev-running strong{display:block;font-size:12px;margin-bottom:3px}.aev-running p{margin:0;color:var(--dsw-alias-label-secondary);font-size:11px;line-height:1.55}@keyframes aev-spin{to{transform:rotate(360deg)}}
      @media(max-width:780px){.aob-root{padding:20px 16px calc(var(--dsh-composer-height,152px) + 20px)}.aob-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.aob-grid{grid-template-columns:1fr}.aob-heading{flex-direction:column}.aob-status{align-self:flex-start}}
    `

    function injectStyle() {
      if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`)) return
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-agent-observe'
      tag.dataset.pluginCss = STYLE_ID
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    function formatNumber(value) {
      return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)
    }

    function formatTokens(value) {
      if (value < 1000) return String(value)
      if (value < 1000000) return `${formatNumber(value / 1000)}K`
      return `${formatNumber(value / 1000000)}M`
    }

    function formatDuration(ms) {
      if (ms < 1000) return `${Math.round(ms)}ms`
      if (ms < 60000) return `${formatNumber(ms / 1000)}s`
      const seconds = Math.round(ms / 1000)
      return `${Math.floor(seconds / 60)}m${seconds % 60}s`
    }

    function formatCost(value) {
      if (value < 0.01) return `$${value.toFixed(4)}`
      if (value < 1) return `$${value.toFixed(3)}`
      return `$${value.toFixed(2)}`
    }

    function tr(t, key, values = {}) {
      let text = t(key)
      for (const [name, value] of Object.entries(values)) text = text.replace(`{${name}}`, String(value))
      return text
    }

    function metricCard(label, value, meta) {
      return React.createElement('div', { className: 'aob-card', key: label },
        React.createElement('div', { className: 'aob-label' }, label),
        React.createElement('div', { className: 'aob-value' }, value),
        React.createElement('div', { className: 'aob-meta' }, meta),
      )
    }

    const LEGACY_CANDIDATE_STORAGE_KEY = 'dsh-agent-observe.badcase-candidates'
    const EVALUATION_STORAGE_KEY = 'dsh-agent-observe.evaluation.v1'

    function emptyEvaluationDatabase() {
      return {
        version: 1,
        records: [],
        datasets: [],
        samples: [],
        candidates: [],
        scenarioFamilies: [],
        scoreProfiles: [{ id: 'score-default', name: '默认评分方案', status: 'published', passThreshold: 80, weights: { task: 40, tool: 35, efficiency: 25 } }],
        baselines: [],
        optimizationRequests: [],
        pluginExperiments: [],
        iterations: [],
        releases: [],
      }
    }

    function normalizeEvaluationDatabase(value) {
      const empty = emptyEvaluationDatabase()
      if (typeof value !== 'object' || value === null) return empty
      return Object.fromEntries(Object.entries(empty).map(([key, fallback]) => [
        key,
        key === 'version' ? 1 : Array.isArray(value[key]) ? value[key] : fallback,
      ]))
    }

    function readEvaluationDatabase() {
      let database = emptyEvaluationDatabase()
      try { database = normalizeEvaluationDatabase(JSON.parse(localStorage.getItem(EVALUATION_STORAGE_KEY) ?? 'null')) } catch {}
      try {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_CANDIDATE_STORAGE_KEY) ?? '[]')
        if (Array.isArray(legacy) && legacy.length > 0) {
          const known = new Set(database.candidates.map(item => item.id))
          const migrated = legacy.filter(item => !known.has(item.id)).map(item => ({
            ...item,
            status: item.status === 'draft' ? 'pending_review' : item.status,
            priority: item.priority ?? 'p1',
            admission: item.admission ?? {
              reproducible: true,
              expectedDefined: Boolean(item.expected),
              traceAvailable: Boolean(item.source?.callId),
            },
          }))
          if (migrated.length > 0) {
            database = { ...database, candidates: [...database.candidates, ...migrated] }
            localStorage.removeItem?.(LEGACY_CANDIDATE_STORAGE_KEY)
            localStorage.setItem(EVALUATION_STORAGE_KEY, JSON.stringify(database))
          }
        }
      } catch {}
      return database
    }

    function writeEvaluationDatabase(database) {
      localStorage.setItem(EVALUATION_STORAGE_KEY, JSON.stringify(normalizeEvaluationDatabase(database)))
    }

    function saveCandidate(candidate) {
      const database = readEvaluationDatabase()
      const normalized = {
        ...candidate,
        status: 'pending_review',
        priority: candidate.priority ?? 'p1',
        admission: {
          reproducible: true,
          expectedDefined: Boolean(candidate.expected),
          traceAvailable: Boolean(candidate.source?.callId),
        },
      }
      writeEvaluationDatabase({ ...database, candidates: [...database.candidates, normalized].slice(-500) })
    }

    function formField(label, control) {
      return React.createElement('label', { className: 'aob-field' },
        React.createElement('span', null, label), control)
    }

    function NativeInput({ className = '', ...props }) {
      return React.createElement('input', { ...props, className: `aev-control ${className}`.trim() })
    }

    function NativeSelect({ children, className = '', ...props }) {
      return React.createElement('div', { className: 'aev-selectWrap' },
        React.createElement('select', { ...props, className: `aev-control aev-select ${className}`.trim() }, children),
        React.createElement('span', { className: 'aev-selectArrow', 'aria-hidden': true }, '⌄'))
    }

    function MetricCheckbox({ checked, disabled, label, onChange }) {
      return React.createElement('label', { className: 'aev-metricOption', 'data-checked': checked || undefined },
        React.createElement('input', { type: 'checkbox', checked, disabled, onChange }),
        React.createElement('span', null, label))
    }

    function CandidateModal({ failure, sessionId, model, t, onClose, onSaved }) {
      const [title, setTitle] = React.useState(`${failure.name}: ${failure.errorCode}`)
      const [category, setCategory] = React.useState('unknown')
      const [expected, setExpected] = React.useState('')
      const [note, setNote] = React.useState('')
      const submit = (event) => {
        event.preventDefault()
        saveCandidate({
          id: `badcase-${Date.now()}-${failure.callId}`,
          kind: 'regression', status: 'draft', caseSource: 'badcase', reviewStatus: 'pending',
          title, category, expected, note, createdAt: Date.now(),
          source: {
            sessionId: String(sessionId), callId: failure.callId, turn: failure.turn, step: failure.step,
            model, tool: failure.name, arguments: failure.arguments,
            errorName: failure.errorName, errorCode: failure.errorCode,
            errorMessage: failure.errorMessage, failedAt: failure.failedAt,
          },
        })
        onSaved()
      }
      return React.createElement('div', { className: 'aob-overlay' },
        React.createElement('div', { className: 'aob-modal', role: 'dialog', 'aria-modal': true },
          React.createElement('h2', null, t('candidate.title')),
          React.createElement('div', { className: 'aob-notice' }, t('candidate.notice')),
          React.createElement('form', { className: 'aob-form', onSubmit: submit },
            formField(t('candidate.name'), React.createElement('input', { required: true, value: title, onChange: event => setTitle(event.target.value) })),
            formField(t('candidate.category'), React.createElement('select', { value: category, onChange: event => setCategory(event.target.value) },
              React.createElement('option', { value: 'unknown' }, '待分析'),
              React.createElement('option', { value: 'tool' }, '工具实现 / 运行环境'),
              React.createElement('option', { value: 'input' }, '参数 / 上下文'),
              React.createElement('option', { value: 'permission' }, '权限 / 审批'))),
            formField(t('candidate.expected'), React.createElement('textarea', { required: true, value: expected, onChange: event => setExpected(event.target.value) })),
            formField(t('candidate.note'), React.createElement('textarea', { value: note, onChange: event => setNote(event.target.value) })),
            React.createElement('div', { className: 'aob-code' }, `${sessionId} / ${failure.callId} / Turn ${failure.turn} / Step ${failure.step}`),
            React.createElement('div', { className: 'aob-modalActions' },
              React.createElement('button', { type: 'button', className: 'aob-button', onClick: onClose }, t('candidate.cancel')),
              React.createElement('button', { type: 'submit', className: 'aob-button primary' }, t('candidate.save'))))))
    }

    function FailureEvidence({ failures, openView, openCandidate, t }) {
      return React.createElement('section', { className: 'aob-panel' },
        React.createElement('h2', null, t('failures.title')),
        React.createElement('p', { className: 'aob-subtitle' }, t('failures.subtitle')),
        failures.length === 0
          ? React.createElement('div', { className: 'aob-empty' }, t('failures.empty'))
          : React.createElement('div', { className: 'aob-failures' }, [...failures].reverse().map(failure =>
            React.createElement('details', { className: 'aob-failure', key: failure.callId },
              React.createElement('summary', null,
                React.createElement('div', { className: 'aob-failureTitle' },
                  React.createElement('span', { className: 'aob-badge' }, failure.errorCode),
                  React.createElement('strong', null, failure.name),
                  React.createElement('span', { className: 'aob-failureMessage' }, failure.errorMessage)),
                React.createElement('span', { className: 'aob-code' }, tr(t, 'failures.turnStep', failure))),
              React.createElement('div', { className: 'aob-evidence' },
                React.createElement('div', { className: 'aob-evidenceMeta' },
                  React.createElement('span', { className: 'aob-code' }, failure.callId),
                  React.createElement('span', { className: 'aob-code' }, formatDuration(failure.durationMs))),
                React.createElement('div', { className: 'aob-label' }, t('failures.arguments')),
                React.createElement('pre', { className: 'aob-pre' }, failure.arguments || '{}'),
                React.createElement('div', { className: 'aob-label' }, t('failures.result')),
                React.createElement('pre', { className: 'aob-pre' }, failure.result || failure.errorMessage),
                React.createElement('div', { className: 'aob-actions' },
                  React.createElement('button', { type: 'button', className: 'aob-button', onClick: () => openView('trajectory', { callId: failure.callId }) }, t('failures.trajectory')),
                  React.createElement('button', { type: 'button', className: 'aob-button primary', onClick: () => openCandidate(failure) }, t('failures.candidate'))))))))
    }

    function ObserveView({ sessionId, useProjection, openView, t }) {
      const [candidateFailure, setCandidateFailure] = React.useState(null)
      const [candidateSaved, setCandidateSaved] = React.useState(false)
      const stats = useProjection('sessionStats') ?? {
        turns: 0, steps: 0, llmMs: 0, toolMs: 0, ttftMs: 0, ttftSteps: 0, decodeMs: 0, decodeTokens: 0,
      }
      const usage = useProjection('tokenUsage') ?? {
        uncachedInputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0,
      }
      const observe = useProjection('agentObserve') ?? {
        model: null, toolCalls: 0, toolErrors: 0, approvals: 0, approvalDenied: 0,
        turnErrors: 0, estimatedCost: 0, tools: {}, failures: [],
      }
      const failures = Array.isArray(observe.failures) ? observe.failures : []
      const inputTokens = usage.uncachedInputTokens + usage.cacheReadTokens + usage.cacheWriteTokens
      const totalTokens = inputTokens + usage.outputTokens
      const stepsPerTurn = stats.turns === 0 ? 0 : stats.steps / stats.turns
      const otherMs = Math.max(0, stats.llmMs + stats.toolMs === 0 ? 0 : stats.ttftMs)
      const durationTotal = Math.max(1, stats.llmMs + stats.toolMs + otherMs)
      const bars = [
        [t('duration.llm'), stats.llmMs, ''],
        [t('duration.tools'), stats.toolMs, 'tool'],
        [t('duration.other'), otherMs, 'other'],
      ]
      const tools = Object.entries(observe.tools).sort((a, b) => b[1].calls - a[1].calls)
      const signals = []
      if (observe.turnErrors > 0) signals.push(tr(t, 'anomalies.turnErrors', { value: observe.turnErrors }))
      if (observe.toolErrors > 0) signals.push(tr(t, 'anomalies.toolErrors', { value: observe.toolErrors }))
      if (observe.approvalDenied > 0) signals.push(tr(t, 'anomalies.approvalDenied', { value: observe.approvalDenied }))
      if (stepsPerTurn >= 4) signals.push(tr(t, 'anomalies.stepDensity', { value: formatNumber(stepsPerTurn) }))
      if (observe.model === null && totalTokens > 0) signals.push(t('anomalies.modelMissing'))
      const attention = signals.length > 0

      return React.createElement('div', { className: 'aob-root' },
        React.createElement('div', { className: 'aob-shell' },
          React.createElement('div', { className: 'aob-heading' },
            React.createElement('div', null,
              React.createElement('h1', null, t('summary.title')),
              React.createElement('p', null, t('summary.subtitle')),
            ),
            React.createElement('span', { className: 'aob-status', 'data-alert': attention },
              attention ? t('status.attention') : t('status.healthy')),
          ),
          React.createElement('div', { className: 'aob-metrics' },
            metricCard(t('metric.turns'), formatNumber(stats.turns), tr(t, 'metric.perTurn', { value: formatNumber(stepsPerTurn) })),
            metricCard(t('metric.steps'), formatNumber(stats.steps), formatDuration(stats.llmMs)),
            metricCard(t('metric.tools'), formatNumber(observe.toolCalls), tr(t, 'metric.errors', { value: observe.toolErrors })),
            metricCard(t('metric.cost'), formatCost(observe.estimatedCost), tr(t, 'metric.tokens', { value: formatTokens(totalTokens) })),
          ),
          React.createElement('div', { className: 'aob-grid' },
            React.createElement('section', { className: 'aob-panel' },
              React.createElement('h2', null, t('duration.title')),
              React.createElement('div', { className: 'aob-bars' }, bars.map(([label, value, kind]) =>
                React.createElement('div', { className: 'aob-barRow', key: label },
                  React.createElement('span', null, label),
                  React.createElement('div', { className: 'aob-track' },
                    React.createElement('div', { className: `aob-fill ${kind}`, style: { width: `${value / durationTotal * 100}%` } }),
                  ),
                  React.createElement('span', { className: 'aob-barValue' }, formatDuration(value)),
                ))),
            ),
            React.createElement('section', { className: 'aob-panel' },
              React.createElement('h2', null, t('tokens.title')),
              React.createElement('div', { className: 'aob-facts' },
                React.createElement('div', { className: 'aob-fact' }, React.createElement('span', { className: 'aob-label' }, t('tokens.input')), React.createElement('strong', null, formatTokens(inputTokens))),
                React.createElement('div', { className: 'aob-fact' }, React.createElement('span', { className: 'aob-label' }, t('tokens.output')), React.createElement('strong', null, formatTokens(usage.outputTokens))),
                React.createElement('div', { className: 'aob-fact' }, React.createElement('span', { className: 'aob-label' }, t('tokens.cache')), React.createElement('strong', null, formatTokens(usage.cacheReadTokens))),
                React.createElement('div', { className: 'aob-fact' }, React.createElement('span', { className: 'aob-label' }, t('model.title')), React.createElement('strong', null, observe.model ?? t('model.unknown'))),
              ),
              React.createElement('p', { className: 'aob-note' }, t('tokens.costNote')),
            ),
          ),
          React.createElement('section', { className: 'aob-panel' },
            React.createElement('h2', null, t('anomalies.title')),
            React.createElement('div', { className: 'aob-signals' },
              signals.length === 0
                ? React.createElement('div', { className: 'aob-signal aob-clean' }, React.createElement('span', { className: 'aob-dot' }), React.createElement('span', null, t('anomalies.clean')))
                : signals.map(signal => React.createElement('div', { className: 'aob-signal', key: signal }, React.createElement('span', { className: 'aob-dot' }), React.createElement('span', null, signal))),
            ),
          ),
          React.createElement(FailureEvidence, {
            failures,
            openView,
            openCandidate: failure => {
              setCandidateSaved(false)
              setCandidateFailure(failure)
            },
            t,
          }),
          candidateSaved
            ? React.createElement('div', { className: 'aob-toast', role: 'status' }, t('candidate.saved'))
            : null,
          React.createElement('section', { className: 'aob-panel' },
            React.createElement('h2', null, t('tools.title')),
            tools.length === 0
              ? React.createElement('div', { className: 'aob-empty' }, t('tools.empty'))
              : React.createElement('div', { className: 'aob-tableWrap' },
                React.createElement('table', { className: 'aob-table' },
                  React.createElement('thead', null, React.createElement('tr', null,
                    React.createElement('th', null, t('tools.name')),
                    React.createElement('th', null, t('tools.calls')),
                    React.createElement('th', null, t('tools.errors')),
                    React.createElement('th', null, t('tools.success')),
                    React.createElement('th', null, t('tools.average')),
                  )),
                  React.createElement('tbody', null, tools.map(([name, row]) => {
                    const success = row.calls === 0 ? 100 : Math.round((row.calls - row.errors) / row.calls * 100)
                    return React.createElement('tr', { key: name },
                      React.createElement('td', null, React.createElement('span', { className: 'aob-code' }, name)),
                      React.createElement('td', null, row.calls),
                      React.createElement('td', { className: row.errors > 0 ? 'aob-danger' : undefined }, row.errors),
                      React.createElement('td', null, `${success}%`),
                      React.createElement('td', null, formatDuration(row.calls === 0 ? 0 : row.totalMs / row.calls)),
                    )
                  })),
                ),
              ),
          ),
          React.createElement('div', { className: 'aob-grid' },
            React.createElement('section', { className: 'aob-panel' },
              React.createElement('h2', null, t('approval.title')),
              React.createElement('div', { className: 'aob-facts' },
                React.createElement('div', { className: 'aob-fact' }, React.createElement('span', { className: 'aob-label' }, t('approval.requested')), React.createElement('strong', null, observe.approvals)),
                React.createElement('div', { className: 'aob-fact' }, React.createElement('span', { className: 'aob-label' }, t('approval.denied')), React.createElement('strong', null, observe.approvalDenied)),
              ),
            ),
          ),
          candidateFailure === null
            ? null
            : React.createElement(CandidateModal, {
              failure: candidateFailure,
              sessionId,
              model: observe.model,
              t,
              onClose: () => setCandidateFailure(null),
              onSaved: () => {
                setCandidateFailure(null)
                setCandidateSaved(true)
              },
            }),
        ),
      )
    }

    function pill(text, kind = '') {
      return React.createElement('span', { className: `aev-pill ${kind}` }, text)
    }

    function emptyState(text) {
      return React.createElement('div', { className: 'aev-empty' }, text)
    }

    function table(headers, rows) {
      return React.createElement('div', { className: 'aev-tableWrap' }, React.createElement('table', { className: 'aev-table' },
        React.createElement('thead', null, React.createElement('tr', null, headers.map(header => React.createElement('th', { key: header }, header)))),
        React.createElement('tbody', null, rows)))
    }

    function TraceModal({ item, openView, onClose }) {
      if (item === null) return null
      const source = item.source ?? {}
      return React.createElement('div', { className: 'aob-overlay' }, React.createElement('div', { className: 'aob-modal wide', role: 'dialog' },
        React.createElement('div', { className: 'aev-panelHead' }, React.createElement('h2', null, `Trace · ${item.title}`), React.createElement('button', { className: 'aob-button', onClick: onClose }, '关闭')),
        React.createElement('div', { className: 'aev-traceGrid' },
          React.createElement('div', { className: 'aev-timeline' },
            React.createElement('div', { className: 'aev-step' }, React.createElement('strong', null, 'Session'), React.createElement('div', null, source.sessionId ?? '-')),
            React.createElement('div', { className: 'aev-step' }, React.createElement('strong', null, `Turn ${source.turn ?? '-'} · Step ${source.step ?? '-'}`)),
            React.createElement('div', { className: 'aev-step error' }, React.createElement('strong', null, source.tool ?? 'Tool'), React.createElement('div', null, source.errorCode ?? '失败'))),
          React.createElement('div', null,
            React.createElement('div', { className: 'aev-cards' },
              React.createElement('div', { className: 'aev-card' }, React.createElement('h3', null, '运行上下文'), React.createElement('p', null, `模型：${source.model ?? '-'}\nCall：${source.callId ?? '-'}`)),
              React.createElement('div', { className: 'aev-card' }, React.createElement('h3', null, '运行结果'), React.createElement('p', null, source.errorMessage ?? item.expected ?? '-'))),
            React.createElement('h3', null, '调用参数'), React.createElement('pre', { className: 'aob-pre' }, source.arguments ?? '{}'),
            React.createElement('div', { className: 'aev-checks' },
              React.createElement('div', { className: 'aev-check' }, React.createElement('span', null, 'Trace 已关联'), pill(source.callId ? '通过' : '缺失', source.callId ? 'ok' : 'warn')),
              React.createElement('div', { className: 'aev-check' }, React.createElement('span', null, '预期已定义'), pill(item.expected ? '通过' : '待补', item.expected ? 'ok' : 'warn'))),
            source.callId ? React.createElement('button', { className: 'aob-button primary', onClick: () => openView('trajectory', { callId: source.callId }) }, '在 DSH 轨迹中定位') : null))))
    }

    function CandidateReviewModal({ candidate, onClose, onDecision }) {
      const [rootCause, setRootCause] = React.useState(candidate?.category ?? '')
      const [expected, setExpected] = React.useState(candidate?.expected ?? '')
      if (candidate === null) return null
      return React.createElement('div', { className: 'aob-overlay' }, React.createElement('div', { className: 'aob-modal', role: 'dialog' },
        React.createElement('h2', null, 'Badcase 准入审核'),
        React.createElement('div', { className: 'aob-notice' }, '只有确认预期、脱敏和代表性后，候选才能进入正式回归集。'),
        React.createElement('div', { className: 'aob-form' },
          formField('根因标签', React.createElement('input', { value: rootCause, onChange: event => setRootCause(event.target.value) })),
          formField('回归期望', React.createElement('textarea', { value: expected, onChange: event => setExpected(event.target.value) })),
          React.createElement('div', { className: 'aob-modalActions' },
            React.createElement('button', { className: 'aob-button', onClick: onClose }, '取消'),
            React.createElement('button', { className: 'aob-button danger', onClick: () => onDecision('rejected', { rootCause, expected }) }, '拒绝'),
            React.createElement('button', { className: 'aob-button', onClick: () => onDecision('needs_evidence', { rootCause, expected }) }, '待补证'),
            React.createElement('button', { className: 'aob-button primary', disabled: !rootCause.trim() || !expected.trim(), onClick: () => onDecision('admitted', { rootCause, expected }) }, '通过并进入回归集')))))
    }

    function PluginExperimentModal({ onClose, onCreate }) {
      const [name, setName] = React.useState('插件快速验证')
      const [baselinePlugins, setBaselinePlugins] = React.useState('')
      const [treatmentPlugins, setTreatmentPlugins] = React.useState('')
      const splitPlugins = value => value.split(',').map(item => item.trim()).filter(Boolean)
      return React.createElement('div', { className: 'aob-overlay' }, React.createElement('div', { className: 'aob-modal', role: 'dialog' },
        React.createElement('h2', null, '快速验证插件'),
        React.createElement('div', { className: 'aob-notice' }, '系统固定默认 Agent、模型、任务集与运行规则；只比较未启用和启用目标插件后的真实 Session 结果。'),
        React.createElement('form', { className: 'aob-form', onSubmit: event => { event.preventDefault(); onCreate({ mode: 'simple', name, agent: '当前默认 Agent', model: '当前默认模型配置', dataset: '插件快速验证集 v1', task: '固定任务模板', baselinePlugins: splitPlugins(baselinePlugins), treatmentPlugins: splitPlugins(treatmentPlugins) }) } },
          formField('验证名称', React.createElement('input', { required: true, value: name, onChange: event => setName(event.target.value) })),
          formField('基线插件（默认关闭目标插件）', React.createElement('input', { value: baselinePlugins, onChange: event => setBaselinePlugins(event.target.value), placeholder: '例如：observe' })),
          formField('启用后的插件', React.createElement('input', { required: true, value: treatmentPlugins, onChange: event => setTreatmentPlugins(event.target.value), placeholder: '例如：observe, demo-knowledge' })),
          React.createElement('div', { className: 'aob-modalActions' }, React.createElement('button', { type: 'button', className: 'aob-button', onClick: onClose }, '取消'), React.createElement('button', { type: 'submit', className: 'aob-button primary' }, '创建快速验证')))))
    }

    function PluginRunResultModal({ experiment, group, onClose, onSave }) {
      const [sessionId, setSessionId] = React.useState('')
      const [totalCases, setTotalCases] = React.useState('3')
      const [passedCases, setPassedCases] = React.useState('0')
      const [toolCalls, setToolCalls] = React.useState('0')
      const [toolErrors, setToolErrors] = React.useState('0')
      const [durationMs, setDurationMs] = React.useState('0')
      const [inputTokens, setInputTokens] = React.useState('0')
      const [outputTokens, setOutputTokens] = React.useState('0')
      const [estimatedCost, setEstimatedCost] = React.useState('0')
      const [failedCases, setFailedCases] = React.useState('')
      const number = value => Math.max(0, Number(value) || 0)
      return React.createElement('div', { className: 'aob-overlay' }, React.createElement('div', { className: 'aob-modal', role: 'dialog' },
        React.createElement('h2', null, `登记${group === 'baseline' ? '基线' : '对比'}组真实运行结果`),
        React.createElement('div', { className: 'aob-notice' }, `${experiment.name}：仅填写真实完成的 DSH Session 指标。未通过的任务会创建待审核 Badcase 候选。`),
        React.createElement('form', { className: 'aob-form', onSubmit: event => { event.preventDefault(); onSave({ group, sessionId: sessionId.trim(), totalCases: number(totalCases), passedCases: number(passedCases), toolCalls: number(toolCalls), toolErrors: number(toolErrors), durationMs: number(durationMs), inputTokens: number(inputTokens), outputTokens: number(outputTokens), estimatedCost: number(estimatedCost), failedCases: failedCases.split('\n').map(item => item.trim()).filter(Boolean), recordedAt: Date.now() }) } },
          formField('真实 Session ID', React.createElement('input', { required: true, value: sessionId, onChange: event => setSessionId(event.target.value), placeholder: '从 DSH Session 复制' })),
          formField('任务总数', React.createElement('input', { required: true, type: 'number', min: 1, value: totalCases, onChange: event => setTotalCases(event.target.value) })),
          formField('通过任务数', React.createElement('input', { required: true, type: 'number', min: 0, value: passedCases, onChange: event => setPassedCases(event.target.value) })),
          formField('工具调用 / 工具错误', React.createElement('div', { className: 'aev-cards' }, React.createElement('input', { type: 'number', min: 0, value: toolCalls, onChange: event => setToolCalls(event.target.value) }), React.createElement('input', { type: 'number', min: 0, value: toolErrors, onChange: event => setToolErrors(event.target.value) }))),
          formField('总耗时（ms）', React.createElement('input', { type: 'number', min: 0, value: durationMs, onChange: event => setDurationMs(event.target.value) })),
          formField('输入 Token / 输出 Token', React.createElement('div', { className: 'aev-cards' }, React.createElement('input', { type: 'number', min: 0, value: inputTokens, onChange: event => setInputTokens(event.target.value) }), React.createElement('input', { type: 'number', min: 0, value: outputTokens, onChange: event => setOutputTokens(event.target.value) }))),
          formField('估算成本', React.createElement('input', { type: 'number', min: 0, step: '0.0001', value: estimatedCost, onChange: event => setEstimatedCost(event.target.value) })),
          formField('失败任务（每行一条，可选）', React.createElement('textarea', { value: failedCases, onChange: event => setFailedCases(event.target.value), placeholder: '例如：refund-window：未回答 30 天时限' })),
          React.createElement('div', { className: 'aob-modalActions' }, React.createElement('button', { type: 'button', className: 'aob-button', onClick: onClose }, '取消'), React.createElement('button', { type: 'submit', className: 'aob-button primary' }, '保存真实结果')))))
    }

    const DEMO_PLUGIN = {
      id: 'demo-knowledge',
      name: '样例知识查询插件',
      description: '查询退款、配送和电子发票知识',
      metrics: ['工具调用成功', '最终答案符合预期', '任务执行成功率', '执行耗时'],
      cases: [
        { id: 'refund-window', title: '查询退款申请时限', prompt: '请使用 demo_knowledge_lookup 工具查询退款时限，并只回答查询到的退款申请默认时限。', expected: '30 天' },
        { id: 'shipping-sla', title: '查询标准配送时效', prompt: '请使用 demo_knowledge_lookup 工具查询标准配送，并只回答查询到的标准配送承诺时效。', expected: '3 个工作日' },
        { id: 'invoice-channel', title: '查询电子发票发送渠道', prompt: '请使用 demo_knowledge_lookup 工具查询电子发票，并只回答查询到的电子发票发送渠道。', expected: '订单绑定邮箱' },
      ],
    }

    function casesForPlugin(pluginId, pluginName) {
      return pluginId === DEMO_PLUGIN.id || pluginName === DEMO_PLUGIN.name ? DEMO_PLUGIN.cases : []
    }

    function EvaluationProfilePicker({ profiles, selectedIds, onClose, onConfirm }) {
      const [query, setQuery] = React.useState('')
      const [draftIds, setDraftIds] = React.useState(selectedIds)
      const normalizedQuery = query.trim().toLowerCase()
      const visibleProfiles = profiles.filter(profile => !normalizedQuery || `${profile.name} ${profile.description} ${profile.metrics.join(' ')}`.toLowerCase().includes(normalizedQuery))
      const toggle = id => setDraftIds(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
      return React.createElement(Modal, {
        open: true,
        className: 'aev-profileModal',
        title: '选择评测方案',
        description: '方案和测试用例来自固定版本的社区评测标准库。可多选，所选方案的用例会全部执行。',
        closeLabel: '关闭',
        onClose,
        footer: React.createElement('div', { className: 'aob-modalActions' },
          React.createElement(Button, { variant: 'ghost', size: 'sm', onClick: onClose }, '取消'),
          React.createElement(Button, { variant: 'primary', size: 'sm', disabled: draftIds.length === 0, onClick: () => onConfirm(draftIds) }, `确定选择 (${draftIds.length})`)),
      },
      React.createElement('div', { className: 'aev-profilePicker' },
        React.createElement(NativeInput, { value: query, onChange: event => setQuery(event.target.value), placeholder: '搜索评测方案' }),
        visibleProfiles.length ? visibleProfiles.map(profile => React.createElement('label', { className: 'aev-profileOption', key: profile.id, 'data-checked': draftIds.includes(profile.id) || undefined },
          React.createElement('input', { type: 'checkbox', checked: draftIds.includes(profile.id), onChange: () => toggle(profile.id) }),
          React.createElement('span', null, React.createElement('strong', null, `${profile.name} v${profile.version}`), React.createElement('small', null, `${profile.metrics.join(' · ')} · ${profile.caseCount} 条用例`), React.createElement('small', null, profile.description)))) : React.createElement('div', { className: 'aev-empty' }, '没有匹配的评测方案。')))
    }

    function CreateExperimentModal({ plugins, models = [], profiles = [], profilesLoading, selectedModel, onClose, onCreate, onLoadProfiles, loading, error }) {
      const initial = plugins[0]
      const [pluginId, setPluginId] = React.useState(initial?.id ?? '')
      const [name, setName] = React.useState(initial ? `${initial.name}验证` : '')
      const [modelKey, setModelKey] = React.useState(selectedModel ? `${selectedModel.provider}:${selectedModel.model}` : models[0] ? `${models[0].provider}:${models[0].model}` : '')
      const [profilePickerOpen, setProfilePickerOpen] = React.useState(false)
      const [profileIds, setProfileIds] = React.useState(profiles.length ? [profiles[0].id] : [])
      const selected = plugins.find(item => item.id === pluginId)
      const model = models.find(item => `${item.provider}:${item.model}` === modelKey)
      const selectedProfiles = profiles.filter(profile => profileIds.includes(profile.id))
      const submit = event => { event.preventDefault(); if (model) onCreate({ name: name.trim(), pluginId, pluginName: selected?.name ?? pluginId, model: { provider: model.provider, model: model.model }, profileIds }) }
      return React.createElement(React.Fragment, null,
        React.createElement(Modal, {
          open: true,
          className: 'aev-createModal',
          title: '创建实验',
          description: '选择当前 Web Profile 的插件、判定模型和社区评测方案后，直接拉取方案中的测试用例。',
          closeLabel: '关闭',
          onClose: loading ? () => {} : onClose,
          footer: React.createElement('div', { className: 'aob-modalActions' },
            React.createElement(Button, { variant: 'ghost', size: 'sm', disabled: loading, onClick: onClose }, '取消'),
            React.createElement(Button, { variant: 'primary', size: 'sm', disabled: loading || !name.trim() || !pluginId || !model || profileIds.length === 0, onClick: submit }, loading ? '正在拉取用例…' : '创建实验')),
        },
        error ? React.createElement('div', { className: 'aob-notice' }, `拉取评测方案失败：${error}`) : null,
        React.createElement('form', { className: 'aob-form aev-createForm', onSubmit: submit },
          formField('实验名称', React.createElement(NativeInput, { required: true, value: name, disabled: loading, onChange: event => setName(event.target.value) })),
          formField('插件', React.createElement(NativeSelect, { required: true, value: pluginId, disabled: loading, onChange: event => { const next = plugins.find(item => item.id === event.target.value); setPluginId(event.target.value); setName(`${next?.name ?? event.target.value}验证`) } }, plugins.map(item => React.createElement('option', { key: item.id, value: item.id, disabled: !item.available }, `${item.name} (${item.id})${item.available ? '' : ' · 无法读取'}`)))),
          formField('生成与判定模型', React.createElement(NativeSelect, { required: true, value: modelKey, disabled: loading || models.length === 0, onChange: event => setModelKey(event.target.value) }, models.length ? models.map(item => React.createElement('option', { key: `${item.provider}:${item.model}`, value: `${item.provider}:${item.model}` }, item.name)) : React.createElement('option', { value: '' }, '没有可用模型'))),
          React.createElement('div', { className: 'aob-field' }, React.createElement('span', null, '评测方案'),
            React.createElement('button', { type: 'button', className: 'aob-button', disabled: loading || profilesLoading, onClick: async () => { const loaded = profiles.length > 0 || await onLoadProfiles(); if (loaded) setProfilePickerOpen(true) } }, profilesLoading ? '正在加载方案…' : '选择评测方案'),
            selectedProfiles.length ? React.createElement('div', { className: 'aev-selectedProfiles' }, selectedProfiles.map(profile => React.createElement('span', { key: profile.id }, `${profile.name} v${profile.version}`))) : null)),
        profilePickerOpen && profiles.length ? React.createElement(EvaluationProfilePicker, { profiles, selectedIds: profileIds, onClose: () => setProfilePickerOpen(false), onConfirm: ids => { setProfileIds(ids); setProfilePickerOpen(false) } }) : null))
    }

    function evaluationCaseKey(item) {
      return `${item.profileId ?? 'legacy'}:${item.id}`
    }

    function groupEvaluationCases(cases) {
      const groups = new Map()
      for (const item of cases) {
        const id = item.profileId ?? 'legacy'
        if (!groups.has(id)) groups.set(id, {
          id,
          name: item.profileName ?? '未标注评测方案',
          version: item.profileVersion,
          cases: [],
        })
        groups.get(id).cases.push(item)
      }
      return [...groups.values()]
    }

    function EvaluationCaseGroup({ group, running, onToggleCase }) {
      return React.createElement('section', { className: 'aev-caseGroup' },
        React.createElement('div', { className: 'aev-caseGroupHead' }, React.createElement('strong', null, group.name), group.version ? React.createElement('span', null, `v${group.version}`) : null),
        table(['执行','测试用例','预期结果'], group.cases.map(item => React.createElement('tr', { key: evaluationCaseKey(item) },
          React.createElement('td', null, React.createElement('input', { type: 'checkbox', checked: item.selected, disabled: running, onChange: () => onToggleCase(evaluationCaseKey(item)) })),
          React.createElement('td', null, React.createElement('strong', null, item.title), React.createElement('div', { className: 'aob-code' }, item.id)),
          React.createElement('td', null, item.expected)))))
    }

    function EvaluationResultCase({ item }) {
      return React.createElement('article', { className: `aev-resultCase${item.passed ? '' : ' failed'}` },
        React.createElement('div', { className: 'aev-resultCaseHead' }, React.createElement('h3', null, item.title ?? item.id), pill(item.passed ? '通过' : '失败', item.passed ? 'ok' : 'bad')),
        React.createElement('p', null, `预期：${item.expected ?? '未提供'}`),
        item.error ? React.createElement('p', { className: 'aev-resultError' }, `失败原因：${item.error}`) : null,
        React.createElement('details', null, React.createElement('summary', null, item.error ? '查看运行详情' : '查看原始输出'), React.createElement('pre', null, item.output || item.error || '没有可展示的运行输出')))
    }

    function EvaluationResultGroup({ group }) {
      return React.createElement('section', { className: 'aev-resultGroup' },
        React.createElement('div', { className: 'aev-caseGroupHead' }, React.createElement('strong', null, group.name), group.version ? React.createElement('span', null, `v${group.version}`) : null),
        React.createElement('div', { className: 'aev-resultList' }, group.cases.map(item => React.createElement(EvaluationResultCase, { item, key: evaluationCaseKey(item) }))))
    }

    function ExperimentDetail({ experiment, onBack, onToggleCase, onExecute, running, result, elapsedMs }) {
      const selectedCases = experiment.cases.filter(item => item.selected)
      const caseGroups = groupEvaluationCases(experiment.cases)
      const resultGroups = result ? groupEvaluationCases(result.cases) : []
      const resultPanel = result ? React.createElement('div', { className: 'aev-panel' },
        React.createElement('h2', null, '实验结果'),
        React.createElement('div', { className: 'aev-resultSummary' },
          React.createElement('div', { className: `aev-resultHero ${result.status === 'passed' ? 'ok' : 'bad'}` }, React.createElement('strong', null, result.status === 'passed' ? '实验通过' : '实验未通过'), React.createElement('span', null, result.status === 'passed' ? '所有已选用例均满足预期。' : '请优先查看下方失败用例。')),
          React.createElement('div', { className: 'aev-resultStat ok' }, React.createElement('span', null, '通过用例'), React.createElement('strong', null, `${result.passedCases}/${result.totalCases}`)),
          React.createElement('div', { className: 'aev-resultStat bad' }, React.createElement('span', null, '失败用例'), React.createElement('strong', null, Math.max(0, result.totalCases - result.passedCases))),
          React.createElement('div', { className: 'aev-resultStat' }, React.createElement('span', null, '执行耗时'), React.createElement('strong', null, formatDuration(result.durationMs)))),
        React.createElement('div', { className: 'aev-resultGroups' }, resultGroups.map(group => React.createElement(EvaluationResultGroup, { group, key: group.id })))) : null
      const casesPanel = React.createElement('div', { className: 'aev-panel' },
        React.createElement('h2', null, '已选评测方案与用例'),
        React.createElement('div', { className: 'aev-caseGroups' }, caseGroups.map(group => React.createElement(EvaluationCaseGroup, { group, running, onToggleCase, key: group.id }))),
        React.createElement('div', { className: 'aob-actions' }, React.createElement('button', { className: 'aob-button primary', disabled: running || selectedCases.length === 0, onClick: onExecute }, running ? '正在执行实验…' : `执行已选用例 (${selectedCases.length})`)),
        running ? React.createElement('div', { className: 'aev-running', role: 'status' }, React.createElement('span', { className: 'aev-spinner', 'aria-hidden': true }), React.createElement('div', null, React.createElement('strong', null, `正在隔离环境中执行 ${selectedCases.length} 条用例`), React.createElement('p', null, `正在运行插件并调用模型判定 · 已耗时 ${formatDuration(elapsedMs)}。复杂插件通常需要 1–3 分钟，请保持页面打开。`))) : null)
      return React.createElement('div', null,
        React.createElement('div', { className: 'aev-panelHead' }, React.createElement('h2', null, experiment.name), React.createElement('button', { className: 'aob-button', disabled: running, onClick: onBack }, '返回实验记录')),
        casesPanel,
        resultPanel)
    }

    function WorkspaceEvaluationLauncher({ wide }) {
      const [open, setOpen] = React.useState(false)
      React.useEffect(() => {
        const show = () => setOpen(true)
        window.addEventListener('dsh-agent-observe:open-evaluation', show)
        return () => window.removeEventListener('dsh-agent-observe:open-evaluation', show)
      }, [])
      return React.createElement(React.Fragment, null,
        React.createElement('button', { className: 'aev-launcher', 'data-compact': !wide || undefined, title: '评测中心', onClick: () => setOpen(true) },
          React.createElement(IconChecklistOutline14, { size: wide ? 16 : 18, 'aria-hidden': true }),
          wide ? React.createElement('span', { className: 'aev-launcherLabel' }, '评测中心') : null),
        open ? React.createElement('div', { className: 'aev-workspaceOverlay' }, React.createElement(EvaluationView, { workspace: true, onClose: () => setOpen(false) })) : null)
    }

    function SessionEvaluationShortcut({ sessionId, useProjection }) {
      const observe = useProjection('agentObserve') ?? { failures: [] }
      const failures = Array.isArray(observe.failures) ? observe.failures : []
      return React.createElement('div', { className: 'aev-root' }, React.createElement('div', { className: 'aev-shell' },
        React.createElement('div', { className: 'aev-header' }, React.createElement('div', null, React.createElement('h1', null, '当前 Session 评测'), React.createElement('p', null, '评测资产在工作区级评测中心统一管理。')),
          React.createElement('button', { className: 'aob-button primary', onClick: () => window.dispatchEvent(new Event('dsh-agent-observe:open-evaluation')) }, '在评测中心打开')),
        React.createElement('div', { className: 'aev-summary' }, React.createElement('div', { className: 'aev-stat' }, React.createElement('span', null, '当前失败'), React.createElement('strong', null, failures.length)), React.createElement('div', { className: 'aev-stat' }, React.createElement('span', null, 'Session'), React.createElement('strong', null, sessionId ?? '-'))),
        React.createElement('div', { className: 'aev-panel' }, React.createElement('h2', null, '快捷入口'), React.createElement('p', null, failures.length ? '当前会话有失败证据。请在评测中心收集、审核并沉淀为回归资产。' : '当前会话没有工具失败证据。评测中心仍可管理所有历史资产。'))))
    }

    function EvaluationView({ sessionId, useProjection = () => null, openView = () => {}, workspace = false, onClose }) {
      const [database, setDatabase] = React.useState(readEvaluationDatabase)
      const [experimentPage, setExperimentPage] = React.useState(1)
      const [view, setView] = React.useState('experiments')
      const [assetView, setAssetView] = React.useState('samples')
      const [traceItem, setTraceItem] = React.useState(null)
      const [reviewCandidate, setReviewCandidate] = React.useState(null)
      const [createExperiment, setCreateExperiment] = React.useState(false)
      const [plugins, setPlugins] = React.useState([])
      const [pluginsError, setPluginsError] = React.useState('')
      const [models, setModels] = React.useState([])
      const [selectedModel, setSelectedModel] = React.useState(null)
      const [modelsError, setModelsError] = React.useState('')
      const [profiles, setProfiles] = React.useState([])
      const [profilesLoading, setProfilesLoading] = React.useState(false)
      const [toastMessage, setToastMessage] = React.useState(null)
      const [generationState, setGenerationState] = React.useState('idle')
      const [generationError, setGenerationError] = React.useState('')
      const [activeExperiment, setActiveExperiment] = React.useState(null)
      const [validationState, setValidationState] = React.useState('idle')
      const [validationStartedAt, setValidationStartedAt] = React.useState(null)
      const [validationNow, setValidationNow] = React.useState(Date.now())
      const [validationResult, setValidationResult] = React.useState(null)
      const [validationError, setValidationError] = React.useState('')
      React.useEffect(() => {
        if (validationState !== 'running') return undefined
        const timer = setInterval(() => setValidationNow(Date.now()), 1000)
        return () => clearInterval(timer)
      }, [validationState])
      const validationElapsedMs = validationStartedAt === null ? 0 : Math.max(0, validationNow - validationStartedAt)
      const observe = useProjection('agentObserve') ?? { model: null, failures: [] }
      const failures = Array.isArray(observe.failures) ? observe.failures : []
      const loadPlugins = async () => {
        setPluginsError('')
        try {
          const response = await fetch('/api/agent-observe/installed-plugins')
          const body = await response.text()
          const result = JSON.parse(body)
          if (!response.ok) throw new Error(result.error ?? '无法读取已安装插件')
          setPlugins(Array.isArray(result.plugins) ? result.plugins : [])
        } catch (error) {
          setPluginsError(error instanceof Error ? error.message : String(error))
        }
      }
      const loadModels = async () => {
        setModelsError('')
        try {
          const response = await fetch('/api/agent-observe/models')
          const body = await response.text()
          const result = JSON.parse(body)
          if (!response.ok) throw new Error(result.error ?? '无法读取可用模型')
          setModels(Array.isArray(result.models) ? result.models : [])
          setSelectedModel(result.selected ?? null)
        } catch (error) {
          setModelsError(error instanceof Error ? error.message : String(error))
        }
      }
      const loadProfiles = async () => {
        setProfilesLoading(true)
        try {
          const response = await fetch('/api/agent-observe/evaluation-profiles')
          const body = await response.text()
          if (response.status === 404) throw new Error('service-not-ready')
          let result
          try { result = JSON.parse(body) } catch { throw new Error('评测方案服务返回了无效响应') }
          if (!response.ok) throw new Error(result.error ?? '无法读取社区评测方案')
          setProfiles(Array.isArray(result.profiles) ? result.profiles : [])
          return true
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          setToastMessage(message === 'service-not-ready'
            ? '评测方案服务未就绪，请重启 DSH Web 后重试。'
            : `无法加载评测方案：${message}`)
          return false
        } finally {
          setProfilesLoading(false)
        }
      }
      const openCreateExperiment = async () => {
        await Promise.all([loadPlugins(), loadModels()])
        setProfiles([])
        setCreateExperiment(true)
      }
      const commit = update => {
        const next = typeof update === 'function' ? update(database) : update
        writeEvaluationDatabase(next)
        setDatabase(next)
      }
      const collectFailures = () => {
        const existing = new Set(database.candidates.map(item => item.source?.callId))
        const additions = failures.filter(failure => !existing.has(failure.callId)).map(failure => ({
          id: `badcase-${Date.now()}-${failure.callId}`, title: `${failure.name}: ${failure.errorCode}`,
          status: 'pending_review', priority: 'p1', caseSource: 'badcase', reviewStatus: 'pending',
          expected: '', category: 'unknown', createdAt: Date.now(),
          admission: { reproducible: true, expectedDefined: false, traceAvailable: true },
          source: { sessionId: String(sessionId), callId: failure.callId, turn: failure.turn, step: failure.step, model: observe.model, tool: failure.name, arguments: failure.arguments, errorCode: failure.errorCode, errorMessage: failure.errorMessage },
        }))
        const record = additions.length === 0 ? [] : [{ id: `record-${Date.now()}`, name: `Session ${sessionId} 失败收集`, status: 'completed', createdAt: Date.now(), failureCount: additions.length, sourceSessionId: String(sessionId) }]
        commit({ ...database, candidates: [...database.candidates, ...additions], records: [...database.records, ...record] })
        setAssetView('candidates'); setView('assets')
      }
      const decideCandidate = (status, values) => {
        const candidate = reviewCandidate
        let samples = database.samples
        let candidates = database.candidates.map(item => item.id === candidate.id ? { ...item, status, category: values.rootCause, expected: values.expected } : item)
        if (status === 'admitted') {
          const sample = { ...candidate, id: `reg-${Date.now()}`, status: 'active', kind: 'regression', reviewStatus: 'approved', category: values.rootCause, expected: values.expected, admittedFrom: candidate.id }
          samples = [...samples, sample]
          candidates = candidates.map(item => item.id === candidate.id ? { ...item, admittedCaseId: sample.id } : item)
        }
        commit({ ...database, candidates, samples })
        setReviewCandidate(null)
      }
      const runDemoValidation = async () => {
        if (activeExperiment === null) return
        const selectedCases = activeExperiment.cases.filter(item => item.selected)
        const startedAt = Date.now()
        setValidationStartedAt(startedAt)
        setValidationNow(startedAt)
        setValidationState('running')
        setValidationError('')
        try {
          const response = await fetch('/api/agent-observe/plugin-validation', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ pluginId: activeExperiment.pluginId, model: activeExperiment.model, cases: selectedCases }),
          })
          const body = await response.text()
          let result
          try { result = JSON.parse(body) } catch {
            throw new Error(body || `验证服务返回 HTTP ${response.status}`)
          }
          if (!response.ok) throw new Error(result.error === 'validation-running' ? '已有实验正在隔离环境中执行，请等待它完成后再试。' : result.error ?? '验证运行失败')
          const failedCases = result.cases.filter(item => !item.passed)
          const candidates = failedCases.map((item, index) => ({
            id: `badcase-${Date.now()}-plugin-validation-${index}`,
            title: `demo-knowledge: ${item.id}`,
            status: 'pending_review',
            priority: 'p1',
            caseSource: 'plugin_validation',
            reviewStatus: 'pending',
            expected: item.expected,
            category: 'plugin-validation',
            createdAt: Date.now(),
            admission: { reproducible: true, expectedDefined: true, traceAvailable: false },
            source: { plugin: result.plugin, validationCaseId: item.id, output: item.output, error: item.error },
          }))
          const status = result.status === 'passed' ? 'passed' : 'failed'
          const record = { ...activeExperiment, id: activeExperiment.id, status, createdAt: activeExperiment.createdAt, executedAt: result.recordedAt, totalCases: result.totalCases, passedCases: result.passedCases, durationMs: result.durationMs, result }
          commit({ ...database, records: [...database.records.filter(item => item.id !== record.id), record], candidates: [...database.candidates, ...candidates] })
          setActiveExperiment(record)
          setValidationResult({ ...result, status })
          setValidationStartedAt(null)
          setValidationState('completed')
        } catch (error) {
          setValidationError(error instanceof Error ? error.message : String(error))
          setValidationStartedAt(null)
          setValidationState('idle')
        }
      }
      const createNewExperiment = async values => {
        setGenerationState('running')
        setGenerationError('')
        try {
          const response = await fetch('/api/agent-observe/evaluation-profiles', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ profileIds: values.profileIds }),
          })
          const body = await response.text()
          let result
          try { result = JSON.parse(body) } catch { throw new Error(body || `评测方案服务返回 HTTP ${response.status}`) }
          if (!response.ok) throw new Error(result.error ?? '无法拉取评测方案')
          const selectedProfiles = Array.isArray(result.profiles) ? result.profiles : []
          const cases = selectedProfiles.flatMap(profile => profile.cases.map(item => ({ ...item, selected: true })))
          if (cases.length === 0) throw new Error('所选评测方案没有测试用例')
          const experiment = { id: `experiment-${Date.now()}`, name: values.name, pluginId: values.pluginId, model: values.model, profiles: selectedProfiles, metrics: selectedProfiles.flatMap(profile => profile.metrics), cases, status: 'draft', createdAt: Date.now() }
          commit({ ...database, records: [...database.records, experiment] })
          setExperimentPage(1)
          setCreateExperiment(false)
          setValidationError('')
          setValidationResult(null)
          setActiveExperiment(experiment)
        } catch (error) {
          setGenerationError(error instanceof Error ? error.message : String(error))
        } finally {
          setGenerationState('idle')
        }
      }
      const toggleExperimentCase = caseKey => setActiveExperiment(experiment => ({ ...experiment, cases: experiment.cases.map(item => evaluationCaseKey(item) === caseKey ? { ...item, selected: !item.selected } : item) }))
      const experiments = database.records
        .filter(item => item.pluginId)
        .sort((left, right) => (right.executedAt ?? right.createdAt ?? 0) - (left.executedAt ?? left.createdAt ?? 0))
      const experimentsPerPage = 10
      const experimentPageCount = Math.max(1, Math.ceil(experiments.length / experimentsPerPage))
      const currentExperimentPage = Math.min(experimentPage, experimentPageCount)
      const pagedExperiments = experiments.slice((currentExperimentPage - 1) * experimentsPerPage, currentExperimentPage * experimentsPerPage)
      return React.createElement('div', { className: `aev-root${workspace ? ' workspace' : ''}` }, React.createElement('div', { className: 'aev-shell' },
        React.createElement('div', { className: 'aev-header' }, React.createElement('div', null, React.createElement('h1', null, '插件评测中心')), React.createElement('div', { className: 'aev-toolbar' }, workspace && onClose ? React.createElement('button', { className: 'aob-button', onClick: onClose }, '返回会话') : null, !workspace ? React.createElement('button', { className: 'aob-button', onClick: collectFailures }, `收集当前失败 (${failures.length})`) : null, React.createElement('button', { className: 'aob-button', onClick: () => { const blob = new Blob([JSON.stringify(database, null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'dsh-evaluation.json'; link.click() } }, '导出资产'))),
        createExperiment ? (pluginsError ? React.createElement('div', { className: 'aob-notice' }, `无法读取当前 Profile 插件：${pluginsError}`) : modelsError ? React.createElement('div', { className: 'aob-notice' }, `无法读取可用模型：${modelsError}`) : plugins.length === 0 ? React.createElement('div', { className: 'aob-notice' }, '当前 Web Profile 没有可选择的非基础插件。') : models.length === 0 ? React.createElement('div', { className: 'aob-notice' }, '当前 DSH 没有可选择的模型。请先在模型设置中完成配置。') : React.createElement(CreateExperimentModal, { plugins, models, profiles, profilesLoading, selectedModel, loading: generationState === 'running', error: generationError, onClose: () => setCreateExperiment(false), onCreate: createNewExperiment, onLoadProfiles: loadProfiles })) : null,
        view === 'experiments' ? (activeExperiment !== null
          ? React.createElement(ExperimentDetail, { experiment: activeExperiment, running: validationState === 'running', result: validationResult, elapsedMs: validationElapsedMs, onBack: () => { setActiveExperiment(null); setValidationResult(null); setValidationError(''); setGenerationError('') }, onToggleCase: toggleExperimentCase, onExecute: runDemoValidation })
          : React.createElement('div', { className: 'aev-panel' },
            React.createElement('div', { className: 'aev-panelHead' }, React.createElement('h2', null, '实验记录'), React.createElement('button', { className: 'aob-button primary', onClick: openCreateExperiment }, '创建实验')),
            experiments.length === 0 ? emptyState('暂无实验。创建一个实验，开始验证已安装的插件。') : React.createElement(React.Fragment, null,
              table(['实验','插件','指标','用例','创建时间','状态','操作'], pagedExperiments.map(item => {
                const statusKind = item.status === 'passed' ? 'ok' : item.status === 'failed' ? 'bad' : 'warn'
                const statusLabel = item.status === 'passed' ? '已通过' : item.status === 'failed' ? '未通过' : '待执行'
                const actionLabel = item.status === 'draft' ? '继续执行' : item.status === 'failed' ? '查看失败' : '查看结果'
                return React.createElement('tr', { key: item.id }, React.createElement('td', null, React.createElement('strong', null, item.name)), React.createElement('td', null, item.pluginId), React.createElement('td', null, item.metrics.length), React.createElement('td', null, `${item.cases.filter(caseItem => caseItem.selected).length}/${item.cases.length}`), React.createElement('td', null, item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'), React.createElement('td', null, pill(statusLabel, statusKind)), React.createElement('td', null, React.createElement('button', { className: `aob-button aev-recordAction ${item.status}`, onClick: () => { setValidationResult(item.result ?? null); setValidationError(''); setActiveExperiment(item) } }, actionLabel)))
              })),
              experimentPageCount > 1 ? React.createElement('div', { className: 'aev-pagination' }, React.createElement('span', null, `第 ${currentExperimentPage}/${experimentPageCount} 页 · 共 ${experiments.length} 条`), React.createElement('button', { disabled: currentExperimentPage === 1, onClick: () => setExperimentPage(currentExperimentPage - 1), 'aria-label': '上一页' }, '‹'), React.createElement('button', { disabled: currentExperimentPage === experimentPageCount, onClick: () => setExperimentPage(currentExperimentPage + 1), 'aria-label': '下一页' }, '›')) : null))
        ) : null,
        validationError && activeExperiment !== null ? React.createElement('div', { className: 'aob-notice' }, `实验未完成：${validationError}`) : null,
        toastMessage ? React.createElement(Toast, { key: toastMessage, text: toastMessage, onDone: () => setToastMessage(null) }) : null,
        view === 'records' ? React.createElement('div', { className: 'aev-panel' }, React.createElement('div', { className: 'aev-panelHead' }, React.createElement('h2', null, '评测记录'), !workspace ? React.createElement('button', { className: 'aob-button primary', onClick: collectFailures }, '从当前 Session 创建记录') : null), database.records.length === 0 && failures.length === 0 ? emptyState('暂无评测记录。先运行 Session，或从工具失败收集 Badcase。') : React.createElement(React.Fragment, null, database.records.length ? table(['评测记录','状态','来源 Session','失败数'], database.records.map(record => React.createElement('tr', { key: record.id }, React.createElement('td', null, record.name), React.createElement('td', null, pill(record.status, 'ok')), React.createElement('td', null, record.sourceSessionId), React.createElement('td', null, record.failureCount)))) : null, !workspace && failures.length ? table(['问题源头','状态','证据','操作'], [...failures].reverse().map(failure => React.createElement('tr', { key: failure.callId }, React.createElement('td', null, React.createElement('strong', null, failure.name), React.createElement('div', null, failure.errorMessage)), React.createElement('td', null, pill('失败','bad')), React.createElement('td', null, `Turn ${failure.turn} · Step ${failure.step}`), React.createElement('td', null, React.createElement('button', { className: 'aob-button', onClick: () => setTraceItem({ title: `${failure.name}: ${failure.errorCode}`, source: { sessionId, callId: failure.callId, turn: failure.turn, step: failure.step, model: observe.model, tool: failure.name, arguments: failure.arguments, errorCode: failure.errorCode, errorMessage: failure.errorMessage } }) }, '查看 Trace'))))) : null)) : null,
        view === 'assets' ? React.createElement('div', null,
          React.createElement('div', { className: 'aev-subnav' }, [['samples','评测用例'],['candidates','Badcase 候选'],['datasets','数据集'],['families','场景族']].map(([id,label]) => React.createElement('button', { key: id, className: assetView === id ? 'active' : '', onClick: () => setAssetView(id) }, label))),
          assetView === 'candidates' ? React.createElement('div', { className: 'aev-panel' }, React.createElement('div', { className: 'aob-notice' }, '候选不会直接进入回归集，必须完成人工准入。'), database.candidates.length === 0 ? emptyState('暂无 Badcase 候选') : table(['候选','来源','证据','结论','操作'], database.candidates.map(item => React.createElement('tr', { key: item.id }, React.createElement('td', null, pill(item.status, item.status === 'admitted' ? 'ok' : 'warn'), React.createElement('strong', null, item.title)), React.createElement('td', null, item.source?.sessionId ?? '-'), React.createElement('td', null, pill(item.admission?.traceAvailable ? 'Trace 已关联':'Trace 缺失', item.admission?.traceAvailable ? 'ok':'warn')), React.createElement('td', null, item.admittedCaseId ?? item.status), React.createElement('td', null, React.createElement('button', { className: 'aob-button', onClick: () => setTraceItem(item) }, 'Trace'), ' ', ['pending_review','needs_evidence'].includes(item.status) ? React.createElement('button', { className: 'aob-button primary', onClick: () => setReviewCandidate(item) }, '准入审核') : null))))) : null,
          assetView === 'samples' ? React.createElement('div', { className: 'aev-panel' }, database.samples.length === 0 ? emptyState('暂无正式评测用例。通过 Badcase 准入后会出现在这里。') : table(['评测用例','性质','来源','状态','操作'], database.samples.map(item => React.createElement('tr', { key: item.id }, React.createElement('td', null, React.createElement('strong', null, item.title), React.createElement('div', null, item.id)), React.createElement('td', null, pill(item.kind)), React.createElement('td', null, item.caseSource), React.createElement('td', null, pill(item.status,'ok')), React.createElement('td', null, React.createElement('button', { className: 'aob-button', onClick: () => setTraceItem(item) }, '查看场景')))))) : null,
          assetView === 'datasets' ? React.createElement('div', { className: 'aev-panel' }, React.createElement('div', { className: 'aev-panelHead' }, React.createElement('h2', null, '数据集'), React.createElement('button', { className: 'aob-button primary', onClick: createDataset }, '从正式用例创建数据集')), database.datasets.length ? table(['数据集','用例数','创建时间'], database.datasets.map(item => React.createElement('tr', { key: item.id }, React.createElement('td', null, item.name), React.createElement('td', null, item.sampleIds.length), React.createElement('td', null, new Date(item.createdAt).toLocaleString())))) : emptyState('暂无数据集。准入用例后可创建回归集。')) : null,
          assetView === 'families' ? React.createElement('div', { className: 'aev-panel' }, React.createElement('div', { className: 'aev-panelHead' }, React.createElement('h2', null, '场景族'), React.createElement('button', { className: 'aob-button primary', onClick: createFamily }, '新建场景族')), database.scenarioFamilies.length ? table(['场景族','说明','创建时间'], database.scenarioFamilies.map(item => React.createElement('tr', { key: item.id }, React.createElement('td', null, item.name), React.createElement('td', null, item.description), React.createElement('td', null, new Date(item.createdAt).toLocaleString())))) : emptyState('暂无场景族。可用于归类相近问题和受控扩展。')) : null) : null,
        view === 'standards' ? React.createElement('div', { className: 'aev-cards' }, React.createElement('div', { className: 'aev-panel' }, React.createElement('div', { className: 'aev-panelHead' }, React.createElement('h2', null, '类型基准'), React.createElement('button', { className: 'aob-button primary', onClick: createBaseline }, '创建基准')), database.baselines.length ? database.baselines.map(item => React.createElement('div', { className: 'aev-card', key: item.id }, React.createElement('h3', null, item.name), React.createElement('p', null, `状态：${item.status} · 正式用例：${item.sampleCount}`))) : emptyState('尚未设置基准')), React.createElement('div', { className: 'aev-panel' }, React.createElement('h2', null, '评分方案'), database.scoreProfiles.map(item => React.createElement('div', { className: 'aev-card', key: item.id }, React.createElement('h3', null, item.name), React.createElement('p', null, `通过阈值 ${item.passThreshold}% · 任务 ${item.weights.task}% · 工具 ${item.weights.tool}% · 效率 ${item.weights.efficiency}%`))))) : null,
        view === 'optimization' ? React.createElement('div', { className: 'aev-panel' }, React.createElement('div', { className: 'aev-panelHead' }, React.createElement('h2', null, 'AI 优化中心'), React.createElement('button', { className: 'aob-button primary', onClick: createOptimization }, '创建优化请求')), database.optimizationRequests.length ? table(['优化请求','状态','关联证据'], database.optimizationRequests.map(item => React.createElement('tr', { key: item.id }, React.createElement('td', null, item.title), React.createElement('td', null, pill(item.status, 'warn')), React.createElement('td', null, item.evidenceCount)))) : emptyState('暂无优化请求。先收集失败证据，再建立可验收的优化工作。')) : null,
        view === 'iterations' ? React.createElement('div', { className: 'aev-panel' }, React.createElement('div', { className: 'aev-panelHead' }, React.createElement('h2', null, 'Agent 迭代'), React.createElement('button', { className: 'aob-button primary', onClick: createIteration }, '创建迭代')), database.iterations.length ? table(['迭代','状态','基准'], database.iterations.map(item => React.createElement('tr', { key: item.id }, React.createElement('td', null, item.name), React.createElement('td', null, pill(item.status, 'warn')), React.createElement('td', null, item.baselineId ?? '未选择')))) : emptyState('暂无迭代。基于已保存的基准创建对比和评测门禁。')) : null,
        view === 'releases' ? React.createElement('div', { className: 'aev-panel' }, React.createElement('div', { className: 'aev-panelHead' }, React.createElement('h2', null, '版本归档'), React.createElement('button', { className: 'aob-button primary', onClick: createRelease }, '创建版本归档')), database.releases.length ? table(['版本归档','状态','关联迭代'], database.releases.map(item => React.createElement('tr', { key: item.id }, React.createElement('td', null, item.name), React.createElement('td', null, pill(item.status, 'warn')), React.createElement('td', null, item.iterationId ?? '未关联')))) : emptyState('暂无版本归档。归档 Agent 版本、评测结果、基线差异和发布说明。')) : null,
        React.createElement(TraceModal, { item: traceItem, openView, onClose: () => setTraceItem(null) }),
        React.createElement(CandidateReviewModal, { candidate: reviewCandidate, onClose: () => setReviewCandidate(null), onDecision: decideCandidate })))
    }

    exports.inject = ['slots', 'sessions', 'locale']
    exports.apply = function apply(ctx) {
      injectStyle()
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'agent-observe:client dictionaries')
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: 'observe',
        order: 20,
        locale: NS,
        label: () => t('view.observe'),
      }, ObserveView))
      ctx.slots.inject('conversation.view', () => ctx.slots.register({
        name: 'conversation.view',
        id: 'evaluation',
        order: 30,
        locale: NS,
        label: () => t('view.evaluation'),
      }, SessionEvaluationShortcut))
      ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({
        name: 'sidebar.footer.action',
        id: 'evaluation-center',
        order: 20,
      }, WorkspaceEvaluationLauncher))
    }

    return module.exports
  },
})
