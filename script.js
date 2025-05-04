// Ambil elemen HTML
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture');
const downloadBtn = document.getElementById('download');
const filterSelect = document.getElementById('filter');
const ctx = canvas.getContext('2d');

// 1. Akses Kamera
navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => {
        alert("Error: Kamera tidak bisa diakses!");
        console.error(err);
    });

// 2. Ambil Foto + Filter
captureBtn.addEventListener('click', () => {
    // Set canvas size = video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame ke canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Apply filter
    const filter = filterSelect.value;
    ctx.filter = filter === 'none' ? 'none' : 
                 filter === 'grayscale' ? 'grayscale(100%)' :
                 filter === 'sepia' ? 'sepia(100%)' :
                 'invert(100%)';
    ctx.drawImage(canvas, 0, 0);
    
    // Tampilkan canvas, sembunyikan video
    canvas.style.display = 'block';
    video.style.display = 'none';
});

// 3. Download Foto
downloadBtn.addEventListener('click', () => {
    canvas.toBlob(blob => {
        saveAs(blob, 'photobooth-resa.png');
    });
});

// Load model face detection
async function loadFaceDetectionModel() {
    await faceapi.nets.tinyFaceDetector.loadFromUri('https://justadudewhohacks.github.io/face-api.js/models');
    setInterval(detectFaces, 100); // Cek wajah tiap 100ms
}

async function detectFaces() {
    if (video.style.display !== 'none') {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
        if (detections.length > 0) {
            console.log("Wajah terdeteksi!");
            // Bisa tambahkan efek khusus di sini
        }
    }
}

loadFaceDetectionModel();