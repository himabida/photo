// Variabel global
let currentFilter = "none";
let currentFrame = 1;
let photosTaken = 0;
const maxPhotos = 6;

// Ambil elemen
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const faceOverlay = document.getElementById('face-overlay');
const filterSelect = document.getElementById('filter');
const frameButtons = document.querySelectorAll('.frame-btn');
const photoGrid = document.getElementById('photo-grid');
const ctx = canvas.getContext('2d');

// Filter CSS real-time
const filters = {
    none: 'none',
    grayscale: 'grayscale(100%)',
    sepia: 'sepia(100%)',
    invert: 'invert(100%)',
    vintage: 'sepia(70%) brightness(80%) contrast(120%)',
    cool: 'brightness(90%) contrast(110%) hue-rotate(180deg)',
    warm: 'brightness(110%) contrast(110%) hue-rotate(-20deg)',
    blackwhite: 'grayscale(100%) contrast(120%)',
    blur: 'blur(2px)',
    'hue-rotate': 'hue-rotate(90deg)',
    contrast: 'contrast(200%)',
    saturate: 'saturate(200%)',
    neon: 'brightness(120%) contrast(120%) hue-rotate(45deg)',
    shadow: 'brightness(90%) contrast(120%) drop-shadow(5px 5px 5px #333)',
    focus: 'blur(1px) brightness(110%)'
};

// 1. Akses kamera
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            initFaceDetection();
        };
    });

// 2. Update filter real-time
filterSelect.addEventListener('change', () => {
    currentFilter = filterSelect.value;
    video.style.filter = filters[currentFilter];
});

// 3. Pilih frame (1, 4, atau 6 foto)
frameButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        frameButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFrame = parseInt(btn.dataset.frame);
    });
});

// 4. Ambil foto
document.getElementById('capture').addEventListener('click', () => {
    if (photosTaken >= maxPhotos) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.filter = video.style.filter;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Tambahkan ke grid
    const photoItem = document.createElement('img');
    photoItem.src = canvas.toDataURL('image/png');
    photoItem.classList.add('photo-item');
    photoGrid.appendChild(photoItem);
    
    photosTaken++;
});

// 5. Download semua foto
document.getElementById('download').addEventListener('click', () => {
    if (photosTaken === 0) return;
    
    // Buat canvas besar untuk semua foto
    const gridCanvas = document.createElement('canvas');
    const gridCtx = gridCanvas.getContext('2d');
    const gridSize = Math.ceil(Math.sqrt(photosTaken));
    
    gridCanvas.width = video.videoWidth * gridSize;
    gridCanvas.height = video.videoHeight * gridSize;
    
    // Gambar semua foto di canvas
    const photoItems = document.querySelectorAll('.photo-item');
    photoItems.forEach((photo, i) => {
        const x = (i % gridSize) * video.videoWidth;
        const y = Math.floor(i / gridSize) * video.videoHeight;
        gridCtx.drawImage(photo, x, y, video.videoWidth, video.videoHeight);
    });
    
    // Download
    gridCanvas.toBlob(blob => {
        saveAs(blob, 'photobooth-grid.png');
    });
});

// 6. Deteksi wajah + icon lucu
let faceExpression = "neutral";
let handGesture = "none";

// Init MediaPipe Face Mesh
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
    maxNumFaces: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

// Init MediaPipe Hands
const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

// Proses hasil deteksi
function onResultsFaceMesh(results) {
    if (results.multiFaceLandmarks) {
        const landmarks = results.multiFaceLandmarks[0];
        // Deteksi ekspresi (contoh sederhana)
        const mouthOpen = landmarks[13].y - landmarks[14].y > 0.1;
        const eyebrowsRaised = landmarks[159].y < landmarks[386].y;
        
        if (mouthOpen && eyebrowsRaised) faceExpression = "surprised";
        else if (mouthOpen) faceExpression = "happy";
        else if (eyebrowsRaised) faceExpression = "sad";
        else faceExpression = "neutral";
        
        updateEmoji();
    }
}

function onResultsHands(results) {
    if (results.multiHandLandmarks) {
        const landmarks = results.multiHandLandmarks[0];
        // Deteksi gesture (contoh: love = jempol + telunjuk bentuk hati)
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        
        if (distance < 0.05) handGesture = "love";
        else handGesture = "none";
        
        updateEmoji();
    }
}

// Update emoji berdasarkan ekspresi + gesture
function updateEmoji() {
    const emojiMap = {
        happy: "😊",
        sad: "😢",
        surprised: "😮",
        neutral: "😐",
        love: "❤️"
    };
    
    let emoji = emojiMap[faceExpression];
    if (handGesture === "love") emoji += "👐";
    
    faceOverlay.innerHTML = `<div class="emoji">${emoji}</div>`;
}

// Gabungkan dengan kamera
camera = new Camera(video, {
    onFrame: async () => {
        await faceMesh.send({ image: video });
        await hands.send({ image: video });
    },
    width: 640,
    height: 480,
});
camera.start();

// Pakai library "BodyPix" (TensorFlow.js)
async function removeBackground() {
    const net = await bodyPix.load();
    const segmentation = await net.segmentPerson(video);
    const background = document.getElementById('custom-background');
    
    bodyPix.drawBokehEffect(
        canvas, video, segmentation, 15, 0.7
    );
}