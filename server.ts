import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
let pdfParse: any;
try {
  pdfParse = require("pdf-parse");
} catch (e) {
  console.error("Lỗi khi nạp pdf-parse:", e);
}

import mammoth from "mammoth";
import * as xlsx from "xlsx";
import { google } from "googleapis";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const upload = multer({ 
    dest: uploadsDir,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  // API: Process Documents
  app.post("/api/process-documents", upload.array("files"), async (req: any, res) => {
    const processedFiles: string[] = [];
    try {
      console.log("--- Bắt đầu xử lý yêu cầu upload ---");
      const files = (req.files as any[]) || [];
      const manualText = req.body.text || "";
      let combinedText = manualText + "\n";

      console.log(`Nhận được ${files.length} file. Văn bản đi kèm: ${manualText.length} ký tự.`);

      for (const file of files) {
        const filePath = file.path;
        processedFiles.push(filePath);
        const mimeType = file.mimetype;
        const originalName = file.originalname;
        const extension = path.extname(originalName).toLowerCase();

        console.log(`Đang xử lý: ${originalName} | Mime: ${mimeType} | Ext: ${extension}`);

        try {
          // Xử lý PDF
          if (mimeType === "application/pdf" || extension === ".pdf") {
            const dataBuffer = fs.readFileSync(filePath);
            // Đảm bảo pdfParse là một hàm
            const parseFunc = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
            if (typeof parseFunc !== 'function') {
              throw new Error("Thư viện pdf-parse không được nạp đúng cách.");
            }
            const data = await parseFunc(dataBuffer);
            combinedText += `--- Nội dung từ file PDF: ${originalName} ---\n${data.text}\n`;
          } 
          // Xử lý Word
          else if (
            mimeType.includes("wordprocessingml") || 
            mimeType.includes("msword") || 
            extension === ".docx" || 
            extension === ".doc"
          ) {
            const result = await mammoth.extractRawText({ path: filePath });
            combinedText += `--- Nội dung từ file Word: ${originalName} ---\n${result.value}\n`;
          } 
          // Xử lý Excel / CSV
          else if (
            mimeType.includes("spreadsheetml") || 
            mimeType.includes("csv") || 
            extension === ".xlsx" || 
            extension === ".xls" || 
            extension === ".csv"
          ) {
            const workbook = xlsx.readFile(filePath);
            let sheetText = "";
            workbook.SheetNames.forEach(name => {
              const sheet = workbook.Sheets[name];
              sheetText += `[Sheet: ${name}]\n${xlsx.utils.sheet_to_txt(sheet)}\n`;
            });
            combinedText += `--- Nội dung từ file Excel/CSV: ${originalName} ---\n${sheetText}\n`;
          } 
          // Xử lý Text
          else if (mimeType.startsWith("text/") || extension === ".txt" || extension === ".md") {
            const content = fs.readFileSync(filePath, "utf-8");
            combinedText += `--- Nội dung từ file Text: ${originalName} ---\n${content}\n`;
          } 
          else {
            console.warn(`Định dạng không hỗ trợ nhưng vẫn cố gắng đọc dưới dạng text: ${originalName}`);
            try {
              const content = fs.readFileSync(filePath, "utf-8");
              combinedText += `--- Nội dung từ file (Unknown): ${originalName} ---\n${content}\n`;
            } catch (e) {
              console.error(`Không thể đọc file ${originalName} dưới dạng văn bản.`);
            }
          }
          console.log(`Xử lý thành công file: ${originalName}`);
        } catch (fileError: any) {
          console.error(`Lỗi khi xử lý file ${originalName}:`, fileError.message);
        }
      }

      // Dọn dẹp file sau khi xử lý xong
      for (const f of processedFiles) {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }

      if (!combinedText.trim() || combinedText.trim().length < 10) {
        return res.status(400).json({ 
          error: "Không tìm thấy nội dung văn bản hợp lệ trong các file đã tải lên.",
          details: "Vui lòng đảm bảo file không bị trống và thuộc định dạng được hỗ trợ (PDF, Word, Excel, Text)."
        });
      }

      console.log(`Tổng hợp nội dung thành công. Độ dài: ${combinedText.length} ký tự.`);
      
      res.json({
        extractedText: combinedText
      });

    } catch (error: any) {
      console.error("Lỗi chi tiết xử lý tài liệu:", {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        error: "Lỗi máy chủ khi trích xuất văn bản từ tài liệu", 
        details: error.message
      });
    }
  });

  // API: Chatbot - REMOVED (Moving to frontend)
  
  // API: Sync Google Sheets (Placeholder - requires service account)
  app.post("/api/sync-sheets", async (req, res) => {
    // Logic đồng bộ Google Sheets sẽ được triển khai ở đây
    res.json({ message: "Đang đồng bộ..." });
  });

  // Handle 404 for API routes
  app.use("/api/*", (req, res) => {
    res.status(404).json({ error: "API endpoint not found" });
  });

  // Vite middleware
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
