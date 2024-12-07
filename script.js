const video = document.getElementById('video');
const canvas = document.getElementById('output-canvas');
const ctx = canvas.getContext('2d');
let lastSquatTime = 0;
let lastPushUpTime = 0;
let squatCount = 0;
let pushUpCount = 0;
let isSquatInProgress = false;
let isPushUpInProgress = false;
let isSquatMode = true; // Initial mode is squat mode
const minSquatDelay = 2000; // Minimum time between squats (2 seconds)
const minPushUpDelay = 2000; // Minimum time between push-ups (2 seconds)
const maxSquatSpeed = 1; // Max squats per second allowed
const maxPushUpSpeed = 1; // Max push-ups per second allowed
const resultDiv = document.getElementById("result");
const counterDiv = document.getElementById("counter");
const slowDownMessage = document.getElementById("slowDownMessage");
const modeSwitchButton = document.getElementById("modeSwitchButton");

let detector = null;
let isModelLoaded = false;

async function initMoveNet() {
    try {
        const model = poseDetection.SupportedModels.MoveNet;
        detector = await poseDetection.createDetector(model, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
        });
        console.log("MoveNet model loaded successfully.");
        isModelLoaded = true;
    } catch (error) {
        console.error("Error initializing MoveNet:", error);
        resultDiv.textContent = "Error initializing MoveNet. Please try again.";
    }
}

async function setupCamera() {
    try {
        const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);

        if (isMobileDevice) {
            // Mobile device setup
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            video.srcObject = stream;

            // Apply mirroring to both video and canvas for mobile
            video.style.transform = "scaleX(-1)";
            canvas.style.transform = "scaleX(-1)";

            video.onloadedmetadata = async () => {
                try {
                    await video.play();
                } catch (error) {
                    console.log("Autoplay failed. Waiting for user interaction.");
                }
            };

            // Allow video to play after a user interaction if autoplay fails
            document.body.addEventListener("click", async () => {
                if (video.paused) {
                    try {
                        await video.play();
                        console.log("Video playback started after user interaction.");
                    } catch (error) {
                        console.error("Error playing video:", error);
                    }
                }
            });
        } else {
            // PC setup
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputDevices = devices.filter(device => device.kind === 'videoinput');

            if (videoInputDevices.length > 0) {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        deviceId: videoInputDevices[0].deviceId
                    }
                });
                video.srcObject = stream;
                video.onloadedmetadata = () => {
                    video.play();
                };
            } else {
                console.error("No video input devices found.");
                resultDiv.textContent = "No camera found. Please connect a camera.";
            }
        }
    } catch (error) {
        console.error("Error accessing camera:", error);
        resultDiv.textContent = "Unable to access camera. Please ensure you have granted permission.";
    }
}

function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
}

