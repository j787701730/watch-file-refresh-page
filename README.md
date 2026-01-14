## 原生 js 项目, 监听文件(html, css, js)修改, 通过 SSE 通知前端, 实现自动刷新页面

## 工作区 .vscode 目录下 settings.json 配置

```json
"watchFile.config": {
  "watchFileType": ["js", "html", "css"], // 监听的文件类型
  "port": 6006, // 默认 6006
  "autoStart": false, // 默认不启动
}
```

## 页面添加代码

```js
// ! 实例代码
{
  if (['127.0.0.1', 'localhost', '${localIp}'].includes(location.hostname)) {
    new EventSource('http://${localIp}:${port}/sse').onmessage = (e) => location.reload();
  }
}
```
