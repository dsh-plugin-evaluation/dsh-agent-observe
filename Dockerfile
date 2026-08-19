# syntax=docker/dockerfile:1
# DSH + dsh-agent-observe 评测环境
# 构建：docker compose build
# 运行：docker compose up -d
# 国内网络可覆盖镜像源：docker compose build --build-arg NPM_REGISTRY=https://registry.npmmirror.com
FROM node:22-bookworm-slim AS dsh

ARG NPM_REGISTRY=https://registry.npmmirror.com

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates curl \
  && rm -rf /var/lib/apt/lists/*

# 1. 从上游源码构建 DSH
WORKDIR /opt/deepseek-harness
RUN git clone --depth 1 https://github.com/deepseek-ai/deepseek-harness.git .
RUN pnpm config set registry "$NPM_REGISTRY" \
  && pnpm install --frozen-lockfile
RUN pnpm run build

# 2. 安装 observe 插件（仅运行时依赖）
COPY . /opt/dsh-agent-observe
WORKDIR /opt/dsh-agent-observe
RUN npm install --omit=dev --no-audit --no-fund --legacy-peer-deps --ignore-scripts --registry "$NPM_REGISTRY" || true

# 3. 拉取评测标准与安全评测集（固定版本）
WORKDIR /opt/evaluation
RUN git clone --depth 1 https://github.com/dsh-plugin-evaluation/dsh-plugin-evaluation-standards.git
RUN git clone --depth 1 --branch v1.1.0 https://github.com/dsh-plugin-evaluation/dsh-security-evaluation-dataset.git

# 4. 配置 Web Profile 并挂载插件
ENV DSH_HOME=/opt/dsh-home
ENV DSH_STANDARDS_ROOT=/opt/evaluation/dsh-plugin-evaluation-standards
ENV DSH_DATASET_ROOT=/opt/evaluation/dsh-security-evaluation-dataset

RUN mkdir -p "$DSH_HOME/profiles/web/node_modules" \
  && printf '%s\n' \
    '{' \
    '  "name": "dsh-profile-web",' \
    '  "private": true,' \
    '  "dependencies": {' \
    '    "dsh-agent-observe": "link:/opt/dsh-agent-observe"' \
    '  },' \
    '  "dsh": {' \
    '    "profile": {' \
    '      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-agent-observe"]' \
    '    }' \
    '  }' \
    '}' \
    > "$DSH_HOME/profiles/web/package.json" \
  && printf '[]\n' > "$DSH_HOME/profiles/web/cordis.patch.yml" \
  && ln -sfn /opt/dsh-agent-observe "$DSH_HOME/profiles/web/node_modules/dsh-agent-observe"

# 5. 把 DSH 安装内的 peer 包链接进插件，保证隔离评测时运行时解析
RUN mkdir -p /opt/dsh-agent-observe/node_modules/@deepseek-ai \
  && ln -sfn /opt/deepseek-harness/packages/core/tools /opt/dsh-agent-observe/node_modules/@deepseek-ai/dsh-tools \
  && ln -sfn /opt/deepseek-harness/packages/llm/llm /opt/dsh-agent-observe/node_modules/@deepseek-ai/dsh-llm \
  && ln -sfn /opt/deepseek-harness/packages/storage/storage-domain /opt/dsh-agent-observe/node_modules/@deepseek-ai/dsh-storage-domain \
  && ln -sfn /opt/deepseek-harness/vendor/cordis /opt/dsh-agent-observe/node_modules/@deepseek-ai/cordis

WORKDIR /opt/deepseek-harness
EXPOSE 3080
CMD ["pnpm", "dsh", "web", "--patch", "/opt/dsh-agent-observe/docker/cordis.patch.yml"]
