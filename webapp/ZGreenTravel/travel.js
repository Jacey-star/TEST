// 绿色出行追踪器核心JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // 应用状态变量
    let map;
    let trackPolyline;
    let userMarker;
    let trackPoints = [];
    let lastPosition = null;
    let distance = 0;
    let startTime = null;
    let timerInterval = null;
    let watchId = null;
    let isTracking = false;
    let isPaused = false;
    let currentMode = 'walking'; // 默认为步行模式
    let sessionId = null; // 当前会话ID，用于后端识别

    // 屏幕唤醒锁
    let wakeLock = null;
    
    // 初始化地图
    function initMap() {
        // 先用一个默认位置初始化地图（可以修改为你所在城市的中心位置）
        const defaultPosition = [39.9042, 116.4074]; // 北京市中心，你可以根据需要修改
        
        // 初始化地图但先不设置视图
        map = L.map('map');
        
        // 添加地图图层
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
        
        // 创建路线图层
        trackPolyline = L.polyline([], {
            color: '#4CAF50',
            weight: 5,
            opacity: 0.7
        }).addTo(map);
        
        // 立即尝试获取用户位置并自动居中地图
        if (navigator.geolocation) {
            // 显示加载中消息
            showAlert('Getting your location...', 2000);
            
            // 使用高精度定位
            const options = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            };
            
            navigator.geolocation.getCurrentPosition(
                // 成功获取位置
                position => {
                    const userLocation = [position.coords.latitude, position.coords.longitude];
                    
                    // 设置地图视图到用户位置
                    map.setView(userLocation, 16);
                    
                    // 创建或更新用户位置标记
                    if (userMarker) {
                        userMarker.setLatLng(userLocation);
                    } else {
                        userMarker = L.marker(userLocation).addTo(map);
                    }
                    
                    userMarker.bindPopup('Your current location').openPopup();
                    
                    showAlert('Located your position', 2000);
                },
                // 获取位置失败
                error => {
                    console.error('Failed to get location', error);
                    // 定位失败时使用默认位置
                    map.setView(defaultPosition, 12);
                    showAlert('Unable to get your location, using default position', 3000);
                    
                    // 根据错误代码显示不同的错误消息
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            showAlert('You denied location permission, please allow it in browser settings', 5000);
                            break;
                        case error.POSITION_UNAVAILABLE:
                            showAlert('Location information unavailable, please check if your GPS is enabled', 5000);
                            break;
                        case error.TIMEOUT:
                            showAlert('Location request timed out, please try again', 3000);
                            break;
                        default:
                            showAlert('Failed to get location: ' + error.message, 3000);
                    }
                },
                options
            );
        } else {
            // 浏览器不支持地理位置API
            map.setView(defaultPosition, 12);
            showAlert('Your browser does not support geolocation', 3000);
        }
    }

    // 开始追踪
    function startTracking() {
        if (!navigator.geolocation) {
            showAlert('Your browser does not support geolocation');
            return;
        }
        
        // 如果不是从暂停恢复，则重置数据并创建新会话
        if (!isPaused) {
            distance = 0;
            trackPoints = [];
            trackPolyline.setLatLngs([]);
            updateDistanceDisplay();
            startTime = new Date();
            
            // 生成会话ID并发送到后端开始新会话
            sessionId = generateSessionId();
            sendTrackingStartToServer();
        }
        
        isTracking = true;
        isPaused = false;
        
        // 防止屏幕睡眠（如果支持）
        requestWakeLock();
        
        // 更新按钮状态
        document.getElementById('startBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        document.getElementById('stopBtn').disabled = false;
        
        // 开始定时更新时间
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateTimer, 1000);
        
        // 开始GPS追踪
        const options = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };
        
        watchId = navigator.geolocation.watchPosition(
            updatePosition,
            error => {
                showAlert('Location tracking error: ' + error.message);
                console.error('Tracking error:', error);
            },
            options
        );
    }
    
    // 暂停追踪
    function pauseTracking() {
        isTracking = false;
        isPaused = true;
        
        // 停止位置监听
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        
        // 停止计时器
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
        
        // 释放唤醒锁
        releaseWakeLock();
        
        // 更新按钮状态
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;
        
        // 通知后端暂停
        sendTrackingPauseToServer();
    }
    
    // 结束追踪
    function stopTracking() {
        // 如果正在追踪，先暂停
        if (isTracking) {
            // 停止位置监听
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
                watchId = null;
            }
            
            // 停止计时器
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            
            // 释放唤醒锁
            releaseWakeLock();
        }
        
        isTracking = false;
        isPaused = false;
        
        // 更新按钮状态
        document.getElementById('startBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        document.getElementById('stopBtn').disabled = true;
        
        // 发送完整轨迹到后端进行验证
        sendTrackingCompleteToServer();
    }
    
    // 位置更新处理
    function updatePosition(position) {
        const currentPosition = [position.coords.latitude, position.coords.longitude];
        
        // 更新用户位置标记
        if (userMarker) {
            userMarker.setLatLng(currentPosition);
        } else {
            userMarker = L.marker(currentPosition).addTo(map);
        }
        
        // 添加点到路线
        trackPoints.push({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            timestamp: new Date().toISOString(),
            accuracy: position.coords.accuracy
        });
        
        trackPolyline.addLatLng(currentPosition);
        
        // 更新地图视图，保持用户位置在中心
        map.setView(currentPosition);
        
        // 计算与上一个点的距离
        if (lastPosition) {
            const segmentDistance = calculateDistance(
                lastPosition[0], lastPosition[1],
                currentPosition[0], currentPosition[1]
            );
            
            // 简单验证 - 防止GPS跳跃
            // 步行模式下不超过每秒3米，骑行模式下不超过每秒8米
            const maxSpeedPerSec = currentMode === 'walking' ? 3 : 8;
            
            // 估算速度
            let speed = 0;
            if (position.coords.speed) {
                speed = position.coords.speed * 3.6; // 转换为公里/小时
            }
            
            if (segmentDistance < maxSpeedPerSec * 5) { // 假设5秒更新一次
                // 本地临时计算距离
                distance += segmentDistance / 1000; // 转换为公里
                updateDistanceDisplay();
                
                // 每隔一定距离或时间将数据发送到后端
                if (trackPoints.length % 10 === 0) { // 每10个点发送一次
                    sendTrackPointsToServer();
                }
            }
            
            // 更新速度显示
            updateSpeedDisplay(position.coords.speed);
        }
        
        lastPosition = currentPosition;
        
        // 检查是否达到目标
        if (distance >= 3) {
            stopTracking();
        }
    }
    
    // 计算两点之间的距离（使用Haversine公式）
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // 地球半径，单位米
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return distance; // 返回距离，单位米
    }
    
    function toRad(degrees) {
        return degrees * Math.PI / 180;
    }
    
    // 更新距离显示
    function updateDistanceDisplay() {
        const distanceText = document.getElementById('distanceText');
        distanceText.textContent = distance.toFixed(1);
    }
    
    // 更新速度显示
    function updateSpeedDisplay(speed) {
        const speedValue = document.getElementById('speedValue');
        // 如果speed存在就使用它，否则根据最近两点计算
        let displaySpeed = 0;
        
        if (speed) {
            displaySpeed = (speed * 3.6); // 转换为公里/小时
        } else if (trackPoints.length >= 2) {
            // 取最近两点计算速度
            const latest = trackPoints[trackPoints.length - 1];
            const previous = trackPoints[trackPoints.length - 2];
            
            const recentDistance = calculateDistance(
                previous.lat, previous.lng,
                latest.lat, latest.lng
            );
            
            // 时间差（毫秒）
            const timeDiff = new Date(latest.timestamp) - new Date(previous.timestamp);
            
            // 计算速度（公里/小时）
            if (timeDiff > 0) {
                displaySpeed = (recentDistance / timeDiff * 3600); // 转换为公里/小时
            }
        }
        
        speedValue.textContent = displaySpeed.toFixed(1);
    }
    
    // 更新计时器
    function updateTimer() {
        if (!startTime) return;
        
        const currentTime = new Date();
        const elapsedTime = new Date(currentTime - startTime);
        const minutes = elapsedTime.getUTCMinutes().toString().padStart(2, '0');
        const seconds = elapsedTime.getUTCSeconds().toString().padStart(2, '0');
        
        document.getElementById('timeValue').textContent = `${minutes}:${seconds}`;
    }
    
    // 显示提示消息
    function showAlert(message, duration = 3000) {
        const alert = document.getElementById('alert');
        alert.textContent = message;
        alert.classList.add('show');
        
        setTimeout(() => {
            alert.classList.remove('show');
        }, duration);
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
    
    // 生成会话ID
    function generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    // ---------------- 与后端通信的函数 ----------------
    
    // 发送开始追踪信息到后端
    function sendTrackingStartToServer() {
        // 这里使用fetch实现与后端通信，实际开发时替换为真实API
        console.log('Sending start tracking data to server...');
        
        const data = {
            sessionId: sessionId,
            startTime: new Date().toISOString(),
            mode: currentMode,
            deviceInfo: {
                userAgent: navigator.userAgent,
                screenWidth: window.innerWidth,
                screenHeight: window.innerHeight
            }
        };
        
        // 模拟API调用
        setTimeout(() => {
            console.log('Start tracking sent:', data);
        }, 300);
    }
    
    // 发送路径点到后端
    function sendTrackPointsToServer() {
        // 只发送最近10个点，避免数据过大
        const recentPoints = trackPoints.slice(-10);
        
        const data = {
            sessionId: sessionId,
            points: recentPoints,
            currentDistance: distance,
            timestamp: new Date().toISOString()
        };
        
        // 模拟API调用
        setTimeout(() => {
            console.log('Track points sent:', data);
            
            // 模拟后端返回校准的距离
            const serverDistance = distance * 0.98; // 模拟后端计算的距离略小
            
            // 如果相差超过5%，则使用服务器距离进行校准
            if (Math.abs(distance - serverDistance) / distance > 0.05) {
                distance = serverDistance;
                updateDistanceDisplay();
                showAlert('Distance calibrated by server');
            }
            
        }, 300);
    }
    
    // 发送暂停信息到后端
    function sendTrackingPauseToServer() {
        const data = {
            sessionId: sessionId,
            pauseTime: new Date().toISOString(),
            currentDistance: distance,
            elapsedTime: startTime ? (new Date() - startTime) : 0
        };
        
        // 模拟API调用
        setTimeout(() => {
            console.log('Pause tracking sent:', data);
        }, 300);
    }
    
    // 发送完成信息到后端
    function sendTrackingCompleteToServer() {
        const data = {
            sessionId: sessionId,
            completeTime: new Date().toISOString(),
            finalDistance: distance,
            totalElapsedTime: startTime ? (new Date() - startTime) : 0,
            mode: currentMode,
            trackPoints: trackPoints
        };
        
        // 模拟API调用和响应
        setTimeout(() => {
            console.log('Complete tracking sent:', data);
            
            // 模拟后端验证结果
            const isValidated = distance >= 3;
            
            if (isValidated) {
                showAlert('Congratulations! You have completed the green travel challenge and earned 30 points!', 5000);
            } else {
                showAlert('Activity recorded, but distance did not reach 3km, no points earned', 5000);
            }
            
        }, 1000);
    }
    
    // 模式切换处理
    document.querySelectorAll('.mode-option').forEach(option => {
        option.addEventListener('click', function() {
            if (isTracking) {
                showAlert('Please pause tracking before switching modes');
                return;
            }
            
            document.querySelectorAll('.mode-option').forEach(opt => {
                opt.classList.remove('active');
            });
            
            this.classList.add('active');
            currentMode = this.dataset.mode;
        });
    });
    
    // 按钮事件监听
    document.getElementById('startBtn').addEventListener('click', startTracking);
    document.getElementById('pauseBtn').addEventListener('click', pauseTracking);
    document.getElementById('stopBtn').addEventListener('click', stopTracking);
    
    // 检查位置权限
    function checkLocationPermission() {
        if (navigator.permissions && navigator.permissions.query) {
            navigator.permissions.query({name: 'geolocation'})
                .then(function(permissionStatus) {
                    if (permissionStatus.state === 'denied') {
                        showAlert('Please allow location permission to use green travel tracking');
                    } else if (permissionStatus.state === 'prompt') {
                        showAlert('This app requires location permission');
                    }
                    
                    permissionStatus.onchange = function() {
                        if (this.state === 'denied') {
                            showAlert('Location permission denied, the app cannot function properly');
                        } else if (this.state === 'granted') {
                            showAlert('Location permission granted, you can start using the app');
                            initMap();
                        }
                    };
                });
        }
    }
    
    // 初始化应用
    initMap();
    checkLocationPermission();
});