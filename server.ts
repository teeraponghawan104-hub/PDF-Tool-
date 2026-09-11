import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024 // 30MB
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API Routes
  app.post("/api/analyze-image", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "กรุณาเลือกไฟล์รูปภาพที่ต้องการวิเคราะห์" });
      }

      const prompt = req.body.prompt || "กรุณาวิเคราะห์รูปภาพนี้อย่างละเอียดและอธิบายสิ่งที่เห็น";
      const requestedModel = req.body.model || "gemini-3.1-pro-preview";
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Normalize mimeType for image compatibility (especially mobile uploads)
      let mimeType = req.file.mimetype || "image/jpeg";
      if (!mimeType.startsWith("image/") || mimeType === "application/octet-stream") {
        const name = req.file.originalname.toLowerCase();
        if (name.endsWith(".png")) mimeType = "image/png";
        else if (name.endsWith(".webp")) mimeType = "image/webp";
        else if (name.endsWith(".gif")) mimeType = "image/gif";
        else mimeType = "image/jpeg";
      }

      const imagePart = {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType,
        },
      };

      // Primary recommended model is gemini-3.1-pro-preview, with fallbacks if temporary 503 high demand occurs
      const modelsToTry = [
        requestedModel,
        "gemini-3.1-pro-preview",
        "gemini-flash-latest",
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash"
      ];
      const uniqueModels = Array.from(new Set(modelsToTry));

      let lastError: any = null;
      let textResult = "";
      let usedModel = "";

      for (const model of uniqueModels) {
        // Try each model with up to 2 attempts if 503/temporary spike occurs
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: {
                parts: [imagePart, { text: prompt }],
              },
              config: {
                systemInstruction: "คุณคือผู้ช่วย AI ผู้เชี่ยวชาญด้านการวิเคราะห์รูปภาพ การอ่านเอกสาร และการสกัดข้อมูล ให้ตอบคำถามและอธิบายรายละเอียดภาพอย่างแม่นยำ เป็นมิตร ชัดเจน จัดรูปแบบด้วย Markdown ให้อ่านง่าย หากคำถามเป็นภาษาไทยให้ตอบเป็นภาษาไทยเสมอ",
              }
            });

            if (response?.text) {
              textResult = response.text;
              usedModel = model;
              break;
            }
          } catch (err: any) {
            console.warn(`Model ${model} attempt ${attempt + 1} error:`, err?.message || err);
            lastError = err;
            const errMsg = err?.message || "";
            // If temporary spike, wait briefly before retrying
            if (errMsg.includes("503") || errMsg.includes("high demand") || errMsg.includes("UNAVAILABLE") || errMsg.includes("overloaded") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED")) {
              await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
            } else {
              // Non-503 error, move to next model
              break;
            }
          }
        }

        if (textResult) break;
      }

      if (textResult) {
        return res.json({ result: textResult, model: usedModel });
      }

      const errorMsg = lastError?.message || "";
      if (errorMsg.includes("404") || errorMsg.includes("400") || errorMsg.includes("not found") || errorMsg.includes("INVALID_ARGUMENT")) {
        return res.status(400).json({
          error: "ชื่อโมเดล AI ที่ระบุไม่ถูกต้องหรือไม่มีอยู่จริง กรุณาติดต่อนักพัฒนา",
        });
      }
      if (errorMsg.includes("503") || errorMsg.includes("high demand") || errorMsg.includes("UNAVAILABLE") || errorMsg.includes("overloaded")) {
        return res.status(503).json({
          error: "ขณะนี้ระบบ AI กำลังมีผู้ใช้งานหนาแน่นชั่วคราว กรุณากดปุ่มลองวิเคราะห์ใหม่อีกครั้ง",
        });
      }
      if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({
          error: "เกินขีดจำกัดการเรียกใช้งานชั่วคราว กรุณารอสักครู่แล้วกดลองใหม่อีกครั้ง",
        });
      }

      res.status(500).json({ error: lastError?.message || "ไม่สามารถวิเคราะห์รูปภาพได้ในขณะนี้" });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      res.status(500).json({ error: error.message || "เกิดข้อผิดพลาดในการประมวลผลรูปภาพ" });
    }
  });

  // Global error handler for JSON responses (e.g. Multer errors)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled server error:", err);
    res.status(500).json({ error: err.message || "Internal server error" });
  });

  // Serve static files from public
  app.use(express.static(path.join(process.cwd(), "public")));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { overlay: false } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
