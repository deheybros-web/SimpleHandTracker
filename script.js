import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";


// ========================================
// HTML ELEMENTS
// ========================================

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");

const ctx = canvas.getContext("2d");

const status = document.getElementById("status");
const handCount = document.getElementById("handCount");
const cameraStatus = document.getElementById("cameraStatus");

const startButton = document.getElementById("startButton");


// ========================================
// VARIABLES
// ========================================

let handLandmarker = null;

let cameraStream = null;

let lastVideoTime = -1;

let cameraStarted = false;


// ========================================
// HAND CONNECTIONS
// ========================================

const connections = [

    // Thumb
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4],

    // Index
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8],

    // Middle
    [5, 9],
    [9, 10],
    [10, 11],
    [11, 12],

    // Ring
    [9, 13],
    [13, 14],
    [14, 15],
    [15, 16],

    // Pinky
    [13, 17],
    [17, 18],
    [18, 19],
    [19, 20],

    // Palm
    [0, 17]

];


// ========================================
// LOAD MODEL
// ========================================

async function loadHandTracker() {

    try {

        status.textContent =
            "Loading hand tracking model...";


        // Load MediaPipe WASM
        const vision =
            await FilesetResolver.forVisionTasks(

                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"

            );


        // Create hand tracker
        handLandmarker =
            await HandLandmarker.createFromOptions(

                vision,

                {

                    baseOptions: {

                        modelAssetPath:
                            "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"

                    },

                    runningMode: "VIDEO",

                    numHands: 2

                }

            );


        status.textContent =
            "Model ready. Click Start Camera.";


        startButton.disabled = false;


    }

    catch (error) {

        console.error(error);

        status.textContent =
            "Failed to load hand tracker.";

    }

}


// ========================================
// START CAMERA
// ========================================

async function startCamera() {

    if (!handLandmarker) {

        console.log("Model is not ready.");

        return;

    }


    try {

        status.textContent =
            "Requesting camera permission...";


        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {

                    width: {
                        ideal: 640
                    },

                    height: {
                        ideal: 480
                    }

                },

                audio: false

            });


        video.srcObject = cameraStream;


        await video.play();


        cameraStarted = true;


        cameraStatus.textContent = "ON";

        startButton.textContent = "Camera Running";

        startButton.disabled = true;


        status.textContent =
            "Show your hand to the camera.";


        // Set canvas size
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;


        // Start tracking
        requestAnimationFrame(detectHands);

    }

    catch (error) {

        console.error(error);

        status.textContent =
            "Could not access camera.";

    }

}


// ========================================
// DETECT HANDS
// ========================================

function detectHands() {

    if (!cameraStarted) {

        return;

    }


    // Only detect when a new video frame exists
    if (
        video.currentTime !== lastVideoTime
    ) {

        lastVideoTime =
            video.currentTime;


        const results =
            handLandmarker.detectForVideo(

                video,

                performance.now()

            );


        drawHands(results);

    }


    requestAnimationFrame(detectHands);

}


// ========================================
// DRAW HANDS
// ========================================

function drawHands(results) {

    // Clear previous frame
    ctx.clearRect(

        0,
        0,
        canvas.width,
        canvas.height

    );


    // No hands
    if (
        !results.landmarks ||
        results.landmarks.length === 0
    ) {

        handCount.textContent = "0";

        status.textContent =
            "No hand detected.";

        return;

    }


    // Update hand count
    handCount.textContent =
        results.landmarks.length;


    status.textContent =
        `${results.landmarks.length} hand detected`;


    // Draw every detected hand
    for (
        const landmarks of results.landmarks
    ) {

        drawConnections(landmarks);

        drawLandmarks(landmarks);

    }

}


// ========================================
// DRAW LANDMARKS
// ========================================

function drawLandmarks(landmarks) {

    for (
        const point of landmarks
    ) {

        const x =
            point.x * canvas.width;

        const y =
            point.y * canvas.height;


        ctx.beginPath();


        ctx.arc(

            x,
            y,

            6,

            0,
            Math.PI * 2

        );


        ctx.fill();

    }

}


// ========================================
// DRAW CONNECTIONS
// ========================================

function drawConnections(landmarks) {

    for (
        const connection of connections
    ) {

        const startIndex =
            connection[0];

        const endIndex =
            connection[1];


        const start =
            landmarks[startIndex];

        const end =
            landmarks[endIndex];


        const startX =
            start.x * canvas.width;

        const startY =
            start.y * canvas.height;


        const endX =
            end.x * canvas.width;

        const endY =
            end.y * canvas.height;


        ctx.beginPath();


        ctx.moveTo(
            startX,
            startY
        );


        ctx.lineTo(
            endX,
            endY
        );


        ctx.stroke();

    }

}


// ========================================
// BUTTON
// ========================================

startButton.addEventListener(
    "click",
    startCamera
);


// ========================================
// INITIALIZE
// ========================================

startButton.disabled = true;

loadHandTracker();