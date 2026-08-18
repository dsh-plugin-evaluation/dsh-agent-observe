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

当前安全评测集固定使用 `v1.0.0`。可以通过环境变量覆盖目录：

```bash
export DSH_EVALUATION_HOME="$HOME/.dsh/evaluation"
export DSH_STANDARDS_ROOT="$DSH_EVALUATION_HOME/dsh-plugin-evaluation-standards"
export DSH_DATASET_ROOT="$DSH_EVALUATION_HOME/dsh-security-evaluation-dataset"
```

## 开发

```bash
npm test
```
