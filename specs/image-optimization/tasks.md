# 实施计划

- [ ] 1. 资源清单确认
  - 对照 `specs/image-optimization/requirements.md` 列表逐项勾选需产出文件
  - _需求: 全量范围

- [ ] 2. 设计与选型
  - 选取图标（Lucide/Tabler/Heroicons）并在 Figma/AI 统一线条规格（2 px、主色 #3B82F6）
  - 设计 3 张 Banner 渐变底图
  - _需求: 风格与主色

- [ ] 3. 导出与压缩
  - 导出 PNG（24/32/64/128 px 视需要）、JPG（1440×540 / 1200×900）
  - 使用 Squoosh/TinyPNG 进行体积优化（PNG ≤ 80KB，JPG ≤ 300KB/200KB）
  - _需求: 体积与清晰度

- [ ] 4. 文件放置
  - 按既有文件名放入 `miniprogram/images/`
  - 中文文件名 UTF-8 保证，路径与代码一致
  - _需求: 不改代码路径

- [ ] 5. 许可与文档
  - 在 `README.md` 新增“素材来源与许可”段落（MIT/CC0/自制）
  - 归档 SVG 源文件至 `assets-src/`（不参与构建）
  - _需求: 许可合规

- [ ] 6. 运行与自测
  - 使用微信开发者工具打开项目，核验首页/分类/空状态/订单/分享
  - 网络面板确认无 404，图像清晰无锯齿
  - _验收: 1、2、3、4、5、6、7、8

- [ ] 7. 备份与回滚
  - 备份原 `miniprogram/images/`
  - 出现异常可快速还原
  - _非功能: 可维护

- [ ] 8. 提交
  - `git add . && git commit -m "chore(images): unify style with #3B82F6 and optimize assets"`
  - _流程: 提交规范 