export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      reply: "API chatbot chỉ nhận yêu cầu POST."
    });
  }

  try {
    const { message, profile, scope } = req.body || {};

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        reply: "Em hãy nhập câu hỏi trước nhé!"
      });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";

    if (!apiKey) {
      return res.status(500).json({
        reply: "Backend chưa đọc được GEMINI_API_KEY trong Vercel Environment Variables.",
        debug: "process.env.GEMINI_API_KEY is empty"
      });
    }

    const systemPrompt = `
Bạn là "Trợ lý Khoa học tự nhiên của thầy Hiếu", một trợ lý học tập thông minh, thân thiện, dí dỏm và dễ hiểu dành cho học sinh THCS.

Nhiệm vụ:
- Hỗ trợ học sinh học môn Khoa học tự nhiên.
- Trả lời linh hoạt theo câu hỏi học sinh, không bó hẹp vào một chủ đề cố định.
- Hỗ trợ kiến thức, bài tập, thí nghiệm, kỹ năng học, phương pháp ôn tập.
- Trả lời chính xác, dễ hiểu, hấp dẫn, không khô cứng.
- Nếu câu hỏi ngoài phạm vi học tập KHTN hoặc phương pháp học, hãy từ chối nhẹ nhàng và kéo học sinh về chủ đề học tập.

Phong cách:
- Vui vẻ, gần gũi, dí dỏm.
- Có ví dụ đời sống.
- Khi giải bài tập, ưu tiên gợi ý từng bước, không làm thay toàn bộ nếu học sinh chưa thử.
- Với thí nghiệm, luôn nhắc an toàn nếu có điện, nhiệt, hóa chất, thủy tinh hoặc vật sắc nhọn.
`;

    const userText = `
Thông tin người dùng:
${JSON.stringify(profile || {}, null, 2)}

Phạm vi web:
${scope || "Hỗ trợ học tập môn Khoa học tự nhiên"}

Câu hỏi của học sinh:
${message}
`;

    const geminiUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userText }]
          }
        ],
        generationConfig: {
          temperature: 0.75,
          maxOutputTokens: 900
        }
      })
    });

    const rawText = await geminiResponse.text();

    if (!geminiResponse.ok) {
      console.error("Gemini API error status:", geminiResponse.status);
      console.error("Gemini API error body:", rawText);

      return res.status(500).json({
        reply: "Gemini API đang trả lỗi. Xem debug để biết nguyên nhân.",
        debug: rawText.slice(0, 1500),
        status: geminiResponse.status,
        model
      });
    }

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseError) {
      return res.status(500).json({
        reply: "Gemini có phản hồi nhưng backend chưa đọc được JSON.",
        debug: rawText.slice(0, 1500)
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim() ||
      "Mình chưa tạo được câu trả lời phù hợp. Em thử hỏi lại ngắn hơn hoặc rõ hơn nhé!";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Chatbot Gemini API error:", error);

    return res.status(500).json({
      reply: "Backend chatbot gặp lỗi kết nối.",
      debug: String(error?.message || error)
    });
  }
}
