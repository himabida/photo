// Variabel Global
let currentFilter = "none";
let currentFrame = "none";
let photosTaken = 0;
const maxPhotos = 6;

// Elemen DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const faceOverlay = document.getElementById('face-overlay');
const filterSelect = document.getElementById('filter');
const frameSelect = document.getElementById('frame-select');
const countButtons = document.querySelectorAll('.count-btn');
const photoGrid = document.getElementById('photo-grid');
const ctx = canvas.getContext('2d');

// Filter
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
    focus: 'blur(1px) brightness(110%)',
    smooth: 'contrast(110%) brightness(110%) saturate(110%) blur(0.5px)',
    glamour: 'contrast(120%) brightness(105%) hue-rotate(10deg)'
};

// Frame
const frames = {
    none: '',
    polaroid: 'frame-polaroid',
    wood: 'frame-wood',
    gold: 'frame-gold',
    neon: 'frame-neon',
    vintage: 'frame-vintage'
};

// Inisialisasi Kamera
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            initFaceDetection();
        };
    })
    .catch(err => {
        console.error("Error kamera:", err);
        alert("Tidak bisa mengakses kamera. Mohon izinkan akses kamera.");
    });

// Event Listener
filterSelect.addEventListener('change', () => {
    currentFilter = filterSelect.value;
    video.style.filter = filters[currentFilter];
});

frameSelect.addEventListener('change', (e) => {
    currentFrame = frames[e.target.value];
    canvas.className = currentFrame;
});

countButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        countButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        maxPhotos = parseInt(btn.dataset.count);
    });
});

document.getElementById('capture').addEventListener('click', () => {
    if (photosTaken >= maxPhotos) return;
    
    // Bunyi jepret
    document.getElementById('shutter-sound').play();
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.filter = video.style.filter;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Tambahkan ke grid
    const photoItem = document.createElement('img');
    photoItem.src = canvas.toDataURL('image/png');
    photoItem.className = `photo-item ${currentFrame}`;
    photoGrid.appendChild(photoItem);
    
    photosTaken++;
});

document.getElementById('delete-last').addEventListener('click', () => {
    const photos = document.querySelectorAll('.photo-item');
    if (photos.length > 0) {
        photos[photos.length - 1].remove();
        photosTaken--;
    }
});

document.getElementById('download').addEventListener('click', () => {
    if (photosTaken === 0) return;
    
    const gridCanvas = document.createElement('canvas');
    const gridCtx = gridCanvas.getContext('2d');
    const gridSize = Math.ceil(Math.sqrt(photosTaken));
    
    gridCanvas.width = video.videoWidth * gridSize;
    gridCanvas.height = video.videoHeight * gridSize;
    
    const photoItems = document.querySelectorAll('.photo-item');
    photoItems.forEach((photo, i) => {
        const x = (i % gridSize) * video.videoWidth;
        const y = Math.floor(i / gridSize) * video.videoHeight;
        gridCtx.drawImage(photo, x, y, video.videoWidth, video.videoHeight);
    });
    
    gridCanvas.toBlob(blob => {
        saveAs(blob, 'photobooth-digital.png');
    });
});

// Deteksi Wajah
const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
    maxNumFaces: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

faceMesh.onResults(onResultsFaceMesh);

const camera = new Camera(video, {
    onFrame: async () => {
        await faceMesh.send({ image: video });
    },
    width: 640,
    height: 480
});
camera.start();

function onResultsFaceMesh(results) {
    faceOverlay.innerHTML = '';
    
    if (results.multiFaceLandmarks) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Deteksi ekspresi
        const mouthOpen = landmarks[13].y - landmarks[14].y > 0.1;
        const eyebrowsRaised = landmarks[159].y < landmarks[386].y;
        
        let expression = "Netral";
        if (mouthOpen && eyebrowsRaised) expression = "Kaget";
        else if (mouthOpen) expression = "Senang";
        else if (eyebrowsRaised) expression = "Sedih";
        
        // Gambar kotak biru di wajah
        const box = document.createElement('div');
        box.className = 'face-box';
        box.style.left = `${landmarks[10].x * 100}%`;
        box.style.top = `${landmarks[10].y * 100}%`;
        box.style.width = `${(landmarks[234].x - landmarks[10].x) * 100}%`;
        box.style.height = `${(landmarks[152].y - landmarks[10].y) * 100}%`;
        
        // Label ekspresi
        const label = document.createElement('div');
        label.className = 'expression-label';
        label.textContent = `Ekspresi: ${expression}`;
        label.style.left = `${landmarks[10].x * 100}%`;
        label.style.top = `${landmarks[10].y * 100 - 30}px`;
        
        faceOverlay.appendChild(box);
        faceOverlay.appendChild(label);
    }
} 