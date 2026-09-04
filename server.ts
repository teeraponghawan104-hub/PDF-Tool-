import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
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

      const prompt = req.body.prompt || "Analyze this image and describe what you see in detail.";
      
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const imagePart = {
        inlineData: {
          data: req.file.buffer.toString("base64"),
          mimeType: req.file.mimetype || "image/jpeg",
        },
      };

      // Primary recommended model is gemini-3.8-flash with fallback models if temporary 503 high demand occurs
      const modelsToTry = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-2.5-flash"];
      let lastError: any = null;
      let textResult = "";

      for (const model of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: {
              parts: [imagePart, { text: prompt }],
            },
          });

          if (response?.text) {
            textResult = response.text;
            break;
          }
        } catch (err: any) {
          console.warn(`Model ${model} encounter error, attempting fallback:`, err?.message || err);
          lastError = err;
          // If 503 or transient unavailability, wait briefly before fallback
          await new Promise((resolve) => setTimeout(resolve, 600));
        }
      }

      if (textResult) {
        return res.json({ result: textResult });
      }

      const errorMsg = lastError?.message || "";
      if (errorMsg.includes("503") || errorMsg.includes("high demand") || errorMsg.includes("UNAVAILABLE")) {
        return res.status(503).json({
          error: "ขณะนี้ระบบ AI (Gemini) กำลังมีผู้ใช้งานหนาแน่นชั่วคราว กรุณากดลองวิเคราะห์ใหม่อีกครั้งในอีกสักครู่",
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
      server: { middlewareMode: true },
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
