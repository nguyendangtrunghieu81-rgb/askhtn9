export default async function handler(req, res) {
  // Cho phép gọi API từ web khác domain, ví dụ GitHub Pages hoặc tên miền riêng
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

    const apiKey = process.env.OPENAI_API_KEY || process.env.APITCHATBOT;

    if (!apiKey) {
      return res.status(500).json({
        reply: "Chatbot AI chưa được cấu hình API key. Thầy cần thêm OPENAI_API_KEY trong Vercel Environment Variables."
      });
    }

    const systemPrompt = `
Bạn là Trợ lý Ánh Sáng của thầy Hiếu, hỗ trợ học sinh lớp 9 học chủ đề Ánh sáng trong môn Khoa học tự nhiên 9, bộ Kết nối tri thức.

Chỉ trả lời trong phạm vi:
- Khúc xạ ánh sáng
- Phản xạ toàn phần
- Lăng kính
- Thấu kính
- Ảnh qua thấu kính
- Đo tiêu cự thấu kính hội tụ
- Kính lúp
- Bài tập thấu kính
- Tổng ôn chủ đề ánh sáng

Nếu câu hỏi ngoài phạm vi, hãy từ chối nhẹ nhàng, dí dỏm và hướng học sinh quay lại chủ đề Ánh sáng.
Giải thích ngắn gọn, trực quan, dễ hiểu, có ví dụ đời sống.
Ưu tiên gợi ý từng bước, không làm thay toàn bộ bài nếu học sinh chưa thử.
Ngôn ngữ thân thiện, vui vẻ, phù hợp học sinh THCS.
`;

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content:
`Thông tin người dùng:
${JSON.stringify(profile || {}, null, 2)}

Phạm vi hỗ trợ:
${scope || "KHTN 9 - Kết nối tri thức - Chủ đề Ánh sáng"}

Câu hỏi:
${message}`
          }
        ],
        temperature: 0.7,
        max_output_tokens: 700
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);

      return res.status(500).json({
        reply: "Trợ lý Ánh Sáng đang bị nhiễu tia một chút 😅 Em thử hỏi lại sau nhé!"
      });
    }

    const data = await openaiResponse.json();

    const reply =
      data.output_text ||
      data.output?.map(item =>
        item.content?.map(content => content.text).join("")
      ).join("\n") ||
      "Mình chưa tạo được câu trả lời phù hợp. Em thử hỏi lại ngắn hơn nhé!";

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Chatbot API error:", error);

    return res.status(500).json({
      reply: "Hic, chatbot gặp lỗi kết nối rồi 😅 Em thử hỏi lại sau nhé!"
    });
  }
}
