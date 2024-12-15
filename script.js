// Add these CSS variables at the start of your script
document.documentElement.style.setProperty('--primary-gradient', 'linear-gradient(135deg, #1e3c72 0%, #B94E48 100%)');
document.documentElement.style.setProperty('--primary-dark', '#1e3c72');
document.documentElement.style.setProperty('--primary-light', '#B94E48');
document.documentElement.style.setProperty('--text-light', '#ffffff');

let userData = {
    name: '',
    age: 0,
    weight: 0,
    goalWeight: 0
};

const EXERCISES = {
    SQUATS: {
        name: 'Squats',
        goals: [5, 10, 15, 20, 25],
        caloriesPerRep: 0.32
    },
    PUSHUPS: {
        name: 'Push-ups',
        goals: [5, 10, 15, 20, 25],
        caloriesPerRep: 0.32
    },
    PLANK: {
        name: 'Plank',
        goals: [5, 10, 15, 20, 25],
        interval: 10000, // 10 seconds in milliseconds
        caloriesPerInterval: 0.3, // Base calories, can increase up to 0.8 based on form
        maxCaloriesPerInterval: 0.8
    }
};

let currentGoalIndex = 0;
let currentQuestion = 0;
const questionIds = ['welcome', 'nameQuestion', 'ageQuestion', 'weightQuestion', 'goalQuestion'];

function showNextQuestion() {
    if (currentQuestion > 0) {
        // Don't proceed if the current input is empty (except for welcome screen)
        if (currentQuestion < questionIds.length) {
            const currentInput = document.querySelector(`#${questionIds[currentQuestion-1]} input`);
            if (currentInput && !currentInput.value) {
                return; // Don't proceed if input is empty
            }
        }
        document.getElementById(questionIds[currentQuestion - 1]).classList.remove('active');
    }
    
    if (currentQuestion < questionIds.length) {
        document.getElementById(questionIds[currentQuestion]).classList.add('active');
        
        // Don't auto-proceed after showing a question with input
        if (currentQuestion === 0) { // Only auto-proceed after welcome screen
            setTimeout(() => {
                currentQuestion++;
                showNextQuestion();
            }, 2000);
        } else {
            // Add input event listeners for other questions
            const input = document.querySelector(`#${questionIds[currentQuestion]} input`);
            if (input) {
                input.addEventListener('keypress', function(e) {
                    if (e.key === 'Enter' && this.value) {
                        currentQuestion++;
                        showNextQuestion();
                    }
                });
            }
        }
    }
}

function submitQuestionnaire() {
    // Get values with defaults
    userData.name = document.getElementById('userName').value;
    userData.age = document.getElementById('userAge').value;
    userData.weight = document.getElementById('userWeight').value;
    userData.goalWeight = document.getElementById('goalWeight').value;

    // Update user info display
    const userInfo = document.getElementById('user-info');
    userInfo.innerHTML = `
        <p>Welcome, ${userData.name}! 
        Current Weight: ${userData.weight}kg | 
        Goal Weight: ${userData.goalWeight}kg</p>
    `;

    // Show loading screen and properly remove questionnaire
    const questionnaire = document.getElementById('questionnaire');
    questionnaire.style.opacity = '0';
    const loadingScreen = document.querySelector('.loading-screen');
    loadingScreen.style.display = 'flex';

    setTimeout(() => {
        questionnaire.style.display = 'none';
        questionnaire.style.zIndex = '-1';
        
        // Start everything after questionnaire is hidden
        initializeSystem();
    }, 500);
}

// New function to handle system initialization
async function initializeSystem() {
    try {
        const loadingScreen = document.querySelector('.loading-screen');
        const loadingText = loadingScreen.querySelector('.loading-text');
        
        // Update loading message
        loadingText.textContent = 'Initializing camera...';
        
        // First setup camera (this will trigger permission request)
        await setupCamera();
        
        // Update loading message
        loadingText.textContent = 'Loading AI model...';
        
        // Then load model
        await initMoveNet();
        
        // Hide loading screen and show main content
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            document.getElementById('main-content').style.opacity = '1';
        }, 500);

        // Start the animation frame loop
        isProcessingFrame = false;
        requestAnimationFrame(analyzeFrame);
    } catch (error) {
        console.error("Error starting application:", error);
        const loadingScreen = document.querySelector('.loading-screen');
        const loadingText = loadingScreen.querySelector('.loading-text');
        loadingText.innerHTML = `Error: ${error.message}<br>
            <button onclick="location.reload()" style="
                margin-top: 15px;
                padding: 10px 20px;
                background: var(--primary-color);
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">Retry</button>`;
    }
}

