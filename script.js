import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18";

// ===============================
// ELEMENTS
// ===============================

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const status = document.getElementById("status");
const handCount = document.getElementById("handCount");
const cameraStatus = document.getElementById("cameraStatus");
const startButton = document.getElementById("startButton");

const gestureDisplay = document.getElementById("gesture");
const accessStatus = document.getElementById("accessStatus");

// ===============================
// CONFIG
// ===============================

const DASHBOARD_PAGE = "./dashboard.html";
const LOGIN_PAGE = "./index.html";

const correctSequence = [
    "OPEN",
    "OK",
    "PEACE"
];

// ===============================
// LOGIN CHECK
// ===============================

// Kalau user sudah login,
// jangan tampilkan halaman gesture login lagi.

const isLoggedIn = localStorage.getItem("loggedIn");

if (isLoggedIn === "true") {
    window.location.href = DASHBOARD_PAGE;
}

// ===============================
// MEDIAPIPE
// ===============================

let handLandmarker = null;
let cameraStream = null;
let lastVideoTime = -1;

// ===============================
// GESTURE PASSWORD
// ===============================

let currentSequence = [];

// Gesture terakhir yang sudah dicatat
let lastRecordedGesture = null;

// Gesture yang sedang terdeteksi
let currentGesture = "NONE";

// Mencegah login diproses berkali-kali
let accessGrantedState = false;

// ===============================
// INITIALIZE MEDIAPIPE
// ===============================

async function createHandLandmarker() {

    try {

        status.textContent =
            "Loading hand tracker...";

        const vision =
            await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm"
            );

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
            "Hand tracker ready";

        console.log(
            "MediaPipe initialized"
        );

    } catch (error) {

        console.error(
            "MediaPipe error:",
            error
        );

        status.textContent =
            "Failed to load hand tracker";
    }
}

// ===============================
// START CAMERA
// ===============================

async function startCamera() {

    try {

        cameraStatus.textContent =
            "Requesting camera...";

        cameraStream =
            await navigator.mediaDevices.getUserMedia(
                {
                    video: {
                        width: {
                            ideal: 640
                        },

                        height: {
                            ideal: 480
                        }
                    },

                    audio: false
                }
            );

        video.srcObject =
            cameraStream;

        await video.play();

        canvas.width =
            video.videoWidth;

        canvas.height =
            video.videoHeight;

        cameraStatus.textContent =
            "Camera active";

        status.textContent =
            "Tracking hands...";

        requestAnimationFrame(
            detectHands
        );

    } catch (error) {

        console.error(
            "Camera error:",
            error
        );

        cameraStatus.textContent =
            "Camera permission denied";

        status.textContent =
            "Could not access camera";
    }
}

// ===============================
// DETECT HANDS
// ===============================

async function detectHands() {

    if (!handLandmarker) {

        requestAnimationFrame(
            detectHands
        );

        return;
    }

    if (
        video.readyState >= 2 &&
        !accessGrantedState
    ) {

        if (
            video.currentTime !==
            lastVideoTime
        ) {

            lastVideoTime =
                video.currentTime;

            const results =
                handLandmarker.detectForVideo(
                    video,
                    performance.now()
                );

            drawHands(results);

            if (
                results.landmarks &&
                results.landmarks.length > 0
            ) {

                handCount.textContent =
                    results.landmarks.length;

                // Gunakan tangan pertama
                const landmarks =
                    results.landmarks[0];

                currentGesture =
                    detectGesture(
                        landmarks
                    );

                gestureDisplay.textContent =
                    currentGesture;

                handleGesture(
                    currentGesture
                );

            } else {

                handCount.textContent =
                    "0";

                currentGesture =
                    "NONE";

                gestureDisplay.textContent =
                    "NONE";
            }
        }
    }

    requestAnimationFrame(
        detectHands
    );
}

// ===============================
// GESTURE DETECTION
// ===============================

function detectGesture(landmarks) {

    const thumbTip =
        landmarks[4];

    const thumbIP =
        landmarks[3];

    const indexTip =
        landmarks[8];

    const indexPIP =
        landmarks[6];

    const middleTip =
        landmarks[12];

    const middlePIP =
        landmarks[10];

    const ringTip =
        landmarks[16];

    const ringPIP =
        landmarks[14];

    const pinkyTip =
        landmarks[20];

    const pinkyPIP =
        landmarks[18];

    // ===============================
    // FINGERS
    // ===============================

    const indexUp =
        indexTip.y <
        indexPIP.y;

    const middleUp =
        middleTip.y <
        middlePIP.y;

    const ringUp =
        ringTip.y <
        ringPIP.y;

    const pinkyUp =
        pinkyTip.y <
        pinkyPIP.y;

    // ===============================
    // THUMB
    // ===============================

    const thumbOpen =
        Math.abs(
            thumbTip.x -
            thumbIP.x
        ) > 0.04;

    // ===============================
    // OPEN HAND
    // ===============================

    if (
        thumbOpen &&
        indexUp &&
        middleUp &&
        ringUp &&
        pinkyUp
    ) {

        return "OPEN";
    }

    // ===============================
    // PEACE
    // ===============================

    if (
        indexUp &&
        middleUp &&
        !ringUp &&
        !pinkyUp
    ) {

        return "PEACE";
    }

    // ===============================
    // OK SIGN
    // ===============================

    const thumbIndexDistance =
        distance(
            thumbTip,
            indexTip
        );

    const okCircle =
        thumbIndexDistance < 0.08;

    if (
        okCircle &&
        middleUp &&
        ringUp &&
        pinkyUp
    ) {

        return "OK";
    }

    return "NONE";
}

