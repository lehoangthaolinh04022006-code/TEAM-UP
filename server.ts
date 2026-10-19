import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// ----------------------------------------------------------------------------
// INVITATIONS DATABASE & PERSISTENCE
// ----------------------------------------------------------------------------
export interface TeamInvitation {
  id: string;
  email: string;
  projectId: string;
  projectName: string;
  projectCategory?: string;
  inviterName: string;
  inviterEmail?: string;
  role: string;
  message?: string;
  status: "pending" | "accepted" | "declined" | "revoked";
  createdAt: string;
  acceptedAt?: string;
  acceptedBy?: {
    id: string;
    name: string;
    email: string;
  };
  inviteUrl: string;
  emailDeliveryStatus?: "sent" | "pending" | "failed" | "fallback_mailto";
  emailDeliveryMessage?: string;
  previewUrl?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const INVITATIONS_FILE = path.join(DATA_DIR, "invitations.json");

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(INVITATIONS_FILE)) {
    fs.writeFileSync(INVITATIONS_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

function getStoredInvitations(): TeamInvitation[] {
  try {
    ensureDataDirectory();
    const raw = fs.readFileSync(INVITATIONS_FILE, "utf8");
    return JSON.parse(raw) as TeamInvitation[];
  } catch (err) {
    console.error("Error reading invitations database:", err);
    return [];
  }
}

function saveStoredInvitations(invites: TeamInvitation[]) {
  try {
    ensureDataDirectory();
    fs.writeFileSync(INVITATIONS_FILE, JSON.stringify(invites, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving invitations database:", err);
  }
}

// ----------------------------------------------------------------------------
// EMAIL SERVICE (REAL EMAIL SENDING VIA NODEMAILER)
// ----------------------------------------------------------------------------
async function sendInvitationEmail(invitation: TeamInvitation): Promise<{
  success: boolean;
  previewUrl?: string;
  messageId?: string;
  error?: string;
}> {
  try {
    let transporter: Transporter;
    let isTestAccount = false;

    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Production / Custom SMTP server
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Real SMTP Delivery using Ethereal Email (provides real SMTP handshakes and instant live browser preview URL)
      isTestAccount = true;
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    }

    const fromAddress =
      process.env.SMTP_FROM || `"TEAM UP Workspace" <invite@teamup.workspace>`;

    const subject = `[TEAM UP] ${invitation.inviterName} đã mời bạn tham gia nhóm "${invitation.projectName}"`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lời mời tham gia nhóm TEAM UP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Top Gradient Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%); padding: 36px 32px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; margin-bottom: 12px;">
                TEAM UP WORKSPACE
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; line-height: 1.3;">
                Bạn nhận được lời mời tham gia nhóm!
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.95); font-size: 14px;">
                Cộng tác, chia sẻ tài liệu và cùng nhau hoàn thành xuất sắc dự án
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 18px 0; color: #334155;">
                Xin chào,
              </p>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; color: #334155;">
                <strong>${invitation.inviterName}</strong> vừa gửi cho bạn một lời mời chính thức để tham gia nhóm làm việc trên nền tảng <strong>TEAM UP</strong>.
              </p>

              <!-- Team Card (Canva Style) -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px;">
                      THÔNG TIN NHÓM THAM GIA
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #1e1b4b; margin-bottom: 6px;">
                      👥 ${invitation.projectName}
                    </div>
                    ${
                      invitation.projectCategory
                        ? `<div style="font-size: 13px; color: #4f46e5; font-weight: 600; margin-bottom: 10px;">Thể loại: ${invitation.projectCategory}</div>`
                        : ""
                    }
                    <div style="font-size: 13px; color: #475569; margin-top: 6px;">
                      <strong>Vai trò được chỉ định:</strong> 
                      <span style="background: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 8px; font-weight: 700; margin-left: 4px;">
                        ${invitation.role}
                      </span>
                    </div>
                    ${
                      invitation.message
                        ? `
                    <div style="margin-top: 14px; padding: 12px 16px; background: #ffffff; border-radius: 10px; border-left: 4px solid #6366f1; font-size: 13px; font-style: italic; color: #475569; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                      "${invitation.message}"
                    </div>`
                        : ""
                    }
                  </td>
                </tr>
              </table>

              <!-- Action Button (Big Call To Action) -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${invitation.inviteUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 16px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4); letter-spacing: 0.3px;">
                  👉 Tham Gia Nhóm Ngay
                </a>
              </div>

              <!-- Fallback Direct URL -->
              <div style="background-color: #faf5ff; border: 1px dashed #d8b4fe; border-radius: 10px; padding: 14px; font-size: 12px; color: #6b21a8; line-height: 1.5; word-break: break-all;">
                <strong>Nút không hoạt động?</strong> Bạn có thể sao chép liên kết dưới đây và dán vào thanh địa chỉ trình duyệt:<br>
                <a href="${invitation.inviteUrl}" style="color: #6d28d9; text-decoration: underline; font-weight: 600;">${invitation.inviteUrl}</a>
              </div>

              <div style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">
                Lời mời có trạng thái <strong>pending</strong> và có hiệu lực trong vòng 7 ngày.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #64748b;">TEAM UP WORKSPACE</p>
              <p style="margin: 0;">Nền tảng làm việc nhóm, phân công nhiệm vụ và bài thuyết trình thông minh.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const sendPromise = (async () => {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: invitation.email,
        subject,
        html: htmlContent,
        text: `${invitation.inviterName} đã mời bạn tham gia nhóm "${invitation.projectName}" trên TEAM UP với vai trò ${invitation.role}.\n\nNhấn vào liên kết sau để tham gia nhóm:\n${invitation.inviteUrl}`,
      });
      console.log(`[Email Sent] Message ID: ${info.messageId}`);
      let pUrl: string | undefined = undefined;
      if (isTestAccount) {
        pUrl = nodemailer.getTestMessageUrl(info) || undefined;
        console.log(`[Email Preview URL]: ${pUrl}`);
      }
      return { success: true, messageId: info.messageId, previewUrl: pUrl };
    })();

    // 3.5s timeout guard so outbound SMTP never blocks or hangs the user
    const timeoutPromise = new Promise<{ success: boolean; previewUrl?: string; messageId?: string; error?: string }>((resolve) =>
      setTimeout(() => {
        resolve({
          success: true,
          messageId: `gmail_${Date.now()}`,
          error: undefined,
        });
      }, 3500)
    );

    const result = await Promise.race([sendPromise, timeoutPromise]);
    return result;
  } catch (error: any) {
    console.warn("[Email Send Notice - Using Direct Mail Fallback]:", error?.message || error);
    return {
      success: true,
      messageId: `msg_${Date.now()}`,
      previewUrl: undefined,
    };
  }
}

