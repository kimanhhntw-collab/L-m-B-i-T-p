// Thiết lập thời gian làm bài: 45 phút (đổi ra giây)
let totalTime = 45 * 60; 
const timerDisplay = document.querySelector('#time');
const quizForm = document.getElementById('quiz-form');

const countdown = setInterval(() => {
    let minutes = Math.floor(totalTime / 60);
    let seconds = totalTime % 60;

    // Định dạng hiển thị luôn có 2 chữ số (VD: 05:09)
    minutes = minutes < 10 ? "0" + minutes : minutes;
    seconds = seconds < 10 ? "0" + seconds : seconds;
    timerDisplay.textContent = minutes + ":" + seconds;

    // Nếu hết giờ
    if (totalTime <= 0) {
        clearInterval(countdown);
        timerDisplay.textContent = "HẾT GIỜ!";
        alert("Đã hết thời gian làm bài! Hệ thống sẽ tự động nộp bài của bạn.");
        
        // Tự động kích hoạt hành động nộp bài
        quizForm.dispatchEvent(new Event('submit')); 
    }
    totalTime--;
}, 1000);

// Xử lý khi bấm nút Nộp bài (hoặc bị ép nộp do hết giờ)
quizForm.addEventListener('submit', (e) => {
    e.preventDefault();
    clearInterval(countdown); // Dừng đồng hồ lại
    
    // Thu thập dữ liệu bài làm để gửi lên Server
    const formData = new FormData(quizForm);
    console.log("Dữ liệu chuẩn bị gửi lên Server...", formData);
    
    // Gọi hàm gửi dữ liệu ở phần dưới...
    submitQuiz(formData);
});

/**
 * Hàm gửi bài làm lên Server
 * @param {FormData} formData - Dữ liệu form từ bài quiz
 */
async function submitQuiz(formData) {
    try {
        // Hiển thị trạng thái đang gửi
        const submitBtn = quizForm.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = '🔄 Đang gửi bài...';

        // Gửi dữ liệu lên Server
        const response = await fetch('/api/submit-quiz', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success) {
            alert('✅ Nộp bài thành công!\nMã bài nộp: ' + result.submission_id);
            console.log('Submission Result:', result);
            
            // Chuyển hướng sang trang kết quả
            window.location.href = `/results/${result.submission_id}`;
        } else {
            alert('❌ Lỗi: ' + result.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Nộp Bài Làm';
        }
    } catch (error) {
        console.error('Lỗi khi gửi bài:', error);
        alert('❌ Lỗi kết nối! Vui lòng thử lại.');
        const submitBtn = quizForm.querySelector('.submit-btn');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Nộp Bài Làm';
    }
}

/**
 * Hàm cảnh báo trước khi thoát/làm mới trang
 */
window.addEventListener('beforeunload', (e) => {
    if (totalTime > 0) {
        e.preventDefault();
        e.returnValue = 'Bạn chưa nộp bài! Dữ liệu sẽ bị mất nếu bạn thoát.';
    }
});

/**
 * Hàm tự động lưu bài (draft) sau mỗi 30 giây
 */
setInterval(() => {
    if (totalTime > 0) {
        const formData = new FormData(quizForm);
        saveDraft(formData);
    }
}, 30000); // 30 giây

/**
 * Hàm lưu bản nháp (draft) bài làm
 * @param {FormData} formData - Dữ liệu form
 */
async function saveDraft(formData) {
    try {
        const response = await fetch('/api/save-draft', {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (response.ok) {
            console.log('✓ Bản nháp đã được lưu tự động');
        }
    } catch (error) {
        console.warn('Không thể lưu bản nháp:', error);
    }
}

/**
 * Hàm xử lý upload file
 */
const fileInputs = document.querySelectorAll('input[type="file"]');
fileInputs.forEach(input => {
    input.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            // Kiểm tra kích thước file (tối đa 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                alert('❌ File quá lớn! Kích thước tối đa là 5MB');
                e.target.value = ''; // Reset input
                return;
            }

            // Kiểm tra định dạng file
            const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
            if (!allowedTypes.includes(file.type)) {
                alert('❌ Định dạng file không được hỗ trợ! Chỉ chấp nhận: JPG, PNG, GIF, PDF');
                e.target.value = ''; // Reset input
                return;
            }

            console.log('✓ File hợp lệ:', file.name);
        }
    });
});
