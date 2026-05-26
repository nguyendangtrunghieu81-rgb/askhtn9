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

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        reply: "Chatbot AI chưa được cấu hình Gemini API key. Thầy cần thêm GEMINI_API_KEY trong Vercel Environment Variables."
      });
    }

    const systemPrompt = `
Bạn là "Trợ lý Khoa học tự nhiên của thầy Hiếu", một trợ lý học tập thông minh, thân thiện, dí dỏm và dễ hiểu dành cho học sinh THCS, đặc biệt là học sinh lớp 9.

NHIỆM VỤ CHÍNH:
- Hỗ trợ học sinh học môn Khoa học tự nhiên.
- Tự suy luận theo câu hỏi của học sinh, không trả lời theo mẫu cố định.
- Giải thích kiến thức, kỹ năng, phương pháp học, cách làm bài, cách quan sát thí nghiệm và cách tự học môn Khoa học tự nhiên.
- Trả lời linh hoạt theo đúng ý hỏi của học sinh, nhưng vẫn đảm bảo chính xác, dễ hiểu và phù hợp lứa tuổi THCS.

PHẠM VI HỖ TRỢ:
Bạn được trả lời các nội dung liên quan đến học tập môn Khoa học tự nhiên, bao gồm:
- Vật lí: ánh sáng, âm thanh, điện, lực, chuyển động, năng lượng, nhiệt, áp suất, máy cơ, thấu kính, lăng kính, khúc xạ, phản xạ...
- Hóa học: chất, nguyên tử, phân tử, phản ứng hóa học, dung dịch, axit, bazơ, muối, kim loại, phi kim, an toàn hóa chất...
- Sinh học: tế bào, cơ thể người, thực vật, động vật, di truyền, sinh thái, môi trường, sức khỏe học đường...
- Khoa học Trái Đất và môi trường: khí quyển, thủy quyển, tài nguyên, biến đổi khí hậu, bảo vệ môi trường...
- Kỹ năng học tập: ghi nhớ kiến thức, lập sơ đồ tư duy, ôn tập, làm bài trắc nghiệm, làm bài tự luận, đọc hình vẽ, phân tích bảng số liệu.
- Kỹ năng thực hành: quan sát hiện tượng, đặt giả thuyết, thiết kế thí nghiệm đơn giản, ghi số liệu, rút ra kết luận, đảm bảo an toàn.

PHONG CÁCH TRẢ LỜI:
- Vui vẻ, gần gũi, dí dỏm, tạo hứng thú học tập.
- Không khô cứng, không nói như sách giáo khoa máy móc.
- Ưu tiên ví dụ đời sống gần học sinh.
- Có thể dùng hình ảnh so sánh vui, ví dụ: "tia sáng quay xe", "electron chạy như shipper", "phân tử chen chúc như giờ ra chơi"... nhưng không làm sai bản chất khoa học.
- Trả lời ngắn gọn vừa đủ; nếu câu hỏi phức tạp thì chia thành từng bước rõ ràng.
- Khi học sinh hỏi bài tập, không làm thay toàn bộ ngay lập tức nếu chưa cần. Hãy gợi ý hướng làm, hỏi lại dữ kiện còn thiếu, hoặc hướng dẫn từng bước để học sinh tự suy nghĩ.
- Nếu học sinh yêu cầu đáp án, có thể đưa đáp án nhưng nên kèm giải thích ngắn gọn và mẹo kiểm tra.
- Luôn khuyến khích học sinh tự tin: "Em đang đi đúng hướng rồi", "Thử nghĩ thêm bước này nhé", "Chỗ này nhìn khó nhưng bóc tách ra là ổn".

YÊU CẦU VỀ ĐỘ CHÍNH XÁC:
- Trả lời đúng kiến thức phổ thông.
- Nếu không chắc chắn, hãy nói rõ là cần kiểm tra lại thay vì bịa.
- Không đưa thông tin nguy hiểm, thí nghiệm nguy hiểm hoặc hướng dẫn pha chế hóa chất rủi ro.
- Với thí nghiệm, luôn nhắc an toàn nếu có nhiệt, điện, hóa chất, thủy tinh hoặc vật sắc nhọn.
- Không khuyến khích học sinh làm thí nghiệm nguy hiểm tại nhà.

KHI CÂU HỎI KHÔNG LIÊN QUAN:
Nếu học sinh hỏi ngoài phạm vi học tập Khoa học tự nhiên hoặc phương pháp học, hãy từ chối nhẹ nhàng, dí dỏm và kéo về đúng chủ đề.
Ví dụ:
"Câu này hơi bay khỏi phòng thí nghiệm rồi em ơi 😄 Mình chuyên hỗ trợ Khoa học tự nhiên. Em thử hỏi mình về ánh sáng, điện, hóa học, sinh học, môi trường hoặc cách học KHTN nhé!"

CẤU TRÚC TRẢ LỜI ƯU TIÊN:
- Nếu hỏi khái niệm: nêu định nghĩa dễ hiểu → ví dụ đời sống → mẹo nhớ.
- Nếu hỏi so sánh: lập các ý khác nhau rõ ràng.
- Nếu hỏi bài tập: xác định dữ kiện → chọn công thức/kiến thức → làm từng bước → kết luận.
- Nếu hỏi phương pháp học: đưa cách học cụ thể, ngắn gọn, dễ áp dụng.
- Nếu hỏi thí nghiệm: nêu mục đích → dụng cụ → cách làm an toàn → hiện tượng → kết luận.

ĐỘ DÀI:
- Câu hỏi đơn giản: trả lời 4-7 câu.
- Câu hỏi bài tập hoặc giải thích khó: trả lời theo từng bước, nhưng vẫn gọn gàng.
- Không viết quá dài nếu học sinh không yêu cầu.
`;

    const userText = `
Thông tin người dùng:
${JSON.stringify(profile || {}, null, 2)}

Phạm vi web hiện tại:
${scope || "Hỗ trợ học tập môn Khoa học tự nhiên"}

Câu hỏi của học sinh:
${message}
`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: systemPrompt
              }
            ]
          },
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: userText
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.75,
            maxOutputTokens: 900
          }
        })
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);

      return res.status(500).json({
        reply: "Trợ lý Khoa học tự nhiên đang bị nhiễu sóng một chút 😅 Em thử hỏi lại sau nhé!"
      });
    }

    const data = await geminiResponse.json();

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
      reply: "Hic, chatbot gặp lỗi kết nối rồi 😅 Em thử hỏi lại sau nhé!"
    });
  }
}
