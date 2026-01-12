## 原生 js 项目, 监听文件(html, css, js)修改, 通过 SSE 通知前端, 实现自动刷新页面

```js
// ! 实例代码
{
  if (['127.0.0.1', 'localhost', '${localIp}'].includes(location.hostname)) {
    new EventSource('http://${localIp}:${port}/sse').onmessage = (e) => location.reload();
  }
}
```
