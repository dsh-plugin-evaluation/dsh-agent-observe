# dsh-agent-observe

DSH 插件观测与安全评测工具。

## 安装

```bash
dsh plugin --profile web add github:dsh-plugin-evaluation/dsh-agent-observe
```

安装插件时不会下载评测数据。

## 使用评测

1. 打开 DSH Web 的“评测中心”。
2. 打开“选择评测方案”。此时按需获取 `dsh-plugin-evaluation-standards`。
3. 选择评测方案并创建实验。此时才按 `catalog.json` 中的固定版本获取对应安全评测集。
4. 执行实验。

数据默认缓存到：

```text
~/.dsh/evaluation/
```

数据来源：

- `dsh-plugin-evaluation-standards`：评测规则、指标和方案目录。
- `dsh-security-evaluation-dataset`：实际安全测试用例。

当前安全评测集固定使用 `v1.1.0`。可以通过环境变量覆盖目录：

```bash
export DSH_EVALUATION_HOME="$HOME/.dsh/evaluation"
export DSH_STANDARDS_ROOT="$DSH_EVALUATION_HOME/dsh-plugin-evaluation-standards"
export DSH_DATASET_ROOT="$DSH_EVALUATION_HOME/dsh-security-evaluation-dataset"
```

## Portable Case Plan

评测 case 可以先转换为受限的 Portable Case Plan，再由 runner 执行。计划只支持标准操作：

- `environment.set`
- `workspace.write`
- `workspace.read`
- `plugin.prompt`
- `output.equals`
- `output.contains`
- `output.notContains`

runner 为每条 case 创建临时工作区，拒绝绝对路径和 `..` 路径穿越，并在插件执行后清理工作区。安全提示词注入 case 会在 Portable Plan 结果上继续执行秘密泄露、恶意指令执行和原始任务完成检查。

已实现的 HTTP 入口：

```text
POST /api/agent-observe/plugin-validation/portable-plan
POST /api/agent-observe/plugin-validation/portable-security-case
```

两者都接收 `pluginId`。前者还接收 `plan`，后者接收旧安全数据集格式的 `testCase`，由服务端转换为 Portable Plan 后执行。

## API 文档

启动 DSH Web 后可直接查看：

```text
http://127.0.0.1:4380/api-docs
```

机器可读的 OpenAPI 3.1 文档位于：

```text
http://127.0.0.1:4380/api-docs/openapi.json
```

文档入口是插件内置的只读路由，不需要额外启动文档服务。

## 独立 Portable Runner

Portable runner 已拆为不依赖 DSH 的 npm 包目录：

```text
packages/portable-runner/
```

它只负责临时工作区、受限 setup、插件回调和输出断言。宿主通过 `runPlugin({ input, cwd, env })` 提供实际插件启动方式，因此可以被 DSH、CI 或其他 runner 复用。DSH 专属的 profile 初始化和 Node 进程启动仍由本插件负责。

当前包边界刻意不包含 CLI：启动任意插件需要宿主定义进程、profile 和凭证契约；在这些契约稳定后，再添加独立 CLI 才不会把 DSH 实现细节复制进 npm 平台。

## 测试

普通单元测试：

```bash
npm test
```

真实 DSH E2E 测试需要一个已构建的 DSH 源码目录、隔离的 DSH_HOME、standards 目录和 dataset 目录：

```bash
DSH_E2E_DSH_ROOT=/path/to/deepseek-harness \
DSH_E2E_DSH_HOME=/tmp/dsh-e2e-home \
DSH_STANDARDS_ROOT=/path/to/dsh-plugin-evaluation-standards \
DSH_DATASET_ROOT=/path/to/dsh-security-evaluation-dataset \
npm run test:e2e
```

E2E 默认覆盖：

- DSH Web 是否能启动；
- 插件是否能被真实 Web Profile 发现；
- 评测方案目录是否可读取；
- 选择方案时是否按需加载外部数据集；
- 无效方案是否返回错误；
- 可选的真实插件运行和评测报告结构。

如需执行真实模型评测，再加：

```bash
DSH_E2E_RUN_VALIDATION=1
```

## Docker 运行

在 Docker 中运行 DSH + 评测插件：

```bash
# 1. 准备环境变量（真实 API Key 只写本地，不提交）
cp .env.example .env
# 编辑 .env，填入 DEEPSEEK_API_KEY

# 2. 构建并启动
docker compose up -d --build

# 3. 打开
open http://127.0.0.1:4380
```

`.env` 已被 `.gitignore` 忽略，不会提交到 Git。

### Docker E2E

```bash
bash scripts/docker-e2e.sh
```

脚本会构建镜像、启动容器、等待评测接口就绪，然后对运行中的容器执行真实 E2E 测试。

### 常用命令

```bash
docker compose logs -f        # 查看日志
docker compose down           # 停止并删除容器
docker compose restart        # 重启
```
