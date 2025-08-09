# 需求文档：图片优化与统一

## 介绍

在不修改代码中图片路径与文件名的前提下，为小程序提供更高质量、更统一风格的图片与图标资源，以提升整体观感与一致性，降低运行时缺图风险。

## 需求

- 风格：A 方案（线性单色图标 + 柔和渐变 Banner，清爽风格）
- 主色：蓝色 `#3B82F6`（可在图标与 Banner 渐变中作为主色使用）
- 许可：允许联网下载/引入可商用、无版权或开源许可的图片与图标；需在 README 标注来源与协议
- 不改代码：保留既有引用路径与文件名，仅补齐/替换图片文件

### 资源范围（需产出文件，全部放置于 `miniprogram/images/`）

1) 首页 Banner（JPG）
- banner1.jpg
- banner2.jpg
- banner3.jpg

2) 分类入口图标（PNG）
- category-life.png
- category-errand.png
- category-second.png
- category-pet.png
- category-neighbor.png

3) 子分类图标（PNG）
- 二手：category-all.png, category-furniture.png, category-electronics.png, category-clothing.png, category-books.png, category-sports.png, category-other.png
- 发布服务：category-repair.png, category-cleaning.png, category-moving.png, category-decoration.png, category-other.png
- 宠物服务：pet-all.png, pet-boarding.png, pet-walking.png, pet-grooming.png, pet-training.png, pet-medical.png, pet-other.png
- 好邻居互助：help-all.png, help-tools.png, help-delivery.png, help-care.png, help-repair.png, help-education.png, help-other.png

4) 通用 UI 图标（PNG）
- upload.png, location.png, arrow-right.png, arrow-down.png
- 菜单：menu-service.png, menu-order.png, menu-member.png, menu-settings.png, menu-help.png, menu-about.png
- 快捷操作：action-publish.png, action-scan.png, action-invite.png

5) 空状态与默认图（PNG）
- empty.png, empty-order.png, empty-review.png
- default-avatar.png（已有但需统一风格重制）、default-service.png（已有但需统一风格重制）

6) 订单状态图（PNG，中文文件名按现有规则）
- status-待接单.png, status-已接单.png, status-进行中.png, status-已完成.png

7) 分享图（JPG）
- share.jpg, share-default.jpg

8) 版权不变更
- powered-by-cloudbase-badge.svg 保留（无需改动）

## 验收标准（EARS）

1. When 构建并在微信开发者工具运行项目时，the 小程序 shall 不出现图片加载 404，控制台无缺图报错。
2. When 打开首页与所有功能页（首页/生活服务/二手/宠物/互助/发布/订单/详情/个人中心），the 图片 shall 按引用路径正确显示，清晰无锯齿，样式与排版不变形。
3. When 查看首页 Banner 轮播，the 三张 Banner shall 渐变风格统一、清爽、分辨率≥1440×540，体积单张≤300KB。
4. When 查看分类与子分类入口，the 图标 shall 为线性单色风格，主色系为 `#3B82F6`，在深浅背景下均清晰可辨（必要时带 2px 内阴影或描边）。
5. When 查看通用 UI 图标（上传/定位/箭头/菜单/操作），the 图标 shall 线性单色、像素贴合（24/32px 基准），Retina 下无模糊。
6. When 列表无数据或默认占位触发时，the 空状态与默认图 shall 主题一致（线性插画/简约几何），单图≤80KB。
7. When 订单状态为“待接单/已接单/进行中/已完成”，the 对应状态图 shall 以中文文件名加载正确，视觉语义清晰（例如颜色或形状区分）。
8. When 触发分享或生成分享卡片时，the share.jpg 与 share-default.jpg shall 能正确显示，风格与主色一致，单图≤200KB。
9. While 进行代码审查，the 资源文件名 shall 与代码一致，无新增路径改动；仅替换/新增图片文件。
10. While 审核第三方素材，the README shall 增加素材来源与许可说明，满足可商用或等价开源许可要求。

## 非功能性要求

- 性能：新增或替换图片需压缩优化，合计体积控制在合理范围（首屏涉及资源合计≤1MB）。
- 兼容：在 iOS 与 Android 端小程序均显示清晰；避免出现中文路径编码问题（文件系统保存为 UTF-8）。
- 可维护：提供原始设计源文件或可复用的矢量素材链接，便于后续替换与二次设计。

## 约束

- 不改动任何 WXML/JS 中的图片路径与文件名映射。
- 保留并优先复用既有尺寸与占位布局，确保页面结构不受影响。

## 交付物

- `miniprogram/images/` 下上述全量文件（JPG/PNG/SVG）
- README 中新增的素材来源与许可段落
- 如有：设计源文件（SVG/AI/FIG 或开源图标链接清单） 