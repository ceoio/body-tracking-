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
    },
    CURLS: {                    // Add dumbbell curls
        name: 'Curls',
        goals: [5, 10, 15, 20, 25],
        caloriesPerRep: 0.25
    },
    SITUPS: {                   // Add sit-ups
        name: 'Sit-ups',
        goals: [5, 10, 15, 20, 25],
        caloriesPerRep: 0.30
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
    
    // Initialize stats from localStorage
    initializeStats();
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
            } else if (isCurlMode) {
                message = "💪 Curl Mode Active";
            } else if (isSitupMode) {
                message = "🦾 Sit-up Mode Active";
            } else {
                message = "💪 Push-up Mode Active";
            }
            
            modeMessageDiv.textContent = message;
            modeMessageDiv.classList.add('active');
        }, 300);

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
const PLANK_ANGLE_THRESHOLD = 20; // More forgiving angle threshold
const PLANK_POSITION_MEMORY = []; // Store recent positions
const PLANK_MEMORY_SIZE = 10; // Number of positions to remember
const PLANK_MOVEMENT_THRESHOLD = 50; // More forgiving movement threshold
const PLANK_POSITION_CHECK_DELAY = 1000; // Wait 1 second before starting timer

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

                drawKeypoints(scaledKeypoints);
                drawSkeleton(scaledKeypoints);

                if (isSquatMode) {
                    processSquat(keypoints, 0.3);
                } else if (isPlankMode) {
                    processPlank(keypoints, 0.3);
                } else if (isCurlMode) {
                    processCurl(keypoints, 0.3);
                } else if (isSitupMode) {
                    processSitup(keypoints, 0.3);
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

// Update the handleExerciseCompletion function to handle all exercise types
function handleExerciseCompletion(exerciseType) {
    let count;
    switch (exerciseType) {
        case 'SQUATS':
            count = squatCount;
            break;
        case 'PUSHUPS':
            count = pushUpCount;
            break;
        case 'PLANK':
            count = plankCount;
            break;
        case 'CURLS':
            count = curlCount;
            break;
        case 'SITUPS':
            count = situpCount;
            break;
        default:
            count = 0;
    }
    
    // Update statistics
    dailyStats.exercises[exerciseType]++;
    totalStats.exercises[exerciseType]++;
    
    let caloriesBurned = 0;
    if (exerciseType === 'PLANK') {
        caloriesBurned = EXERCISES.PLANK.caloriesPerInterval * calculatePlankFormQuality();
        dailyStats.calories += caloriesBurned;
        totalStats.calories += caloriesBurned;
    } else {
        caloriesBurned = EXERCISES[exerciseType].caloriesPerRep;
        dailyStats.calories += caloriesBurned;
        totalStats.calories += caloriesBurned;
    }
    
    // Update both calorie displays
    updateCalorieCounter(caloriesBurned);
    
    // Save to localStorage
    saveStats();
    
    // Update the stats display if it's visible
    if (document.getElementById('profileStats').style.display === 'block') {
        updateStatsDisplay();
    }
    
    // Update progress bar based on target reps
    const progress = (count / targetReps[exerciseType]) * 100;
    document.querySelector('.progress-bar').style.width = `${Math.min(progress, 100)}%`;
    
    // Check if set is completed
    if (count === targetReps[exerciseType]) {
        EXERCISES[exerciseType].currentSet++;
        
        // Reset count for next set
        switch (exerciseType) {
            case 'SQUATS':
                squatCount = 0;
                break;
            case 'PUSHUPS':
                pushUpCount = 0;
                break;
            case 'PLANK':
                plankCount = 0;
                break;
            case 'CURLS':
                curlCount = 0;
                break;
            case 'SITUPS':
                situpCount = 0;
                break;
        }
        
        // Check if all sets are completed
        if (EXERCISES[exerciseType].currentSet >= EXERCISES[exerciseType].goalSets) {
            showMotivationalMessage();
            setTimeout(() => {
                document.getElementById('exerciseMenu').style.display = 'flex';
                document.getElementById('repsInput').style.display = 'none';
                document.getElementById('exerciseSelection').style.display = 'grid';
            }, 2000);
        } else {
            // Show "Set completed" message and reset progress bar
            showFormFeedback(`Set ${EXERCISES[exerciseType].currentSet} completed! Take a short break.`);
            document.querySelector('.progress-bar').style.width = '0%';
        }
    }
}

// Update the processPushUp function with more lenient checks
function processPushUp(keypoints, minConfidence) {
    // Get required keypoints
    const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
    const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');
    const leftElbow = keypoints.find(k => k.name === 'left_elbow');
    const rightElbow = keypoints.find(k => k.name === 'right_elbow');
    const leftWrist = keypoints.find(k => k.name === 'left_wrist');
    const rightWrist = keypoints.find(k => k.name === 'right_wrist');
    const leftHip = keypoints.find(k => k.name === 'left_hip');
    const rightHip = keypoints.find(k => k.name === 'right_hip');

    // More lenient keypoint check - only check upper body points
    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || 
        !leftWrist || !rightWrist || !leftHip || !rightHip ||
        leftShoulder.score < 0.2 || rightShoulder.score < 0.2 ||
        leftElbow.score < 0.2 || rightElbow.score < 0.2 ||
        leftWrist.score < 0.2 || rightWrist.score < 0.2) {
        return;
    }

    // Calculate body angles and positions
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // Calculate body alignment with more lenient checks
    const shoulderMidpoint = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2
    };
    const hipMidpoint = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2
    };

    // More lenient body angle check (45 degrees instead of 30)
    const bodyAngle = Math.abs(Math.atan2(
        hipMidpoint.y - shoulderMidpoint.y,
        hipMidpoint.x - shoulderMidpoint.x
    ) * 180 / Math.PI);
    
    const isBodyHorizontal = Math.abs(bodyAngle) < 45;

    // More lenient hand width check
    const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
    const handWidth = Math.abs(leftWrist.x - rightWrist.x);
    const isHandsProperWidth = handWidth >= shoulderWidth * 0.6 && handWidth <= shoulderWidth * 2.0;

    // Simplified wrist position check
    const areWristsBelowShoulders = 
        leftWrist.y > leftShoulder.y - 50 && 
        rightWrist.y > rightShoulder.y - 50;

    // Define push-up positions with more lenient criteria
    const isPushUpDown = (
        leftElbowAngle < 110 && 
        rightElbowAngle < 110 && 
        isBodyHorizontal && 
        isHandsProperWidth && 
        areWristsBelowShoulders
    );

    const isPushUpUp = (
        leftElbowAngle > 130 && 
        rightElbowAngle > 130 && 
        isBodyHorizontal && 
        isHandsProperWidth && 
        areWristsBelowShoulders
    );

    // Handle push-up state and counting
    if (isPushUpDown && !isPushUpInProgress) {
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
            showFormFeedback("Great form! Keep going!");
        } else {
            updateSlowDownMessage('PUSHUPS');
        }
    }

    // Simplified form feedback
    if (!isBodyHorizontal && isPushUpInProgress) {
        showFormFeedback(FORM_FEEDBACK.PUSHUPS.back);
    } else if (!isHandsProperWidth && isPushUpInProgress) {
        showFormFeedback(FORM_FEEDBACK.PUSHUPS.stance);
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

// Update the mode switch handler with correct mode cycling
modeSwitchButton.addEventListener('click', () => {
    document.getElementById('exerciseMenu').style.display = 'flex';
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
    counterDiv.textContent = `Squats: ${squatCount}${separator}` +
                           `Push-Ups: ${pushUpCount}${separator}` +
                           `Plank: ${plankCount}${separator}` +
                           `Curls: ${curlCount}${separator}` +
                           `Sit-ups: ${situpCount}`;
    counterDiv.style.whiteSpace = isMobile ? 'pre-line' : 'nowrap';
}

// Update the startPlankTimer function to position timer under the video
function startPlankTimer() {
    if (plankTimer) {
        return;
    }

    const timerDiv = document.createElement('div');
    timerDiv.id = 'plankTimer';
    timerDiv.style.cssText = `
        font-size: 2em;
        color: var(--primary-dark);
        text-align: center;
        margin-top: 20px;
        font-weight: bold;
    `;
    
    // Insert timer after the video container
    document.querySelector('.video-container').after(timerDiv);

    let timeLeft = EXERCISES.PLANK.interval;
    updatePlankTimer(timeLeft);

    plankTimer = setInterval(() => {
        if (!isPlankMode || !isPlankInProgress) {
            clearPlankTimer();
            return;
        }

        timeLeft -= 1000;
        updatePlankTimer(timeLeft);

        if (timeLeft <= 0) {
            plankCount++;
            handleExerciseCompletion('PLANK');
            showFormFeedback("Great job! Keep going!");
            timeLeft = EXERCISES.PLANK.interval;
            updateCounter();
        }
    }, 1000);
}

// Update the processPlank function
function processPlank(keypoints, minConfidence) {
    if (!isPlankMode) {
        clearPlankTimer();
        return;
    }

    // Check for required keypoints with more forgiving confidence threshold
    const requiredPoints = [
        'left_shoulder', 'right_shoulder',
        'left_elbow', 'right_elbow',
        'left_wrist', 'right_wrist',
        'left_hip', 'right_hip',
        'left_ankle', 'right_ankle'
    ].map(name => keypoints.find(k => k.name === name));

    if (requiredPoints.some(point => !point || point.score < 0.2)) {
        clearPlankTimer();
        isPlankInProgress = false;
        showFormFeedback(FORM_FEEDBACK.PLANK.start);
        return;
    }

    const [
        leftShoulder, rightShoulder,
        leftElbow, rightElbow,
        leftWrist, rightWrist,
        leftHip, rightHip,
        leftAnkle, rightAnkle
    ] = requiredPoints;

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

    // Check body alignment with more forgiving threshold
    const bodyLineAngle = Math.abs(Math.atan2(
        hipMidpoint.y - shoulderMidpoint.y,
        hipMidpoint.x - shoulderMidpoint.x
    ) * 180 / Math.PI);
    
    isBodyAligned = Math.abs(180 - bodyLineAngle) < PLANK_ANGLE_THRESHOLD;

    // Check elbow angles with more forgiving range
    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);
    areElbowsProperlyBent = (leftElbowAngle >= 60 && leftElbowAngle <= 120) && 
                           (rightElbowAngle >= 60 && rightElbowAngle <= 120);

    // More forgiving check for elbows under shoulders
    const leftElbowUnderShoulder = Math.abs(leftElbow.x - leftShoulder.x) < 100;
    const rightElbowUnderShoulder = Math.abs(rightElbow.x - rightShoulder.x) < 100;
    const areElbowsUnderShoulders = leftElbowUnderShoulder && rightElbowUnderShoulder;

    // More forgiving hip level check
    const hipToShoulderDist = Math.abs(hipMidpoint.y - shoulderMidpoint.y);
    const hipToAnkleDist = Math.abs(hipMidpoint.y - ankleMidpoint.y);
    const isHipLevel = Math.abs(hipToShoulderDist - hipToAnkleDist) < 100;

    // Simplified stability check
    PLANK_POSITION_MEMORY.push({...hipMidpoint, timestamp: Date.now()});
    if (PLANK_POSITION_MEMORY.length > PLANK_MEMORY_SIZE) {
        PLANK_POSITION_MEMORY.shift();
    }

    let isStable = true;
    if (PLANK_POSITION_MEMORY.length > 1) {
        const recentPositions = PLANK_POSITION_MEMORY.slice(-2);
        const movement = Math.sqrt(
            Math.pow(recentPositions[1].x - recentPositions[0].x, 2) +
            Math.pow(recentPositions[1].y - recentPositions[0].y, 2)
        );
        isStable = movement < PLANK_MOVEMENT_THRESHOLD;
    }

    const isInPlankPosition = areElbowsProperlyBent && isBodyAligned && 
                            areElbowsUnderShoulders && isHipLevel && isStable;

    // Handle plank state
    if (isInPlankPosition) {
        if (!isPlankInProgress) {
            // Start a short delay before starting the timer
            setTimeout(() => {
                if (isPlankMode && !isPlankInProgress) {
                    isPlankInProgress = true;
                    startPlankTimer();
                    showFormFeedback("Great plank form! Hold it!");
                }
            }, PLANK_POSITION_CHECK_DELAY);
        }
    } else {
        if (isPlankInProgress) {
            clearPlankTimer();
            isPlankInProgress = false;
            PLANK_POSITION_MEMORY.length = 0;
        }

        // Show specific feedback based on what's wrong
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
    },
    CURLS: {
        start: "Stand straight with arms down!",
        elbows: "Keep elbows close to body!",
        range: "Full range of motion!",
        speed: "Control the movement!",
        stance: "Keep your stance steady!"
    },
    SITUPS: {
        start: "Lie on your back with knees bent!",
        form: "Keep your core engaged!",
        range: "Lift your upper body more!",
        speed: "Control the movement!",
        neck: "Keep your neck neutral!"
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

// Add to the state variables section
let isCurlMode = false;
let isSitupMode = false;
let curlCount = 0;
let situpCount = 0;
let isCurlInProgress = false;
let isSitupInProgress = false;
let lastCurlTime = 0;
let lastSitupTime = 0;
const minCurlDelay = 1500;  // Minimum time between curls
const minSitupDelay = 2000; // Minimum time between sit-ups

// Add the curl detection function
function processCurl(keypoints, minConfidence) {
    const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
    const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');
    const leftElbow = keypoints.find(k => k.name === 'left_elbow');
    const rightElbow = keypoints.find(k => k.name === 'right_elbow');
    const leftWrist = keypoints.find(k => k.name === 'left_wrist');
    const rightWrist = keypoints.find(k => k.name === 'right_wrist');

    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow || 
        !leftWrist || !rightWrist ||
        leftShoulder.score < 0.2 || rightShoulder.score < 0.2 ||
        leftElbow.score < 0.2 || rightElbow.score < 0.2 ||
        leftWrist.score < 0.2 || rightWrist.score < 0.2) {
        return;
    }

    const leftElbowAngle = calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = calculateAngle(rightShoulder, rightElbow, rightWrist);

    // Check if elbows are close to body
    const leftElbowAlignment = Math.abs(leftElbow.x - leftShoulder.x);
    const rightElbowAlignment = Math.abs(rightElbow.x - rightShoulder.x);
    const areElbowsAligned = leftElbowAlignment < 100 && rightElbowAlignment < 100;

    // Define curl positions
    const isCurlDown = (leftElbowAngle > 150 || rightElbowAngle > 150) && areElbowsAligned;
    const isCurlUp = (leftElbowAngle < 60 || rightElbowAngle < 60) && areElbowsAligned;

    if (isCurlDown && !isCurlInProgress) {
        isCurlInProgress = true;
        showFormFeedback("Good! Now curl up!");
    }

    if (isCurlUp && isCurlInProgress) {
        const currentTime = Date.now();
        if (currentTime - lastCurlTime >= minCurlDelay) {
            curlCount++;
            lastCurlTime = currentTime;
            updateCounter();
            isCurlInProgress = false;
            handleExerciseCompletion('CURLS');
            showFormFeedback("Great form! Keep going!");
        } else {
            updateSlowDownMessage('CURLS');
        }
    }

    // Form feedback
    if (!areElbowsAligned && isCurlInProgress) {
        showFormFeedback(FORM_FEEDBACK.CURLS.elbows);
    }
}

// Add the sit-up detection function
function processSitup(keypoints, minConfidence) {
    const leftShoulder = keypoints.find(k => k.name === 'left_shoulder');
    const rightShoulder = keypoints.find(k => k.name === 'right_shoulder');
    const leftHip = keypoints.find(k => k.name === 'left_hip');
    const rightHip = keypoints.find(k => k.name === 'right_hip');
    const leftKnee = keypoints.find(k => k.name === 'left_knee');
    const rightKnee = keypoints.find(k => k.name === 'right_knee');

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip || 
        !leftKnee || !rightKnee ||
        leftShoulder.score < 0.2 || rightShoulder.score < 0.2 ||
        leftHip.score < 0.2 || rightHip.score < 0.2 ||
        leftKnee.score < 0.2 || rightKnee.score < 0.2) {
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

    // Calculate angle between shoulders and hips
    const torsoAngle = Math.abs(Math.atan2(
        shoulderMidpoint.y - hipMidpoint.y,
        shoulderMidpoint.x - hipMidpoint.x
    ) * 180 / Math.PI);

    // Define sit-up positions
    const isSitupDown = torsoAngle < 30;  // Nearly horizontal
    const isSitupUp = torsoAngle > 60;    // More upright position

    if (isSitupDown && !isSitupInProgress) {
        isSitupInProgress = true;
        showFormFeedback("Good! Now sit up!");
    }

    if (isSitupUp && isSitupInProgress) {
        const currentTime = Date.now();
        if (currentTime - lastSitupTime >= minSitupDelay) {
            situpCount++;
            lastSitupTime = currentTime;
            updateCounter();
            isSitupInProgress = false;
            handleExerciseCompletion('SITUPS');
            showFormFeedback("Great form! Keep going!");
        } else {
            updateSlowDownMessage('SITUPS');
        }
    }

    // Form feedback
    if (!isSitupDown && !isSitupUp && isSitupInProgress) {
        showFormFeedback(FORM_FEEDBACK.SITUPS.range);
    }
}

// Add to the top of the file with other state variables
let currentExercise = 'SQUATS';
let targetReps = {
    SQUATS: 5,
    PUSHUPS: 5,
    PLANK: 5,
    CURLS: 5,
    SITUPS: 5
};

// Add this function to handle exercise selection
function selectExercise(exercise, reps, goalSets = 1) {
    // Reset all modes
    isSquatMode = false;
    isPlankMode = false;
    isCurlMode = false;
    isSitupMode = false;
    
    // Set the target reps and goal sets
    targetReps[exercise] = reps;
    EXERCISES[exercise].goalSets = goalSets;
    EXERCISES[exercise].currentSet = 0;
    
    // Set the appropriate mode
    switch(exercise) {
        case 'SQUATS':
            isSquatMode = true;
            showFormFeedback(FORM_FEEDBACK.SQUATS.start);
            break;
        case 'PUSHUPS':
            showFormFeedback(FORM_FEEDBACK.PUSHUPS.start);
            break;
        case 'PLANK':
            isPlankMode = true;
            showFormFeedback(FORM_FEEDBACK.PLANK.start);
            break;
        case 'CURLS':
            isCurlMode = true;
            showFormFeedback(FORM_FEEDBACK.CURLS.start);
            break;
        case 'SITUPS':
            isSitupMode = true;
            showFormFeedback(FORM_FEEDBACK.SITUPS.start);
            break;
    }
    
    currentExercise = exercise;
    
    // Reset states
    isSquatInProgress = false;
    isPushUpInProgress = false;
    isPlankInProgress = false;
    isCurlInProgress = false;
    isSitupInProgress = false;
    isProcessingFrame = false;
    PLANK_POSITION_MEMORY.length = 0;
    clearPlankTimer();
    
    // Update UI
    updateModeMessage();
    updateCounter();
    document.getElementById('exerciseMenu').style.display = 'none';
    
    // Reset progress bar
    document.querySelector('.progress-bar').style.width = '0%';
}

// Add these functions to handle localStorage
function initializeStats() {
    // Try to load stats from localStorage
    const savedDailyStats = localStorage.getItem('dailyStats');
    const savedTotalStats = localStorage.getItem('totalStats');
    const lastDate = localStorage.getItem('lastExerciseDate');
    const today = new Date().toDateString();

    // Initialize total stats
    if (savedTotalStats) {
        totalStats = JSON.parse(savedTotalStats);
    }

    // Check if it's a new day
    if (lastDate !== today) {
        // Reset daily stats for new day
        dailyStats = {
            calories: 0,
            exercises: {
                SQUATS: 0,
                PUSHUPS: 0,
                PLANK: 0,
                CURLS: 0,
                SITUPS: 0
            }
        };
        localStorage.setItem('lastExerciseDate', today);
    } else {
        // Load saved daily stats
        dailyStats = savedDailyStats ? JSON.parse(savedDailyStats) : {
            calories: 0,
            exercises: {
                SQUATS: 0,
                PUSHUPS: 0,
                PLANK: 0,
                CURLS: 0,
                SITUPS: 0
            }
        };
    }

    // Update the display
    updateStatsDisplay();
}

function saveStats() {
    localStorage.setItem('dailyStats', JSON.stringify(dailyStats));
    localStorage.setItem('totalStats', JSON.stringify(totalStats));
}

// Update the handleExerciseCompletion function
function handleExerciseCompletion(exerciseType) {
    let count;
    switch (exerciseType) {
        case 'SQUATS':
            count = squatCount;
            break;
        case 'PUSHUPS':
            count = pushUpCount;
            break;
        case 'PLANK':
            count = plankCount;
            break;
        case 'CURLS':
            count = curlCount;
            break;
        case 'SITUPS':
            count = situpCount;
            break;
        default:
            count = 0;
    }
    
    // Update statistics
    dailyStats.exercises[exerciseType]++;
    totalStats.exercises[exerciseType]++;
    
    let caloriesBurned = 0;
    if (exerciseType === 'PLANK') {
        caloriesBurned = EXERCISES.PLANK.caloriesPerInterval * calculatePlankFormQuality();
        dailyStats.calories += caloriesBurned;
        totalStats.calories += caloriesBurned;
    } else {
        caloriesBurned = EXERCISES[exerciseType].caloriesPerRep;
        dailyStats.calories += caloriesBurned;
        totalStats.calories += caloriesBurned;
    }
    
    // Update both calorie displays
    updateCalorieCounter(caloriesBurned);
    
    // Save to localStorage
    saveStats();
    
    // Update the stats display if it's visible
    if (document.getElementById('profileStats').style.display === 'block') {
        updateStatsDisplay();
    }
    
    // Update progress bar based on target reps
    const progress = (count / targetReps[exerciseType]) * 100;
    document.querySelector('.progress-bar').style.width = `${Math.min(progress, 100)}%`;
    
    // Check if set is completed
    if (count === targetReps[exerciseType]) {
        EXERCISES[exerciseType].currentSet++;
        
        // Reset count for next set
        switch (exerciseType) {
            case 'SQUATS':
                squatCount = 0;
                break;
            case 'PUSHUPS':
                pushUpCount = 0;
                break;
            case 'PLANK':
                plankCount = 0;
                break;
            case 'CURLS':
                curlCount = 0;
                break;
            case 'SITUPS':
                situpCount = 0;
                break;
        }
        
        // Check if all sets are completed
        if (EXERCISES[exerciseType].currentSet >= EXERCISES[exerciseType].goalSets) {
            showMotivationalMessage();
            setTimeout(() => {
                document.getElementById('exerciseMenu').style.display = 'flex';
                document.getElementById('repsInput').style.display = 'none';
                document.getElementById('exerciseSelection').style.display = 'grid';
            }, 2000);
        } else {
            // Show "Set completed" message and reset progress bar
            showFormFeedback(`Set ${EXERCISES[exerciseType].currentSet} completed! Take a short break.`);
            document.querySelector('.progress-bar').style.width = '0%';
        }
    }
}

let selectedExercise = null;

function showRepsInput(exercise) {
    selectedExercise = exercise;
    const exerciseSelection = document.getElementById('exerciseSelection');
    const repsInput = document.getElementById('repsInput');
    const repsTimeInput = document.getElementById('repsTimeInput');
    const selectedExerciseTitle = document.getElementById('selectedExerciseTitle');
    
    // Update title with emoji
    const emojis = {
        'SQUATS': '🏋️ Squats',
        'PUSHUPS': '💪 Push-ups',
        'PLANK': '🧘 Plank',
        'CURLS': '💪 Curls',
        'SITUPS': '🦾 Sit-ups'
    };
    
    selectedExerciseTitle.textContent = emojis[exercise];
    
    // Show goal question first
    repsTimeInput.innerHTML = `
        <div class="goal-question">
            <h4>Do you have a target goal?</h4>
            <div class="button-group">
                <button onclick="showGoalInput('${exercise}')">Yes</button>
                <button onclick="showRegularInput('${exercise}')">No</button>
            </div>
        </div>
    `;
    
    exerciseSelection.style.display = 'none';
    repsInput.style.display = 'block';
}

function showGoalInput(exercise) {
    const repsTimeInput = document.getElementById('repsTimeInput');
    
    if (exercise === 'PLANK') {
        repsTimeInput.innerHTML = `
            <div class="plank-inputs">
                <div class="input-group">
                    <input type="number" min="5" max="300" value="30" id="plankTime">
                    <span>seconds per plank</span>
                </div>
                <div class="input-group">
                    <input type="number" min="1" max="10" value="3" id="plankReps">
                    <span>reps</span>
                </div>
                <div class="input-group">
                    <input type="number" min="1" max="100" value="10" id="goalReps">
                    <span>goal sets</span>
                </div>
            </div>
        `;
    } else {
        repsTimeInput.innerHTML = `
            <div class="input-group">
                <input type="number" min="1" max="50" value="5" id="repsCount">
                <span>reps per set</span>
            </div>
            <div class="input-group">
                <input type="number" min="1" max="100" value="10" id="goalReps">
                <span>goal sets</span>
            </div>
        `;
    }
}

function showRegularInput(exercise) {
    const repsTimeInput = document.getElementById('repsTimeInput');
    
    if (exercise === 'PLANK') {
        repsTimeInput.innerHTML = `
            <div class="plank-inputs">
                <div class="input-group">
                    <input type="number" min="5" max="300" value="30" id="plankTime">
                    <span>seconds per plank</span>
                </div>
                <div class="input-group">
                    <input type="number" min="1" max="10" value="3" id="plankReps">
                    <span>reps</span>
                </div>
            </div>
        `;
    } else {
        repsTimeInput.innerHTML = `
            <div class="input-group">
                <input type="number" min="1" max="50" value="5" id="repsCount">
                <span>reps</span>
            </div>
        `;
    }
}

function startExercise() {
    const hasGoal = document.getElementById('goalReps') !== null;
    
    if (selectedExercise === 'PLANK') {
        const plankTime = parseInt(document.getElementById('plankTime').value);
        const plankReps = parseInt(document.getElementById('plankReps').value);
        const goalReps = hasGoal ? parseInt(document.getElementById('goalReps').value) : 1;
        
        // Convert seconds to intervals and multiply by reps
        const totalIntervals = Math.ceil(plankTime / 10) * plankReps;
        selectExercise(selectedExercise, totalIntervals, goalReps);
        // Store the time per plank for the timer display
        EXERCISES.PLANK.interval = plankTime * 1000; // Convert to milliseconds
    } else {
        const repsCount = parseInt(document.getElementById('repsCount').value);
        const goalReps = hasGoal ? parseInt(document.getElementById('goalReps').value) : 1;
        selectExercise(selectedExercise, repsCount, goalReps);
    }
}

// Add these variables at the top with other state variables
let dailyStats = {
    calories: 0,
    exercises: {
        SQUATS: 0,
        PUSHUPS: 0,
        PLANK: 0,
        CURLS: 0,
        SITUPS: 0
    }
};

let totalStats = {
    calories: 0,
    exercises: {
        SQUATS: 0,
        PUSHUPS: 0,
        PLANK: 0,
        CURLS: 0,
        SITUPS: 0
    }
};

// Add this function to toggle the stats panel
function toggleProfileStats() {
    const statsPanel = document.getElementById('profileStats');
    const isVisible = statsPanel.style.display === 'block';
    statsPanel.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible) {
        updateStatsDisplay();
    }
}

// Add this function to update the statistics display
function updateStatsDisplay() {
    document.getElementById('todayCalories').textContent = `${dailyStats.calories.toFixed(1)} cal`;
    document.getElementById('totalCalories').textContent = `${totalStats.calories.toFixed(1)} cal`;
    
    const todayExercises = document.getElementById('todayExercises');
    const totalExercises = document.getElementById('totalExercises');
    
    todayExercises.innerHTML = Object.entries(dailyStats.exercises)
        .map(([exercise, count]) => `<div>${EXERCISES[exercise].name}: ${count}</div>`)
        .join('');
    
    totalExercises.innerHTML = Object.entries(totalStats.exercises)
        .map(([exercise, count]) => `<div>${EXERCISES[exercise].name}: ${count}</div>`)
        .join('');
}