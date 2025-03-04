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
    
    // API 
    const API_BASE_URL = '/walkinggame';
    const API_ENDPOINTS = {
        SAVE_TRIP: '/save/',
        GET_TRIPS: '/history/',
        DELETE_TRIP: '/delete/',
        GET_USER_INFO: '/user/info/'
    };

    // CSRF
    function getCSRFToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }
    

    
/******************* PART 1 : NEED TO CONNECT WITH THE BACKEND ************************/
    

    /**
     * send walking data to backend
     * @param {Object} tripData 
     */
    async function sendTripDataToBackend(tripData) {
        try {
            showAlert('Saving trip data to server...');
            
            const formData = new FormData();
            formData.append('session_id', tripData.sessionId);
            formData.append('start_time', tripData.startTime.toISOString());
            formData.append('end_time', tripData.endTime.toISOString());
            formData.append('distance', tripData.distance.toFixed(2));
            formData.append('duration', tripData.duration);
            formData.append('is_completed', tripData.isCompleted);
            formData.append('points_earned', tripData.pointsEarned);
            
            formData.append('track_points_count', trackPoints.length);
            
            trackPoints.forEach((point, index) => {
                formData.append(`point_lat_${index}`, point.lat);
                formData.append(`point_lng_${index}`, point.lng);
                formData.append(`point_time_${index}`, point.timestamp);
            });
            
            const response = await fetch(API_BASE_URL + API_ENDPOINTS.SAVE_TRIP, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                },
                body: formData,
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const responseText = await response.text();
                showAlert('Trip data saved to server successfully');
                
    
                try {
                    return responseText ? JSON.parse(responseText) : null;
                } catch (e) {
                    console.log('Server response is not JSON:', responseText);
                    return null;
                }
            } else {
                console.error('Server error:', response.status);
                showAlert('Failed to send data to server');
                return null;
            }
        } catch (error) {
            console.error('Error sending data:', error);
            showAlert('Connection error, please try again');
            return null;
        }
    }


   //get history from backend
   async function getTripsFromBackend() {
        try {
            const response = await fetch(API_BASE_URL + API_ENDPOINTS.GET_TRIPS, {
                method: 'GET',
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const htmlContent = await response.text();
                
                const historyList = document.getElementById('historyList');
                historyList.innerHTML = htmlContent;
                return null; 
                
        
            } else {
                console.error('Failed to load history:', response.status);
                return null;
            }
        } catch (error) {
            console.error('Error loading history:', error);
            return null;
        }
    }

    /**
     * delete history
     * @param {string} tripId 
     */
    async function deleteTripFromBackend(tripId) {
        try {
            const formData = new FormData();
            formData.append('trip_id', tripId);
            
            const response = await fetch(API_BASE_URL + API_ENDPOINTS.DELETE_TRIP, {
                method: 'POST', 
                headers: {
                    'X-CSRFToken': getCSRFToken()
                },
                body: formData,
                credentials: 'same-origin' 
            });
            
            if (response.ok) {
                showAlert('Record deleted from server');
                return true;
            } else {
                console.error('Failed to delete record:', response.status);
                showAlert('Failed to delete record from server');
                return false;
            }
        } catch (error) {
            console.error('Error deleting record:', error);
            showAlert('Connection error, please try again');
            return false;
        }
    }
    
   
    /**
     * display history
     * @param {Array} history 
     */
    function displayHistory(history) {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = '';
        
        if (!history || history.length === 0) {
            historyList.innerHTML = '<div class="no-records">No travel records yet. Start your green travel journey!</div>';
            return;
        }
        
        history.forEach(record => {
            const item = {
                id: record.id || record.session_id,
                date: record.date || record.created_at,
                distance: record.distance,
                duration: record.duration_display || record.duration,
                isCompleted: record.is_completed,
                pointsEarned: record.points_earned
            };
            
            const date = new Date(item.date);
            const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
            
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${item.isCompleted ? 'success' : 'incomplete'}`;
            
            historyItem.innerHTML = `
                <div class="history-date">
                    ${formattedDate}
                    <span class="history-status ${item.isCompleted ? 'status-complete' : 'status-incomplete'}">
                        ${item.isCompleted ? 'Completed' : 'Incomplete'}
                    </span>
                </div>
                <div class="history-stats">
                    <div class="history-stat">
                        <div class="history-stat-value">${item.distance} km</div>
                        <div class="history-stat-label">Distance</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-value">${item.duration}</div>
                        <div class="history-stat-label">Duration</div>
                    </div>
                    <div class="history-stat">
                        <div class="history-stat-value">${item.pointsEarned}</div>
                        <div class="history-stat-label">Points</div>
                    </div>
                </div>
                <div class="history-actions">
                    <button class="history-btn delete-btn" data-id="${item.id}">
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </div>
            `;
            
            const deleteBtn = historyItem.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async function() {
                    const success = await deleteTripFromBackend(item.id);
                    if (success) {
                        updateHistoryUI();
                    }
                });
            }
            
            historyList.appendChild(historyItem);
        });
    }
    



    /******************************** PART 2: MAP and TRACKING ******************************/
    // Initialize map
    function initMap() {
        const defaultPosition = [51.6231, 3.9447];

        map = L.map('map');

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
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
    
    //delete??
    // 请求保持屏幕唤醒
    // async function requestWakeLock() {
    //     if ('wakeLock' in navigator) {
    //         try {
    //             wakeLock = await navigator.wakeLock.request('screen');
    //         } catch (err) {
    //             console.error('Wake Lock error:', err);
    //         }
    //     }
    // }
    
    // // 释放屏幕唤醒锁
    // function releaseWakeLock() {
    //     if (wakeLock !== null) {
    //         wakeLock.release()
    //           .then(() => {
    //             wakeLock = null;
    //           });
    //     }
    // }
    
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
        
        // // 防止屏幕睡眠（如果支持）
        // requestWakeLock();
        
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
        
        // // 释放唤醒锁
        // releaseWakeLock();
        
        // Update button states
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
    }
    
    
   
    async function stopTracking() {
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
            
        //     // 释放唤醒锁
        //     releaseWakeLock();
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

        try {
            await sendTripDataToBackend(tripData);
            updateHistoryUI(); 
        } catch (err) {
            console.error('Backend sync failed:', err);
            showAlert('Failed to save your activity');
        }
        
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
            
            distance += segmentDistance / 1000;
            updateDistanceDisplay();
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
    
    function updateDistanceDisplay() {
        document.getElementById('distanceText').textContent = distance.toFixed(1);
    }

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
        let type = 'info'; 
        
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

        alert.classList.add('show');
        
        // Auto-hide the alert
        setTimeout(() => {
            alert.classList.remove('show');
        }, duration);
    }
    
    // Show completion success (color: green)
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
    
    // Show completion failure (color: orange)
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
        
       
        const customPopup = L.popup({
            className: 'failure-popup'
        });
        
        customPopup.on('add', function(event) {
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
    


/************************** PART 3: HISTORY UI (use the functions in part1) *******************************/

    // Save to history
    async function saveToHistory(tripData) {
  
        try {
            await sendTripDataToBackend(tripData);
            updateHistoryUI();
        } catch (error) {
            console.error('Error saving to backend:', error);
            showAlert('Failed to save your activity');
        }
    }
    
    // update history UI
    async function updateHistoryUI() {
        try {
            const backendHistory = await getTripsFromBackend();
            
            // 如果getTripsFromBackend直接操作DOM并返回null/true
            if (backendHistory === null) {
                // DOM已经在getTripsFromBackend中更新，无需额外操作
                return;
            }
        
        } catch (error) {
            console.error('Error updating history UI:', error);
            const historyList = document.getElementById('historyList');
            historyList.innerHTML = '<div class="no-records">Unable to load history. Please try again later.</div>';
            showAlert('Failed to load history');
        }
    }
    

    
    //delete records UI
    async function deleteRecord(recordId) {
        try {
            // 从后端删除
            const backendDeleted = await deleteTripFromBackend(recordId);
            
            if (backendDeleted) {
                updateHistoryUI();
                showAlert('Record deleted successfully');
            } else {
                showAlert('Failed to delete record');
            }
        } catch (err) {
            console.error('Error deleting record:', err);
            showAlert('Connection error, please try again');
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
                
                if (tabName === 'history') {
                    updateHistoryUI();
                }
            });
        });
    }
    
    initApp();
});