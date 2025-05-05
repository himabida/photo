// Global Variables
let currentFilter = "none";
let currentFrame = 1;
let photosTaken = 0;
const maxPhotos = 6;

// DOM Elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const faceOverlay = document.getElementById('face-overlay');
const filterSelect = document.getElementById('filter');
const frameButtons = document.querySelectorAll('.frame-btn');
const photoGrid = document.getElementById('photo-grid');
const backgroundSelect = document.getElementById('background-select');
const ctx = canvas.getContext('2d');

// Filters
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

// Background Options
const backgrounds = {
    none: 'none',
    beach: 'url("backgrounds/beach.jpg")',
    city: 'url("backgrounds/city.jpg")',
    space: 'url("backgrounds/space.jpg")',
    mountains: 'url("backgrounds/mountains.jpg")',
    forest: 'url("backgrounds/forest.jpg")',
    office: 'url("backgrounds/office.jpg")',
    studio: 'url("backgrounds/studio.jpg")',
    concert: 'url("backgrounds/concert.jpg")',
    snow: 'url("backgrounds/snow.jpg")',
    sunset: 'url("backgrounds/sunset.jpg")',
    abstract: 'url("backgrounds/abstract.jpg")',
    gradient: 'linear-gradient(135deg, #667eea, #764ba2)',
    neon: 'url("backgrounds/neon.jpg")',
    party: 'url("backgrounds/party.jpg")',
    galaxy: 'url("backgrounds/galaxy.jpg")'
};

// Initialize Camera
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            initFaceDetection();
        };
    })
    .catch(err => {
        console.error("Error accessing camera:", err);
        alert("Could not access camera. Please check permissions.");
    });

// Event Listeners
filterSelect.addEventListener('change', () => {
    currentFilter = filterSelect.value;
    video.style.filter = filters[currentFilter];
});

frameButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        frameButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFrame = parseInt(btn.dataset.frame);
    });
});

backgroundSelect.addEventListener('change', (e) => {
    const backgroundValue = e.target.value;
    if (backgroundValue === 'none') {
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = '#f5f5f5';
    } else {
        document.body.style.backgroundImage = backgrounds[backgroundValue];
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
    }
});

document.getElementById('capture').addEventListener('click', () => {
    if (photosTaken >= maxPhotos) return;
    
    // Play shutter sound
    document.getElementById('shutter-sound').play();
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.filter = video.style.filter;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Add to grid
    const photoItem = document.createElement('img');
    photoItem.src = canvas.toDataURL('image/png');
    photoItem.classList.add('photo-item');
    photoGrid.appendChild(photoItem);
    
    photosTaken++;
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
        saveAs(blob, 'photobooth-grid.png');
    });
});

document.getElementById('remove-bg').addEventListener('click', removeBackground);

// Face Detection
let faceExpression = "neutral";
let handGesture = "none";

const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
});
faceMesh.setOptions({
    maxNumFaces: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});
hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
});

faceMesh.onResults(onResultsFaceMesh);
hands.onResults(onResultsHands);

const camera = new Camera(video, {
    onFrame: async () => {
        await faceMesh.send({ image: video });
        await hands.send({ image: video });
    },
    width: 640,
    height: 480
});
camera.start();

function onResultsFaceMesh(results) {
    if (results.multiFaceLandmarks) {
        const landmarks = results.multiFaceLandmarks[0];
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
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        
        if (distance < 0.05) handGesture = "love";
        else handGesture = "none";
        
        updateEmoji();
    }
}

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

async function removeBackground() {
    try {
        // Note: You'll need to implement this with your preferred background removal library
        alert("Background removal feature will be implemented here");
    } catch (error) {
        console.error("Error removing background:", error);
    }
}