import AIHistory from "../models/AIHistory.js";
import User from "../models/User.js";
import * as geminiService from "../services/gemini.service.js";

// Gọi AI - Sử dụng Gemini API thật
export const askAI = async (req, res) => {
  try {
    const { prompt, type, excelContext } = req.body;
    const user = req.user;

    console.log("=== AI REQUEST RECEIVED ===");
    console.log("Type:", type);
    console.log("Prompt:", prompt?.substring(0, 100));
    console.log("Excel Context received:", !!excelContext);
    if (excelContext) {
      console.log("Context details:", {
        sheetName: excelContext.sheetName,
        rowCount: excelContext.rowCount,
        columnCount: excelContext.columnCount,
        hasHeaders: excelContext.headers?.length > 0,
        hasSampleData: excelContext.sampleData?.length > 0,
      });
    }

    // Validation
    if (!type) {
      return res
        .status(400)
        .json({ message: "Thiếu type (formula/analysis/guide)" });
    }

    if (!["formula", "analysis", "guide"].includes(type)) {
      return res.status(400).json({
        message: "Type không hợp lệ. Chấp nhận: formula, analysis, guide",
      });
    }

    // Validate prompt for formula and guide
    if (
      (type === "formula" || type === "guide") &&
      (!prompt || !prompt.trim())
    ) {
      return res.status(400).json({ message: "Thiếu prompt" });
    }

    // ============================================
    // VALIDATE PROMPT QUALITY - Tránh lãng phí credits
    // ============================================
    if (type === "formula" || type === "guide") {
      // Chuẩn hóa: lowercase, bỏ dấu câu, trim
      const cleanPrompt = prompt
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:]+$/g, "")
        .trim();

      // Danh sách prompt HOÀN TOÀN mơ hồ (chỉ match exact hoặc gần exact)
      const vagueExactPrompts = [
        "tính toán",
        "tính toán đi",
        "làm đi",
        "giúp tôi",
        "help",
        "công thức",
        "formula",
        "tính",
        "làm gì",
        "gì đó",
        "test",
        "thử",
        "ok",
        "yes",
        "no",
        "hi",
        "hello",
        "xin chào",
        "giúp",
        "hỗ trợ",
      ];

      // Kiểm tra prompt quá ngắn (dưới 10 ký tự)
      if (cleanPrompt.length < 10) {
        return res.status(400).json({
          message:
            "❌ Prompt quá ngắn! Vui lòng mô tả chi tiết hơn. Ví dụ: 'Tính tổng cột B' hoặc 'VLOOKUP lấy Name từ CustomerID'",
          creditsRemaining:
            user.subscription.plan === "pro"
              ? "unlimited"
              : user.subscription.credits,
        });
      }

      // Kiểm tra prompt mơ hồ - CHỈ EXACT MATCH, không dùng startsWith nữa
      // Prompt dài và chi tiết sẽ được chấp nhận
      const isVague = vagueExactPrompts.some(
        (vague) => cleanPrompt === vague || cleanPrompt === vague + " đi"
      );

      if (isVague) {
        return res.status(400).json({
          message:
            "❌ Yêu cầu chưa rõ ràng! Vui lòng nói cụ thể bạn muốn tính gì. Ví dụ: 'Tính tổng doanh thu', 'Đếm số khách hàng', 'VLOOKUP lấy tên từ mã'",
          creditsRemaining:
            user.subscription.plan === "pro"
              ? "unlimited"
              : user.subscription.credits,
        });
      }
    }

    // Validate excelContext for analysis
    if (type === "analysis" && (!excelContext || !excelContext.sampleData)) {
      return res
        .status(400)
        .json({ message: "Thiếu excelContext cho phân tích" });
    }

    // Kiểm tra cache (không trừ credits cho cache hits)
    const cached = await AIHistory.findCached(
      type,
      prompt || "analysis",
      excelContext
    );
    if (cached) {
      return res.status(200).json({
        result: cached.output.result,
        cached: true,
        message: "Kết quả từ cache",
        creditsRemaining:
          user.subscription.plan === "pro"
            ? "unlimited"
            : user.subscription.credits,
      });
    }

    // Gọi Gemini API thật (KHÔNG trừ credit trước)
    const startTime = Date.now();
    let aiResult;

    try {
      switch (type) {
        case "formula":
          aiResult = await geminiService.generateFormula(prompt, excelContext);
          break;
        case "analysis":
          aiResult = await geminiService.analyzeData(excelContext);
          break;
        case "guide":
          aiResult = await geminiService.generateGuide(prompt);
          break;
      }
    } catch (aiError) {
      // AI fail = không trừ credit
      console.error("Lỗi gọi Gemini API:", aiError);
      return res.status(500).json({
        message: aiError.message || "Lỗi gọi AI. Vui lòng thử lại!",
        creditsRemaining:
          user.subscription.plan === "pro"
            ? "unlimited"
            : user.subscription.credits,
      });
    }

    const latency = Date.now() - startTime;

    // ============================================
    // CHỈ TRỪ CREDIT KHI CÓ KẾT QUẢ HỮU ÍCH
    // ============================================
    let shouldChargeCredit = true;

    // Với formula: chỉ charge nếu có công thức thực sự
    if (type === "formula") {
      if (!aiResult?.formula || aiResult.formula.trim() === "") {
        shouldChargeCredit = false;
        console.log("⚠️ Formula rỗng - không trừ credit");
      }
    }

    // Trừ credit cho free user (SAU khi có kết quả)
    if (shouldChargeCredit && user.subscription.plan === "free") {
      user.subscription.credits -= 1;
      await user.save();
      console.log(`💰 Đã trừ 1 credit. Còn lại: ${user.subscription.credits}`);
    }

    // Lưu vào lịch sử
    const history = await AIHistory.create({
      userId: user._id,
      type,
      input: { prompt: prompt || "analysis", excelContext },
      output: { result: aiResult, tokensUsed: 100, latency },
      isCached: false,
    });

    res.status(200).json({
      result: aiResult,
      cached: false,
      historyId: history._id,
      creditsRemaining:
        user.subscription.plan === "pro"
          ? "unlimited"
          : user.subscription.credits,
    });
  } catch (error) {
    console.error("Lỗi gọi AI:", error);
    res.status(500).json({ message: "Lỗi server. Vui lòng thử lại!" });
  }
};

// Lấy lịch sử AI
export const getAIHistory = async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const query = { userId };
    if (type) query.type = type;

    const histories = await AIHistory.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await AIHistory.countDocuments(query);

    res.status(200).json({
      histories,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Lỗi lấy lịch sử AI:", error);
    res.status(500).json({ message: "Lỗi lấy lịch sử AI" });
  }
};

// Xóa một mục lịch sử
export const deleteAIHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const history = await AIHistory.findOneAndDelete({ _id: id, userId });
    if (!history) {
      return res.status(404).json({ message: "Không tìm thấy lịch sử" });
    }

    res.status(200).json({ message: "Đã xóa lịch sử" });
  } catch (error) {
    console.error("Lỗi xóa lịch sử:", error);
    res.status(500).json({ message: "Lỗi xóa lịch sử" });
  }
};
