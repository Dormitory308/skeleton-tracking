# 实时摄像头骨架跟踪

基于 MediaPipe Pose 的实时人体姿态估计与骨架跟踪应用。

---

## 🚀 快速部署（新手必看）

本项目是一个网页应用，**无需安装任何编程环境**，只需一个浏览器即可运行。以下提供三种部署方式，请选择最适合您的一种：

### 方式一：直接双击打开（最简单）

1. 进入项目文件夹，找到 `index.html` 文件
2. **双击** `index.html` 文件
3. 浏览器会自动打开页面

> ⚠️ **注意**：部分浏览器（如 Chrome、Edge）可能因为安全策略限制无法访问摄像头，建议使用下方「方式二」或「方式三」部署。

---

### 方式二：使用命令行启动本地服务器

#### 第一步：安装 Node.js

1. 访问 https://nodejs.org/
2. 下载 **LTS（长期支持版）**
3. 双击安装包，一路点击「下一步」完成安装

#### 第二步：打开命令行

#### 第三步：进入项目文件夹

在命令行中输入（根据您的实际路径修改）：

```bash
cd /path/to/your-project
```

#### 第四步：启动服务

```bash
# 如果这是第一次运行，先安装 http-server
npm install -g http-server

# 启动服务器
npm start
```

#### 第五步：打开浏览器

命令行会显示类似信息：

```
Available on:
  http://127.0.0.1:8080
  http://192.168.x.x:8080
```

打开浏览器，访问 `http://127.0.0.1:8080`

---

### 方式四：手机/平板直接访问（同一局域网）

如果您想在手机或平板上测试：

1. 按照「方式三」启动服务器
2. 记录命令行中显示的 `http://192.168.x.x:8080` 地址
3. 确保手机和电脑连接**同一个WiFi**
4. 在手机浏览器中输入该地址即可访问

---

### 使用摄像头权限

首次使用时会弹出提示：

```
「是否允许访问摄像头？」
```

**必须点击「允许」**，否则无法进行姿态检测。

---

## 项目简介

本项目使用 MediaPipe Pose 技术，通过摄像头实时检测人体姿态，并在视频画面上绘制33个关键点和骨架连接线。同时支持关键点位置信息实时显示和骨架图像截图保存。

---

## 技术实现详解

### 1. 核心技术栈

| 技术 | 用途 |
|------|------|
| MediaPipe Pose | 人体姿态估计模型，提供33个关键点检测 |
| Canvas API | 在视频画面上绘制骨架线和关键点 |
| getUserMedia API | 访问用户摄像头获取视频流 |
| CSS3 | UI界面 |

### 2. MediaPipe Pose 姿态检测原理

MediaPipe Pose 是 Google 开源的高精度人体姿态估计模型，采用 BlazePose 模型架构。

#### 2.1 关键点检测 (Landmarks)

模型输出33个人体关键点，每个关键点包含：
- `x`: 归一化坐标 (0-1，相对于图像宽度)
- `y`: 归一化坐标 (0-1，相对于图像高度)
- `z`: 深度坐标
- `visibility`: 可见度评分 (0-1，表示该点是否可见)

33个关键点定义：
```
0: 鼻子           11: 左髋           22: 右眼外角
1: 左眼           12: 右髋           23: 左嘴角
2: 右眼           13: 左膝           24: 右嘴角
3: 左耳           14: 右膝           25: 左眉内
4: 右耳           15: 左脚踝         26: 左眉外
5: 左肩           16: 右脚踝         27: 右眉内
6: 右肩           17: 左脚趾         28: 右眉外
7: 左肘           18: 右脚趾         29: 下巴
8: 右肘           19: 左眼内角       30: 左掌
9: 左手腕         20: 左眼外角       31: 右掌
10: 右手腕        21: 右眼内角
```

#### 2.2 骨架连接 (Pose Connections)

定义了25组关键点连接对，组成完整的人体骨架：

```javascript
// 面部轮廓
[0, 1], [0, 2], [1, 3], [2, 4]

// 躯干
[5, 6], [5, 11], [6, 12], [11, 12]

// 左臂
[5, 7], [7, 9], [9, 30]

// 右臂
[6, 8], [8, 10], [10, 31]

// 左手连接关系
[11, 13], [13, 15], [15, 17], [15, 19], [15, 21]

// 右手连接关系
[12, 14], [14, 16], [16, 18], [16, 20], [16, 22]

// 左腿
[23, 25], [25, 27], [27, 29], [27, 31]

// 右腿
[24, 26], [26, 28], [28, 30], [28, 32]
```

### 3. 摄像头访问实现

使用 Web API `navigator.mediaDevices.getUserMedia` 获取摄像头视频流：

```javascript
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    facingMode: 'user'  // 前置摄像头
  },
  audio: false
});
```

关键点：
- `facingMode: 'user'` 指定使用前置摄像头
- 设置理想分辨率 640x480
- 仅请求视频轨道，不请求音频

### 4. Canvas 绘制技术

#### 4.1 双层画布结构

```
video-container (相对定位容器)
  ├── video (摄像头画面，display: block)
  └── canvas (绝对定位，100%填充，叠加在video上)
```

Canvas 覆盖在 video 元素上方，用于绘制骨架，不影响原视频显示。

#### 4.2 绘制连接线 (drawConnectors)

