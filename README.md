```js
// ! 实例代码
{
  if (['127.0.0.1', 'localhost', '${localIp}'].includes(location.hostname)) {
    new EventSource('http://${localIp}:${port}/sse').onmessage = (e) => location.reload()
  }
}`);
```

