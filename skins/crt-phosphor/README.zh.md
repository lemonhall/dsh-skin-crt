# 磷光 CRT

[English](README.md) | 中文

dsh web GUI 的 CRT 皮肤：暗玻璃上的磷光绿、覆盖中英文的点阵字体、烘焙进素材的扫描线与暗角，两个网络行者立绘钉在输入框左右两沿。

| | |
| --- | --- |
| id | `crt-phosphor` |
| 版本 | 0.1.0 |
| 清单 | v2 |
| 字体 | Fusion Pixel 12px 等宽（OFL-1.1，随包） |
| 许可 | CC BY-NC-SA 4.0（非官方同人） |

## 预览

亮色：

![亮色](preview/light.jpg)

暗色：

![暗色](preview/dark.jpg)

两张都是 1440x900 JPEG q85，出自官方 facade 渲染器。

## 是什么

- `skin.css` 重映射官方 token：所有文字与描边变磷光绿、所有面板变近黑绿玻璃，31 个 `--dsw-font-*-font-family` 全部指向随包点阵字体；字体用**本地相对路径**的 `@font-face` 声明（本地相对 URL 能过安全管线，远程的不行）。
- `patches.css` 画管子：`#root::before` 暗角 + 缓慢呼吸，`#root::after` 淡辉光 + 偶发闪烁，正文磷光泛光 + 一丝色差边缘，两个立绘在 `body::before/::after`。
- 扫描线**刻意烘焙进素材**：用 CSS 画 3px 周期的线会和设备像素比打架，看起来就是几条粗带在扫。
- **没有 `hooks.mjs`**：市场预览渲染器不执行皮肤 hooks，所以管子刻意做成纯声明式。

## 跟她们说话

把鼠标移到输入框上，两个小姐姐会各弹一个漫画气泡（点阵字），指针离开后再停留约 2.6 秒才消失。

触发用的是 `body:has([data-composer-card]:hover)`，而不是"点立绘本身"——因为在 Chromium 里**伪元素根本无法成为 hover/click 的目标**（`body::before:hover` 甚至不是合法选择器，而选择器列表只要一条无效，整条规则都会被丢弃）。真要"点她本人才回应"，必须上 `hooks.mjs`，而皮肤中心只对**市场安装**的皮肤放行 hooks。

## 立绘

锚定 `[data-composer-card]`（左立绘用 `left: anchor(--crt-composer left)` 配 `translate: -100% 0`），因此侧栏与 details 栏开合都会跟着走，全程不需要测量；层级 `z-index: 900` —— 高于官方那几层（15~40）、低于鲸鱼娘挂件的 `9999`。

`--crt-portrait-filter` 是唯一旋钮：自然色 + 磷光轮廓，或纯绿幽灵双色调，一行切换。

## 已知限制

- 纯呈现层：只改浏览器样式，不触及模型请求。
- 字体按 12px 网格设计，界面里的奇数号（11、13、14、16）会被轻微插值。
- `patches.css` 有几处匹配 CSS-Modules 哈希类名，官方重建后可能改名（`dsh-skin validate` 会按设计 warning）。
- 字体占皮肤总体积（约 1.3 MB）里的 903 KB；子集化能砍掉约一半，代价是生僻字。

完整推导见项目仓库的 `docs/CRT-TECHNIQUE.md`。
