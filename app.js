const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusDiv = document.getElementById('status');

let camera = null;
let hands = null;
let isRunning = false;
let peaceDetected = false;

// Initialize MediaPipe Hands
function initializeHands() {
    hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);
}

// Check if finger is up
function fingerUp(tip, pip, landmarks) {
    return landmarks[tip].y < landmarks[pip].y;
}

// Check for peace sign
function isPeace(landmarks) {
    const indexUp = fingerUp(8, 6, landmarks);
    const middleUp = fingerUp(12, 10, landmarks);
    const ringUp = fingerUp(16, 14, landmarks);
    const pinkyUp = fingerUp(20, 18, landmarks);

    return indexUp && middleUp && !ringUp && !pinkyUp;
}

// Process hand detection results
function onResults(results) {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    peaceDetected = false;

    if (results.multiHandLandmarks) {
        for (const landmarks of results.multiHandLandmarks) {
            if (isPeace(landmarks)) {
                peaceDetected = true;
                break;
            }
        }
    }

    // Apply blur effect if peace sign detected
    if (peaceDetected) {
        ctx.filter = 'blur(20px)';
        statusDiv.textContent = '✌️ Peace sign detected! Camera blurred!';
        statusDiv.className = 'status peace';
    } else {
        ctx.filter = 'none';
        statusDiv.textContent = '📷 Camera active - Show peace sign to blur';
        statusDiv.className = 'status active';
    }

    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();
}

// Start camera
async function startCamera() {
    try {
        statusDiv.textContent = '🔄 Requesting camera permission...';
        statusDiv.className = 'status inactive';

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        });

        video.srcObject = stream;
        
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                resolve();
            };
        });

        video.play();

        // Initialize MediaPipe Hands
        if (!hands) {
            initializeHands();
        }

        // Start processing frames
        isRunning = true;
        processFrame();

        startBtn.disabled = true;
        stopBtn.disabled = false;
        statusDiv.textContent = '📷 Camera active - Show peace sign to blur';
        statusDiv.className = 'status active';

    } catch (error) {
        console.error('Error accessing camera:', error);
        statusDiv.textContent = '❌ Error: Could not access camera. Please allow camera permission.';
        statusDiv.className = 'status inactive';
    }
}

// Process video frames
async function processFrame() {
    if (!isRunning) return;

    await hands.send({ image: video });
    requestAnimationFrame(processFrame);
}

// Stop camera
function stopCamera() {
    isRunning = false;

    if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    startBtn.disabled = false;
    stopBtn.disabled = true;
    statusDiv.textContent = '⏹️ Camera stopped';
    statusDiv.className = 'status inactive';
}

// Event listeners
startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);

// Handle page unload
window.addEventListener('beforeunload', stopCamera);
