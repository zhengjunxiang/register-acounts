const { contextBridge, ipcRenderer } = require('electron');

// 使用 contextBridge 将安全的 API 暴露给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, data) => ipcRenderer.send(channel, data), // 用于发送事件
  on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args)), // 用于监听事件
  invoke: (channel, data) => ipcRenderer.invoke(channel, data), // 用于请求数据并等待响应
});

/**
 * The preload script runs before `index.html` is loaded
 * in the renderer. It has access to web APIs as well as
 * Electron's renderer process modules and some polyfilled
 * Node.js functions.
 *
 * https://www.electronjs.org/docs/latest/tutorial/sandbox
 */
window.addEventListener('DOMContentLoaded', () => {
  const replaceText = (selector, text) => {
    const element = document.getElementById(selector)
    if (element) element.innerText = text
  }

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, process.versions[type])
  }
})