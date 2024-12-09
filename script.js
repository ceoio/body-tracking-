let userData = {
    name: '',
    age: 0,
    weight: 0,
    goalWeight: 0
};

const EXERCISES = {
    SQUATS: {
        name: 'Squats',
        goals: [5, 10, 15, 20, 25]
    },
    PUSHUPS: {
        name: 'Push-ups',
        goals: [5, 10, 15, 20, 25]
    },
    PLANK: {
        name: 'Plank',
        goals: [5, 10, 15, 20, 25], // Number of 5-second intervals
        interval: 5000 // 5 seconds in milliseconds
    }
};

let currentGoalIndex = 0;
let currentQuestion = 0;
const questions = ['welcome', 'nameQuestion', 'ageQuestion', 'weightQuestion', 'goalQuestion'];

function showNextQuestion() {
    if (currentQuestion > 0) {
        // Don't proceed if the current input is empty (except for welcome screen)
        if (currentQuestion < questions.length) {
            const currentInput = document.querySelector(`#${questions[currentQuestion-1]} input`);
            if (currentInput && !currentInput.value) {
                return; // Don't proceed if input is empty
            }
        }
        document.getElementById(questions[currentQuestion - 1]).classList.remove('active');
    }
    
    if (currentQuestion < questions.length) {
        document.getElementById(questions[currentQuestion]).classList.add('active');
        
        // Don't auto-proceed after showing a question with input
        if (currentQuestion === 0) { // Only auto-proceed after welcome screen
            setTimeout(() => {
                currentQuestion++;
                showNextQuestion();
            }, 2000);
        } else {
            // Add input event listeners for other questions
            const input = document.querySelector(`#${questions[currentQuestion]} input`);
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
    userData.name = document.getElementById('userName').value;
    userData.age = document.getElementById('userAge').value;
    userData.weight = document.getElementById('userWeight').value;
    userData.goalWeight = document.getElementById('goalWeight').value;

    if (!userData.name || !userData.age || !userData.weight || !userData.goalWeight) {
        alert('Please fill in all fields');
        return;
    }

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
        const nextButton = document.createElement('button');
        nextButton.textContent = 'Next';
        nextButton.classList.add('next-button');
        nextButton.onclick = () => {
            const input = question.querySelector('input');
            if (input && input.value) {
                currentQuestion++;
                showNextQuestion();
            } else {
                alert('Please fill in the field');
            }
        };
        question.appendChild(nextButton);
    });
}

// Start the question animation sequence when the page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(showNextQuestion, 1000);
    addNextButtons();
    updateModeMessage();
    updateCounter();
});

function updateProgressBar(count, total) {
    const progress = (count / total) * 100;
    document.querySelector('.progress-bar').style.width = `${progress}%`;
}

