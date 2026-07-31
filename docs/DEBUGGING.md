# 调试状态接口

本文只负责浏览器运行时的调试协议。接口不属于玩家玩法，不在普通页面显示，也不替代存档迁移和规则测试。

## 1. 开启方式

只有URL明确包含`?debug=1`时，页面才注入：

```js
window.WudaoDebug
```

普通入口中`typeof window.WudaoDebug === "undefined"`。调试入口仍加载真实游戏、真实存档层和真实渲染器，没有并行的“测试版状态机”。

## 2. 协议

当前`protocolVersion`为`1`。

### 只读状态

```js
window.WudaoDebug.status()
```

返回稳定、低体积的运行状态：

```js
{
  protocolVersion: 1,
  ready: true,
  buildSha: "a1b2c3d",
  saveVersion: 9,
  screen: "templeWake",
  originId: "mystery",
  viewport: { width: 844, height: 390 },
  overlays: {
    inventory: false,
    character: false,
    martial: false
  }
}
```

`document.documentElement.dataset.appReady`只有首个真实渲染完成后才变为`"true"`。部署后浏览器冒烟以此判断页面不是“HTML返回成功但主模块没有启动”。

### 完整快照

```js
window.WudaoDebug.snapshot()
```

在`status()`之外返回当前可序列化状态副本、因果种子和覆盖层状态。调用方修改返回对象不会直接改动游戏。

### 受控命令

所有写操作收进独立命名空间：

```js
window.WudaoDebug.commands.replaceState(state)
window.WudaoDebug.commands.patchState(patch)
window.WudaoDebug.commands.setScreen(screen)
window.WudaoDebug.commands.resetJourney()
```

- `replaceState`必须通过现有存档迁移与屏幕白名单；
- `patchState`只做顶层补丁，随后仍走完整校验；
- `setScreen`只接受已注册渲染器；
- `resetJourney`清理当前浏览器旅程并建立标准初始状态；
- 失败返回`{ ok: false, reason }`，不静默写入坏状态。

浏览器回归优先用真实点击推进。命令只用于建立昂贵前置、坏档恢复和接口本身验证，不能掩盖不可达节点。

## 3. 构建与线上诊断

本地HTML的`data-build-sha`为`dev`。Pages部署时写入当前七位短提交号，`status().buildSha`必须读取同一个值。线上问题先检查：

```js
window.WudaoDebug.status()
```

- `ready: false`：主模块未完成首屏渲染；
- 构建号不符：Pages或浏览器仍在读取旧产物；
- 存档版本不符：迁移未完成或入口混用了旧模块；
- 屏幕不符：查看完整快照和最近叙事记录。

调试接口不得进入玩家按钮、剧情文案、正式存档字段或截图。协议字段变化必须更新本文件、`tests/release-infrastructure.test.mjs`和浏览器冒烟。
