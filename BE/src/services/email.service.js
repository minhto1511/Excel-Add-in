import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  // Initialize transporter (lazy initialization)
  initialize() {
    if (this.initialized) return;

    // Check for required env vars
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.warn(
        "Email service not configured: EMAIL_USER or EMAIL_PASSWORD missing"
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD, // Gmail App Password or SMTP password
      },
    });

    this.initialized = true;
    console.log("Email service initialized");
  }

  // Get email templates
  getTemplate(purpose, otp) {
    const templates = {
      signup: {
        subject: "Xác thực email - eOfficeAI",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a73e8; margin: 0;">eOfficeAI</h1>
              <p style="color: #5f6368; margin: 5px 0;">Excel AI Assistant</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h2 style="color: #202124; margin-top: 0;">Xác thực email của bạn</h2>
              <p style="color: #5f6368; line-height: 1.6;">
                Cảm ơn bạn đã đăng ký tài khoản eOfficeAI. Vui lòng sử dụng mã OTP dưới đây để hoàn tất đăng ký:
              </p>
              
              <div style="background: linear-gradient(135deg, #1a73e8, #4285f4); padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: white;">
                  ${otp}
                </span>
              </div>
              
              <p style="color: #5f6368; font-size: 14px; margin-bottom: 0;">
                ⏰ Mã này sẽ hết hạn sau <strong>10 phút</strong>
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 25px; color: #9aa0a6; font-size: 12px;">
              <p>Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
              <p>© 2026 eOfficeAI. All rights reserved.</p>
            </div>
          </div>
        `,
      },
      reset_password: {
        subject: "Đặt lại mật khẩu - eOfficeAI",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a73e8; margin: 0;">eOfficeAI</h1>
              <p style="color: #5f6368; margin: 5px 0;">Excel AI Assistant</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <h2 style="color: #202124; margin-top: 0;">🔐 Đặt lại mật khẩu</h2>
              <p style="color: #5f6368; line-height: 1.6;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Sử dụng mã OTP dưới đây:
              </p>
              
              <div style="background: linear-gradient(135deg, #ea4335, #fbbc04); padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: white;">
                  ${otp}
                </span>
              </div>
              
              <p style="color: #5f6368; font-size: 14px;">
                ⏰ Mã này sẽ hết hạn sau <strong>10 phút</strong>
              </p>
              
              <div style="background: #fef7e0; border-left: 4px solid #fbbc04; padding: 15px; border-radius: 4px; margin-top: 20px;">
                <p style="color: #5f6368; margin: 0; font-size: 13px;">
                  ⚠️ Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và đổi mật khẩu ngay để bảo vệ tài khoản.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; margin-top: 25px; color: #9aa0a6; font-size: 12px;">
              <p>© 2026 eOfficeAI. All rights reserved.</p>
            </div>
          </div>
        `,
      },
    };

    return templates[purpose] || templates.signup;
  }

  // Send OTP email
  async sendOTP(email, otp, purpose) {
    this.initialize();

    if (!this.transporter) {
      console.error("Email service not configured");
      throw new Error("EMAIL_SERVICE_NOT_CONFIGURED");
    }

    const template = this.getTemplate(purpose, otp);

    try {
      const info = await this.transporter.sendMail({
        from: `"eOfficeAI" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: template.subject,
        html: template.html,
      });

      console.log("Email sent:", info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error("Email send error:", error);
      throw new Error("EMAIL_SEND_FAILED");
    }
  }

  // Send payment confirmation email
  async sendPaymentConfirmation(email, plan, amount, transactionId) {
    this.initialize();

    if (!this.transporter) {
      console.error("Email service not configured");
      return;
    }

    const planNames = {
      pro_monthly: "Pro Hàng Tháng",
      pro_yearly: "Pro Hàng Năm",
      credits_50: "Gói 50 Credits",
      credits_100: "Gói 100 Credits",
    };

    try {
      await this.transporter.sendMail({
        from: `"eOfficeAI" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "✅ Thanh toán thành công - eOfficeAI",
        html: `
          <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a73e8; margin: 0;">eOfficeAI</h1>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 48px;">✅</span>
                <h2 style="color: #34a853; margin: 10px 0;">Thanh toán thành công!</h2>
              </div>
              
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #5f6368;">Gói:</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #202124;">${
                      planNames[plan] || plan
                    }</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #5f6368;">Số tiền:</td>
                    <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #202124;">${amount.toLocaleString(
                      "vi-VN"
                    )} VND</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #5f6368;">Mã giao dịch:</td>
                    <td style="padding: 10px 0; text-align: right; font-family: monospace; color: #202124;">${transactionId}</td>
                  </tr>
                </table>
              </div>
              
              <p style="color: #5f6368; margin-top: 20px; text-align: center;">
                Tài khoản của bạn đã được nâng cấp. Cảm ơn bạn đã sử dụng eOfficeAI!
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 25px; color: #9aa0a6; font-size: 12px;">
              <p>© 2026 eOfficeAI. All rights reserved.</p>
            </div>
          </div>
        `,
      });

      console.log("Payment confirmation email sent to:", email);
    } catch (error) {
      console.error("Payment confirmation email error:", error);
      // Don't throw - this is non-critical
    }
  }

  // Verify transporter connection
  async verifyConnection() {
    this.initialize();

    if (!this.transporter) {
      return { success: false, error: "Not configured" };
    }

    try {
      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const emailService = new EmailService();
export default emailService;
