function goBack() {
    window.history.back();
}


// Avatar
function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
        showPopup("Please select an image file.");
        return;
    }
    
    const formData = new FormData();
    formData.append('avatar', file);
    
    // Call the backend interface to upload the avatar, and the frontend backend connection may here----------!!!!!
    // ------------------------------------------------------------------------------前后端连接大概在这里
    fetch('/api/user/avatar', {
        method: 'POST',
        body: formData,
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const newAvatarUrl = data.avatarUrl;
            document.getElementById('current-avatar').src = newAvatarUrl;
            document.getElementById("modal-avatar").src = newAvatarUrl;
            closeModal();
            showPopup("Avatar updated successfully.");
        } else {
            closeModal();
            showPopup("Avatar update failed, please try again.");
        }
    })
    .catch(err => {
        console.error("Error updating avatar:", err);
        closeModal();
        showPopup("Avatar update error, please try again later.");
    });
}



// update avatar - popup window  更换头像-弹窗
function openModal() {
    const currentAvatarSrc = document.getElementById("current-avatar").src;
    document.getElementById("modal-avatar").src = currentAvatarSrc;
    document.getElementById("avatar-modal").style.display = "block";
}
function closeModal() {
    document.getElementById("avatar-modal").style.display = "none";
}
var popupDuration = 3000;
function showPopup(message = "Success!") {
    const popup = document.getElementById('success-popup');
    const content = popup.querySelector('.success-popup-content');
    content.textContent = message;
    popup.style.display = 'flex';
    setTimeout(function() {
        popup.style.display = 'none';
    }, popupDuration);
}


//Get username at the greeting area
// 打招呼处获取用户名------------------------------------------------------------------------------需要获取数据库用户名
window.addEventListener("DOMContentLoaded", function() {
    var dbUsername = "Alice"; // -----------Replace with the username returned by the backend - 替换为后端返回的用户名
    const displayUsername = document.getElementById('display-username');
    if (displayUsername) {
      displayUsername.textContent = dbUsername;
    }
});



// icon - edit & save----------------------------------------------------------The display and modification of personal information
// -----------------------------------------------------------------------------------------------------个人信息的显示及更改，也要后端
function toggleEdit(fieldId, btn) {
    const inputField = document.getElementById(fieldId);
    if (inputField.disabled) {
        inputField.disabled = false;
        inputField.focus();
        inputField.style.backgroundColor = "#fff";
        inputField.style.border = "2px solid #658a65";
        btn.innerHTML = `<i class="fa fa-check-square-o"></i>`;
    } else {
        inputField.disabled = true;
        inputField.style.backgroundColor = "#eee";
        inputField.style.border = "1px solid #ccc";
        const updatedValue = inputField.value;
        console.log(`保存 ${fieldId}: ${updatedValue}`);
        btn.innerHTML = `<i class="fa fa-pencil-square-o"></i>`;
    }
}


//set new password-----------------------------------------------------------------------------store in database
// 修改密码，重设密码的网页放这里，登录页重设密码还有问题--------------------------------------------更改密码也要存储到数据库
function changePassword() {
    showCustomConfirm(
        "Do you want to set new password? ",
        function() {
            //Add the logic for changing passwords here
            // 这里添加修改密码的逻辑
        },
        function() {}
    );
}
//log out - 登出
function logout() {
    showCustomConfirm(
        "Are you sure to log out of the account? ",
        function() {
            window.location.href = "../logininterface/index.html";
        },
        function() {}
    );
}
// delect account - 注销账号
function deleteAccount() {
    showCustomConfirm(
        "Are you sure you want to delect your account? Your account and content will be delected permanently and cannot be restored.",
        function() {
            // connect ------------------------------------------------------- connect - 连接
            fetch('/api/user/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showPopup("Account cancellation successful. ");
                    setTimeout(function(){
                        window.location.href = "../logininterface/index.html";
                    }, 3000);
                } else {
                    showPopup("Account cancellation failed, please try again later.");
                }
            })
            .catch(err => {
                console.error("Error deleting account:", err);
                showPopup("An error occurred while logging out of the account. Please try again later.");
            });
        },
        function() {}
    );
}



// ok button 
function showCustomConfirm(message, onConfirm, onCancel) {
    const confirmModal = document.getElementById('confirm-modal');
    const confirmMessage = document.getElementById('confirm-message');
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');

    confirmMessage.textContent = message;
    confirmModal.style.display = 'flex';

    function handleConfirm() {
        cleanup();
        if (onConfirm) onConfirm();
    }
    function handleCancel() {
        cleanup();
        if (onCancel) onCancel();
    }
    function cleanup() {
        confirmModal.style.display = 'none';
        okBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    }
    okBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}
