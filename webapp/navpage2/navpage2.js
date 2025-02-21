let items = document.querySelectorAll(".item");

function setActive() {
    // 先移除所有 item 的 active 状态，并禁用所有问号点击
    // First, remove the 'active' status from all items and disable all question mark clicks
    items.forEach((item) => {
        item.classList.remove("active");
        item.querySelectorAll(".info-icon").forEach(icon => {
            icon.classList.add("disabled"); // 禁用问号点击 / Disable question mark click
        });
    });

    // 给当前 item 添加 active 状态
    // Add the 'active' status to the currently clicked item
    this.classList.add("active");

    // 0.5 秒后（500ms）再启用问号点击
    // Enable question mark click after 0.5 seconds (500ms)
    setTimeout(() => {
        this.querySelectorAll(".info-icon").forEach(icon => {
            icon.classList.remove("disabled"); // 允许点击问号 / Allow question mark click
        });
    }, 500);
}

// 绑定点击事件
// Bind click event to each item
items.forEach((item) => {
    item.addEventListener('click', setActive);
});

// 排行榜积分
// Leaderboard score fetching
document.addEventListener("DOMContentLoaded", function () {
    fetch("https://your-api.com/get_user_info", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer YOUR_ACCESS_TOKEN"
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById("user-score").innerText = data.score;
            document.getElementById("user-rank").innerText = data.rank;
        } else {
            document.getElementById("user-score").innerText = "Fetch failed"; // 获取失败
            document.getElementById("user-rank").innerText = "Fetch failed"; // 获取失败
        }
    })
    .catch(error => {
        console.error("Failed to fetch user info:", error);
        document.getElementById("user-score").innerText = "Load failed"; // 加载失败
        document.getElementById("user-rank").innerText = "Load failed"; // 加载失败
    });
});

// 弹窗 / Modal handling
document.addEventListener("DOMContentLoaded", function () {
    // 确保页面刷新时所有弹窗都是隐藏的
    // Ensure all modals are hidden on page load
    document.querySelectorAll(".modal").forEach(modal => {
        modal.style.display = "none";
    });

    // 打开弹窗（增加判断，防止误触）
    // Open modal (Added a check to prevent accidental clicks)
    window.openModal = function (modalId) {
        let modal = document.getElementById(modalId);
        let icon = document.querySelector(`[onclick="openModal('${modalId}')"]`);

        // 如果问号图标处于禁用状态，则阻止弹窗打开
        // If the question mark icon is disabled, prevent the modal from opening
        if (icon && icon.classList.contains("disabled")) {
            return;
        }

        if (modal) {
            modal.style.display = "flex"; // 仅在用户点击时显示弹窗 / Show the modal only when the user clicks
        }
    };

    // 关闭弹窗
    // Close modal
    window.closeModal = function (modalId) {
        let modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = "none"; // 确保点击关闭按钮后隐藏弹窗 / Ensure modal is hidden after clicking close button
        }
    };

    // 点击空白区域关闭弹窗
    // Close modal when clicking outside of it
    window.onclick = function (event) {
        document.querySelectorAll(".modal").forEach(modal => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    };
});