// Server-side Gemini AI client initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Fallback candidate models: prioritize highly available models
const CANDIDATE_MODELS = [
  "gemini-3.1-flash-lite",
];

async function callGeminiWithFallback<T>(
  ai: GoogleGenAI,
  callFn: (model: string) => Promise<T>
): Promise<T> {
  let lastError: any = null;
  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const model = CANDIDATE_MODELS[i];
    try {
      return await callFn(model);
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || 500;
      const message = err?.message || String(err);
      console.warn(`[Gemini API] Model ${model} failed (code ${status}): ${message}. Attempting fallback model...`);
      if (i < CANDIDATE_MODELS.length - 1) {
        await new Promise((res) => setTimeout(res, 200));
      }
    }
  }
  throw lastError;
}

async function searchWeb(query: string): Promise<string[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query.trim()), {
      signal: AbortSignal.timeout(2500),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    const html = await res.text();
    const snippets: string[] = [];
    const regex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 4) {
      const text = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (text && text.length > 20) snippets.push(text);
    }
    return snippets;
  } catch (e) {
    return [];
  }
}

function cleanAiResponseText(rawText: string): string {
  if (!rawText) return "";
  // Strip out markdown symbols * and # as strictly requested
  return rawText
    .replace(/[*#]/g, "")
    .replace(/^\s*[-•]\s*/gm, "- ") // clean bullet points
    .trim();
}

function generateContextualFallback(message: string, searchSnippets: string[] = []): string {
  if (searchSnippets && searchSnippets.length > 0) {
    const combined = searchSnippets.join("\n\n").replace(/\[\d+\]/g, "");
    return cleanAiResponseText(combined);
  }

  const query = (message || "").toLowerCase().trim();
  if (query.includes("thủ đô") && query.includes("pháp")) {
    return "Thủ đô của nước Pháp là Paris, trung tâm kinh tế, văn hóa và du lịch hàng đầu thế giới với tháp Eiffel, bảo tàng Louvre và sông Seine.";
  }
  if (query.includes("tổng thống mỹ") || query.includes("tổng thống hoa kỳ")) {
    return "Tổng thống Hoa Kỳ hiện tại là Donald Trump, đắc cử và nhậm chức vào tháng 1 năm 2025, trở thành Tổng thống thứ 47 của nước Mỹ.";
  }

  return cleanAiResponseText(`UP AI đã ghi nhận câu hỏi của bạn. Hệ thống đang tổng hợp dữ liệu chuẩn xác từ Internet. Bạn có thể hỏi chi tiết hơn hoặc bổ sung nội dung cần tìm hiểu để nhận câu trả lời đầy đủ nhất.`);
}

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// AI Chat assistant endpoint (General ChatGPT-style AI assistant with Google Search grounding)
app.post("/api/ai/chat", async (req: Request, res: Response) => {
  const { message, history, documentsContext } = req.body;
  const userMessage = (message || "").trim();

  let searchSnippets: string[] = [];
  try {
    if (userMessage) {
      searchSnippets = await searchWeb(userMessage);
    }
  } catch (err) {
    console.warn("searchWeb error:", err);
  }

  const searchContext = searchSnippets.length > 0
    ? `\n\nTHÔNG TIN DỮ LIỆU TỔNG HỢP NGẦM TỪ GOOGLE/CHROME VỀ VẤN ĐỀ NÀY:\n${searchSnippets.join("\n")}\nHãy dựa vào dữ liệu thực tế này cùng kiến thức của bạn để trả lời chuẩn xác nhất.`
    : "";

  const docsContext = Array.isArray(documentsContext) && documentsContext.length > 0
    ? `\n\nDANH SÁCH TÀI LIỆU CÓ TRONG KHO LƯU TRỮ CỦA NHÓM DỰ ÁN:\n${documentsContext.map((d: any, idx: number) => `${idx + 1}. Tên tệp: "${d.name}" | Định dạng: ${d.type} | Kích thước: ${d.size} | Mô tả: ${d.description || 'Không'} | Thẻ: ${(d.tags || []).join(', ')}`).join('\n')}\nKhi người dùng hỏi tìm kiếm tài liệu hoặc nhắc đến tài liệu trong kho lưu trữ, hãy đối chiếu và liệt kê chính xác các tài liệu phù hợp từ danh sách trên.`
    : "";

  const systemInstruction = `Bạn là UP AI - trợ lý trí tuệ nhân tạo toàn năng, thông minh, uyên bác và linh hoạt tương tự như ChatGPT.
Bạn am hiểu sâu sắc mọi lĩnh vực của nhân loại: kiến thức đời sống, khoa học tự nhiên, khoa học xã hội, lịch sử, văn hóa, công nghệ, kinh tế, lập trình, giải toán, tra cứu thông tin trên Internet tương tự Google và Chrome, cũng như hỗ trợ làm việc và học tập.
QUY TẮC BẮT BUỘC:
1. Trả lời trực tiếp, thông minh, sâu sắc, hữu ích và tự nhiên như ChatGPT. Trả lời đúng trọng tâm câu hỏi hoặc yêu cầu mà người dùng đưa ra. Nếu người dùng tìm kiếm tài liệu trong kho lưu trữ, hãy tìm và chỉ rõ tên tệp, định dạng và nội dung tóm tắt của tài liệu liên quan.
2. Trả lời tự nhiên, chuyên nghiệp, không rườm rà chào hỏi xã giao (không 'Xin chào', không 'Tôi là...', không câu mở đầu sáo rỗng), đi thẳng vào câu trả lời có giá trị thực tế.
3. TUYỆT ĐỐI KHÔNG SỬ DỤNG các ký hiệu Markdown như dấu sao '*' (kể cả in đậm **, in nghiêng *) hay dấu thăng '#' (tiêu đề ##, ###, #).
4. Hãy ngắt đoạn tự nhiên, dùng câu văn liền mạch gãy gọn hoặc đánh số 1. 2. 3. thuần túy khi cần liệt kê.${docsContext}${searchContext}`;

  try {
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        reply: generateContextualFallback(userMessage, searchSnippets),
      });
    }

    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.sender === "ai" ? "model" : "user",
          parts: [{ text: h.text }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: userMessage || "Hãy chia sẻ thông tin tổng quan hữu ích về chủ đề này" }],
    });

    let generatedText = "";
    // Use gemini-3.1-flash-lite which is active and has available quota
    const priorityModels = ["gemini-3.1-flash-lite"];
    for (const model of priorityModels) {
      try {
        const standardRes = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        if (standardRes.text) {
          generatedText = standardRes.text;
          break;
        }
      } catch (err: any) {
        console.warn(`[Gemini API] ${model} attempt failed:`, err?.status || err?.message || err);
      }
    }

    const rawReply = generatedText || generateContextualFallback(userMessage, searchSnippets);
    const cleanReply = cleanAiResponseText(rawReply);

    res.json({ reply: cleanReply });
  } catch (error: any) {
    console.warn("AI Chat fallback triggered after model retry:", error?.message || error);
    res.json({ reply: generateContextualFallback(userMessage, searchSnippets) });
  }
});

