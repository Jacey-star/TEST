let items = document.querySelectorAll(".item");

function setActive() {
    items.forEach((item) => {
        item.classList.remove("active");
        item.querySelectorAll(".info-icon").forEach(icon => {
            icon.classList.add("disabled");
        });
    });
    this.classList.add("active");
    setTimeout(() => {
        this.querySelectorAll(".info-icon").forEach(icon => {
            icon.classList.remove("disabled");
        });
    }, 500);
}

items.forEach((item) => {
    item.addEventListener('click', setActive);
});



document.addEventListener("DOMContentLoaded", function () {
    // Retrieve user profile picture and obtain the latest profile picture from the backend -- 获取用户头像，从后端获取最新头像，前后端连接
    fetch('/api/user/avatar', {
        method: 'GET',
        headers: {
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let avatarUrl = data.avatarUrl;
            let avatarImg = document.querySelector(".avatar-link img");
            if (avatarImg) {
                avatarImg.src = avatarUrl;
            }
        }
    })
    .catch(err => {
        console.error("Failed to fetch avatar:", err);
    });
    // -----------------------------------------------------------------------------------------后面不需要连接了---------

    // popup keep close when do not need them
    document.querySelectorAll(".modal").forEach(modal => {
        modal.style.display = "none";
    });
    // popup open & close
    window.openModal = function (modalId) {
        let modal = document.getElementById(modalId);
        let icon = document.querySelector(`[onclick="openModal('${modalId}')"]`);
        if (icon && icon.classList.contains("disabled")) {
            return;
        }
        if (modal) {
            modal.style.display = "flex";
        }
    };
    window.closeModal = function (modalId) {
        let modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = "none";
        }
    };
    window.onclick = function (event) {
        document.querySelectorAll(".modal").forEach(modal => {
            if (event.target === modal) {
                modal.style.display = "none";
            }
        });
    };
});
