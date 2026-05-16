console.log('MediaPipe Pose loaded:', typeof window.Pose);

const { Pose } = window;

const POSE_CONNECTIONS = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [15, 17], [15, 19], [15, 21], [16, 18], [16, 20], [16, 22],
  [17, 19], [18, 20],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32],
  [27, 31], [28, 32]
];

function drawConnectors(ctx, landmarks, connections, options) {
  const color = options.color || '#00ff88';
  const lineWidth = options.lineWidth || 3;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  connections.forEach(([startIdx, endIdx]) => {
    const start = landmarks[startIdx];
    const end = landmarks[endIdx];
    
    if (start && end && start.visibility > 0.1 && end.visibility > 0.1) {
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

function drawLandmarks(ctx, landmarks, options) {
  const color = options.color || '#ff0066';
  const lineWidth = options.lineWidth || 2;
  
  ctx.fillStyle = color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = lineWidth;
  
  landmarks.forEach((landmark) => {
    if (landmark && landmark.visibility > 0.1) {
      const x = landmark.x * ctx.canvas.width;
      const y = landmark.y * ctx.canvas.height;
      const radius = Math.max(4, landmark.visibility * 6);
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  });
}

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const captureBtn = document.getElementById('captureBtn');
const statusText = document.getElementById('statusText');
const statusDot = document.getElementById('statusDot');
const landmarkInfo = document.getElementById('landmarkInfo');

let pose = null;
let isRunning = false;
let lastLandmarks = [];

const LANDMARK_LABELS = [
  '鼻子', '左眼', '右眼', '左耳', '右耳',
  '左肩', '右肩', '左肘', '右肘', '左手腕',
  '右手腕', '左髋', '右髋', '左膝', '右膝',
  '左脚踝', '右脚踝', '左脚趾', '右脚趾',
  '左眼内', '左眼外', '右眼内', '右眼外',
  '左嘴角', '右嘴角', '左眉内', '左眉外',
  '右眉内', '右眉外', '下巴', '左掌', '右掌'
];

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      },
      audio: false
    });
    
    return new Promise((resolve) => {
      video.srcObject = stream;
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.style.width = video.videoWidth + 'px';
        canvas.style.height = video.videoHeight + 'px';
        video.style.width = video.videoWidth + 'px';
        video.style.height = video.videoHeight + 'px';
        resolve(true);
      };
      
      setTimeout(() => {
        if (!video.videoWidth) {
          canvas.width = 640;
          canvas.height = 480;
          canvas.style.width = '640px';
          canvas.style.height = '480px';
          video.style.width = '640px';
          video.style.height = '480px';
        }
        resolve(true);
      }, 1000);
    });
  } catch (error) {
    console.error('摄像头访问失败:', error);
    alert('无法访问摄像头，请确保已授予权限');
    return false;
  }
}

function createPoseInstance() {
  pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
  });

  pose.setOptions({
    modelComplexity: 0,
    smoothLandmarks: true,
    enableSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  pose.onResults(onResults);
}

function onResults(results) {
  if (!isRunning) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (results.poseLandmarks) {
    drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: '#00ff88',
      lineWidth: 3
    });
    
    drawLandmarks(ctx, results.poseLandmarks, {
      color: '#ff0066',
      lineWidth: 2
    });

    lastLandmarks = results.poseLandmarks;
    updateLandmarkInfo(results.poseLandmarks);
  }
}

function updateLandmarkInfo(landmarks) {
  if (!landmarks || landmarks.length === 0) {
    landmarkInfo.innerHTML = '<p style="color: #ff4757;">未检测到人体</p>';
    return;
  }

  const displayLandmarks = [0, 5, 6, 11, 12, 13, 14, 15, 16];
  let html = '';
  
  displayLandmarks.forEach(index => {
    if (landmarks[index]) {
      const lm = landmarks[index];
      const x = Math.round(lm.x * canvas.width);
      const y = Math.round(lm.y * canvas.height);
      html += `
        <div class="landmark-item">
          <span class="landmark-name">${LANDMARK_LABELS[index]}</span>
          <span class="landmark-value">(${x}, ${y})</span>
        </div>
      `;
    }
  });
  
  landmarkInfo.innerHTML = html;
}

async function startTracking() {
  statusText.textContent = '初始化中...';
  statusDot.style.background = '#ffaa00';
  
  const cameraReady = await initCamera();
  if (!cameraReady) {
    statusText.textContent = '摄像头访问失败';
    statusDot.style.background = '#ff4757';
    return;
  }

  if (!pose) {
    createPoseInstance();
  }

  isRunning = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;
  captureBtn.disabled = false;
  
  statusText.textContent = '跟踪中...';
  statusDot.style.background = '#00ff88';
  
  processFrame();
}

async function processFrame() {
  if (!isRunning) return;
  
  try {
    await pose.send({ image: video });
  } catch (error) {
    console.error('处理帧时出错:', error);
  }
  
  setTimeout(processFrame, 16);
}

function stopTracking() {
  isRunning = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;
  captureBtn.disabled = true;
  
  statusText.textContent = '已停止';
  statusDot.style.background = '#ff4757';
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  landmarkInfo.innerHTML = '<p style="color: #aaa;">点击"开始跟踪"启动</p>';
}

function captureImage() {
  const link = document.createElement('a');
  link.download = `skeleton-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

startBtn.addEventListener('click', startTracking);
stopBtn.addEventListener('click', stopTracking);
captureBtn.addEventListener('click', captureImage);

landmarkInfo.innerHTML = '<p style="color: #aaa;">点击"开始跟踪"启动</p>';