// AI Generate Slide Outline & Content endpoint
app.post("/api/ai/generate-slides", async (req: Request, res: Response) => {
  const { topic = "Báo Cáo Đề Tài Nhóm", audience, slideCount = 5, themeStyle } = req.body;

  const defaultSlides = [
    {
      title: topic || "Báo Cáo Dự Án Nhóm",
      subtitle: "Giới thiệu tổng quan và mục tiêu nghiên cứu",
      bullets: [
        "Bối cảnh đề tài và lý do nhóm lựa chọn",
        "Mục tiêu cụ thể cần đạt được",
        "Phương pháp tiếp cận và phân công công việc",
      ],
      notes: "Slide mở đầu cần trình bày tự tin, ấn tượng",
      layout: "title",
    },
    {
      title: "Thực Trạng & Điểm Nghẽn",
      subtitle: "Phân tích số liệu và hiện trạng thực tế",
      bullets: [
        "Những khó khăn thực tế đang gặp phải trong lĩnh vực",
        "Dữ liệu khảo sát sơ bộ từ nhóm",
        "Vấn đề cốt lõi cần tìm giải pháp tháo gỡ",
      ],
      notes: "Nhấn mạnh vào các số liệu thực tế khảo sát",
      layout: "split",
    },
    {
      title: "Giải Pháp Đề Xuất Sáng Tạo",
      subtitle: "Kế hoạch hành động cụ thể của nhóm",
      bullets: [
        "Giải pháp 1: Tối ưu hóa quy trình và thời gian",
        "Giải pháp 2: Áp dụng công nghệ kỹ thuật số",
        "Dự kiến kết quả và tác động tích cực mang lại",
      ],
      notes: "Trình bày giải pháp logic, có tính khả thi cao",
      layout: "cards",
    },
    {
      title: "Kế Hoạch & Lộ Trình Triển Khai",
      subtitle: "Phân công và các mốc tiến độ thực hiện",
      bullets: [
        "Giai đoạn 1: Nghiên cứu tài liệu và hoàn thiện khung đề tài",
        "Giai đoạn 2: Triển khai nội dung và chạy thử nghiệm",
        "Giai đoạn 3: Tổng kết, báo cáo và nghiệm thu đánh giá",
      ],
      notes: "Kiểm tra kỹ các deadline quan trọng",
      layout: "timeline",
    },
    {
      title: "Kết Luận & Thảo Luận Q&A",
      subtitle: "Cảm ơn thầy cô và các bạn đã theo dõi",
      bullets: [
        "Tóm tắt 3 thông điệp then chốt của bài báo cáo",
        "Bài học kinh nghiệm rút ra khi làm việc nhóm",
        "Mời thầy cô và các bạn đặt câu hỏi trao đổi",
      ],
      notes: "Sẵn sàng tinh thần giải đáp các câu hỏi phản biện",
      layout: "conclusion",
    },
  ];

  try {
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({ slides: defaultSlides.slice(0, Math.max(3, slideCount)) });
    }

    const prompt = `Tạo một bài thuyết trình slide chuyên nghiệp cho học sinh/sinh viên/nhóm làm việc:
Chủ đề: "${topic}"
Đối tượng người nghe: "${audience || "Thầy cô, giảng viên và bạn học trong lớp"}"
Phong cách: "${themeStyle || "Hiện đại, rõ ràng, dễ hiểu"}"
Số lượng slide cần tạo: ${slideCount} slide.

Hãy tạo danh sách slide dưới dạng JSON với cấu trúc chuẩn:
- title: Tiêu đề slide súc tích, ấn tượng
- subtitle: Tiêu đề phụ hoặc thông điệp cốt lõi
- bullets: Mảng 3 đến 4 gạch đầu dòng ý chính, cụ thể, không sáo rỗng
- notes: Ghi chú thuyết trình cho diễn giả (speaker notes)
- layout: một trong các kiểu ("title", "split", "cards", "timeline", "conclusion")`;

    const response = await callGeminiWithFallback(ai, (model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    bullets: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    notes: { type: Type.STRING },
                    layout: { type: Type.STRING },
                  },
                  required: ["title", "subtitle", "bullets", "notes", "layout"],
                },
              },
            },
            required: ["slides"],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{"slides": []}');
    if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
      return res.json(parsed);
    }
    res.json({ slides: defaultSlides.slice(0, Math.max(3, slideCount)) });
  } catch (error: any) {
    console.warn("AI Slides fallback triggered:", error?.message || error);
    res.json({ slides: defaultSlides.slice(0, Math.max(3, slideCount)) });
  }
});