function updateModeMessage() {
    const modeMessageDiv = document.getElementById('modeMessage');
    if (modeMessageDiv) {
        modeMessageDiv.style.animation = 'none';
        modeMessageDiv.offsetHeight;
        modeMessageDiv.style.animation = 'fadeInUp 0.5s forwards';
        let message = isSquatMode ? "Squat mode active" : 
                     (isPlankMode ? "Plank mode active" : "Push-up mode active");
        modeMessageDiv.textContent = message;
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

// Add these optimization flags
let isProcessingFrame = false;
let lastFrameTime = 0;
const FRAME_RATE = 30; // Limit frame rate to 30 FPS
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

async function initMoveNet() {
    try {
        const model = poseDetection.SupportedModels.MoveNet;
        detector = await poseDetection.createDetector(model, {
            modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            enableSmoothing: true,
            modelUrl: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4', // Direct model URL
            minPoseScore: 0.25 // Lower threshold for faster processing
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
        const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

        // First try to release any existing camera streams
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }

        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera access is not supported by this browser');
        }

        // First try with simpler constraints
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                } 
            });

            // If we got a stream, set it up
            video.srcObject = stream;
            
            return new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    video.play()
                        .then(() => resolve(video))
                        .catch(e => {
                            console.warn('Autoplay failed', e);
                            // Show play button
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
                                background: var(--primary-color);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                cursor: pointer;
                            `;
                            document.querySelector('.video-container').appendChild(playButton);
                            
                            playButton.onclick = async () => {
                                try {
                                    await video.play();
                                    playButton.remove();
                                    resolve(video);
                                } catch (playError) {
                                    console.error('Play failed:', playError);
                                    throw playError;
                                }
                            };
                        });
                };

                video.onerror = (err) => {
                    throw new Error(`Video error: ${err.message}`);
                };
            });
        } catch (initialError) {
            console.warn('Initial camera setup failed, trying fallback...', initialError);
            
            // Try fallback constraints
            const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
                video: true 
            });
            
            video.srcObject = fallbackStream;
            return new Promise((resolve) => {
                video.onloadedmetadata = () => video.play().then(() => resolve(video));
            });
        }
    } catch (error) {
        console.error('Camera setup error:', error);
        
        // Create more detailed error message
        let errorMessage = 'Unable to access camera. ';
        if (error.name === 'NotReadableError') {
            errorMessage += 'The camera might be in use by another application. Please close other apps that might be using the camera and refresh the page.';
        } else if (error.name === 'NotAllowedError') {
            errorMessage += 'Camera permission was denied. Please allow camera access and refresh the page.';
        } else if (error.name === 'NotFoundError') {
            errorMessage += 'No camera device was found. Please connect a camera and refresh the page.';
        } else {
            errorMessage += error.message || 'Please ensure camera permissions are granted and no other app is using the camera.';
        }

        // Show error UI
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.8);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            z-index: 1000;
            max-width: 80%;
        `;
        errorDiv.innerHTML = `
            ${errorMessage}<br><br>
            <button onclick="location.reload()" style="
                margin-top: 10px;
                padding: 10px 20px;
                background: white;
                color: black;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            ">Try Again</button>
        `;
        document.querySelector('.video-container').appendChild(errorDiv);
        
        throw new Error(errorMessage);
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
        requestAnimationFrame(analyzeFrame);
        return;
    }

    try {
        // Get container dimensions
        const container = document.querySelector('.video-container');
        const containerWidth = container.offsetWidth;
        const containerHeight = container.offsetHeight;

        // Update canvas dimensions to match container
        canvas.width = containerWidth;
        canvas.height = containerHeight;

        // Calculate scale factors
        const scaleX = containerWidth / video.videoWidth;
        const scaleY = containerHeight / video.videoHeight;

        // Always draw video frame first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            ctx.drawImage(video, 0, 0, containerWidth, containerHeight);
        }

        // Only process pose if we're not already processing
        if (!isProcessingFrame) {
            isProcessingFrame = true;
            
            const poses = await detector.estimatePoses(video);

            if (poses.length === 0) {
                resultDiv.textContent = "No person detected.";
            } else {
                resultDiv.textContent = "";
                const keypoints = poses[0].keypoints;
                
                // Scale keypoints to match container size
                const scaledKeypoints = keypoints.map(keypoint => ({
                    ...keypoint,
                    x: keypoint.x * scaleX,
                    y: keypoint.y * scaleY
                }));

                // Draw keypoints with scaled coordinates
                drawKeypoints(scaledKeypoints);
                drawSkeleton(scaledKeypoints);

                // Process exercise detection with original keypoints
                if (isSquatMode) {
                    processSquat(keypoints, 0.4);
                } else if (isPlankMode) {
                    processPlank(keypoints, 0.4);
                } else {
                    processPushUp(keypoints, 0.1);
                }
            }
            
            isProcessingFrame = false;
        }

    } catch (error) {
        console.error("Error during pose detection:", error);
        isProcessingFrame = false;
    }

    requestAnimationFrame(analyzeFrame);
}

