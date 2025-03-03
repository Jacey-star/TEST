document.addEventListener('DOMContentLoaded', function() {
    // Core application state variables
    let map, trackPolyline, userMarker;
    let trackPoints = [];
    let lastPosition = null;
    let distance = 0;
    let startTime = null;
    let timerInterval = null;
    let watchId = null;
    let isTracking = false;
    let isPaused = false;
    let sessionId = null;
    let wakeLock = null;
    
    // Initialize map
    function initMap() {
        const defaultPosition = [51.6231, 3.9447];
        
        // Initialize map
        map = L.map('map');
        
        // Add map layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // Create route layer
        trackPolyline = L.polyline([], {
            color: '#4CAF50',
            weight: 5,
            opacity: 0.7
        }).addTo(map);
        
        // Try to get user's location
        if (navigator.geolocation) {
            showAlert('Getting your location...');
            
            navigator.geolocation.getCurrentPosition(
                // Success
                position => {
                    const userLocation = [position.coords.latitude, position.coords.longitude];
                    map.setView(userLocation, 16);
                    
                    userMarker = L.marker(userLocation).addTo(map);
                    showAlert('Located your position');
                },
                // Error
                error => {
                    console.error('Failed to get location', error);
                    map.setView(defaultPosition, 12);
                    showAlert('Unable to get your location');
                }
            );
        } else {
            map.setView(defaultPosition, 12);
            showAlert('Your browser does not support geolocation');
        }
    }
    
    // 请求保持屏幕唤醒（如果浏览器支持）
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.error('Wake Lock error:', err);
            }
        }
    }
    
    // 释放屏幕唤醒锁
    function releaseWakeLock() {
        if (wakeLock !== null) {
            wakeLock.release()
              .then(() => {
                wakeLock = null;
              });
        }
    }
    
    // Start tracking
    function startTracking() {
        if (!navigator.geolocation) {
            showAlert('Your browser does not support geolocation');
            return;
        }
        
        // If not resuming from pause, reset data
        if (!isPaused) {
            distance = 0;
            trackPoints = [];
            trackPolyline.setLatLngs([]);
            updateDistanceDisplay();
            startTime = new Date();
            sessionId = 'session_' + Date.now();
        }
        
        isTracking = true;
        isPaused = false;
        
        // 防止屏幕睡眠（如果支持）
        requestWakeLock();
        
        // Update button states
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('stopBtn').disabled = false;
        
        // Start timer
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        
        // Start GPS tracking
        watchId = navigator.geolocation.watchPosition(
            updatePosition,
            error => {
                showAlert('Location tracking error: ' + error.message);
                console.error('Tracking error:', error);
            },
            { enableHighAccuracy: true }
        );
    }
    
    // Pause tracking
    function pauseTracking() {
        if (!isTracking) return;
        
        isTracking = false;
        isPaused = true;
        
        // Stop location monitoring
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        
        // Stop timer
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // 释放唤醒锁
        releaseWakeLock();
        
        // Update button states
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
    }
    
    // End tracking
    function stopTracking() {
        // If tracking, stop first
        if (isTracking) {
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            
            // 释放唤醒锁
            releaseWakeLock();
        }
        
        isTracking = false;
        isPaused = false;
        
        // Update button states
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('stopBtn').disabled = true;
        
        // Collect trip data
        const tripData = {
            sessionId: sessionId,
            startTime: startTime,
            endTime: new Date(),
            distance: distance,
            duration: startTime ? (new Date() - startTime) : 0,
            isCompleted: distance >= 3,
            pointsEarned: distance >= 3 ? 30 : 0
        };
        
        // Save to history
        saveToHistory(tripData);
        
        // Show completion status
        if (distance >= 3) {
            showCompletionSuccess();
        } else {
            showCompletionFailure();
        }
    }
    
    // Position update handler
    function updatePosition(position) {
        const currentPosition = [position.coords.latitude, position.coords.longitude];
        
        // Update user position marker
        if (userMarker) {
            userMarker.setLatLng(currentPosition);
        } else {
            userMarker = L.marker(currentPosition).addTo(map);
        }
        
        // Add point to route
        trackPoints.push({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date().toISOString()
        });
        
        trackPolyline.addLatLng(currentPosition);
        
        // Update map view to keep user centered
        map.setView(currentPosition);
        
        // Calculate distance from last point
        if (lastPosition) {
            const segmentDistance = calculateDistance(
                lastPosition[0], lastPosition[1],
                currentPosition[0], currentPosition[1]
            );
            
            // Add to total distance (convert to km)
            distance += segmentDistance / 1000;
            updateDistanceDisplay();
            
            // Update speed display
            updateSpeedDisplay(position.coords.speed);
        }
        
        lastPosition = currentPosition;
    }
    
    // Calculate distance between two points (Haversine formula)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; // Distance in meters
    }
    
    function toRad(degrees) {
        return degrees * Math.PI / 180;
    }
    
    // Update distance display
    function updateDistanceDisplay() {
        document.getElementById('distanceText').textContent = distance.toFixed(1);
    }
    
    // Update speed display
    function updateSpeedDisplay(speed) {
        let displaySpeed = 0;
        
        if (speed) {
            displaySpeed = speed * 3.6; // Convert to km/h
        }
        
        document.getElementById('speedValue').textContent = displaySpeed.toFixed(1);
    }
    
    // Update timer
    function updateTimer() {
        if (!startTime) return;
        
        const elapsedTime = new Date(new Date() - startTime);
        const minutes = elapsedTime.getUTCMinutes().toString().padStart(2, '0');
        const seconds = elapsedTime.getUTCSeconds().toString().padStart(2, '0');
        
        document.getElementById('timeValue').textContent = `${minutes}:${seconds}`;
    }
    
    // Show alert message
    function showAlert(message, duration = 3000) {
        const alert = document.getElementById('alert');
        
        // Automatically determine message type based on content
        let type = 'info'; // Default type
        
        // Success type determination
        if (message.includes('Congratulation') || 
            message.includes('Located') ||
            message.includes('complete') || 
            message.includes('position') ||
            message.includes('granted')) {
            type = 'success';
        } 
        // Error type determination
        else if (message.includes('error') || 
                message.includes('failed') || 
                message.includes('Unable') ||
                message.includes('denied') ||
                message.includes('does not support')) {
            type = 'error';
        } 
        // Warning type determination
        else if (message.includes('Please') || 
                message.includes('please') ||
                message.includes('did not reach') ||
                message.includes('calibrated') ||
                message.includes('timed out')) {
            type = 'warning';
        }
        
        // Set type attribute
        alert.setAttribute('data-type', type);
        
        // Set progress bar animation duration
        document.documentElement.style.setProperty('--alert-duration', `${duration}ms`);
        
        // Set message content
        alert.textContent = message;
        
        // Show the alert
        alert.classList.add('show');
        
        // Auto-hide the alert
        setTimeout(() => {
            alert.classList.remove('show');
        }, duration);
    }
    
    // Show completion success
    function showCompletionSuccess() {
        const successPopupContent = `
            <div style="text-align: center;">
                <h3 style="margin: 5px 0 10px 0;">Congratulations!</h3>
                <div style="color:rgb(255, 255, 255); font-size: 28px; margin: 10px 0;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <p style="margin: 10px 0;">You have completed the green travel challenge and earned 30 points!</p>
            </div>
        `;
        
        L.popup()
            .setLatLng(userMarker.getLatLng())
            .setContent(successPopupContent)
            .openOn(map);
    }
    
    // Show completion failure
    function showCompletionFailure() {
        const failurePopupContent = `
            <div style="text-align: center;">
                <h3 style="margin: 5px 0 10px 0;">Almost There!</h3>
                <div style="color:rgb(255, 255, 255); font-size: 28px; margin: 10px 0;">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <p style="margin: 10px 0;">Activity recorded, but distance did not reach 3km. No points earned this time.</p>
                <p style="margin: 5px 0; font-size: 0.9rem; color: #fff;">Current distance: ${distance.toFixed(1)}km / Target: 3km</p>
            </div>
        `;
        
        // 创建一个自定义样式的弹窗
        const customPopup = L.popup({
            className: 'failure-popup'
        });
        
        // 获取弹窗元素并直接设置样式
        customPopup.on('add', function(event) {
            // 当弹窗添加到地图上时，直接修改DOM元素样式
            setTimeout(() => {
                const popupWrapper = document.querySelector('.leaflet-popup-content-wrapper');
                const popupTip = document.querySelector('.leaflet-popup-tip');
                if (popupWrapper) popupWrapper.style.backgroundColor = '#FFB347';
                if (popupTip) popupTip.style.backgroundColor = '#FFB347';
            }, 10);
        });
        
        customPopup
            .setLatLng(userMarker.getLatLng())
            .setContent(failurePopupContent)
            .openOn(map);
    }
    
    // Save to history
    function saveToHistory(tripData) {
        let history = [];
        const savedHistory = localStorage.getItem('travelHistory');
        
        if (savedHistory) {
            try {
                history = JSON.parse(savedHistory);
            } catch (e) {
                console.error('Error parsing saved history', e);
                history = [];
            }
        }
        
        // Add new record
        history.unshift({
            id: tripData.sessionId,
            date: new Date().toISOString(),
            distance: tripData.distance.toFixed(1),
            duration: formatDuration(tripData.duration),
            isCompleted: tripData.isCompleted,
            pointsEarned: tripData.pointsEarned
        });
        
        // Keep only most recent 20 records
        if (history.length > 20) {
            history = history.slice(0, 20);
        }
        
        // Save to local storage
        try {
            localStorage.setItem('travelHistory', JSON.stringify(history));
        } catch (e) {
            console.error('Error saving history:', e);
            showAlert('Failed to save history');
        }
        
        // Update history UI
        updateHistoryUI();
    }
    
    // Format duration
    function formatDuration(milliseconds) {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const seconds = (totalSeconds % 60).toString().padStart(2, '0');
        return `${minutes}:${seconds}`;
    }
    
    // Update history UI
    function updateHistoryUI() {
        const historyList = document.getElementById('historyList');
        const savedHistory = localStorage.getItem('travelHistory');
        
        // Clear current list
        historyList.innerHTML = '';
        
        if (!savedHistory || JSON.parse(savedHistory).length === 0) {
            historyList.innerHTML = '<div class="no-records">No travel records yet. Start your green travel journey!</div>';
            return;
        }
        
        // Add each history record
        const history = JSON.parse(savedHistory);
        
        history.forEach(record => {
            const date = new Date(record.date);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${record.isCompleted ? 'success' : 'incomplete'}`;
            
            historyItem.innerHTML = `
                <div class="history-date">
                    ${formattedDate}
                    <span class="history-status ${record.isCompleted ? 'status-complete' : 'status-incomplete'}">
                        ${record.isCompleted ? 'Completed' : 'Incomplete'}
                    </span>
                </div>
                <div class="history-stats">
                    <div class="history-stat">
                        <div class="history-stat-value">${record.distance} km</div>
                        <div class="history-stat-label">Distance</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-value">${record.duration}</div>
                        <div class="history-stat-label">Duration</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-value">${record.pointsEarned}</div>
                        <div class="history-stat-label">Points</div>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="history-btn delete-btn" data-id="${record.id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            `;
            
            // Add event listener for delete button
            const deleteBtn = historyItem.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function() {
                    deleteRecord(record.id);
                });
            }
            
            historyList.appendChild(historyItem);
        });
    }
    
    // Delete history record
    function deleteRecord(recordId) {
        const savedHistory = localStorage.getItem('travelHistory');
        if (savedHistory) {
            let history = JSON.parse(savedHistory);
            history = history.filter(item => item.id !== recordId);
            localStorage.setItem('travelHistory', JSON.stringify(history));
            
            updateHistoryUI();
            showAlert('Record deleted');
        }
    }
    
    // Initialize app
    function initApp() {
        // Initialize map
        initMap();
        
        // Initialize button states
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('stopBtn').disabled = true;
        
        // Load history
        updateHistoryUI();
        
        // Bind button events
        document.getElementById('startBtn').addEventListener('click', startTracking);
        document.getElementById('pauseBtn').addEventListener('click', pauseTracking);
        document.getElementById('stopBtn').addEventListener('click', stopTracking);
        
        // Bind tab switching events
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', function() {
                // Toggle tab active state
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                
                // Toggle panel display
                const tabName = this.dataset.tab;
                document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active'));
                document.getElementById(`${tabName}Panel`).classList.add('active');
                
                // If switching to map tab, refresh map
                if (tabName === 'tracking' && map) {
                    setTimeout(() => map.invalidateSize(), 100);
                }
            });
        });
    }
    
    // Initialize app
    initApp();
});