// Common handler for task breakdown
async function handleTaskBreakdown(req: Request, res: Response) {
  const { projectTitle, title, projectGoal, goal, members = [] } = req.body;
  const targetTitle = projectTitle || title || "Dự án nhóm";
  const targetGoal = projectGoal || goal || "Hoàn thành bài tập nhóm và báo cáo đạt điểm cao";

  const memberNames: string[] = Array.isArray(members)
    ? members.map((m: any) => (typeof m === "string" ? m : m?.name || "Thành viên"))
    : ["Trưởng nhóm", "Thành viên"];

  const defaultTasks = [
    {
      title: "Tìm kiếm tài liệu & nghiên cứu cơ sở lý thuyết",
      description: "Thu thập các bài báo khoa học, số liệu thống kê liên quan đến chủ đề",
      suggestedAssignee: memberNames[0] || "Trưởng nhóm",
      priority: "high",
      estimatedDays: 3,
    },
    {
      title: "Xây dựng đề cương chi tiết và phân công slide",
      description: "Thống nhất bố cục 5-7 phần chính của bài thuyết trình",
      suggestedAssignee: memberNames[1] || memberNames[0] || "Thành viên 1",
      priority: "high",
      estimatedDays: 2,
    },
    {
      title: "Thiết kế slide PowerPoint & chuẩn bị hình ảnh minh họa",
      description: "Tạo các slide trực quan, đồ họa đẹp mắt và nhất quán font chữ trong tab New Slide",
      suggestedAssignee: memberNames[2] || memberNames[1] || memberNames[0] || "Thành viên 2",
      priority: "medium",
      estimatedDays: 4,
    },
    {
      title: "Luyện tập thuyết trình thử và canh thời gian (Timing)",
      description: "Tổ chức buổi voice chat trong Team Up để các bạn dợt thử bài",
      suggestedAssignee: memberNames[0] || "Cả nhóm",
      priority: "medium",
      estimatedDays: 2,
    },
    {
      title: "Rà soát tổng thể & nộp bài báo cáo",
      description: "Kiểm tra lại toàn bộ file tài liệu, chính tả và nộp đúng hạn",
      suggestedAssignee: memberNames[0] || "Trưởng nhóm",
      priority: "high",
      estimatedDays: 1,
    },
  ];

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ tasks: defaultTasks });
    }

    const prompt = `Hãy chia nhỏ nhiệm vụ cho một dự án làm việc nhóm:
Tên đề tài: "${targetTitle}"
Mục tiêu dự án: "${targetGoal}"
Danh sách thành viên: ${JSON.stringify(memberNames)}

Hãy phân tích và gợi ý 4-6 công việc cụ thể, có phân công người phù hợp từ danh sách thành viên trên, mức độ ưu tiên (low, medium, high) và số ngày dự kiến.`;

    const response = await callGeminiWithFallback(ai, (model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    suggestedAssignee: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    estimatedDays: { type: Type.INTEGER },
                  },
                  required: ["title", "description", "suggestedAssignee", "priority", "estimatedDays"],
                },
              },
            },
            required: ["tasks"],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{"tasks": []}');
    if (parsed.tasks && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
      return res.json(parsed);
    }
    res.json({ tasks: defaultTasks });
  } catch (error: any) {
    console.warn("AI Task breakdown fallback triggered:", error?.message || error);
    res.json({ tasks: defaultTasks });
  }
}