// ===============================
// DISTANCE
// ===============================

function distance(
    pointA,
    pointB
) {

    const dx =
        pointA.x -
        pointB.x;

    const dy =
        pointA.y -
        pointB.y;

    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}

// ===============================
// HANDLE GESTURE
// ===============================

function handleGesture(
    gesture
) {

    // Tidak ada gesture
    if (
        gesture === "NONE"
    ) {
        return;
    }

    // Gesture yang sama tidak dicatat
    // dua kali berturut-turut
    if (
        gesture ===
        lastRecordedGesture
    ) {
        return;
    }

    lastRecordedGesture =
        gesture;

    console.log(
        "Gesture detected:",
        gesture
    );

    // Masukkan gesture
    currentSequence.push(
        gesture
    );

    console.log(
        "Current sequence:",
        currentSequence
    );

    // ===============================
    // CHECK INPUT
    // ===============================

    const index =
        currentSequence.length - 1;

    if (
        currentSequence[index] !==
        correctSequence[index]
    ) {

        accessDenied();

        return;
    }

    // ===============================
    // CHECK SUCCESS
    // ===============================

    if (
        currentSequence.length ===
        correctSequence.length
    ) {

        accessGranted();
    }
}

// ===============================
// ACCESS GRANTED
// ===============================

function accessGranted() {

    if (accessGrantedState) {
        return;
    }

    accessGrantedState =
        true;

    console.log(
        "ACCESS GRANTED"
    );

    accessStatus.textContent =
        "ACCESS GRANTED!!!";

    status.textContent =
        "Correct gesture sequence!";

    // ===============================
    // SAVE LOGIN
    // ===============================

    localStorage.setItem(
        "loggedIn",
        "true"
    );

    // ===============================
    // STOP CAMERA
    // ===============================

    stopCamera();

    // ===============================
    // REDIRECT
    // ===============================

    setTimeout(() => {

        window.location.href =
            DASHBOARD_PAGE;

    }, 1000);
}

// ===============================
// ACCESS DENIED
// ===============================

function accessDenied() {

    console.log(
        "ACCESS DENIED"
    );

    accessStatus.textContent =
        "ACCESS DENIED";

    status.textContent =
        "Wrong sequence!";

    // Reset
    currentSequence = [];

    lastRecordedGesture =
        null;

    setTimeout(() => {

        accessStatus.textContent =
            "WAITING FOR GESTURE";

        status.textContent =
            "Enter: OPEN → OK → PEACE";

    }, 1500);
}

// ===============================
// STOP CAMERA
// ===============================

function stopCamera() {

    if (!cameraStream) {
        return;
    }

    cameraStream
        .getTracks()
        .forEach(track => {
            track.stop();
        });

    cameraStream = null;

    video.srcObject = null;

    cameraStatus.textContent =
        "Camera stopped";
}

// ===============================
// DRAW HANDS
// ===============================

function drawHands(results) {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    if (
        !results.landmarks ||
        results.landmarks.length === 0
    ) {
        return;
    }

    for (
        const landmarks
        of results.landmarks
    ) {

        drawConnections(
            landmarks
        );

        for (
            const landmark
            of landmarks
        ) {

            const x =
                landmark.x *
                canvas.width;

            const y =
                landmark.y *
                canvas.height;

            ctx.beginPath();

            ctx.arc(
                x,
                y,
                5,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }
    }
}

// ===============================
// DRAW CONNECTIONS
// ===============================

function drawConnections(
    landmarks
) {

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

    ctx.lineWidth = 3;

    for (
        const [start, end]
        of connections
    ) {

        const startPoint =
            landmarks[start];

        const endPoint =
            landmarks[end];

        ctx.beginPath();

        ctx.moveTo(
            startPoint.x *
            canvas.width,

            startPoint.y *
            canvas.height
        );

        ctx.lineTo(
            endPoint.x *
            canvas.width,

            endPoint.y *
            canvas.height
        );

        ctx.stroke();
    }
}

// ===============================
// START BUTTON
// ===============================

startButton.addEventListener(
    "click",
    async () => {

        if (!handLandmarker) {

            await createHandLandmarker();
        }

        await startCamera();
    }
);

// ===============================
// INITIALIZE
// ===============================

createHandLandmarker();