import { createServer } from "http";
import * as path from "path";
import * as vscode from "vscode";

/** 端口 */
const port = 6006;
/** 连接的客户端 */
const clients = new Set();
let server: any;
let statusBarItem: vscode.StatusBarItem;
const statusBarItemText = "$(code) watch";

const startServer = () => {
  server = createServer((req, res) => {
    // 仅处理 SSE 请求（例如路径为 /sse）
    if (req.url !== "/sse") {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }

    // 1. 设置 SSE 响应头（关键）
    res.writeHead(200, {
      "Content-Type": "text/event-stream", // 告知客户端是事件流
      "Cache-Control": "no-cache", // 禁用缓存
      Connection: "keep-alive", // 保持长连接
      "Access-Control-Allow-Origin": "*", // 允许跨域（按需配置）
    });

    // 2. 发送初始消息（可选）
    // res.write('data: 连接已建立\n\n');

    clients.add(res);
    // console.log(`现有 ${clients.size} 个连接`);
    statusBarItem.text = `${statusBarItemText}(${clients.size})`;

    // 4. 监听客户端断开连接，清理资源
    req.on("close", () => {
      clients.delete(res);
      res.end(); // 关闭响应
      // console.log(`现有 ${clients.size} 个连接`);
      statusBarItem.text = `${statusBarItemText}(${clients.size})`;
      // console.log('客户端断开连接');
    });
  });

  server.listen(port, () => {
    console.log(`SSE 服务运行在 http://localhost:${port}/sse`);
  });
};

const stopServer = () => {
  server.close((err: any) => {
    if (err) {
      console.error("Server close error:", err);
      process.exit(1); // 异常退出
    }
    // console.log("Server closed successfully");
    process.exit(0); // 正常退出
  });
};

export function activate(context: vscode.ExtensionContext) {
  // ========== 1. 创建状态栏项 ==========
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left, // 位置：右侧（Left 为左侧）
    0 // 优先级（数值越大越靠右/左）
  );

  // ========== 2. 配置状态栏样式和内容 ==========
  statusBarItem.text = statusBarItemText; // 文本 + 内置图标（tag 是标签图标）
  const tooltip = new vscode.MarkdownString(
    `
## watch-file-refresh-page
---
- [$(refresh)刷新缓存](command:watch-file-refresh-page.refreshCache)
    `,
    true
  );

  tooltip.isTrusted = true;

  statusBarItem.tooltip = tooltip;
  statusBarItem.command = "watch-file-refresh-page.clickStatusBar"; // 点击触发的命令

  // ========== 3. 显示状态栏 ==========
  statusBarItem.show();

  if (!server) {
    startServer();
  }

  vscode.workspace.onDidSaveTextDocument((document) => {
    // 1. 排除非文件类型文档（如虚拟文档、未保存的临时文档）
    if (document.uri.scheme !== "file") {
      return;
    }

    const filePath = document.fileName; // 获取文件完整路径

    // 2. 解析文件后缀（path.extname 会返回带点的后缀，如 .js、.tsx）
    const fileExt = path.extname(filePath).toLowerCase(); // 转小写统一处理

    // 3. 处理无后缀文件
    if (fileExt) {
      console.log(fileExt);
      clients.forEach((res: any) => {
        // console.log(path);
        // // ! SSE 格式：data: 内容\n\n（必须严格遵循）
        // const data = `data: ${path} 修改时间: ${new Date().toLocaleTimeString()}\n\n`;
        // 向客户端写入数据
        res.write(1);
      });
    }
  });

  context.subscriptions.push();
}

// This method is called when your extension is deactivated
export function deactivate() {
  stopServer();
}