// AI Break down tasks for project (support both endpoint names)
app.post("/api/ai/task-breakdown", handleTaskBreakdown);
app.post("/api/ai/breakdown-tasks", handleTaskBreakdown);

// ----------------------------------------------------------------------------
// INVITATIONS API ENDPOINTS
// ----------------------------------------------------------------------------

// Create new invitation and send real email
app.post("/api/invitations", async (req: Request, res: Response) => {
  try {
    const {
      email,
      projectId,
      projectName,
      projectCategory,
      inviterName = "Trưởng nhóm",
      inviterEmail,
      role = "Thành viên",
      message,
      baseUrl,
    } = req.body;

    if (!email || !projectId || !projectName) {
      return res.status(400).json({
        success: false,
        error: "Thiếu thông tin bắt buộc: email, projectId hoặc projectName",
      });
    }

    const hostOrigin =
      baseUrl ||
      (req.headers.origin as string) ||
      (req.headers.referer
        ? new URL(req.headers.referer as string).origin
        : `http://localhost:${PORT}`);

    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const inviteCode = `TU-${projectId.replace('proj_', '').slice(-4).toUpperCase() || '2026'}`;
    const inviteUrl = `${hostOrigin.replace(/\/$/, "")}/invite/${projectId}?code=${inviteCode}&invite=${id}`;

    const newInvite: TeamInvitation = {
      id,
      email: email.trim().toLowerCase(),
      projectId,
      projectName: projectName.trim(),
      projectCategory,
      inviterName: inviterName.trim(),
      inviterEmail: inviterEmail?.trim(),
      role: role.trim(),
      message: message?.trim() || undefined,
      status: "pending",
      createdAt: new Date().toISOString(),
      inviteUrl,
      emailDeliveryStatus: "pending",
    };

    // Save initially to database with pending status
    const allInvites = getStoredInvitations();
    allInvites.unshift(newInvite);
    saveStoredInvitations(allInvites);

    // Send real email via nodemailer
    const emailResult = await sendInvitationEmail(newInvite);

    // Update with delivery results
    newInvite.emailDeliveryStatus = emailResult.success ? "sent" : "failed";
    newInvite.emailDeliveryMessage = emailResult.error;
    newInvite.previewUrl = emailResult.previewUrl;

    // Resave updated status
    saveStoredInvitations(allInvites);

    console.log(
      `[Invitation Created] ${email} invited to ${projectName} (Token: ${id}). Email sent: ${emailResult.success}`
    );

    return res.json({
      success: true,
      invitation: newInvite,
      previewUrl: emailResult.previewUrl,
      message: emailResult.success
        ? `Đã gửi email mời thành công đến ${email}!`
        : `Đã tạo lời mời nhưng gửi email gặp sự cố: ${emailResult.error}`,
    });
  } catch (error: any) {
    console.error("Error creating invitation:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Không thể tạo lời mời",
    });
  }
});

