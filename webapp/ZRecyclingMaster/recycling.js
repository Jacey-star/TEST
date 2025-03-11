// recycling_game.js - 完整版

document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
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
    
    // 相机相关变量
    let videoElement;
    let canvasElement;
    let canvasContext;
    let scannerIsRunning = false;
    
    // 切换到扫描界面并启动相机
    scanBtn.addEventListener('click', function() {
        mainScreen.classList.add('hidden');
        scanScreen.classList.add('active');
        
        // 初始化相机视图（第一次点击时）
        if (!videoElement) {
            initCamera();
        } else {
            // 如果相机已初始化，直接启动扫描
            startScanner();
        }
    });
    
    // 初始化相机
    function initCamera() {
        // 创建视频元素
        videoElement = document.createElement('video');
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        
        // 创建Canvas用于处理视频帧
        canvasElement = document.createElement('canvas');
        canvasContext = canvasElement.getContext('2d');
        
        // 将视频元素添加到相机视图中
        const cameraView = document.querySelector('.camera-view');
        cameraView.appendChild(videoElement);
        
        // 启动扫描器
        startScanner();
    }
    
    // 启动扫描器
    function startScanner() {
        scannerIsRunning = true;
        
        // 检查是否支持getUserMedia
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // 请求相机权限
            navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
                .then(function(stream) {
                    videoElement.srcObject = stream;
                    videoElement.setAttribute("playsinline", true); // iOS 需要
                    videoElement.play();
                    
                    // 开始扫描二维码
                    scanQRCode();
                })
                .catch(function(error) {
                    console.error("相机访问失败: ", error);
                    // 如果无法访问相机，回退到模拟扫描
                    setTimeout(function() {
                        showScanResult();
                    }, 3000);
                });
        } else {
            console.error("浏览器不支持getUserMedia");
            // 回退到模拟扫描
            setTimeout(function() {
                showScanResult();
            }, 3000);
        }
    }
    
    // 停止扫描器
    function stopScanner() {
        scannerIsRunning = false;
        
        if (videoElement && videoElement.srcObject) {
            // 停止所有视频轨道
            videoElement.srcObject.getTracks().forEach(track => {
                track.stop();
            });
            videoElement.srcObject = null;
        }
    }
    
    // 扫描二维码
    function scanQRCode() {
        if (!scannerIsRunning) return;
        
        // 设置定时器定期检查视频帧中的QR码
        requestAnimationFrame(function checkFrame() {
            if (!scannerIsRunning) return;
            
            if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
                // 视频准备好，可以扫描
                const width = videoElement.videoWidth;
                const height = videoElement.videoHeight;
                
                // 设置canvas大小
                canvasElement.width = width;
                canvasElement.height = height;
                
                // 将视频帧绘制到canvas
                canvasContext.drawImage(videoElement, 0, 0, width, height);
                
                // 从canvas获取图像数据
                const imageData = canvasContext.getImageData(0, 0, width, height);
                
                try {
                    // 使用jsQR库（如果已加载）解码QR码
                    if (typeof jsQR === 'function') {
                        const code = jsQR(imageData.data, width, height);
                        
                        if (code) {
                            // 找到QR码，处理结果
                            console.log("QR码内容: ", code.data);
                            
                            // 停止扫描
                            stopScanner();
                            
                            // 处理QR码内容
                            processQRCode(code.data);
                            return;
                        }
                    } else {
                        // jsQR库未加载，使用模拟扫描
                        if (Math.random() < 0.01) { // 1%的几率"检测到"QR码
                            stopScanner();
                            showScanResult();
                            return;
                        }
                    }
                } catch (error) {
                    console.error("扫描QR码出错: ", error);
                }
                
                // 继续扫描
                requestAnimationFrame(checkFrame);
            } else {
                // 视频尚未准备好，继续等待
                requestAnimationFrame(checkFrame);
            }
        });
    }
    
    // 处理扫描到的QR码
    function processQRCode(qrData) {
        console.log("处理QR码数据: ", qrData);
        
        // 这里可以根据QR码内容进行判断
        // 例如，检查QR码是否是有效的回收站QR码
        
        // 随机模拟三种结果中的一种
        const randomResult = Math.random();
        if (randomResult < 0.6) {
            // 60%几率成功
            showSuccess();
        } else if (randomResult < 0.8) {
            // 20%几率无效
            showInvalidQR();
        } else {
            // 20%几率已完成
            showAlreadyCompleted();
        }
    }
    
    // 显示成功结果
    function showSuccess() {
        resultContent.className = 'result-content success';
        resultContent.querySelector('.result-icon i').className = 'fas fa-check-circle';
        resultContent.querySelector('.result-title').textContent = 'Success!';
        resultContent.querySelector('.result-message').textContent = 'You\'ve earned 10 points for recycling!';
        resultPrimaryBtn.textContent = 'Return to Main';
        resultSecondaryBtn.style.display = 'none';
        
        // 更新积分（模拟）
        const currentPoints = parseInt(document.getElementById('pointsDisplay').textContent);
        updateUserPoints(currentPoints + 10);
        
        resultPrimaryBtn.onclick = function() {
            resultOverlay.classList.remove('active');
            scanScreen.classList.remove('active');
            mainScreen.classList.remove('hidden');
        };
        
        resultOverlay.classList.add('active');
    }
    
    // 显示无效QR码结果
    function showInvalidQR() {
        resultContent.className = 'result-content error';
        resultContent.querySelector('.result-icon i').className = 'fas fa-times-circle';
        resultContent.querySelector('.result-title').textContent = 'Invalid QR Code';
        resultContent.querySelector('.result-message').textContent = 'Please try again with a valid recycling bin QR code.';
        resultPrimaryBtn.textContent = 'Try Again';
        resultSecondaryBtn.textContent = 'Return to Main';
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
    
    // 显示已完成任务结果
    function showAlreadyCompleted() {
        resultContent.className = 'result-content warning';
        resultContent.querySelector('.result-icon i').className = 'fas fa-exclamation-circle';
        resultContent.querySelector('.result-title').textContent = 'Already Completed';
        resultContent.querySelector('.result-message').textContent = 'You\'ve already completed today\'s recycling task. Please come back tomorrow!';
        resultPrimaryBtn.textContent = 'Return to Main';
        resultSecondaryBtn.style.display = 'none';
        
        resultPrimaryBtn.onclick = function() {
            resultOverlay.classList.remove('active');
            scanScreen.classList.remove('active');
            mainScreen.classList.remove('hidden');
        };
        
        resultOverlay.classList.add('active');
    }
    
    // 返回主界面
    backBtn.addEventListener('click', function() {
        stopScanner();
        mainScreen.classList.remove('hidden');
        scanScreen.classList.remove('active');
        resultOverlay.classList.remove('active');
    });
    
    // 显示位置详情
    locationBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const location = this.dataset.location;
            const zipcode = this.dataset.zipcode;
            
            modalTitle.textContent = location;
            zipcodeValue.textContent = zipcode;
            navigateBtn.href = `https://maps.google.com/?q=${location}`;
            
            locationModal.classList.add('active');
        });
    });
    
    // 关闭位置详情
    closeModalBtn.addEventListener('click', function() {
        locationModal.classList.remove('active');
    });
    
    // 点击弹窗外部关闭
    locationModal.addEventListener('click', function(e) {
        if (e.target === locationModal) {
            locationModal.classList.remove('active');
        }
    });
    
    // 模拟获取用户积分
    function updateUserPoints(points) {
        const pointsDisplay = document.getElementById('pointsDisplay');
        pointsDisplay.textContent = points + ' points';
    }
    
    // 模拟扫描结果（当实际相机不可用时回退到此方法）
    function showScanResult() {
        // 模拟三种不同结果
        const results = [
            {
                type: 'success',
                icon: 'fa-check-circle',
                title: 'Success!',
                message: 'You\'ve earned 10 points for recycling!',
                primaryBtn: 'Return to Main',
                showSecondary: false
            },
            {
                type: 'error',
                icon: 'fa-times-circle',
                title: 'Invalid QR Code',
                message: 'Please try again with a valid recycling bin QR code.',
                primaryBtn: 'Try Again',
                showSecondary: true,
                secondaryBtn: 'Return to Main'
            },
            {
                type: 'warning',
                icon: 'fa-exclamation-circle',
                title: 'Already Completed',
                message: 'You\'ve already completed today\'s recycling task. Please come back tomorrow!',
                primaryBtn: 'Return to Main',
                showSecondary: false
            }
        ];
        
        // 随机选择一个结果
        const result = results[Math.floor(Math.random() * results.length)];
        
        // 更新结果内容
        resultContent.className = 'result-content ' + result.type;
        resultContent.querySelector('.result-icon i').className = 'fas ' + result.icon;
        resultContent.querySelector('.result-title').textContent = result.title;
        resultContent.querySelector('.result-message').textContent = result.message;
        resultPrimaryBtn.textContent = result.primaryBtn;
        
        // 显示/隐藏副按钮
        if (result.showSecondary) {
            resultSecondaryBtn.textContent = result.secondaryBtn;
            resultSecondaryBtn.style.display = 'block';
        } else {
            resultSecondaryBtn.style.display = 'none';
        }
        
        // 设置按钮事件
        if (result.type === 'success' || result.type === 'warning') {
            resultPrimaryBtn.onclick = function() {
                resultOverlay.classList.remove('active');
                scanScreen.classList.remove('active');
                mainScreen.classList.remove('hidden');
            };
        } else {
            resultPrimaryBtn.onclick = function() {
                resultOverlay.classList.remove('active');
                // 重新开始扫描
                setTimeout(function() {
                    showScanResult();
                }, 1000);
            };
            
            resultSecondaryBtn.onclick = function() {
                resultOverlay.classList.remove('active');
                scanScreen.classList.remove('active');
                mainScreen.classList.remove('hidden');
            };
        }
        
        // 显示结果覆盖层
        resultOverlay.classList.add('active');
    }
    
    // 初始化应用
    function init() {
        // 初始化用户积分
        updateUserPoints(30);
    }
    
    // 初始化应用
    init();
});