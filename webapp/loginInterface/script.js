document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    console.log('Form found:', form);
    
    if (form) {
        const submitButton = form.querySelector('.sign-btn');
        const loadingText = form.querySelector('.loading-text');
        const modal = document.querySelector('.success-modal');
        const otherLoadingTexts = document.querySelectorAll('.loading-text:not(.loading)');
        otherLoadingTexts.forEach(text => text.remove());
        
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            console.log('Form submitted');
 
//TEST
            try {
                // 只显示按钮的loading
                if (submitButton) submitButton.style.display = 'none';
                if (loadingText) loadingText.style.display = 'block';
                
                // 显示弹窗
                if (modal) {
                    modal.style.display = 'flex';
                    const modalLoading = modal.querySelector('.modal-loading');
                    const modalSuccess = modal.querySelector('.modal-success');
                    
                    if (modalLoading) modalLoading.style.display = 'block';
                    if (modalSuccess) modalSuccess.style.display = 'none';
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    if (modalLoading) modalLoading.style.display = 'none';
                    if (modalSuccess) modalSuccess.style.display = 'block';
                }
                
            } catch (error) {
                console.error('Error:', error);
                if (modal) modal.style.display = 'none';
                if (submitButton) submitButton.style.display = 'block';
                if (loadingText) loadingText.style.display = 'none';
                alert('An error occurred. Please try again.');
            }
        });
    }
});

// try {
//     // loading
//     if (submitButton) submitButton.style.display = 'none';
//     if (loadingText) loadingText.style.display = 'block';

//     // Gather form data 收集表单数据
//     const formData = new FormData(form);
//     const data = {};
//     formData.forEach((value, key) => {
//         if (value && key !== 'remember') {
//             data[key] = value;
//         }
//     });

//     //Call API  调用API 
//     const response = await fetch(apiUrl, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'X-CSRFToken': getCookie('csrftoken'),
//         },
//         credentials: 'include',
//         body: JSON.stringify(data)
//     });

//     const result = await response.json();

//     if (response.ok) {
//         // Show popup 显示弹窗
//         if (modal) {
//             modal.style.display = 'flex';
//             const modalLoading = modal.querySelector('.modal-loading');
//             const modalSuccess = modal.querySelector('.modal-success');
            
//             if (modalLoading) modalLoading.style.display = 'block';
//             if (modalSuccess) modalSuccess.style.display = 'none';
            
//             await new Promise(resolve => setTimeout(resolve, 2000));
            
//             if (modalLoading) modalLoading.style.display = 'none';
//             if (modalSuccess) modalSuccess.style.display = 'block';
//         }

//         if (isLoginForm && result.user) {
//             localStorage.setItem('user', JSON.stringify(result.user));
//         }
//     } else {
//         throw new Error(result.message || 'Operation failed');
//     }
    
// } catch (error) {
//     console.error('Error:', error);
//     const errorMessage = document.querySelector('.error-message');
//     if (errorMessage) {
//         errorMessage.textContent = error.message || 'Server error, please try again later';
//         errorMessage.style.display = 'block';
//     }
//     if (modal) modal.style.display = 'none';
//     if (submitButton) submitButton.style.display = 'block';
//     if (loadingText) loadingText.style.display = 'none';
// }
// });
// }
// });


// get CSRF Token function
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Get current logged-in user info
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        console.log('Current logged-in user:', user);
        return user;
    }
    return null;
}