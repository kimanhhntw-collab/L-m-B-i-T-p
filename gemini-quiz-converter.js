const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");

// Khởi tạo Gemini API
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "API_KEY_GEMINI_CỦA_BẠN" });

/**
 * Hàm xử lý khi học sinh tải ảnh đề bài lên
 * @param {string} imagePath - Đường dẫn tới file ảnh
 * @returns {Promise<Object>} - Cấu trúc bài tập dưới dạng JSON
 */
async function convertImageToQuiz(imagePath) {
    try {
        // 1. Đọc file ảnh mà học sinh đã chụp gửi lên server
        const imageBuffer = fs.readFileSync(imagePath);
        
        // 2. Viết câu lệnh (Prompt) yêu cầu AI đọc ảnh và chuyển thành cấu trúc đề bài
        const prompt = `
            Hãy đọc bức ảnh chụp đề bài này. Hãy trích xuất tất cả các câu hỏi có trong ảnh và phân loại chúng.
            Trả về kết quả dưới dạng cấu trúc JSON chính xác theo mẫu sau, không thêm bớt từ ngữ nào khác ngoài JSON:
            {
              "quiz_title": "Tên bài tập ôn tập (tự bạn đặt dựa trên nội dung ảnh)",
              "questions": [
                {
                  "type": "multiple_choice",
                  "content": "Nội dung câu hỏi...",
                  "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
                  "correct_answer": "Đáp án đúng đoán được dựa trên kiến thức (nếu có)"
                },
                {
                  "type": "essay",
                  "content": "Nội dung câu hỏi tự luận..."
                }
              ]
            }
        `;

        // 3. Gọi Gemini API truyền cả ảnh và Prompt
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Dòng mô hình đọc ảnh cực nhanh và rẻ
            contents: [
                prompt,
                {
                    inlineData: {
                        data: imageBuffer.toString("base64"),
                        mimeType: "image/jpeg" // Hoặc image/png tùy định dạng ảnh chụp
                    }
                }
            ],
            // Ép AI luôn phải trả về định dạng JSON chuẩn để lập trình viên dễ dùng
            generationConfig: { responseMimeType: "application/json" } 
        });

        // 4. Kết quả nhận được là cấu trúc bài tập hoàn chỉnh
        const quizData = JSON.parse(response.text);
        console.log("✓ Đã chuyển ảnh thành bài tập thành công:", quizData.quiz_title);
        
        return quizData; // Trả về để Frontend vẽ thành các ô trắc nghiệm/tự luận cho học sinh làm

    } catch (error) {
        console.error("❌ Lỗi xử lý ảnh:", error);
        throw error;
    }
}

/**
 * Hàm chấm tự động essay dựa trên AI
 * @param {string} studentAnswer - Câu trả lời của học sinh
 * @param {string} questionContent - Nội dung câu hỏi
 * @param {number} maxPoints - Điểm tối đa của câu
 * @returns {Promise<Object>} - Kết quả chấm: {score, feedback, explanation}
 */
async function gradeEssayWithAI(studentAnswer, questionContent, maxPoints = 5) {
    try {
        const gradingPrompt = `
            Hãy chấm bài tự luận sau đây:
            
            Câu hỏi: "${questionContent}"
            Câu trả lời của học sinh: "${studentAnswer}"
            
            Điểm tối đa: ${maxPoints} điểm
            
            Hãy đánh giá và trả về kết quả dưới dạng JSON (CHỈ JSON, không có text khác):
            {
              "score": điểm cho câu này (0 đến ${maxPoints}),
              "feedback": "Nhận xét ngắn về bài làm",
              "explanation": "Giải thích chi tiết lỗi/điểm mạnh",
              "suggestions": "Gợi ý cải thiện"
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [gradingPrompt],
            generationConfig: { responseMimeType: "application/json" }
        });

        const gradingResult = JSON.parse(response.text);
        console.log(`✓ Đã chấm essay: ${gradingResult.score}/${maxPoints} điểm`);
        
        return gradingResult;

    } catch (error) {
        console.error("❌ Lỗi khi chấm essay:", error);
        throw error;
    }
}

/**
 * Hàm tạo bài tập ôn tập từ một chủ đề
 * @param {string} topic - Chủ đề bài tập (ví dụ: "HTML CSS cơ bản")
 * @param {number} numQuestions - Số lượng câu hỏi muốn tạo
 * @returns {Promise<Object>} - Cấu trúc bài tập
 */
async function generateQuizFromTopic(topic, numQuestions = 5) {
    try {
        const generationPrompt = `
            Hãy tạo một bộ ${numQuestions} câu hỏi ôn tập về chủ đề: "${topic}"
            
            Yêu cầu:
            - Mix giữa câu trắc nghiệm (multiple_choice) và tự luận (essay)
            - Câu trắc nghiệm có 4 đáp án
            - Các câu hỏi phải có mức độ từ dễ đến khó
            - Đáp án phải chính xác
            
            Trả về kết quả dưới dạng JSON (CHỈ JSON):
            {
              "quiz_title": "Bài ôn tập về ${topic}",
              "difficulty": "trung bình",
              "questions": [
                {
                  "id": "q_001",
                  "type": "multiple_choice hoặc essay",
                  "content": "nội dung câu hỏi",
                  "options": ["A", "B", "C", "D"] (nếu là trắc nghiệm),
                  "correct_answer": "đáp án đúng",
                  "points": 2.5 hoặc 5
                }
              ]
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [generationPrompt],
            generationConfig: { responseMimeType: "application/json" }
        });

        const quizData = JSON.parse(response.text);
        console.log(`✓ Đã tạo bài tập: ${quizData.quiz_title} (${quizData.questions.length} câu)`);
        
        return quizData;

    } catch (error) {
        console.error("❌ Lỗi khi tạo bài tập:", error);
        throw error;
    }
}

/**
 * Hàm phân tích và cải thiện bài làm
 * @param {string} studentAnswer - Bài làm của học sinh
 * @param {string} questionContent - Nội dung câu hỏi
 * @returns {Promise<Object>} - Phân tích chi tiết
 */
async function analyzeAndImproveAnswer(studentAnswer, questionContent) {
    try {
        const analysisPrompt = `
            Phân tích bài làm của học sinh:
            
            Câu hỏi: "${questionContent}"
            Bài làm: "${studentAnswer}"
            
            Hãy phân tích chi tiết và trả về JSON với:
            - Điểm mạnh của bài làm
            - Điểm yếu/lỗi
            - Đáp án mẫu tốt nhất
            - Gợi ý cải thiện cụ thể
            
            Trả về JSON (CHỈ JSON):
            {
              "strengths": ["điểm mạnh 1", "điểm mạnh 2"],
              "weaknesses": ["điểm yếu 1", "điểm yếu 2"],
              "model_answer": "đáp án tham khảo hoàn chỉnh",
              "improvements": "các gợi ý cải thiện cụ thể",
              "learning_resources": ["tài liệu 1", "tài liệu 2"]
            }
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [analysisPrompt],
            generationConfig: { responseMimeType: "application/json" }
        });

        const analysis = JSON.parse(response.text);
        console.log("✓ Đã phân tích bài làm thành công");
        
        return analysis;

    } catch (error) {
        console.error("❌ Lỗi khi phân tích bài làm:", error);
        throw error;
    }
}

// Export các hàm để sử dụng trong các file khác
module.exports = {
    convertImageToQuiz,
    gradeEssayWithAI,
    generateQuizFromTopic,
    analyzeAndImproveAnswer
};
