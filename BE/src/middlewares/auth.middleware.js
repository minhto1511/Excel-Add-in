import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Middleware xác thực token
export const authenticate = async (req, res, next) => {
  try {
    // Lấy token từ header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Không có token, vui lòng đăng nhập" });
    }

    const token = authHeader.split(" ")[1];

    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm user và gắn vào request
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User không tồn tại" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Lỗi xác thực:", error);
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token đã hết hạn" });
    }
    res.status(401).json({ message: "Token không hợp lệ" });
  }
};

// Middleware kiểm tra credits
export const checkCredits = async (req, res, next) => {
  try {
    const user = req.user;

    // Pro user: không giới hạn
    if (user.subscription.plan === "pro") {
      return next();
    }

    // Free user: kiểm tra credits
    if (user.subscription.credits <= 0) {
      return res.status(403).json({
        message:
          "Hết lượt sử dụng. Vui lòng nâng cấp lên Pro hoặc chờ gia hạn.",
        credits: 0,
      });
    }

    next();
  } catch (error) {
    console.error("Lỗi kiểm tra credits:", error);
    res.status(500).json({ message: "Lỗi kiểm tra credits" });
  }
};
