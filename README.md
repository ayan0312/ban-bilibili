# bilibili-pa

b站社区环境太差，眼不见心不烦

注册页面，然后挂[Violentmonkey](https://violentmonkey.github.io/)就行

```javascript
// bangumi
ban.pageRegister({
  pathExp: /www.bilibili.com\/bangumi\/play\/(ss|ep)[0-9]?/, // 字符串或者正则
  id: "bangumi", // 唯一id
  timeout: 500, // 超时时间
  nodes: [
    {
      name: "相关推荐", // 名称
      element: "#recom_module", // 提供两种方式 '#id' || '.class1.class2.class3'
      once: true, // false会删除重复出现的节点，一般没有
      delay: 1000, // 定时器刷新频率
      max: 100, // 最大查找次数
      hideType: "hidden", // "hidden" || "removed",removed不会直接删除节点，会创建一个空div占位，可复原
      callback: data => {
        ban.DOMTools.restoreNode(data.item.element); // 恢复节点
        clearInterval(data.timer); // 如果是选择once:false，手动清除定时器
      } // 删除节点后的回调函数
    },
    {
      name: "导航栏",
      element: "#bili-header-m",
      once: true
    },
    {
      name: "弹幕列表",
      element: "#danmukuBox",
      once: true
    }
  ]
});
```
