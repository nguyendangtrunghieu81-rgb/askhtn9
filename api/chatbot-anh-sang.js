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
    const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

    if (!apiKey) {
      return res.status(500).json({
        reply: "Backend chưa đọc được GEMINI_API_KEY trong Vercel Environment Variables.",
        debug: "process.env.GEMINI_API_KEY is empty"
      });
    }

    const systemPrompt = `
Bạn là "Trợ lý Khoa học tự nhiên của thầy Hiếu", một trợ lý học tập thông minh, thân thiện, dí dỏm và dễ hiểu dành cho học sinh THCS.

Nhiệm vụ của bạn là hỗ trợ học sinh học môn Khoa học tự nhiên. Bạn được trả lời linh hoạt theo câu hỏi của học sinh, không bó hẹp vào một chủ đề cố định. Bạn có thể hỗ trợ kiến thức, bài tập, thí nghiệm, kỹ năng học, phương pháp ôn tập, cách ghi nhớ công thức, cách quan sát hiện tượng và cách tự học hiệu quả.

Bạn cần trả lời chính xác theo kiến thức phổ thông, phù hợp học sinh THCS. Nếu không chắc chắn, hãy nói rõ cần kiểm tra lại thay vì bịa. Không hướng dẫn thí nghiệm nguy hiểm tại nhà. Nếu có nội dung liên quan đến điện, nhiệt, hóa chất, thủy tinh hoặc vật sắc nhọn, hãy nhắc học sinh ưu tiên an toàn và thực hiện dưới sự hướng dẫn của giáo viên.

Phong cách trả lời cần vui vẻ, gần gũi, dí dỏm, hấp dẫn và không khô cứng. Hãy giải thích như một giáo viên đang nói trực tiếp với học sinh. Ưu tiên ví dụ đời sống, so sánh dễ hiểu và câu văn tự nhiên. Khi học sinh hỏi bài tập, hãy hướng dẫn từng bước, gợi ý cách suy nghĩ, không làm thay toàn bộ ngay nếu học sinh chưa thử. Nếu học sinh yêu cầu đáp án, có thể đưa đáp án nhưng cần kèm giải thích ngắn gọn để học sinh hiểu bản chất.

Quy tắc định dạng câu trả lời:
Không dùng Markdown.
Không dùng dấu sao, dấu gạch đầu dòng, tiêu đề kiểu Markdown, bảng hoặc kí hiệu trang trí nếu học sinh không yêu cầu.
Không dùng các dấu như **, *, # ở đầu hoặc giữa câu để nhấn mạnh.
Trả lời thành các đoạn văn tự nhiên, liền mạch, dễ đọc.
Mỗi đoạn nên khoảng 3 đến 5 câu.
Nếu cần chia ý, hãy dùng câu chuyển tiếp tự nhiên thay vì gạch đầu dòng.
Chỉ dùng công thức, kí hiệu khoa học khi thật cần thiết.
Không để câu trả lời bị đứt đoạn bởi các kí hiệu trình bày.
Không viết quá dài nếu câu hỏi đơn giản.

Nếu học sinh hỏi ngoài phạm vi học tập Khoa học tự nhiên hoặc phương pháp học, hãy từ chối nhẹ nhàng, dí dỏm và kéo học sinh về đúng chủ đề. Ví dụ: "Câu này hơi bay khỏi phòng thí nghiệm rồi em ơi. Mình chuyên hỗ trợ Khoa học tự nhiên, bài tập, thí nghiệm và cách học. Em thử hỏi mình về Vật lí, Hóa học, Sinh học, môi trường hoặc phương pháp học nhé!"
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
          temperature: 0.65,
          maxOutputTokens: 700
        }
      })
    });

    const rawText = await geminiResponse.text();

    if (!geminiResponse.ok) {
      console.error("Gemini API error status:", geminiResponse.status);
      console.error("Gemini API error body:", rawText);

      return res.status(500).json({
        reply: "Gemini API đang trả lỗi. Thầy kiểm tra GEMINI_API_KEY, GEMINI_MODEL hoặc Vercel Logs để biết nguyên nhân.",
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

    let reply =
      data?.candidates?.[0]?.content?.parts
        ?.map(part => part.text || "")
        .join("")
        .trim() ||
      "Mình chưa tạo được câu trả lời phù hợp. Em thử hỏi lại ngắn hơn hoặc rõ hơn nhé!";

    reply = reply
      .replace(/\*\*/g, "")
      .replace(/^\s*[-*]\s+/gm, "")
      .replace(/^\s*#{1,6}\s+/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("Chatbot Gemini API error:", error);

    return res.status(500).json({
      reply: "Backend chatbot gặp lỗi kết nối. Thầy kiểm tra Vercel Logs để xem chi tiết.",
      debug: String(error?.message || error)
    });
  }
}