// Separate the skeleton drawing into its own function
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
    ctx.strokeStyle = '#00CED1';

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

            if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle &&
        leftHip.score > 0.4 && leftKnee.score > 0.4 && leftAnkle.score > 0.4 &&
        rightHip.score > 0.4 && rightKnee.score > 0.4 && rightAnkle.score > 0.4) {

                const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
                const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);

        const isSquatLow = leftKneeAngle > 160 && rightKneeAngle > 160;
        const isStandingUp = leftKneeAngle < 120 && rightKneeAngle < 120;

                if (isSquatLow && !isSquatInProgress) {
                    isSquatInProgress = true;
                }

                if (isStandingUp && isSquatInProgress) {
                    const currentTime = Date.now();
                    if (currentTime - lastSquatTime >= minSquatDelay) {
                        squatCount++;
                        lastSquatTime = currentTime;
                        updateCounter();
                        isSquatInProgress = false;
                        handleExerciseCompletion('SQUATS');
                    } else {
                        updateSlowDownMessage('SQUATS');
                    }
                }
            }
        }

// Update the handleExerciseCompletion function
function handleExerciseCompletion(exerciseType) {
    const count = exerciseType === 'SQUATS' ? squatCount : 
                 (exerciseType === 'PLANK' ? plankCount : pushUpCount);
    
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
            colors: ['#00CED1', '#008B8B', '#ffffff'],
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
    
    if (leftShoulder && leftElbow && leftWrist && rightShoulder && rightElbow && rightWrist &&
        leftShoulder.score > minConfidence && leftElbow.score > minConfidence && leftWrist.score > minConfidence &&
        rightShoulder.score > minConfidence && rightElbow.score > minConfidence && rightWrist.score > minConfidence) {
        
        const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
        
        const isPushUpLow = leftElbowAngle < 90 && rightElbowAngle < 90;
        const isPushUpUp = leftElbowAngle > 160 && rightElbowAngle > 160;
        
        if (isPushUpLow && !isPushUpInProgress) {
            isPushUpInProgress = true;
        }
        
        if (isPushUpUp && isPushUpInProgress) {
            const currentTime = Date.now();
            if (currentTime - lastPushUpTime >= minPushUpDelay) {
                pushUpCount++;
                lastPushUpTime = currentTime;
                updateCounter();
                isPushUpInProgress = false;
                handleExerciseCompletion('PUSHUPS');
            } else {
                updateSlowDownMessage('PUSHUPS');
            }
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
    } else if (!isPlankMode) {
        isPlankMode = true; // Switch to plank mode
    } else {
        isSquatMode = true; // Back to squat mode
        isPlankMode = false;
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
    
    // Update counter and mode message
    updateModeMessage();
    updateCounter();
});

// Update the slow down message logic in analyzeFrame
function updateSlowDownMessage(exerciseType) {
    // Only check if this is the current active mode
    if ((exerciseType === 'SQUATS' && !isSquatMode) || 
        (exerciseType === 'PUSHUPS' && isSquatMode)) {
        return;
    }

    const currentTime = Date.now();
    const lastTime = exerciseType === 'SQUATS' ? lastSquatTime : lastPushUpTime;
    const minDelay = exerciseType === 'SQUATS' ? minSquatDelay : minPushUpDelay;

    if (currentTime - lastTime < minDelay) {
        // Clear any existing timer
        if (slowDownTimer) clearTimeout(slowDownTimer);
        
        // Show the message
        slowDownMessage.textContent = `Slow down with ${exerciseType.toLowerCase()}!`;
        
        // Set a timer to clear the message
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
    if (plankTimer) return;

    // Remove existing timer div if it exists
    const existingTimer = document.getElementById('plankTimer');
    if (existingTimer) {
        existingTimer.remove();
    }

    const timerDiv = document.createElement('div');
    timerDiv.id = 'plankTimer';
    timerDiv.style.fontSize = window.innerWidth < 768 ? '1.5em' : '2em';
    timerDiv.style.color = 'var(--primary-color)';
    timerDiv.style.marginTop = '10px';
    document.getElementById('counter').after(timerDiv);

    let timeLeft = EXERCISES.PLANK.interval;
    updatePlankTimer(timeLeft);

    plankTimer = setInterval(() => {
        timeLeft -= 1000;
        if (timeLeft <= 0) {
            plankCount++;
            handleExerciseCompletion('PLANK');
            timeLeft = EXERCISES.PLANK.interval;
            updateCounter();
        }
        updatePlankTimer(timeLeft);
    }, 1000);
}

// Update the processPlank function
function processPlank(keypoints, minConfidence) {
    if (!isPlankMode) {
        clearPlankTimer();
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

    if (leftShoulder && rightShoulder && leftElbow && rightElbow && leftWrist && rightWrist &&
        leftHip && rightHip && leftAnkle && rightAnkle &&
        leftShoulder.score > minConfidence && rightShoulder.score > minConfidence &&
        leftElbow.score > minConfidence && rightElbow.score > minConfidence &&
        leftWrist.score > minConfidence && rightWrist.score > minConfidence &&
        leftHip.score > minConfidence && rightHip.score > minConfidence &&
        leftAnkle.score > minConfidence && rightAnkle.score > minConfidence) {

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
        const isBodyAligned = Math.abs(180 - bodyLineAngle) < 30;

        // Check elbow angles
        const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

        // Debug the raw angles
        console.log('Raw Angles:', {
            leftElbowAngle,
            rightElbowAngle
        });

        // Check if elbows are properly bent
        const areElbowsProperlyBent = (leftElbowAngle >= 65 && leftElbowAngle <= 115) && 
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

        // More detailed debug information
        console.log('Plank Position Details:', {
            leftElbowAngle,
            rightElbowAngle,
            areElbowsProperlyBent,
            leftCheck: leftElbowAngle >= 65 && leftElbowAngle <= 115,
            rightCheck: rightElbowAngle >= 65 && rightElbowAngle <= 115,
            bodyLineAngle,
            isBodyAligned,
            areElbowsUnderShoulders,
            isHipLevel,
            isStable
        });

        // All conditions must be met for a valid plank
        const isInPlankPosition = areElbowsProperlyBent && isBodyAligned && 
                                areElbowsUnderShoulders && isHipLevel && isStable;

        if (!isInPlankPosition && isPlankInProgress) {
            clearPlankTimer();
            isPlankInProgress = false;
            PLANK_POSITION_MEMORY.length = 0;
            if (!areElbowsProperlyBent) {
                if (leftElbowAngle < 65 || rightElbowAngle < 65) {
                    resultDiv.textContent = "Bend your elbows more";
                } else if (leftElbowAngle > 115 || rightElbowAngle > 115) {
                    resultDiv.textContent = "Don't bend your elbows too much";
                }
            } else if (!isBodyAligned) resultDiv.textContent = "Keep your body horizontal";
            else if (!areElbowsUnderShoulders) resultDiv.textContent = "Keep elbows under shoulders";
            else if (!isHipLevel) resultDiv.textContent = "Keep hips level with shoulders and ankles";
            else resultDiv.textContent = "Stay stable in plank position";
        } else if (isInPlankPosition && !isPlankInProgress) {
            isPlankInProgress = true;
            plankStartTime = Date.now();
            startPlankTimer();
            resultDiv.textContent = "Good plank position!";
        }
    } else {
        clearPlankTimer();
        isPlankInProgress = false;
        PLANK_POSITION_MEMORY.length = 0;
        resultDiv.textContent = "Position not detected clearly";
    }
}

// Add function to clear plank timer
function clearPlankTimer() {
    if (plankTimer) {
        clearInterval(plankTimer);
        plankTimer = null;
    }
    const timerDiv = document.getElementById('plankTimer');
    if (timerDiv) {
        timerDiv.remove();
    }
}

function updatePlankTimer(timeLeft) {
    const timerDiv = document.getElementById('plankTimer');
    if (timerDiv) {
        timerDiv.textContent = `Time: ${(timeLeft / 1000).toFixed(0)}s`;
    }
}

// Add separate function for drawing keypoints
function drawKeypoints(keypoints) {
    keypoints.forEach((keypoint) => {
        if (keypoint.score > 0.3) {
            ctx.beginPath();
            ctx.arc(keypoint.x, keypoint.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "red";
            ctx.fill();
            ctx.strokeStyle = "white";
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    });
}