// Add "Next" buttons to each question
function addNextButtons() {
    const questions = document.querySelectorAll('.question:not(#welcome):not(#goalQuestion)');
    questions.forEach(question => {
        const buttonGroup = question.querySelector('.button-group');
        const nextButton = buttonGroup.querySelector('.next-button');
        
        nextButton.onclick = () => {
            const input = question.querySelector('input');
            if (input && input.value) {
                currentQuestion++;
                showNextQuestion();
            } else {
                alert('Please fill in the field');
            }
        };
    });
}

// Start the question animation sequence when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(showNextQuestion, 1000);
    addNextButtons();
    
    // Show initial mode message
    const modeMessageDiv = document.getElementById('modeMessage');
    if (modeMessageDiv) {
        setTimeout(() => {
            modeMessageDiv.textContent = "🏋️ Squat Mode Active";
            modeMessageDiv.classList.add('active');
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                modeMessageDiv.classList.remove('active');
            }, 3000);
        }, 1000); // Show after 1 second
    }
    
    updateCounter();
    setTimeout(() => {
        showFormFeedback(FORM_FEEDBACK.SQUATS.start);
    }, 1000);
});

function updateProgressBar(count, total) {
    const progress = (count / total) * 100;
    document.querySelector('.progress-bar').style.width = `${progress}%`;
}

function updateModeMessage() {
    const modeMessageDiv = document.getElementById('modeMessage');
    if (modeMessageDiv) {
        modeMessageDiv.classList.remove('active');
        
        setTimeout(() => {
            let message = '';
            if (isSquatMode) {
                message = "🏋️ Squat Mode Active";
            } else if (isPlankMode) {
                message = "🧘 Plank Mode Active";
            } else {
                message = "💪 Push-up Mode Active";
            }
            
            modeMessageDiv.textContent = message;
            modeMessageDiv.classList.add('active');
        }, 300);

        // Auto-hide the message after 3 seconds
        setTimeout(() => {
            modeMessageDiv.classList.remove('active');
        }, 3000);
    }
}

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

// Update these optimization variables at the top
let isProcessingFrame = false;
let lastFrameTime = 0;
const FRAME_RATE = 30; // Limit to 30 FPS
const FRAME_INTERVAL = 1000 / FRAME_RATE;

// Add these variables at the top with other constants
const SLOW_DOWN_THRESHOLD = 1000; // Time in ms to show slow down message
let slowDownTimer = null;

// Add plank-specific variables
let isPlankMode = false;
let plankCount = 0;
let plankTimer = null;
let plankStartTime = 0;
let isPlankInProgress = false;

// Add these plank-specific constants
const PLANK_ANGLE_THRESHOLD = 15; // Maximum angle deviation allowed
const PLANK_POSITION_MEMORY = []; // Store recent positions
const PLANK_MEMORY_SIZE = 10; // Number of positions to remember
const PLANK_MOVEMENT_THRESHOLD = 30; // Maximum allowed movement in pixels

// Add calorie tracking variable
let totalCaloriesBurned = 0;

// Add function to update calorie display
function updateCalorieCounter(calories) {
    totalCaloriesBurned += calories;
    const calorieDisplay = document.getElementById('calorieCounter');
    if (calorieDisplay) {
        calorieDisplay.textContent = `🔥 ${totalCaloriesBurned.toFixed(1)} cal`;
    }
}

async function initMoveNet() {
    try {
        const model = poseDetection.SupportedModels.MoveNet;
        detector = await poseDetection.createDetector(model, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            minPoseScore: 0.25
        });
        isModelLoaded = true;
    } catch (error) {
        console.error("Error initializing MoveNet:", error);
        throw error;
    }
}