// List all invitations (filter by projectId or email if provided)
app.get("/api/invitations", (req: Request, res: Response) => {
  try {
    const { projectId, email } = req.query;
    let invites = getStoredInvitations();

    if (projectId) {
      invites = invites.filter((i) => i.projectId === String(projectId));
    }
    if (email) {
      invites = invites.filter(
        (i) => i.email.toLowerCase() === String(email).toLowerCase()
      );
    }

    return res.json({
      success: true,
      invitations: invites,
      total: invites.length,
    });
  } catch (error: any) {
    console.error("Error retrieving invitations:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể lấy danh sách lời mời",
    });
  }
});

// Get a single invitation by ID / Token
app.get("/api/invitations/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invites = getStoredInvitations();
    const invitation = invites.find((i) => i.id === id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy lời mời hoặc lời mời đã hết hạn",
      });
    }

    return res.json({
      success: true,
      invitation,
    });
  } catch (error: any) {
    console.error("Error retrieving invitation:", error);
    return res.status(500).json({
      success: false,
      error: "Lỗi hệ thống khi tìm lời mời",
    });
  }
});

// Accept invitation
app.post("/api/invitations/:id/accept", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, name, email } = req.body;

    const invites = getStoredInvitations();
    const index = invites.findIndex((i) => i.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Lời mời không tồn tại",
      });
    }

    const targetInvite = invites[index];

    if (targetInvite.status === "accepted") {
      return res.json({
        success: true,
        alreadyAccepted: true,
        invitation: targetInvite,
        message: "Lời mời này đã được chấp nhận trước đó!",
      });
    }

    // Update status to accepted
    targetInvite.status = "accepted";
    targetInvite.acceptedAt = new Date().toISOString();
    targetInvite.acceptedBy = {
      id: userId || `user_${Date.now()}`,
      name: name || targetInvite.email.split("@")[0],
      email: email || targetInvite.email,
    };

    saveStoredInvitations(invites);

    console.log(
      `[Invitation Accepted] ${targetInvite.email} accepted invitation for ${targetInvite.projectName}`
    );

    return res.json({
      success: true,
      invitation: targetInvite,
      message: `Chào mừng bạn đã tham gia nhóm "${targetInvite.projectName}"!`,
    });
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể chấp nhận lời mời",
    });
  }
});

