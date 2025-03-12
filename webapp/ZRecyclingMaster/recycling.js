// Recycling Master - Reorganized JavaScript Code (Backend Connection Priority)

document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const mainScreen = document.getElementById('mainScreen');
    const scanScreen = document.getElementById('scanScreen');
    const scanBtn = document.getElementById('scanBtn');
    const backBtn = document.getElementById('backBtn');
    const locationBtns = document.querySelectorAll('.location-btn');
    const locationModal = document.getElementById('locationModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalTitle = document.getElementById('modalTitle');
    const zipcodeValue = document.getElementById('zipcodeValue');
    const navigateBtn = document.getElementById('navigateBtn');
    const resultOverlay = document.getElementById('resultOverlay');
    const resultContent = document.getElementById('resultContent');
    const resultPrimaryBtn = document.getElementById('resultPrimaryBtn');
    const resultSecondaryBtn = document.getElementById('resultSecondaryBtn');
    const pointsDisplay = document.getElementById('pointsDisplay');
    
    // User Data
    let userData = {
        points: 0,
        lastScanDate: '',
    };
    
    // ********************* PART1  Backend Connection *******************
    // API Configuration
    const API_BASE_URL = '/recycling';
    const API_ENDPOINTS = {
        SCAN_QR: '/scan/',
        GET_USER_INFO: '/user/info/'
    };
    
    // Fetch user data from the server
    async function fetchUserData() {
        try {
            const response = await fetch(API_BASE_URL + API_ENDPOINTS.GET_USER_INFO);
            if (response.ok) {
                // Parse response text into key-value pairs
                const responseText = await response.text();
                const userDataPairs = responseText.split('&');
                const userData = {};
                
                userDataPairs.forEach(pair => {
                    const [key, value] = pair.split('=');
                    if (key === 'points') {
                        userData.points = parseInt(value) || 0;
                    } else if (key === 'lastScanDate') {
                        userData.lastScanDate = value || '';
                    }
                });
                
                // Update local user data
                updateUserPoints(userData.points);
            } else {
                console.error('Failed to fetch user data:', await response.text());
                // Default to initial values if API call fails
                userData = {
                    points: 0,
                    lastScanDate: '',
                };
                updateUserPoints(userData.points);
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
            userData = {
                points: 0,
                lastScanDate: '',
            };
            updateUserPoints(userData.points);
        }
    }

    // Process scanned QR code with backend
    async function processQRCode(qrData) {
        console.log("Processing QR data: ", qrData);
        
        try {
            const formData = new FormData();
            formData.append('qrCode', qrData);
            
            const response = await fetch(API_BASE_URL + API_ENDPOINTS.SCAN_QR, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                console.error('Server error:', response.status);
                showInvalidQR();
                return;
            }
            
            const responseText = await response.text();
            const responseParts = responseText.split('&');
            const result = {};
            
            responseParts.forEach(part => {
                const [key, value] = part.split('=');
                result[key] = value;
            });
            
            console.log("Scan result:", result);
            
            if (result.status === 'success') {
                // Update user points
                userData.points = parseInt(result.points || 0);
                userData.lastScanDate = result.lastScanDate || '';
                const pointsEarned = parseInt(result.pointsEarned || 10);
                updateUserPoints(userData.points);
                showSuccess(pointsEarned);
            } else if (result.status === 'already_scanned_today') {
                showAlreadyCompleted(); // Using the existing function with updated content
            } else if (result.status === 'invalid') {
                showInvalidQR();
            } else {
                showInvalidQR();
            }
        } catch (error) {
            console.error("Error processing QR code with backend:", error);
            showInvalidQR();
        }
    }
    // *************** PART2 Camera and QR Code Scanning  ********************
    
    // Camera Variables
    let videoElement;
    let canvasElement;
    let canvasContext;
    let scannerIsRunning = false;
    

    scanBtn.addEventListener('click', function() {
        this.classList.add('clicked');
        setTimeout(() => {
            this.classList.remove('clicked');
            mainScreen.classList.add('hidden');
            scanScreen.classList.add('active');
            
            if (!videoElement) {
                initCamera();
            } else {
                startScanner();
            }
        }, 200);
    });
    
    // Initialize camera
    function initCamera() {
        videoElement = document.createElement('video');
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        
        canvasElement = document.createElement('canvas');
        canvasContext = canvasElement.getContext('2d');
        
        // Add video element to camera view
        const cameraView = document.querySelector('.camera-view');
        cameraView.appendChild(videoElement);
        
        startScanner();
    }
    
    // Start the QR scanner
    function startScanner() {
        scannerIsRunning = true;
        
        // Check if getUserMedia is supported
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Request camera permission
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
                .then(function(stream) {
                    videoElement.srcObject = stream;
                    videoElement.setAttribute("playsinline", true); // Required for iOS
                    videoElement.play();

                    scanQRCode();
                })
                .catch(function(error) {
                    console.error("Camera access failed: ", error);
                    showCameraError();
                });
        } else {
            console.error("Browser doesn't support getUserMedia");
            showCameraError();
        }
    }
    
    // Stop the scanner
    function stopScanner() {
        scannerIsRunning = false;
        
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => {
                track.stop();
            });
            videoElement.srcObject = null;
        }
    }
    
    // Scan for QR codes
    function scanQRCode() {
        if (!scannerIsRunning) return;
        
        // Set timer to periodically check video frames for QR codes
        requestAnimationFrame(function checkFrame() {
            if (!scannerIsRunning) return;
            
            if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                const width = videoElement.videoWidth;
                const height = videoElement.videoHeight;
                
                canvasElement.width = width;
                canvasElement.height = height;
                
                canvasContext.drawImage(videoElement, 0, 0, width, height);
                
                const imageData = canvasContext.getImageData(0, 0, width, height);
                
                try {
                    // Use jsQR library (if loaded) to decode QR code
                    if (typeof jsQR === 'function') {
                        const code = jsQR(imageData.data, width, height);
                        
                        if (code) {
                            console.log("QR Code content: ", code.data);
                        
                            stopScanner();
                            
                            processQRCode(code.data);
                            return;
                        }
                    } else {
                        console.error("jsQR library not loaded");
                    }
                } catch (error) {
                    console.error("QR code scanning error: ", error);
                }
                
                requestAnimationFrame(checkFrame);
            } else {
                requestAnimationFrame(checkFrame);
            }
        });
    }
    
    // ******************** PART3 UI Interaction ********************
    
    // Show camera error message
    function showCameraError() {
        resultContent.className = 'result-content error';
        resultContent.querySelector('.result-icon i').className = 'fas fa-camera-retro';
        resultContent.querySelector('.result-title').textContent = 'Camera Error';
        resultContent.querySelector('.result-message').textContent = 'Unable to access your camera. Please check permissions and try again.';
        resultPrimaryBtn.textContent = 'Return Home';
        resultSecondaryBtn.style.display = 'none';
        
        resultPrimaryBtn.onclick = function() {
            resultOverlay.classList.remove('active');
            scanScreen.classList.remove('active');
            mainScreen.classList.remove('hidden');
        };
        
        resultOverlay.classList.add('active');
    }
    
    // effect for success
    function createConfetti() {
        const confettiCount = 100;
        const container = document.querySelector('.result-overlay');
        

        const existingConfetti = document.querySelectorAll('.confetti');
        existingConfetti.forEach(c => c.remove());
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            
            const left = Math.random() * 100;
            const top = Math.random() * -10 - 20;
            const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
            
            confetti.style.left = `${left}%`;
            confetti.style.top = `${top}px`;
            confetti.style.backgroundColor = color;
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            // Animation
            confetti.style.animation = `fall ${3 + Math.random() * 5}s linear forwards`;
            confetti.style.opacity = '1';
            
            const keyframes = `
                @keyframes fall {
                    0% {
                        transform: translateY(0) rotate(${Math.random() * 360}deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(${window.innerHeight * 1.5}px) rotate(${Math.random() * 720}deg);
                        opacity: 0;
                    }
                }
            `;
            
            const styleElement = document.createElement('style');
            styleElement.textContent = keyframes;
            document.head.appendChild(styleElement);
            
            container.appendChild(confetti);
        }
    }
    
    // Show success result
    function showSuccess(pointsEarned = 10) {
        resultContent.className = 'result-content success';
        resultContent.querySelector('.result-icon i').className = 'fas fa-check-circle';
        resultContent.querySelector('.result-title').textContent = 'Success!';
        resultContent.querySelector('.result-message').textContent = `You've earned ${pointsEarned} points for recycling! Every bin helps save our planet.`;
        resultPrimaryBtn.textContent = 'Return Home';
        resultSecondaryBtn.style.display = 'none';
        
        //confetti effect
        createConfetti();
        
        resultPrimaryBtn.onclick = function() {
            resultOverlay.classList.remove('active');
            scanScreen.classList.remove('active');
            mainScreen.classList.remove('hidden');
        };
        
        resultOverlay.classList.add('active');
    }
    
    // Show invalid QR code result
    function showInvalidQR() {
        resultContent.className = 'result-content error';
        resultContent.querySelector('.result-icon i').className = 'fas fa-times-circle';
        resultContent.querySelector('.result-title').textContent = 'Invalid QR Code';
        resultContent.querySelector('.result-message').textContent = 'Please scan an official recycling bin QR code. This code was not recognized.';
        resultPrimaryBtn.textContent = 'Try Again';
        resultSecondaryBtn.textContent = 'Return Home';
        resultSecondaryBtn.style.display = 'block';
        
        resultPrimaryBtn.onclick = function() {
            resultOverlay.classList.remove('active');
            startScanner();
        };
        
        resultSecondaryBtn.onclick = function() {
            resultOverlay.classList.remove('active');
            scanScreen.classList.remove('active');
            mainScreen.classList.remove('hidden');
        };
        
        resultOverlay.classList.add('active');
    }
    
    // Show already completed task result
    // 显示已完成任务结果 (修改为每日限制)
    function showAlreadyCompleted() {
        resultContent.className = 'result-content warning';
        resultContent.querySelector('.result-icon i').className = 'fas fa-exclamation-circle';
        resultContent.querySelector('.result-title').textContent = 'Already Scanned Today';
        resultContent.querySelector('.result-message').textContent = 'You have already earned points today. Come back tomorrow!';
        resultPrimaryBtn.textContent = 'Return Home';
        resultSecondaryBtn.style.display = 'none';
        
        resultPrimaryBtn.onclick = function() {
            resultOverlay.classList.remove('active');
            scanScreen.classList.remove('active');
            mainScreen.classList.remove('hidden');
        };
        
        resultOverlay.classList.add('active');
    }
    
    // Return to main screen
    backBtn.addEventListener('click', function() {
        stopScanner();
        mainScreen.classList.remove('hidden');
        scanScreen.classList.remove('active');
        resultOverlay.classList.remove('active');
    });
    
    // Show location details
    locationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const location = this.dataset.location;
            const zipcode = this.dataset.zipcode;
            const icon = this.dataset.icon || 'fa-recycle';
            
            modalTitle.textContent = location;
            zipcodeValue.textContent = zipcode;
            navigateBtn.href = `https://maps.google.com/?q=${encodeURIComponent(location)}`;
            
            const modalDetails = document.querySelectorAll('.location-detail');
            if (modalDetails.length >= 3) {
                const binCount = Math.floor(Math.random() * 6) + 1; // Random number of bins between 1-6
                modalDetails[1].querySelector('span').textContent = `${binCount} bins available`;
            }
            
            locationModal.classList.add('active');
        });
    });
    
    // Close location details by clicking btn or outside
    closeModalBtn.addEventListener('click', function() {
        locationModal.classList.remove('active');
    });
    
  
    locationModal.addEventListener('click', function(e) {
        if (e.target === locationModal) {
            locationModal.classList.remove('active');
        }
    });
    
    // Update user points display
    function updateUserPoints(points) {
        pointsDisplay.textContent = points + ' points';
        pointsDisplay.classList.add('points-updated');
        setTimeout(() => {
            pointsDisplay.classList.remove('points-updated');
        }, 1000);
    }
    
    // Initialize application
    function init() {
        fetchUserData();
        
        document.body.addEventListener('touchstart', function() {
        }, false);
    }
   
    init();
});

//  CSS animation class
document.head.insertAdjacentHTML('beforeend', `
    <style>
        @keyframes points-pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
        }
        
        @keyframes points-updated {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); color: #FFD700; }
            100% { transform: scale(1); }
        }
        
        .animate-in {
            animation: fadeInUp 0.5s ease forwards;
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .location-btn {
            opacity: 1;
        }
        
        .scan-btn.clicked {
            transform: scale(0.95);
        }
        
        .points-updated {
            animation: points-updated 0.8s ease;
        }
    </style>
`);