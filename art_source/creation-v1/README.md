# Creation art v1

本目录保存“出身／容貌”明亮淡彩界面的无字美术母版。三张出身图只表现生活地点和同龄人物，不预设主角正脸；容貌页底图保留中央与两侧交互留白。

运行资源由下列命令统一裁切并转为 WebP：

```bash
python scripts/build-creation-art-v1.py
```

输出位置：

- `web/assets/creation-v1/`：网页运行资源；
- `docs/assets/creation-art-v1-sheet.webp`：三张出身图的并排人工检查图。

人物容貌继续使用 `rig-v2` 静态分层母版，本版本不接入 Spine。