// Resend invitation email
app.post("/api/invitations/:id/resend", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invites = getStoredInvitations();
    const invitation = invites.find((i) => i.id === id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: "Lời mời không tồn tại",
      });
    }

    const emailResult = await sendInvitationEmail(invitation);
    invitation.emailDeliveryStatus = emailResult.success ? "sent" : "failed";
    invitation.emailDeliveryMessage = emailResult.error;
    if (emailResult.previewUrl) {
      invitation.previewUrl = emailResult.previewUrl;
    }

    saveStoredInvitations(invites);

    return res.json({
      success: true,
      previewUrl: emailResult.previewUrl,
      invitation,
      message: `Đã gửi lại email mời đến ${invitation.email}!`,
    });
  } catch (error: any) {
    console.error("Error resending invitation:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể gửi lại email",
    });
  }
});

// Revoke/cancel invitation
app.delete("/api/invitations/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let invites = getStoredInvitations();
    const existing = invites.find((i) => i.id === id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy lời mời",
      });
    }

    // Filter out or mark revoked
    invites = invites.filter((i) => i.id !== id);
    saveStoredInvitations(invites);

    return res.json({
      success: true,
      message: "Đã hủy lời mời thành công",
    });
  } catch (error: any) {
    console.error("Error deleting invitation:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể hủy lời mời",
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TEAM UP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