async function analyzeFrame() {
    if (!isModelLoaded) {
        resultDiv.textContent = "Model not loaded yet. Please wait.";
        return;
    }

    try {
        const poses = await detector.estimatePoses(video);

        if (poses.length === 0) {
            resultDiv.textContent = "No person detected.";
            return;
        } else {
            resultDiv.textContent = "";
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const keypoints = poses[0].keypoints;
        const squatConfidence = 0.4; // Higher confidence for squat mode
        const pushUpConfidence = 0.1; // Lower confidence for push-up mode

        // Get video dimensions
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Adjust drawing based on video size (scaling to canvas)
        keypoints.forEach((keypoint) => {
            const minConfidence = isSquatMode ? squatConfidence : pushUpConfidence; // Use different minConfidence for each mode
            if (keypoint.score > minConfidence) {
                const x = (keypoint.x / videoWidth) * canvas.width;
                const y = (keypoint.y / videoHeight) * canvas.height;
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fillStyle = "red";
                ctx.fill();
            }
        });

        // Squat detection logic
        if (isSquatMode) {
            const leftHip = keypoints.find(k => k.name === 'left_hip');
            const leftKnee = keypoints.find(k => k.name === 'left_knee');
            const leftAnkle = keypoints.find(k => k.name === 'left_ankle');
            const rightHip = keypoints.find(k => k.name === 'right_hip');
            const rightKnee = keypoints.find(k => k.name === 'right_knee');
            const rightAnkle = keypoints.find(k => k.name === 'right_ankle');

            if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle &&
                leftHip.score > squatConfidence && leftKnee.score > squatConfidence && leftAnkle.score > squatConfidence &&
                rightHip.score > squatConfidence && rightKnee.score > squatConfidence && rightAnkle.score > squatConfidence) {

                const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
                const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

                const isSquatLow = leftKneeAngle > 160 && rightKneeAngle > 160; // Knees below 90 degrees
                const isStandingUp = leftKneeAngle < 120 && rightKneeAngle < 120; // Knees above 160 degrees

                if (isSquatLow && !isSquatInProgress) {
                    isSquatInProgress = true;
                }

                if (isStandingUp && isSquatInProgress) {
                    const currentTime = Date.now();
                    if (currentTime - lastSquatTime >= minSquatDelay) {
                        squatCount++;
                        lastSquatTime = currentTime;
                        counterDiv.textContent = `Squats: ${squatCount} | Push-Ups: ${pushUpCount}`;
                        isSquatInProgress = false;
                    }
                }
            }
        }

        // Push-up detection logic
       if (!isSquatMode) {
           const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
           const leftElbow = keypoints.find(k => k.name === 'left_elbow');
           const leftWrist = keypoints.find(k => k.name === 'left_wrist');
           const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');
           const rightElbow = keypoints.find(k => k.name === 'right_elbow');
           const rightWrist = keypoints.find(k => k.name === 'right_wrist');
           
           if (leftShoulder && leftElbow && leftWrist && rightShoulder && rightElbow && rightWrist &&
               leftShoulder.score > pushUpConfidence && leftElbow.score > pushUpConfidence && leftWrist.score > pushUpConfidence &&
               rightShoulder.score > pushUpConfidence && rightElbow.score > pushUpConfidence && rightWrist.score > pushUpConfidence) {
               
               // Calculate the shoulder width as a baseline for scaling
               const shoulderWidth = Math.sqrt(
                   Math.pow(rightShoulder.x - leftShoulder.x, 2) +
                   Math.pow(rightShoulder.y - leftShoulder.y, 2)
               );
               
               // Calculate relative distances
               const leftElbowToShoulder = Math.sqrt(
                   Math.pow(leftElbow.x - leftShoulder.x, 2) +
                   Math.pow(leftElbow.y - leftShoulder.y, 2)
               );

               const rightElbowToShoulder = Math.sqrt(
                   Math.pow(rightElbow.x - rightShoulder.x, 2) +
                   Math.pow(rightElbow.y - rightShoulder.y, 2)
               );
               
               // Scale expected distances based on shoulder width
               const minDistance = shoulderWidth * 0.3; // Loosen this factor to increase flexibility
               const maxDistance = shoulderWidth * 1.5;
               
               const isDistanceValid = 
                   leftElbowToShoulder > minDistance && leftElbowToShoulder < maxDistance &&
                   rightElbowToShoulder > minDistance && rightElbowToShoulder < maxDistance;
               
               // Push-up logic with looser distance constraints
               const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
               const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
               
               const isPushUpLow = leftElbowAngle < 70 && rightElbowAngle < 70 && isDistanceValid;
               const isPushUpUp = leftElbowAngle > 120 && rightElbowAngle > 120 && isDistanceValid;
               
               if (isPushUpLow && !isPushUpInProgress) {
                   console.log('Push-up low detected');
                   isPushUpInProgress = true;
               }
               
               if (isPushUpUp && isPushUpInProgress) {
                   console.log('Push-up up detected');
                   const currentTime = Date.now();
                   if (currentTime - lastPushUpTime >= minPushUpDelay) {
                       console.log('Push-up counted');
                       pushUpCount++;
                       lastPushUpTime = currentTime;
                       counterDiv.textContent = `Squats: ${squatCount} | Push-Ups: ${pushUpCount}`;
                       isPushUpInProgress = false;
                   }
               }
           }
       }



        // Slow down message
        if (squatCount / (Date.now() - lastSquatTime) > maxSquatSpeed) {
            slowDownMessage.textContent = "Slow down with squats!";
        } else if (pushUpCount / (Date.now() - lastPushUpTime) > maxPushUpSpeed) {
            slowDownMessage.textContent = "Slow down with push-ups!";
        } else {
            slowDownMessage.textContent = "";
        }

    } catch (error) {
        console.error("Error during pose detection:", error);
    }
}

async function start() {
    await initMoveNet();
    await setupCamera();
    video.addEventListener("play", () => {
        function processFrame() {
            analyzeFrame();
            requestAnimationFrame(processFrame);
        }
        processFrame();
    });
}

// Create a new div for the mode message
const modeMessageDiv = document.createElement('div');
modeMessageDiv.id = 'modeMessage'; // Set an ID for styling or future references
modeMessageDiv.style.marginTop = '20px';
modeMessageDiv.style.fontSize = '1.2em';
modeMessageDiv.style.color = '#4CAF50'; // Green color to match the theme
document.body.appendChild(modeMessageDiv); // Append it to the body or another container

// Toggle between Squat and Push-Up mode
modeSwitchButton.addEventListener('click', () => {
    isSquatMode = !isSquatMode;
    modeMessageDiv.textContent = isSquatMode ? "Squat mode active" : "Push-up mode active"; // Update message
});


start();