async function setupCamera() {
    try {
        // First try to release any existing streams
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }

        // Try different camera configurations
        let stream;
        const constraints = [
            // First try: Ideal settings
            {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    frameRate: { ideal: 30, max: 30 },
                    facingMode: 'user'
                }
            },
            // Second try: Basic settings
            {
                video: {
                    facingMode: 'user'
                }
            },
            // Last try: Any available camera
            {
                video: true
            }
        ];

        for (let constraint of constraints) {
            try {
                stream = await navigator.mediaDevices.getUserMedia(constraint);
                break; // If successful, exit the loop
            } catch (e) {
                console.log(`Failed with constraint ${JSON.stringify(constraint)}:`, e);
                continue; // Try next constraint
            }
        }

        if (!stream) {
            throw new Error('Could not access any camera');
        }

        video.srcObject = stream;
        
        return new Promise((resolve) => {
            video.onloadedmetadata = () => {
                // Try to play the video
                video.play()
                    .then(() => resolve(video))
                    .catch(e => {
                        // Handle autoplay restrictions
                        console.log("Autoplay failed, showing manual play button");
                        const playButton = document.createElement('button');
                        playButton.textContent = 'Click to Start Camera';
                        playButton.style.cssText = `
                            position: absolute;
                            z-index: 1000;
                            left: 50%;
                            top: 50%;
                            transform: translate(-50%, -50%);
                            padding: 15px 30px;
                            font-size: 1.2em;
                            background: var(--gradient-primary);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                        `;
                        
                        const container = document.querySelector('.video-container');
                        container.appendChild(playButton);
                        
                        playButton.onclick = async () => {
                            try {
                                await video.play();
                                playButton.remove();
                                resolve(video);
                            } catch (playError) {
                                console.error("Manual play failed:", playError);
                                handleCameraError(playError);
                            }
                        };
                    });
            };

            video.onerror = (err) => {
                handleCameraError(new Error(`Video error: ${err.message || 'Unknown video error'}`));
            };
        });
    } catch (error) {
        console.error("Camera setup failed:", error);
        handleCameraError(error);
    }
}

