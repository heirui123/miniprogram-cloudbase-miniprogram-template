# 技术方案设计：图片优化与统一

## 架构与范围
- 仅替换/新增 `miniprogram/images/` 下的图片文件，不改动代码中的路径与文件名。
- 设计主色：`#3B82F6`，辅色渐变：`#60A5FA`（浅）、`#0EA5E9`（对比）。
- 风格：线性单色图标 + 柔和渐变 Banner。
- 统一图层与导出规范，提供 SVG 源文件（另存：`assets-src/icons/` 与 `assets-src/banners/`，不参与运行）。

## 资源规范与尺寸

### 1) 首页 Banner（JPG）
- 文件：`banner1.jpg`、`banner2.jpg`、`banner3.jpg`
- 尺寸：1440×540（等比可裁切），JPG 品质 70-82
- 设计：蓝色主色渐变背景（`#3B82F6 → #60A5FA`），叠加轻量几何/线性图形，避免文字（多语言与适配成本）。
- 体积：单张 ≤ 300 KB

### 2) 分类入口图标（PNG）
- 文件：`category-life.png`、`category-errand.png`、`category-second.png`、`category-pet.png`、`category-neighbor.png`
- 尺寸：64×64（透明背景），导出 1x（若页面使用 2x，可导出 128×128 再等比缩放放置）
- 线条：2 px，圆角端点，描边颜色 `#3B82F6`，不填充或最小填充
- 像素对齐：图标边界与网格贴合，避免渲染模糊

### 3) 子分类图标（PNG）
- 二手：`category-*.png`
- 发布服务：`category-*.png`
- 宠物服务：`pet-*.png`
- 好邻居互助：`help-*.png`
- 尺寸与风格：同“分类入口图标”，必要时通过细节区分（线段结构不同而非颜色依赖）

### 4) 通用 UI 图标（PNG）
- 文件：`upload.png`、`location.png`、`arrow-right.png`、`arrow-down.png`、`menu-*.png`、`action-*.png`
- 尺寸：24×24 或 32×32（按页面组件栅格选择），透明背景
- 线条：2 px，颜色 `#3B82F6`

### 5) 空状态与默认图（PNG）
- 文件：`empty.png`、`empty-order.png`、`empty-review.png`、`default-avatar.png`、`default-service.png`
- 风格：线性插画（几何构成），主色 `#3B82F6`，辅色低饱和灰蓝
- 尺寸：400×300 或等比例，透明背景
- 体积：单图 ≤ 80 KB

### 6) 订单状态图（PNG，中文文件名）
- 文件：`status-待接单.png`、`status-已接单.png`、`status-进行中.png`、`status-已完成.png`
- 尺寸：320×200 或等比例
- 语义区分：
  - 待接单：灰蓝轮廓/等待符号
  - 已接单：勾选/握手符号
  - 进行中：进度/齿轮/加载符号
  - 已完成：实心勾/奖章符号

### 7) 分享图（JPG）
- 文件：`share.jpg`、`share-default.jpg`
- 尺寸：1200×900 或 1080×864（16:12），JPG 品质 75-85
- 设计：主色渐变 + 轻量图形元素，避免密集细节
- 体积：单图 ≤ 200 KB

## 素材来源与许可
- 图标：优先使用 Lucide / Tabler Icons / Heroicons（MIT 许可）。
  - 官方地址：
    - Lucide: `https://lucide.dev`
    - Tabler: `https://tabler-icons.io`
    - Heroicons: `https://heroicons.com`
- Banner 背景：自制渐变（无需授权）或使用公开可商用的无版权素材做纹理点缀（例如 `https://www.svgbackgrounds.com/` 的免费授权部分）。
- README 中新增“素材来源与许可”段落，列出来源与许可类型（MIT/CC0/自制）。

## 导出与压缩流程（建议）
- 设计工具：Figma/Sketch/Illustrator 统一导出 SVG 源文件
- PNG 导出：以 1x/2x 导出，透明背景，线条 2 px
- JPG 导出：品质 70-85，避免过度压缩产生 Banding
- 压缩：
  - PNG：`pngquant`（目标 60-80）或 Squoosh（`oxipng`/`mozjpeg`）
  - JPG：`mozjpeg` 或 Squoosh Web/CLI
- Windows 本地可选：使用 Squoosh CLI（`npx @squoosh/cli`）或在线压缩（TinyPNG/Photopea 导出优化）

## 文件放置与命名
- 运行时：全部放在 `miniprogram/images/`，使用既有文件名替换
- 源文件：`assets-src/icons/`、`assets-src/banners/`（不被小程序引用）
- 中文文件名：保持 UTF-8 编码，确保 Windows/微信开发者工具可正常识别

## 质量与可访问性
- 像素贴合：导出前检查图标锚点是否落在整数像素
- 对比度：图标在浅/深背景下可辨（必要时保留 2 px 内阴影或描边）
- 性能：首屏涉及图片合计 ≤ 1 MB

## 验证与回归测试
- 打开以下页面核验：
  - 首页 Banner 轮播
  - 分类与子分类入口
  - 列表无数据空状态
  - 订单详情状态图
  - 分享动线（若涉及生成分享图）
- 控制台与网络面板无 404/缺图，图片渲染清晰无模糊

## 回滚策略
- 在替换前备份 `miniprogram/images/`，如出现异常可一键还原
- 保留源 SVG 与导出参数，便于快速调整并二次导出 