```javascript
function drawConnectors(ctx, landmarks, connections, options) {
  ctx.strokeStyle = options.color;      // 默认 #00ff88 绿色
  ctx.lineWidth = options.lineWidth;    // 默认 3px
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  connections.forEach(([startIdx, endIdx]) => {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];

    // 可见度过滤，只绘制可见点
    if (start.visibility > 0.1 && end.visibility > 0.1) {
      // 将归一化坐标转换为实际像素坐标
      const x1 = start.x * ctx.canvas.width;
      const y1 = start.y * ctx.canvas.height;
      const x2 = end.x * ctx.canvas.width;
      const y2 = end.y * ctx.canvas.height;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  });
}
```

#### 4.3 绘制关键点 (drawLandmarks)

```javascript
function drawLandmarks(ctx, landmarks, options) {
  landmarks.forEach((landmark) => {
    if (landmark.visibility > 0.1) {
      const x = landmark.x * ctx.canvas.width;
      const y = landmark.y * ctx.canvas.height;

      // 圆圈半径根据可见度动态调整
      const radius = Math.max(4, landmark.visibility * 6);

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();      // 填充颜色
      ctx.stroke();    // 白色边框
    }
  });
}
```

关键点颜色：#ff0066 (粉红色)
连接线颜色：#00ff88 (绿色)
圆圈半径：4-6像素，根据可见度调整

### 5. 帧处理循环

采用 `setTimeout` 递归调用实现约60fps的处理：

```javascript
async function processFrame() {
  if (!isRunning) return;

  try {
    await pose.send({ image: video });  // 发送当前帧到Pose模型
  } catch (error) {
    console.error('处理帧时出错:', error);
  }

  setTimeout(processFrame, 16);  // 约60fps (1000ms/16 ≈ 62.5fps)
}
```

**注意**：使用 `setTimeout` 而非 `requestAnimationFrame`，这是因为需要等待 `pose.send()` 异步完成后再处理下一帧。

### 6. MediaPipe Pose 配置参数

```javascript
pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
});

pose.setOptions({
  modelComplexity: 0,        // 0=轻量级, 1=完整, 2=高精度
  smoothLandmarks: true,     // 关键点平滑处理
  enableSegmentation: false, // 禁用人体分割
  minDetectionConfidence: 0.5,  // 最小检测置信度
  minTrackingConfidence: 0.5    // 最小跟踪置信度
});
```

**参数说明**：
- `modelComplexity`: 设为0使用轻量级模型，适合移动设备
- `smoothLandmarks`: 启用时域平滑，减少抖动
- `minDetectionConfidence`: 检测阈值，低于此值忽略
- `minTrackingConfidence`: 跟踪阈值，影响关键点稳定性

### 7. UI 状态管理

```javascript
// 状态指示器
statusText: '等待启动...' → '初始化中...' → '跟踪中...' → '已停止'
statusDot: 红色(#ff4757) → 橙色(#ffaa00) → 绿色(#00ff88)

// 按钮状态
开始跟踪: 启用 → 禁用
停止跟踪: 禁用 → 启用
截图: 禁用 → 启用
```

### 8. 截图功能实现

```javascript
function captureImage() {
  const link = document.createElement('a');
  link.download = `skeleton-${Date.now()}.png`;  // 时间戳命名
  link.href = canvas.toDataURL('image/png');     // Canvas转PNG
  link.click();                                   // 自动下载
}
```

使用 Canvas 的 `toDataURL` 方法将绘制了骨架的当前画面导出为 PNG 图片。

### 9. 信息面板展示

只显示9个核心关键点位置信息：

```javascript
const displayLandmarks = [0, 5, 6, 11, 12, 13, 14, 15, 16];
// 鼻子、左肩、右肩、左髋、右髋、左膝、右膝、左脚踝、右脚踝
```

坐标转换：将归一化坐标 (0-1) 转换为实际像素坐标：
```javascript
const x = Math.round(lm.x * canvas.width);
const y = Math.round(lm.y * canvas.height);
```

### 10. 项目结构

```
/Dormitory308/skeleton-tracking
├── index.html      # 主页面，包含UI和样式
├── app.js          # 核心逻辑，姿态检测和骨架绘制
└── package.json    # 项目配置
```

### 11. 技术亮点

1. **实时性**: 约60fps的处理速度，满足实时应用需求
2. **轻量级**: 使用 modelComplexity: 0，适合低性能设备
3. **平滑处理**: smoothLandmarks 减少关键点抖动
4. **响应式设计**: CSS 媒体查询和弹性布局适配不同屏幕
5. **用户体验**: 状态指示器提供清晰的反馈
6. **跨平台**: 纯 Web 技术，支持所有现代浏览器

### 12. 依赖项

- MediaPipe Pose (通过 CDN 加载)
- 无需本地构建，直接运行于浏览器环境

### 13. 浏览器兼容性

| 特性 | 要求 |
|------|------|
| getUserMedia | Chrome 53+, Firefox 36+, Safari 11+ |
| Canvas API | 所有现代浏览器 |
| ES6+ | Chrome 58+, Firefox 54+, Safari 11+ |

---

## 常见问题

**Q: 摄像头无法访问怎么办？**
- 确保使用 HTTPS 或 localhost 访问页面
- 检查浏览器是否已授予摄像头权限
- 尝试刷新页面并重新允许权限

**Q: 姿态检测不准确怎么办？**
- 确保光线充足
- 保持正面面对摄像头
- 尽量保持身体在画面中央

**Q: 手机上无法使用？**
- 确保手机和电脑连接同一局域网
- 使用 Chrome 或 Safari 浏览器