function handleCameraError(error) {
    console.error("Camera error:", error);
    
    let errorMessage = 'Unable to access camera. ';
    if (error.name === 'NotReadableError') {
        errorMessage += 'The camera might be in use by another application or browser tab. Please:\n' +
            '1. Close other apps/tabs using the camera\n' +
            '2. Try restarting your browser\n' +
            '3. Check if your camera is working in other applications';
    } else if (error.name === 'NotAllowedError') {
        errorMessage += 'Camera access was denied. Please allow camera access in your browser settings and refresh the page.';
    } else if (error.name === 'NotFoundError') {
        errorMessage += 'No camera was found. Please connect a camera and refresh the page.';
    } else if (error.name === 'SecurityError') {
        errorMessage += 'Camera access is blocked. Please use HTTPS or localhost.';
    } else {
        errorMessage += error.message || 'Please check camera permissions and ensure no other app is using it.';
    }

    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: var(--gradient-primary);
        color: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        z-index: 1000;
        max-width: 80%;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        white-space: pre-line;
    `;
    
    errorDiv.innerHTML = `
        ${errorMessage}<br><br>
        <button onclick="location.reload()" style="
            padding: 10px 20px;
            background: white;
            color: var(--primary-dark);
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: bold;
        ">Try Again</button>
    `;
    
    document.body.appendChild(errorDiv);
    throw new Error(errorMessage);
}

function calculateAngle(a, b, c) {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180) / Math.PI);
    if (angle > 180) angle = 360 - angle;
    return angle;
}

async function analyzeFrame() {
    if (!isModelLoaded) {
        requestAnimationFrame(analyzeFrame);
        return;
    }

    const currentTime = Date.now();
    const elapsed = currentTime - lastFrameTime;

    if (elapsed < FRAME_INTERVAL) {
        requestAnimationFrame(analyzeFrame);
        return;
    }

    try {
        if (!isProcessingFrame) {
            isProcessingFrame = true;
            lastFrameTime = currentTime;

            // Get container and video dimensions
            const container = document.querySelector('.video-container');
            const containerWidth = container.offsetWidth;
            const containerHeight = container.offsetHeight;

            // Calculate scale factors
            const scaleX = containerWidth / video.videoWidth;
            const scaleY = containerHeight / video.videoHeight;

            // Update canvas dimensions
            canvas.width = containerWidth;
            canvas.height = containerHeight;

            // Draw video frame
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                ctx.drawImage(video, 0, 0, containerWidth, containerHeight);
            }

            // Estimate poses with adjusted parameters
            const poses = await detector.estimatePoses(video, {
                maxPoses: 1,
                flipHorizontal: true, // Enable horizontal flip
                scoreThreshold: 0.3
            });

            if (poses.length > 0) {
                updateResult(""); // Clear no person message
                const keypoints = poses[0].keypoints;
                
                // Scale keypoints to match container size
                const scaledKeypoints = keypoints.map(keypoint => ({
                    ...keypoint,
                    x: keypoint.x * scaleX,
                    y: keypoint.y * scaleY
                }));

                // Draw keypoints and skeleton with scaled coordinates
                drawKeypoints(scaledKeypoints);
                drawSkeleton(scaledKeypoints);

                // Process exercise detection with original keypoints
                if (isSquatMode) {
                    processSquat(keypoints, 0.3);
                } else if (isPlankMode) {
                    processPlank(keypoints, 0.3);
                } else {
                    processPushUp(keypoints, 0.3);
                }
            } else {
                updateResult("No person detected");
            }

            isProcessingFrame = false;
        }
    } catch (error) {
        console.error("Error during pose detection:", error);
        isProcessingFrame = false;
    }

    requestAnimationFrame(analyzeFrame);
}

// Update drawKeypoints function to handle scaling
function drawKeypoints(keypoints) {
    keypoints.forEach((keypoint) => {
        if (keypoint.score > 0.3) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 4, 0, 2 * Math.PI);
            ctx.fillStyle = "#B94E48";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

// Update drawSkeleton function to handle scaling
function drawSkeleton(keypoints) {
    const connections = [
        ['left_shoulder', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'],
        ['right_shoulder', 'right_elbow'],
        ['left_elbow', 'left_wrist'],
        ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'],
        ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'],
        ['right_hip', 'right_knee'],
        ['left_knee', 'left_ankle'],
        ['right_knee', 'right_ankle']
    ];

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#1e3c72';

    connections.forEach(([first, second]) => {
        const firstPoint = keypoints.find(kp => kp.name === first);
        const secondPoint = keypoints.find(kp => kp.name === second);

        if (firstPoint && secondPoint &&
            firstPoint.score > 0.3 && secondPoint.score > 0.3) {
            ctx.beginPath();
            ctx.moveTo(firstPoint.x, firstPoint.y);
            ctx.lineTo(secondPoint.x, secondPoint.y);
            ctx.stroke();
        }
    });
}

// Separate exercise processing functions
function processSquat(keypoints, minConfidence) {
    const leftHip = keypoints.find(k => k.name === 'left_hip');
    const leftKnee = keypoints.find(k => k.name === 'left_knee');
    const leftAnkle = keypoints.find(k => k.name === 'left_ankle');
    const rightHip = keypoints.find(k => k.name === 'right_hip');
    const rightKnee = keypoints.find(k => k.name === 'right_knee');
    const rightAnkle = keypoints.find(k => k.name === 'right_ankle');

    // Slightly stricter confidence check
    if (!leftHip || !leftKnee || !leftAnkle || !rightHip || !rightKnee || !rightAnkle ||
        leftHip.score < 0.3 || leftKnee.score < 0.3 || leftAnkle.score < 0.3 ||
        rightHip.score < 0.3 || rightKnee.score < 0.3 || rightAnkle.score < 0.3) {
        return;
    }

    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

    // Adjusted angle thresholds - more strict than before but still achievable
    const isSquatDown = (leftKneeAngle < 130 && rightKneeAngle < 130); // Both knees must bend
    const isStandingUp = (leftKneeAngle > 160 && rightKneeAngle > 160); // Both legs must straighten

    if (isSquatDown && !isSquatInProgress) {
        isSquatInProgress = true;
        showFormFeedback("Good! Now stand up");
    }

    if (isStandingUp && isSquatInProgress) {
        const currentTime = Date.now();
        // Increased minimum delay between squats to 2.5 seconds
        if (currentTime - lastSquatTime >= 2500) {
            squatCount++;
            lastSquatTime = currentTime;
            updateCounter();
            isSquatInProgress = false;
            handleExerciseCompletion('SQUATS');
            showFormFeedback("Great job! Keep going!");
        }
        // Only show slow down message if the user is going really fast
        else if (currentTime - lastSquatTime < 1500) {
            updateSlowDownMessage('SQUATS');
        }
    }
}

// Update the handleExerciseCompletion function
function handleExerciseCompletion(exerciseType) {
    const count = exerciseType === 'SQUATS' ? squatCount : 
                 (exerciseType === 'PLANK' ? plankCount : pushUpCount);
    
    // Calculate and update calories
    if (exerciseType === 'PLANK') {
        const formQuality = calculatePlankFormQuality();
        const caloriesBurned = EXERCISES.PLANK.caloriesPerInterval * formQuality;
        updateCalorieCounter(caloriesBurned);
    } else {
        // For squats and pushups
        updateCalorieCounter(EXERCISES[exerciseType].caloriesPerRep);
    }
    
    // Update progress bar for current set only
    const progress = (count % 5) * 20; // Each rep is 20% of the bar (5 reps = 100%)
    document.querySelector('.progress-bar').style.width = `${progress}%`;
    
    // Show confetti when reaching 5 reps
    if (count > 0 && count % 5 === 0) {
        const myConfetti = confetti.create(document.getElementById('confetti-canvas'), {
            resize: true,
            useWorker: true
        });
        
        myConfetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#1e3c72', '#B94E48', '#ffffff'],
            disableForReducedMotion: true
        });
    }
}

// Add the processPushUp function
function processPushUp(keypoints, minConfidence) {
    const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
    const leftElbow = keypoints.find(k => k.name === 'left_elbow');
    const leftWrist = keypoints.find(k => k.name === 'left_wrist');
    const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');
    const rightElbow = keypoints.find(k => k.name === 'right_elbow');
    const rightWrist = keypoints.find(k => k.name === 'right_wrist');

    // More lenient confidence check
    if (!leftShoulder || !leftElbow || !leftWrist || !rightShoulder || !rightElbow || !rightWrist ||
        leftShoulder.score < 0.2 || leftElbow.score < 0.2 || leftWrist.score < 0.2 ||
        rightShoulder.score < 0.2 || rightElbow.score < 0.2 || rightWrist.score < 0.2) {
        return;
    }

    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

    // More lenient angle thresholds
    const isPushUpLow = (leftElbowAngle < 110 || rightElbowAngle < 110); // Was 90
    const isPushUpUp = (leftElbowAngle > 130 || rightElbowAngle > 130); // Was 160

    if (isPushUpLow && !isPushUpInProgress) {
        isPushUpInProgress = true;
        showFormFeedback("Good! Now push up");
    }

    if (isPushUpUp && isPushUpInProgress) {
        const currentTime = Date.now();
        if (currentTime - lastPushUpTime >= minPushUpDelay) {
            pushUpCount++;
            lastPushUpTime = currentTime;
            updateCounter();
            isPushUpInProgress = false;
            handleExerciseCompletion('PUSHUPS');
            showFormFeedback("Great job! Keep going!");
        } else {
            updateSlowDownMessage('PUSHUPS');
        }
    }
}

// Add visibility change handler to prevent freezing
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden (user switched tabs)
        isProcessingFrame = false;
    } else {
        // Page is visible again
        if (!isProcessingFrame) {
            requestAnimationFrame(analyzeFrame);
        }
    }
});

// Update the mode switch handler
modeSwitchButton.addEventListener('click', () => {
    // Toggle between three modes
    if (isSquatMode) {
        isSquatMode = false;
        isPlankMode = false; // Switch to push-up mode
        showFormFeedback(FORM_FEEDBACK.PUSHUPS.start);
    } else if (!isPlankMode) {
        isPlankMode = true; // Switch to plank mode
        showFormFeedback(FORM_FEEDBACK.PLANK.start);
    } else {
        isSquatMode = true; // Back to squat mode
        isPlankMode = false;
        showFormFeedback(FORM_FEEDBACK.SQUATS.start);
    }

    // Reset states
    isSquatInProgress = false;
    isPushUpInProgress = false;
    isPlankInProgress = false;
    isProcessingFrame = false;
    PLANK_POSITION_MEMORY.length = 0; // Clear position memory
    clearPlankTimer(); // Clear timer when switching modes
    
    // Update progress bar based on current count
    const currentCount = isSquatMode ? squatCount : (isPlankMode ? plankCount : pushUpCount);
    const progress = (currentCount % 5) * 20;
    document.querySelector('.progress-bar').style.width = `${progress}%`;
    
    // Ensure button stays clickable
    modeSwitchButton.style.zIndex = '1001';
    
    // Update counter and mode message
    updateModeMessage();
    updateCounter();
});

// Update the slow down message logic in analyzeFrame
function updateSlowDownMessage(exerciseType) {
    const currentTime = Date.now();
    const lastTime = exerciseType === 'SQUATS' ? lastSquatTime : lastPushUpTime;
    
    // Only show message if exercise is being done very quickly
    if (currentTime - lastTime < 1500) {
        if (slowDownTimer) clearTimeout(slowDownTimer);
        
        slowDownMessage.textContent = `Slow down for better form!`;
        
        slowDownTimer = setTimeout(() => {
            slowDownMessage.textContent = "";
        }, 1000);
    }
}

// Update the updateCounter function
function updateCounter() {
    const isMobile = window.innerWidth < 768;
    const separator = isMobile ? '\n' : ' | ';
    counterDiv.textContent = `Squats: ${squatCount}${separator}Push-Ups: ${pushUpCount}${separator}Plank Intervals: ${plankCount}`;
    counterDiv.style.whiteSpace = isMobile ? 'pre-line' : 'nowrap';
}

// Update the startPlankTimer function
function startPlankTimer() {
    if (plankTimer) {
        return;
    }

    const timerDiv = document.createElement('div');
    timerDiv.id = 'plankTimer';
    timerDiv.style.fontSize = '2em';
    document.querySelector('.video-container').after(timerDiv);

    let timeLeft = EXERCISES.PLANK.interval;
    updatePlankTimer(timeLeft);

    plankTimer = setInterval(() => {
        if (!isPlankMode || !isPlankInProgress || !detector) {
            clearPlankTimer();
            isPlankInProgress = false;
            return;
        }

        if (isPlankInProgress) {
            timeLeft -= 1000;
            updatePlankTimer(timeLeft);

            if (timeLeft <= 0) {
                plankCount++;
                handleExerciseCompletion('PLANK');
                timeLeft = EXERCISES.PLANK.interval;
                updateCounter();
            }
        }
    }, 1000);
}

// Update the processPlank function
function processPlank(keypoints, minConfidence) {
    if (!isPlankMode) {
        clearPlankTimer();
        return;
    }

    // If no person or keypoints detected, show starting position instruction
    if (!keypoints || keypoints.length === 0) {
        clearPlankTimer();
        isPlankInProgress = false;
        PLANK_POSITION_MEMORY.length = 0;
        showFormFeedback(FORM_FEEDBACK.PLANK.start);
        return;
    }

    const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
    const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');
    const leftElbow = keypoints.find(k => k.name === 'left_elbow');
    const rightElbow = keypoints.find(k => k.name === 'right_elbow');
    const leftWrist = keypoints.find(k => k.name === 'left_wrist');
    const rightWrist = keypoints.find(k => k.name === 'right_wrist');
    const leftHip = keypoints.find(k => k.name === 'left_hip');
    const rightHip = keypoints.find(k => k.name === 'right_hip');
    const leftAnkle = keypoints.find(k => k.name === 'left_ankle');
    const rightAnkle = keypoints.find(k => k.name === 'right_ankle');

    // Check if all required keypoints are detected with sufficient confidence
    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || 
        !leftWrist || !rightWrist || !leftHip || !rightHip || 
        !leftAnkle || !rightAnkle || 
        !leftShoulder.score > minConfidence || !rightShoulder.score > minConfidence ||
        !leftElbow.score > minConfidence || !rightElbow.score > minConfidence ||
        !leftWrist.score > minConfidence || !rightWrist.score > minConfidence ||
        !leftHip.score > minConfidence || !rightHip.score > minConfidence ||
        !leftAnkle.score > minConfidence || !rightAnkle.score > minConfidence) {
        clearPlankTimer();
        isPlankInProgress = false;
        PLANK_POSITION_MEMORY.length = 0;
        showFormFeedback(FORM_FEEDBACK.PLANK.start);
        return;
    }

    // Calculate midpoints
    const shoulderMidpoint = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2
    };
    const hipMidpoint = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2
    };
    const ankleMidpoint = {
        x: (leftAnkle.x + rightAnkle.x) / 2,
        y: (leftAnkle.y + rightAnkle.y) / 2
    };

    // Calculate body alignment first
    const bodyLineAngle = Math.abs(Math.atan2(
        hipMidpoint.y - shoulderMidpoint.y,
        hipMidpoint.x - shoulderMidpoint.x
    ) * 180 / Math.PI);
    isBodyAligned = Math.abs(180 - bodyLineAngle) < 30;

    // Check elbow angles
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

    // Check if elbows are properly bent
    areElbowsProperlyBent = (leftElbowAngle >= 65 && leftElbowAngle <= 115) && 
                             (rightElbowAngle >= 65 && rightElbowAngle <= 115);

    // Check if elbows are under shoulders
    const leftElbowUnderShoulder = Math.abs(leftElbow.x - leftShoulder.x) < 50;
    const rightElbowUnderShoulder = Math.abs(rightElbow.x - rightShoulder.x) < 50;
    const areElbowsUnderShoulders = leftElbowUnderShoulder && rightElbowUnderShoulder;

    // Check if hips are not sagging
    const hipToShoulderDist = Math.abs(hipMidpoint.y - shoulderMidpoint.y);
    const hipToAnkleDist = Math.abs(hipMidpoint.y - ankleMidpoint.y);
    const isHipLevel = Math.abs(hipToShoulderDist - hipToAnkleDist) < 50;

    // Handle movement detection
    PLANK_POSITION_MEMORY.push(hipMidpoint);
    if (PLANK_POSITION_MEMORY.length > PLANK_MEMORY_SIZE) {
        PLANK_POSITION_MEMORY.shift();
    }

    let isStable = true;
    if (PLANK_POSITION_MEMORY.length > 1) {
        for (let i = 1; i < PLANK_POSITION_MEMORY.length; i++) {
            const movement = Math.sqrt(
                Math.pow(PLANK_POSITION_MEMORY[i].x - PLANK_POSITION_MEMORY[i-1].x, 2) +
                Math.pow(PLANK_POSITION_MEMORY[i].y - PLANK_POSITION_MEMORY[i-1].y, 2)
            );
            if (movement > PLANK_MOVEMENT_THRESHOLD) {
                isStable = false;
                break;
            }
        }
    }

    // All conditions must be met for a valid plank
    const isInPlankPosition = areElbowsProperlyBent && isBodyAligned && 
                            areElbowsUnderShoulders && isHipLevel && isStable;

    // Only show starting position message until they're in position
    if (!isPlankInProgress && !isInPlankPosition) {
        showFormFeedback(FORM_FEEDBACK.PLANK.start);
        return;
    }

    if (!isInPlankPosition) {
        if (isPlankInProgress) {
            clearPlankTimer();
            isPlankInProgress = false;
            PLANK_POSITION_MEMORY.length = 0;
        }
    } else {
        if (!isPlankInProgress && !plankTimer) {
            isPlankInProgress = true;
            startPlankTimer();
            updateResult("Good plank position!");
        }
    }

    if (!isBodyAligned) {
        showFormFeedback(FORM_FEEDBACK.PLANK.back);
    } else if (!areElbowsUnderShoulders) {
        showFormFeedback(FORM_FEEDBACK.PLANK.elbows);
    } else if (!isHipLevel) {
        showFormFeedback(FORM_FEEDBACK.PLANK.hips);
    } else if (!isStable) {
        showFormFeedback(FORM_FEEDBACK.PLANK.stable);
    }
}

// Update the clearPlankTimer function
function clearPlankTimer() {
    if (plankTimer) {
        clearInterval(plankTimer);
        plankTimer = null;
    }
    const timerDiv = document.getElementById('plankTimer');
    if (timerDiv) {
        timerDiv.remove();
    }
    isPlankInProgress = false;
}

function updatePlankTimer(timeLeft) {
    const timerDiv = document.getElementById('plankTimer');
    if (timerDiv) {
        timerDiv.textContent = `Time: ${(timeLeft / 1000).toFixed(0)}s`;
        // Add animation class
        timerDiv.classList.add('timer-pulse');
        // Remove animation class after animation completes
        setTimeout(() => {
            timerDiv.classList.remove('timer-pulse');
        }, 200);
    }
}

// Add separate function for drawing keypoints
function drawKeypoints(keypoints) {
    keypoints.forEach((keypoint) => {
        if (keypoint.score > 0.3) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "#B94E48";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}

function updateResult(text) {
    const resultElement = document.getElementById('result');
    resultElement.textContent = text;
    
    if (text === 'No person detected') {
        resultElement.classList.add('active');
    } else {
        resultElement.classList.remove('active');
    }
}

// Update the skipQuestion function
function skipQuestion(inputId, defaultValue) {
    const input = document.getElementById(inputId);
    
    // For age, weight, and goal weight inputs, use '0' instead of '❌'
    if (input.type === 'number') {
        input.value = '0';
    } else {
        input.value = defaultValue;
    }
    
    // Find the current question index
    const currentQuestionIndex = questionIds.indexOf(input.closest('.question').id);
    if (currentQuestionIndex !== -1) {
        // Move to next question
        currentQuestion = currentQuestionIndex + 1;
        
        // Hide current question
        document.getElementById(questionIds[currentQuestionIndex]).classList.remove('active');
        
        // If this was the last question, submit the questionnaire
        if (currentQuestion >= questionIds.length) {
            submitQuestionnaire();
        } else {
            // Show next question
            document.getElementById(questionIds[currentQuestion]).classList.add('active');
        }
    }
}

// Add function to calculate plank form quality (0.0 to 1.0)
function calculatePlankFormQuality() {
    // This is a simplified version - you can make it more sophisticated
    const formQuality = Math.min(1.0, Math.max(0.0, 
        (PLANK_POSITION_MEMORY.length / PLANK_MEMORY_SIZE) * 
        (isBodyAligned ? 1.0 : 0.5) * 
        (areElbowsProperlyBent ? 1.0 : 0.5)
    ));
    
    return formQuality;
}

// Add these with other state variables
let isBodyAligned = false;
let areElbowsProperlyBent = false;

// Add this new function to check plank position
function checkPlankPosition(keypoints) {
    if (!keypoints || keypoints.length === 0) return false;

    const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
    const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');
    const leftElbow = keypoints.find(k => k.name === 'left_elbow');
    const rightElbow = keypoints.find(k => k.name === 'right_elbow');
    const leftWrist = keypoints.find(k => k.name === 'left_wrist');
    const rightWrist = keypoints.find(k => k.name === 'right_wrist');
    const leftHip = keypoints.find(k => k.name === 'left_hip');
    const rightHip = keypoints.find(k => k.name === 'right_hip');
    const leftAnkle = keypoints.find(k => k.name === 'left_ankle');
    const rightAnkle = keypoints.find(k => k.name === 'right_ankle');

    // Check if all keypoints are detected with sufficient confidence
    const requiredKeypoints = [
        leftShoulder, rightShoulder, leftElbow, rightElbow,
        leftWrist, rightWrist, leftHip, rightHip, leftAnkle, rightAnkle
    ];

    if (!requiredKeypoints.every(point => point && point.score > 0.4)) return false;

    // Calculate angles and check position
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

    const areElbowsProperlyBent = (leftElbowAngle >= 65 && leftElbowAngle <= 115) && 
                                 (rightElbowAngle >= 65 && rightElbowAngle <= 115);

    if (!areElbowsProperlyBent) return false;

    // Add other position checks as needed...
    return true;
}

// Add these variables at the top
const MOTIVATIONAL_MESSAGES = [
    "You are doing great! Keep going! 💪",
    "Amazing progress! You're crushing it! 🔥",
    "Keep pushing! You're getting stronger! 💪",
    "Fantastic work! Don't stop now! ⭐",
    "You're unstoppable! Keep it up! 🚀"
];

const FORM_FEEDBACK = {
    SQUATS: {
        start: "Stand with feet shoulder-width apart!",
        knees: "Keep your knees behind your toes!",
        depth: "Go lower for a full squat!",
        back: "Keep your back straight!",
        stance: "Keep your feet shoulder-width apart!"
    },
    PUSHUPS: {
        start: "Get into push-up position - hands shoulder-width apart!",
        back: "Keep your back straight - no sagging!",
        elbows: "Keep your elbows closer to your body!",
        depth: "Lower your chest more!",
        head: "Keep your head neutral - look at the floor!"
    },
    PLANK: {
        start: "Get into plank position on your forearms!",
        hips: "Don't let your hips sag!",
        back: "Straighten your back!",
        elbows: "Keep your elbows under shoulders!",
        stable: "Stay stable - minimize movement!"
    }
};

// Add this function to show motivational messages
function showMotivationalMessage() {
    const message = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
    const messageDiv = document.createElement('div');
    messageDiv.className = 'motivational-message';
    messageDiv.textContent = message;
    document.querySelector('.video-container').appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.classList.add('fade-out');
        setTimeout(() => messageDiv.remove(), 500);
    }, 2000);
}

// Add this function to show form feedback
let lastFeedbackTime = 0;
const FEEDBACK_COOLDOWN = 2000; // Only show feedback every 2 seconds

function showFormFeedback(feedback) {
    const currentTime = Date.now();
    if (currentTime - lastFeedbackTime < FEEDBACK_COOLDOWN) {
        return; // Don't show feedback if it's too soon
    }
    
    const feedbackDiv = document.getElementById('formFeedback') || document.createElement('div');
    feedbackDiv.id = 'formFeedback';
    feedbackDiv.textContent = feedback;
    
    if (!feedbackDiv.parentElement) {
        document.querySelector('.video-container').appendChild(feedbackDiv);
    }
    
    lastFeedbackTime = currentTime;
    
    // Clear the feedback after 1.5 seconds
    setTimeout(() => {
        if (feedbackDiv.textContent === feedback) {
            feedbackDiv.classList.add('fade-out');
            setTimeout(() => feedbackDiv.remove(), 500);
        }
    }, 1500);
}