require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenAI } = require("@google/genai");
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));
app.use(cors());
app.use(express.static('public')); // Để chạy file index.html ở thư mục public

// Cấu hình lưu trữ ảnh học sinh chụp tạm thời vào thư mục 'uploads'
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận file ảnh'), false);
        }
    }
});

// Khởi tạo Google Gemini API (Lấy API Key trong file .env)
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

console.log('✓ Máy chủ khởi tạo thành công');
console.log('✓ Gemini API Key:', process.env.GEMINI_API_KEY ? '✅ Được cấu hình' : '❌ Chưa cấu hình');

/**
 * API 1: TIẾP NHẬN ẢNH CHỤP -> GỬI QUA GEMINI ĐỂ BÓC TÁCH ĐỀ
 * POST /api/upload-quiz
 */
app.post('/api/upload-quiz', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            message: "Không nhận được ảnh. Vui lòng chụp lại!" 
        });
    }

    try {
        console.log(`📸 Xử lý ảnh: ${req.file.filename}`);
        const imageBuffer = fs.readFileSync(req.file.path);
        
        const prompt = `
            Bạn là một trợ lý AI chuyên tạo bài tập ôn tập. 
            Hãy đọc bức ảnh chụp đề bài này và trích xuất toàn bộ câu hỏi (vừa trắc nghiệm vừa tự luận).
            
            HƯỚNG DẪN:
            - Đọc rõ mọi câu hỏi và đáp án trong ảnh
            - Đối với trắc nghiệm: Xác định chính xác 4 đáp án A, B, C, D và đáp án đúng
            - Đối với tự luận: Chỉ cần ghi lại câu hỏi, không cần đáp án
            - Tạo tiêu đề chủ đề phù hợp
            
            TRẢ VỀ JSON THUẦN (không bọc trong thẻ \`\`\`):
            {
              "quiz_title": "Tên chủ đề bài tập",
              "difficulty": "dễ/trung bình/khó",
              "questions": [
                {
                  "type": "multiple_choice",
                  "content": "Nội dung câu hỏi?",
                  "options": ["A: ...", "B: ...", "C: ...", "D: ..."],
                  "correct_answer": "Nội dung của đáp án đúng",
                  "points": 2.5
                },
                {
                  "type": "essay",
                  "content": "Nội dung câu hỏi tự luận?",
                  "points": 5
                }
              ]
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", 
            contents: [
                prompt,
                { 
                    inlineData: { 
                        data: imageBuffer.toString("base64"), 
                        mimeType: req.file.mimetype 
                    } 
                }
            ],
            generationConfig: { responseMimeType: "application/json" }
        });

        // Xóa file ảnh tạm sau khi xử lý xong để nhẹ bộ nhớ máy chủ
        fs.unlinkSync(req.file.path);
        console.log(`✓ Ảnh đã được xử lý và xóa`);

        const quizData = JSON.parse(response.text);
        
        // Validate dữ liệu
        if (!quizData.questions || quizData.questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Không tìm thấy câu hỏi trong ảnh. Vui lòng chụp rõ nét hơn!'
            });
        }

        res.json({ 
            success: true, 
            quiz: quizData,
            message: `Tạo thành công ${quizData.questions.length} câu hỏi`
        });

    } catch (error) {
        console.error("❌ Lỗi xử lý AI:", error.message);
        
        // Xóa file nếu xảy ra lỗi
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ 
            success: false, 
            message: error.message || "Lỗi khi xử lý ảnh. Vui lòng thử lại!"
        });
    }
});

/**
 * API 2: CHẤM ĐIỂM TRẮC NGHIỆM VÀ DÙNG AI SỬA LỖI TỰ LUẬN
 * POST /api/grade-quiz
 */
app.post('/api/grade-quiz', async (req, res) => {
    const { studentAnswers = [], essayAnswers = [], quiz_title = 'Bài Tập Ôn Tập' } = req.body;

    try {
        // 1. Tự chấm trắc nghiệm bằng cách so khớp chuỗi văn bản đáp án
        let mcScore = 0;
        let mcTotalPoints = 0;
        const mcDetails = [];

        studentAnswers.forEach((q, idx) => {
            const points = q.points || 2.5;
            mcTotalPoints += points;
            
            const isCorrect = q.student_answer && 
                            q.student_answer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
            
            if (isCorrect) {
                mcScore += points;
            }
            
            mcDetails.push({
                question_id: q.question_id || `q_${idx}`,
                question: q.question,
                student_answer: q.student_answer || '(Chưa trả lời)',
                correct_answer: q.correct_answer,
                is_correct: isCorrect,
                points_earned: isCorrect ? points : 0
            });
        });

        console.log(`📊 Trắc nghiệm: ${mcScore}/${mcTotalPoints} điểm`);

        // 2. Gửi các câu tự luận kèm bài làm học sinh qua AI để bắt lỗi sai
        let essayAnalysis = '';
        let essayScore = 0;
        let essayTotalPoints = 0;

        if (essayAnswers && essayAnswers.length > 0) {
            essayAnswers.forEach(q => {
                essayTotalPoints += q.points || 5;
            });

            try {
                let aiPrompt = `Bạn là một giáo viên giàu kinh nghiệm. Hãy phân tích bài làm tự luận của học sinh từng câu một.

Bài tập: ${quiz_title}

Hướng dẫn:
1. Đánh giá mỗi câu trả lời độc lập
2. Chỉ rõ những điểm tốt
3. Chỉ ra những lỗi sai (kiến thức, logic, chính tả)
4. Đưa ra gợi ý cải thiện cụ thể
5. Cho điểm từ 0-10 cho mỗi câu

Câu hỏi và bài làm:
`;
                essayAnswers.forEach((item, index) => {
                    aiPrompt += `\n---\nCâu ${index + 1}: ${item.question}\nBài làm: "${item.student_answer || '(Bỏ trống - không làm)'}"\nĐiểm tối đa: ${item.points || 5}`;
                });

                aiPrompt += `\n\nTrả về đánh giá chi tiết, thân thiện, chỉ rõ lỗi sai cho từng câu. Kết thúc bằng lời khuyến khích.`;

                const response = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: aiPrompt,
                    generationConfig: { temperature: 0.7 }
                });

                essayAnalysis = response.text;
                console.log('✓ AI đã phân tích bài tự luận');

                // Ước tính điểm tự luận dựa trên độ dài và chất lượng (đơn giản hóa)
                essayAnswers.forEach(q => {
                    const answerLength = (q.student_answer || '').length;
                    const maxPoints = q.points || 5;
                    
                    if (answerLength === 0) {
                        essayScore += 0;
                    } else if (answerLength < 20) {
                        essayScore += maxPoints * 0.3;
                    } else if (answerLength < 50) {
                        essayScore += maxPoints * 0.6;
                    } else {
                        essayScore += maxPoints * 0.9;
                    }
                });

            } catch (error) {
                console.warn('⚠️ Lỗi khi gọi AI:', error.message);
                essayAnalysis = "Hệ thống AI chấm bài tự luận đang bận. Vui lòng kiểm tra lại sau.";
            }
        }

        // 3. Tính tổng điểm
        const totalScore = mcScore + essayScore;
        const totalPoints = mcTotalPoints + essayTotalPoints;
        const percentage = totalPoints > 0 ? ((totalScore / totalPoints) * 100).toFixed(1) : 0;

        const result = {
            success: true,
            quiz_title,
            mcScore,
            mcTotalPoints,
            mcDetails,
            essayAnalysis,
            essayScore: Math.round(essayScore * 10) / 10,
            essayTotalPoints,
            totalScore: Math.round(totalScore * 10) / 10,
            totalPoints,
            percentage,
            summary: `Bạn đạt ${percentage}% - ${getGrade(percentage)}`
        };

        console.log(`📈 Kết quả: ${totalScore}/${totalPoints} (${percentage}%)`);
        res.json(result);

    } catch (error) {
        console.error("❌ Lỗi chấm bài:", error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Lỗi khi chấm bài. Vui lòng thử lại!"
        });
    }
});

/**
 * API 3: GENERATE QUIZ TỪ TOPIC
 * POST /api/generate-quiz
 */
app.post('/api/generate-quiz', async (req, res) => {
    const { topic = 'Ôn tập chung', numQuestions = 5 } = req.body;

    try {
        console.log(`📚 Tạo bài tập về: ${topic}`);
        
        const prompt = `
            Tạo một bộ ${numQuestions} câu hỏi ôn tập về chủ đề: "${topic}"
            
            Yêu cầu:
            - Mix giữa câu trắc nghiệm (60%) và tự luận (40%)
            - Câu trắc nghiệm có 4 đáp án A, B, C, D
            - Các câu hỏi có mức độ từ dễ đến khó
            - Đáp án phải chính xác
            
            Trả về JSON (CHỈ JSON):
            {
              "quiz_title": "Bài ôn tập về ${topic}",
              "difficulty": "trung bình",
              "questions": [...]
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            generationConfig: { responseMimeType: "application/json" }
        });

        const quizData = JSON.parse(response.text);
        res.json({ success: true, quiz: quizData });

    } catch (error) {
        console.error("❌ Lỗi tạo bài tập:", error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Lỗi khi tạo bài tập"
        });
    }
});

