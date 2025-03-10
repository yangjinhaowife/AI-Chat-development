// 监听扩展图标点击事件
chrome.action.onClicked.addListener(async (tab) => {
  // 打开侧边栏
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

// 确保侧边栏在扩展安装或更新时可用
chrome.runtime.onInstalled.addListener(() => {
  // 设置侧边栏
  chrome.sidePanel.setOptions({
    enabled: true
  });
}); 