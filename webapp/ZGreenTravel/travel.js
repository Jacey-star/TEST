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
        // 初始化地图在校园中心位置（这里使用示例坐标，应替换为实际校园坐标）
        const campusCenter = [39.9042, 116.4074]; // 示例：北京市中心
        
        map = L.map('map').setView(campusCenter, 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> 贡献者'
        }).addTo(map);
        
        // 创建路线图层
        trackPolyline = L.polyline([], {
            color: '#4CAF50',
            weight: 5,
            opacity: 0.7
        }).addTo(map);
        
        // 尝试获取当前位置
        navigator.geolocation.getCurrentPosition(
            position => {
                const userLocation = [position.coords.latitude, position.coords.longitude];
                map.setView(userLocation, 16);
                
                // 创建用户位置标记
                userMarker = L.marker(userLocation).addTo(map);
                userMarker.bindPopup('您的当前位置').openPopup();
            },
            error => {
                showAlert('无法获取您的位置，请确保已授权位置权限');
                console.error('Geolocation error:', error);
            },
            { enableHighAccuracy: true }
        );
    }

    // 开始追踪
    function startTracking() {
        if (!navigator.geolocation) {
            showAlert('您的浏览器不支持地理位置功能');
            return;
        }
        
        // 如果不是从暂停恢复，则重置数据并创建新会话
        if (!isPaused) {
            distance = 0;
            trackPoints = [];
            trackPolyline.setLatLngs([]);
            updateDistanceDisplay();
            startTime = new Date();
            updateCarbonSaved();
            
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
                showAlert('位置追踪错误：' + error.message);
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
                updateCarbonSaved();
                
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
        
        // 更新进度圆环
        updateProgressCircle();
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
    
    // 更新进度圆环
    function updateProgressCircle() {
        const progressPercentage = Math.min(distance / 3, 1) * 100;
        const progressFill = document.getElementById('progressFill');
        const progressFill2 = document.getElementById('progressFill2');
        
        if (progressPercentage <= 50) {
            progressFill.style.transform = `rotate(${progressPercentage * 3.6}deg)`;
            progressFill.classList.remove('gt50');
        } else {
            progressFill.style.transform = 'rotate(180deg)';
            progressFill.classList.add('gt50');
            progressFill2.style.transform = `rotate(${(progressPercentage - 50) * 3.6}deg)`;
        }
    }
    
    // 更新碳排放节约
    function updateCarbonSaved() {
        const carbonValue = document.getElementById('carbonValue');
        // 计算碳排放减少量（粗略估计）
        // 步行/骑行与开车相比，每公里可减少约200克CO2
        const carbonSaved = Math.round(distance * 200);
        carbonValue.textContent = `${carbonSaved} 克`;
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
        
        // 实际开发时使用以下代码
        /*
        fetch('/api/activity/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('连接服务器失败，请检查网络连接');
        });
        */
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
                updateCarbonSaved();
                showAlert('距离已由服务器校准');
            }
            
        }, 300);
        
        // 实际开发时使用以下代码
        /*
        fetch('/api/activity/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            
            // 如果服务器返回校准的距离，进行更新
            if (data.calibratedDistance) {
                distance = data.calibratedDistance;
                updateDistanceDisplay();
                updateCarbonSaved();
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
        */
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
        
        // 实际开发时使用以下代码
        /*
        fetch('/api/activity/pause', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
        */
    }
    
    // 发送完成信息到后端
    function sendTrackingCompleteToServer() {
        const data = {
            sessionId: sessionId,
            completeTime: new Date().toISOString(),
            finalDistance: distance,
            totalElapsedTime: startTime ? (new Date() - startTime) : 0,
            mode: currentMode,
            trackPoints: trackPoints,
            carbonSaved: Math.round(distance * 200)
        };
        
        // 模拟API调用和响应
        setTimeout(() => {
            console.log('Complete tracking sent:', data);
            
            // 模拟后端验证结果
            const isValidated = distance >= 3;
            const serverDistance = distance * 0.98; // 模拟服务器端计算的最终距离
            
            if (isValidated) {
                showAlert('恭喜！您已完成绿色出行挑战，获得30积分！', 5000);
            } else {
                showAlert('活动已记录，但距离未达到3公里，无法获得积分', 5000);
            }
            
        }, 1000);
        
        // 实际开发时使用以下代码
        /*
        fetch('/api/activity/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(data => {
            console.log('Success:', data);
            
            if (data.validated) {
                showAlert(`恭喜！您已完成绿色出行挑战，获得${data.pointsEarned}积分！`, 5000);
            } else {
                showAlert(data.message || '活动已记录，但未能通过验证', 5000);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('提交数据失败，请稍后再试', 5000);
        });
        */
    }
    
    // 模式切换处理
    document.querySelectorAll('.mode-option').forEach(option => {
        option.addEventListener('click', function() {
            if (isTracking) {
                showAlert('请先暂停追踪再切换模式');
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
                        showAlert('请允许位置权限以使用绿色出行追踪功能');
                    } else if (permissionStatus.state === 'prompt') {
                        showAlert('使用此应用需要位置权限');
                    }
                    
                    permissionStatus.onchange = function() {
                        if (this.state === 'denied') {
                            showAlert('位置权限被拒绝，应用无法正常工作');
                        } else if (this.state === 'granted') {
                            showAlert('位置权限已授予，可以开始使用');
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