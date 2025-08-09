# 实施计划（品牌与 UI 素材美化）

- [ ] 1. 新增品牌主题配置
  - 在 `scripts/gen-images.js` 增加 `theme`（颜色、渐变、圆角、阴影、尺寸质量常量）
  - _需求: 4

- [ ] 2. 生成 Banner（3 张）
  - 尺寸 750x300，渐变+几何装饰；JPG q=82，<200KB/张
  - 覆盖 `miniprogram/images/banner1.jpg..banner3.jpg`
  - _需求: 1

- [ ] 3. 生成分享图（1 张）
  - 尺寸 1200x960，品牌文案与徽标角标；JPG q=86，<300KB
  - 覆盖 `miniprogram/images/share.jpg` 与 `share-default.jpg`
  - _需求: 1

- [ ] 4. 生成分类图标（多张）
  - 尺寸 96x96，底色渐变+线性图标；PNG
  - 覆盖 `miniprogram/images/category-*.png`
  - _需求: 2

- [ ] 5. 生成菜单图标（多张）
  - 尺寸 64x64，风格一致；PNG
  - 覆盖 `miniprogram/images/menu-*.png`
  - _需求: 2

- [ ] 6. 生成空状态插画（3 套）
  - 尺寸 750x500；PNG；主题：通用空、订单空、评价空
  - 覆盖 `miniprogram/images/empty*.png`
  - _需求: 3

- [ ] 7. 体积与格式校验
  - 脚本内校验尺寸/格式/大小；超过则自动降质/优化
  - _需求: 1/2/3

- [ ] 8. 预览与验收
  - 微信开发者工具预览首页/个人中心/分享；通过 EARS 验收
  - _需求: 1/2/3/4 