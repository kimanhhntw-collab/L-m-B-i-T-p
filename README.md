# 📚 AI Smart Quiz System

Hệ thống ôn tập thông minh sử dụng AI (Google Gemini) để tự động tạo bài tập từ ảnh chụp đề bài và chấm điểm tự động.

## ✨ Tính Năng

- 📸 **Chụp Ảnh Đề Bài** - Sử dụng camera điện thoại hoặc tải ảnh từ máy tính
- 🤖 **AI Xử Lý Ảnh** - Google Gemini tự động đọc ảnh và tạo bài tập
- ⏱️ **Đếm Ngược Thời Gian** - Hỗ trợ làm bài trong thời gian giới hạn
- 📊 **Chấm Điểm Tự Động** - Tự động chấm trắc nghiệm, AI chấm tự luận
- 💬 **Phân Tích Chi Tiết** - AI cung cấp nhận xét, sửa lỗi từng câu
- 📈 **Báo Cáo Kết Quả** - Hiển thị điểm, mức độ, gợi ý cải thiện

## 🛠️ Công Nghệ Sử Dụng

**Frontend:**
- HTML5 / CSS3 / JavaScript
- Responsive Design
- Local Storage API

**Backend:**
- Node.js + Express.js
- Google Gemini AI API
- Multer (File Upload)
- CORS

**Other:**
- dotenv (Environment Variables)
- Nodemon (Development)

## 📋 Yêu Cầu

- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **Gemini API Key** từ https://makersuite.google.com/app/apikey

## 🚀 Cài Đặt & Chạy

### 1️⃣ Clone Repository
```bash
git clone <repository-url>
cd L-m-B-i-T-p
```

### 2️⃣ Cài Đặt Dependencies
```bash
npm install
```

### 3️⃣ Cấu Hình Environment

Sao chép file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

Mở file `.env` và thêm Gemini API Key của bạn:
```env
GEMINI_API_KEY=AIzaSy...YOUR_KEY_HERE...
PORT=3000
NODE_ENV=development
```

### 4️⃣ Chạy Server

**Development (với auto-reload):**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server sẽ chạy tại: **http://localhost:3000**

## 📖 Cách Sử Dụng

### Luồng Làm Việc Chính:

1. **Mở ứng dụng** → http://localhost:3000
2. **Chụp ảnh đề bài** hoặc tải file ảnh lên
3. **AI xử lý** → Tự động tạo bài tập
4. **Làm bài** → Trả lời câu hỏi trong thời gian giới hạn
5. **Nộp bài** → Hệ thống chấm điểm tự động
6. **Xem kết quả** → Nhận nhận xét chi tiết từ AI

## 🔌 API Endpoints

### 1. Upload & Chuyển Đổi Ảnh
```
POST /api/upload-quiz
- Body: FormData với file 'image'
- Response: { success, quiz }
```

### 2. Chấm Bài & Phân Tích
```
POST /api/grade-quiz
- Body: { studentAnswers[], essayAnswers[] }
- Response: { mcScore, essayAnalysis, totalScore }
```

### 3. Tạo Bài Tập Từ Topic
```
POST /api/generate-quiz
- Body: { topic, numQuestions }
- Response: { success, quiz }
```

### 4. Phân Tích Câu Trả Lời
```
POST /api/analyze-answer
- Body: { question, studentAnswer, correct_answer }
- Response: { analysis }
```

### 5. Health Check
```
GET /api/health
- Response: { status, timestamp, uptime }
```

## 📁 Cấu Trúc Thư Mục

```
L-m-B-i-T-p/
├── public/
│   ├── index.html              # Trang chính
│   ├── camera-upload.html      # Trang chụp ảnh
│   ├── quiz-timer.js           # Logic timer
│   └── style.css               # Styling
├── server.js                   # Backend Express
├── gemini-quiz-converter.js    # AI processing functions
├── questions.json              # Database câu hỏi
├── submissions.json            # Lưu bài làm
├── package.json                # Dependencies
├── .env.example                # Template config
├── .env                        # Actual config (ignored by git)
├── .gitignore                  # Git ignore rules
├── README.md                   # This file
└── uploads/                    # Temp image uploads (auto-created)
```

## 🔐 Bảo Mật

- ✅ **API Key**: Lưu trong `.env`, không commit lên Git
- ✅ **File Upload**: Validate định dạng & kích thước
- ✅ **CORS**: Cấu hình strict origins
- ✅ **Cleanup**: Xóa tự động file tạm thời

## 🐳 Docker Setup (Optional)

```bash
# Build image
docker build -t quiz-system .

# Run container
docker run -p 3000:3000 --env-file .env quiz-system
```

Hoặc dùng Docker Compose:
```bash
docker-compose up -d
```

## 🧪 Testing

```bash
# Kiểm tra server chạy
curl http://localhost:3000/api/health

# Upload ảnh test
curl -F "image=@test-image.jpg" http://localhost:3000/api/upload-quiz
```

## 📊 Ví Dụ Request/Response

### Upload Ảnh
**Request:**
```bash
POST /api/upload-quiz
Content-Type: multipart/form-data

[image file]
```

**Response:**
```json
{
  "success": true,
  "quiz": {
    "quiz_title": "Bài tập Tiếng Anh lớp 10",
    "questions": [
      {
        "type": "multiple_choice",
        "content": "What is the capital of France?",
        "options": ["London", "Paris", "Berlin", "Madrid"],
        "correct_answer": "Paris",
        "points": 2.5
      }
    ]
  }
}
```

### Chấm Bài
**Request:**
```bash
POST /api/grade-quiz
Content-Type: application/json

{
  "studentAnswers": [
    {
      "question": "What is the capital of France?",
      "student_answer": "Paris",
      "correct_answer": "Paris",
      "points": 2.5
    }
  ],
  "essayAnswers": [
    {
      "question": "Why is Paris famous?",
      "student_answer": "Paris is famous for...",
      "points": 5
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "mcScore": 2.5,
  "mcTotalPoints": 2.5,
  "totalScore": 7.5,
  "totalPoints": 7.5,
  "percentage": 100,
  "summary": "Bạn đạt 100% - 🌟 Xuất sắc (A)",
  "essayAnalysis": "AI feedback here..."
}
```

## 🐛 Troubleshooting

### Lỗi: "GEMINI_API_KEY not found"
→ Kiểm tra file `.env` và đảm bảo `GEMINI_API_KEY` đã được thiết lập

### Lỗi: "Port 3000 already in use"
→ Thay đổi PORT trong `.env` hoặc tắt process đang sử dụng port 3000

### Lỗi: "Cannot find module 'express'"
→ Chạy `npm install` để cài đặt dependencies

### Ảnh upload không được xử lý
→ Kiểm tra:
- File là ảnh (JPG, PNG, GIF, WEBP)
- Kích thước < 10MB
- Kết nối mạng bình thường

## 📞 Hỗ Trợ & Liên Hệ

- 📧 Email: kimanhhntw@gmail.com
- 🐙 GitHub: https://github.com/kimanhhntw-collab

## 📜 License

MIT License - xem file LICENSE để chi tiết

## 🎯 Roadmap

- [ ] Thêm authentication/login
- [ ] Database MongoDB/PostgreSQL
- [ ] Lịch sử bài làm
- [ ] Export báo cáo PDF
- [ ] Mobile app native
- [ ] Multi-language support
- [ ] Real-time collaboration
- [ ] Advanced analytics

## 👥 Đóng Góp

Hân hạnh nhận pull requests! Vui lòng:
1. Fork repository
2. Tạo branch feature (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Made with ❤️ by kimanhhntw-collab**