/**
 * API 4: ANALYZE & IMPROVE ANSWER
 * POST /api/analyze-answer
 */
app.post('/api/analyze-answer', async (req, res) => {
    const { question = '', studentAnswer = '', correct_answer = '' } = req.body;

    try {
        const prompt = `
            Phân tích bài làm của học sinh:
            
            Câu hỏi: "${question}"
            Đáp án của học sinh: "${studentAnswer}"
            ${correct_answer ? `Đáp án tham khảo: "${correct_answer}"` : ''}
            
            Hãy cung cấp:
            1. Điểm mạnh của bài làm
            2. Điểm yếu/lỗi
            3. Đáp án tốt nhất
            4. Gợi ý cải thiện
            
            Trả về dưới dạng JSON:
            {
              "strengths": ["điểm 1", "điểm 2"],
              "weaknesses": ["lỗi 1", "lỗi 2"],
              "model_answer": "đáp án tham khảo",
              "improvements": "gợi ý cụ thể"
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            generationConfig: { responseMimeType: "application/json" }
        });

        const analysis = JSON.parse(response.text);
        res.json({ success: true, analysis });

    } catch (error) {
        console.error("❌ Lỗi phân tích:", error.message);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Lỗi khi phân tích bài làm"
        });
    }
});

/**
 * HEALTH CHECK ENDPOINT
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

/**
 * ERROR HANDLER MIDDLEWARE
 */
app.use((err, req, res, next) => {
    console.error('❌ Lỗi:', err.message);
    
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ 
            success: false, 
            message: 'Lỗi upload file: ' + err.message 
        });
    }
    
    res.status(500).json({ 
        success: false, 
        message: err.message || 'Lỗi máy chủ'
    });
});

/**
 * HỖ TRỢ FUNCTION: Xếp loại điểm
 */
function getGrade(percentage) {
    const score = parseFloat(percentage);
    if (score >= 90) return '🌟 Xuất sắc (A)';
    if (score >= 80) return '⭐ Tốt (B)';
    if (score >= 70) return '👍 Khá (C)';
    if (score >= 60) return '📚 Trung bình (D)';
    return '❌ Cần cố gắng (F)';
}

/**
 * START SERVER
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 ========================================`);
    console.log(`🚀 Máy chủ ôn tập AI đang chạy tại:`);
    console.log(`🚀 http://localhost:${PORT}`);
    console.log(`🚀 ========================================\n`);
});
