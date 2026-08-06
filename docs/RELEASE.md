# 发布、资源契约与线上冒烟

本文只负责从已验证代码到GitHub Pages上线后的发布闭环。测试覆盖写在`docs/TESTING.md`，运行时调试写在`docs/DEBUGGING.md`。

## 1. 发布分支与门禁

`main`是正式网页发布分支。推送后`.github/workflows/pages.yml`按顺序执行：

1. 调用`.github/workflows/test-web.yml`；
2. 完整运行`npm run verify`；
3. 检出将要发布的确切提交；
4. 把七位短提交号写入`web/index.html`的`data-build-sha`；
5. 上传`web/`并部署GitHub Pages；
6. 从Pages真实地址验证构建号与发布资源；
7. 自动启动Chrome访问线上页面并跑最短交互。

质量门禁失败时不会制作发布产物；部署后的任一冒烟失败会把整个Pages工作流标记为失败。

## 2. 发布资源唯一契约

`scripts/release-contract.mjs`是关键发布资源的唯一清单，包含：

- 页面入口、主样式、主模块和战斗入口；
- 三出身牌面与两张独立序章场景；
- 破庙、人物、行囊和武学各一项代表性核心资源；
- 每项期望MIME类型和最小字节数。

以下三处共同读取该契约：

- `scripts/verify-release-assets.mjs`：发布前本地校验；
- `scripts/smoke-deployed.mjs`：部署后HTTP校验；
- `tests/release-infrastructure.test.mjs`：锁定工作流和契约结构。

新增必须随入口出现的核心资源时只修改该契约，不再手工同步YAML资源列表。

本地运行：

```bash
npm run test:release
```

除了关键清单，脚本还扫描所有运行时HTML、CSS和ES Modules中的`assets/`引用，确认文件存在且非空；再反向扫描`web/assets/`，拒绝没有运行引用或显式发布契约的孤儿文件，并禁止重新建立`UI_Renderings`设计稿目录。入口与模块还必须只使用一个缓存版本。

## 3. 部署后HTTP冒烟

工作流调用：

```bash
node scripts/smoke-deployed.mjs
```

并提供：

```text
PAGE_URL=<Pages真实地址>
EXPECTED_BUILD_SHA=<七位短提交号>
```

脚本会：

- 轮询线上`index.html`直到构建号等于本次提交；
- 对每项资源追加构建号查询参数，避开中间缓存；
- 跟随重定向并检查HTTP状态；
- 检查MIME类型与最小字节数；
- 输出机器可读JSON结果。

这一步证明发布服务器提供了正确产物，但还不能证明JavaScript成功启动。

## 4. 部署后真实浏览器冒烟

随后工作流设置：

```text
BROWSER_BASE_URL=<Pages真实地址>
EXPECTED_BUILD_SHA=<七位短提交号>
```

并执行：

```bash
npm run smoke:online
```

`scripts/run-browser-regression.mjs`不再启动本地服务器，而是自动启动隔离Chrome访问线上地址。`scripts/cdp-online-smoke.mjs`检查：

- 主模块完成首屏渲染并设置`appReady`；
- HTML构建号与本次提交一致；
- 普通入口没有调试对象；
- 样式表真实加载；
- 新旅程可以进入三出身选择；
- 844×390横屏无横向溢出；
- `?debug=1`状态协议、构建号和当前屏幕可读；
- 页面运行异常为空。

线上冒烟只验证“本次发布可以启动和进入首个核心交互”，完整剧情、战斗和存档回归已经在部署前运行，避免线上重复执行长流程。

## 5. 发布完成定义

只有以下状态都成立，才可以称为“已发布”：

- 本地或CI完整质量门禁通过；
- 提交已推送到`main`；
- Pages部署任务完成；
- 线上HTML显示当前短提交号；
- HTTP资源契约通过；
- 线上浏览器冒烟通过；
- 本地`HEAD`、远端`main`和线上构建号三者一致。

“已提交”“已推送”“Pages正在部署”和“线上已验证”必须分别如实说明。
