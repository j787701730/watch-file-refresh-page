import { createServer, Server } from 'http';
import * as path from 'path';
import * as vscode from 'vscode';
import { getLocalIp, IWatchFileConfig, loadWorkspaceConfig, toArray, toNumber } from './util';

/** 连接的客户端 */
const clients = new Set();
let server: Server;
let statusBarItem: vscode.StatusBarItem;
const statusBarItemText = '$(code) watch';
const watchFileConfig: IWatchFileConfig = {
  watchFileType: ['js', 'html', 'css'],
  port: 6006,
  localIp: getLocalIp(),
};

const startServer = async () => {
  const res = await loadWorkspaceConfig();

  if (res.watchFileType) {
    watchFileConfig.watchFileType = toArray(res.watchFileType);
  }

  if (res.port && toNumber(res.port)) {
    watchFileConfig.port = toNumber(res.port);
  }

  return new Promise((resolve, reject) => {
    try {
      server = createServer((req, res) => {
        // 仅处理 SSE 请求（例如路径为 /sse）
        if (req.url !== '/sse') {
          res.writeHead(404, {
            'Content-Type': 'text/html; charset=utf-8',
          });
          res.end(`
<h3>watch-file-refresh-page 插件服务</h3>
<div>在js文件中添加SSE服务</div>
<code style="white-space: pre;">
{
  if (['127.0.0.1', 'localhost', '${watchFileConfig.localIp}'].includes(location.hostname)) {
    new EventSource('http://${watchFileConfig.localIp}:${watchFileConfig.port}/sse').onmessage = (e) => location.reload();
  }
}
</code>
            `);
          return;
        }

        // 1. 设置 SSE 响应头（关键）
        res.writeHead(200, {
          'Content-Type': 'text/event-stream', // 告知客户端是事件流
          'Cache-Control': 'no-cache', // 禁用缓存
          Connection: 'keep-alive', // 保持长连接
          'Access-Control-Allow-Origin': '*', // 允许跨域（按需配置）
        });

        // 2. 发送初始消息（可选）
        // res.write('data: 连接已建立\n\n');

        clients.add(res);
        // console.log(`现有 ${clients.size} 个连接`);
        statusBarItem.text = `${statusBarItemText}(${clients.size})`;

        // 4. 监听客户端断开连接，清理资源
        req.on('close', () => {
          clients.delete(res);
          res.end(); // 关闭响应
          // console.log(`现有 ${clients.size} 个连接`);
          statusBarItem.text = `${statusBarItemText}(${clients.size})`;
          // console.log('客户端断开连接');
        });
      });

      server.listen(watchFileConfig.port, () => {
        resolve(true);
        console.log(`SSE 服务运行在 http://localhost:${watchFileConfig.port}/sse`);
      });
    } catch (error) {
      reject();
    }
  });
};

const stopServer = async () => {
  return new Promise((resolve, reject) => {
    try {
      server.close((err: any) => {
        resolve(true);
        if (err) {
          console.error('Server close error:', err);
          // process.exit(1); // 异常退出
        }
        // console.log("Server closed successfully");
        // process.exit(0); // 正常退出
      });
      resolve(true);
    } catch (error) {
      reject();
    }
  });
};

export async function activate(context: vscode.ExtensionContext) {
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
- [$(refresh)刷新缓存](command:watch-file-refresh-page.restart)
    `,
    true
  );

  tooltip.isTrusted = true;

  statusBarItem.tooltip = tooltip;
  statusBarItem.command = 'watch-file-refresh-page.restart'; // 点击触发的命令

  // ========== 3. 显示状态栏 ==========
  statusBarItem.show();

  // ========== 4. 注册状态栏点击的自定义命令 ==========
  const refreshCommand = vscode.commands.registerCommand('watch-file-refresh-page.restart', async () => {
    // 点击事件逻辑：刷新组件缓存
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: '正在重启服务...' },
      async () => {
        try {
          await stopServer();
          await startServer();
        } catch (error) {}
        statusBarItem.text = statusBarItemText;
      }
    );
  });

  if (!server) {
    startServer();
  }

  vscode.workspace.onDidSaveTextDocument((document) => {
    // 1. 排除非文件类型文档（如虚拟文档、未保存的临时文档）
    if (document.uri.scheme !== 'file') {
      return;
    }

    const filePath = document.fileName; // 获取文件完整路径

    // 2. 解析文件后缀（path.extname 会返回带点的后缀，如 .js、.tsx）
    const fileExt = path.extname(filePath).toLowerCase(); // 转小写统一处理

    // 3. 处理无后缀文件
    if (fileExt) {
      const suffix = fileExt.slice(1);
      if (watchFileConfig.watchFileType?.includes(suffix)) {
        clients.forEach((res: any) => {
          // ! SSE 格式：data: 内容\n\n（必须严格遵循）
          // const data = `data: ${path} 修改时间: ${new Date().toLocaleTimeString()}\n\n`;
          // 向客户端写入数据
          res.write(1);
        });
      }
    }
  });

  context.subscriptions.push(refreshCommand);
}

// This method is called when your extension is deactivated
export function deactivate() {
  stopServer();
}
