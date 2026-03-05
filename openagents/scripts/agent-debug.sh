#!/usr/bin/env bash
# 使用 Bun 调试器启动 OpenAgents 运行时，用于 IDE 调试
#
# 使用方法:
#   ./scripts/agent-debug.sh <agent_name> [--env dev|prod] [--port 4096]
#
# 示例:
#   ./scripts/agent-debug.sh demo-assistant          # 调试 demo-assistant
#   ./scripts/agent-debug.sh researcher --env prod   # 在 prod 环境下调试 researcher

# set -euo pipefail 是 Bash 的严格模式设置：
# -e: 任何命令返回非零退出码时立即退出脚本
# -u: 使用未定义变量时报错
# -o pipefail: 管道中任意命令失败，整个管道返回失败状态
set -euo pipefail

# 获取脚本所在目录的绝对路径
# $(dirname "$0") 获取脚本所在目录
# cd 进入该目录，然后 pwd 打印当前工作目录（绝对路径）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 获取项目根目录（脚本目录的上一级）
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ========== 参数处理 ==========

# ${1:?...} 是 Bash 的参数扩展语法：
# - 如果 $1（第一个参数）未定义或为空，则显示错误信息并退出
# - 要求必须提供 agent 名称作为第一个参数
AGENT_NAME="${1:?Usage: $0 <agent_name> [--env dev|prod] [--port 4096]}"

# shift 命令将位置参数左移一位，$2 变成 $1，以此类推
# 这样处理后，剩余的参数可以从 $1 开始处理
shift

# 设置默认值：环境为 dev，端口为 4096
ENV="dev"
PORT="4096"

# ========== 解析命令行参数 ==========

# while 循环解析可选参数
# $# 表示参数个数，当还有参数时继续循环
while [[ $# -gt 0 ]]; do
  case "$1" in
    # --env 参数：指定环境（dev 或 prod）
    # shift 2 表示跳过当前参数和它的值
    --env) ENV="$2"; shift 2 ;;
    # --port 参数：指定服务端口
    --port) PORT="$2"; shift 2 ;;
    # 未知参数：显示错误并退出
    *) echo "Unknown flag: $1"; exit 1 ;;
  esac
done

# 构建 Agent 目录路径：agents/{环境}/{Agent名称}
AGENT_DIR="$ROOT_DIR/agents/$ENV/$AGENT_NAME"

# 检查 Agent 目录是否存在
# -d 测试是否是目录
if [[ ! -d "$AGENT_DIR" ]]; then
  echo "Error: Agent directory not found: $AGENT_DIR"
  echo "Available agents:"
  # ls -1 每行显示一个文件/目录
  # 2>/dev/null 将错误输出重定向到空设备（不显示错误）
  # || echo "  (none)" 如果 ls 失败（目录不存在），显示 (none)
  ls -1 "$ROOT_DIR/agents/$ENV/" 2>/dev/null || echo "  (none)"
  exit 1
fi

# ========== 导出运行时环境变量 ==========

# export 将变量导出为环境变量，供子进程使用
export OPENAGENT_NAME="$AGENT_NAME"      # Agent 名称
export OPENAGENT_PORT="$PORT"            # 服务端口
export OPENCODE_CLIENT=sdk               # 设置为 SDK 模式（禁用交互式问题工具）

# 确定要加载的 env 文件路径（使用绝对路径）
ENV_FILE=""
if [[ -f "$ROOT_DIR/.env" ]]; then
  ENV_FILE="$ROOT_DIR/.env"
elif [[ -f "$ROOT_DIR/.env.example" ]]; then
  ENV_FILE="$ROOT_DIR/.env.example"
fi

echo "Starting debug session for agent: $AGENT_NAME ($ENV)"
echo "Directory: $AGENT_DIR"
echo "Bun inspector will be available at ws://localhost:6499/..."
echo ""

# ========== 启动调试模式 ==========

# 切换到 Agent 目录
# Agent 可能依赖该目录下的配置文件
cd "$AGENT_DIR"

# exec 命令用新进程替换当前进程（不创建子进程）
# bun --inspect=ws://localhost:6499/ 启动 Bun 调试器，监听 WebSocket 连接
# bun --env-file 使用绝对路径加载环境变量文件
# 可以在 IDE 中连接 ws://localhost:6499/ 进行断点调试
if [[ -n "$ENV_FILE" ]]; then
  exec bun --inspect=ws://localhost:6499/ --env-file="$ENV_FILE" run "$ROOT_DIR/runtime/src/index.ts"
else
  exec bun --inspect=ws://localhost:6499/ run "$ROOT_DIR/runtime/src/index.ts"
fi
