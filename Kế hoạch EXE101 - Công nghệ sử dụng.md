# CÔNG NGHỆ SỬ DỤNG TRONG eOfficeAI

---

## SHEET 1: CÁC CÔNG NGHỆ SỬ DỤNG

| STT | Tên Công Nghệ | Hình Ảnh | Phân Loại | Mô Tả |
|-----|---------------|----------|-----------|-------|
| **PRESENTATION LAYER** |
| 1 | **React 18** | ![React](https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg) | Frontend Framework | Thư viện JavaScript xây dựng giao diện người dùng tương tác, component-based |
| 2 | **Fluent UI 9** | ![Fluent](https://developer.microsoft.com/en-us/fluentui/images/fluent-ui-logo.png) | Design System | Hệ thống thiết kế của Microsoft, đảm bảo giao diện đồng nhất với Office |
| 3 | **Office.js** | ![Office.js](https://learn.microsoft.com/en-us/javascript/api/overview/images/logo-office.png) | Office Integration API | API chính thức tích hợp với Microsoft Excel, đọc/ghi dữ liệu realtime |
| **INTELLIGENCE LAYER** |
| 4 | **Google Gemini AI** | ![Gemini](https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg) | AI Engine | Mô hình ngôn ngữ AI xử lý tiếng Việt, tạo công thức Excel từ ngôn ngữ tự nhiên |
| 5 | **Context Service** | *(Proprietary)* | Contextual Analysis | Công nghệ độc quyền phân tích cấu trúc Excel, nâng cao độ chính xác AI |
| **APPLICATION LAYER** |
| 6 | **Node.js + Express** | ![Node.js](https://nodejs.org/static/images/favicons/favicon.png) | Backend Server | Runtime và framework xây dựng RESTful API, xử lý business logic |
| 7 | **MongoDB** | ![MongoDB](https://www.mongodb.com/assets/images/global/favicon.ico) | Database | Cơ sở dữ liệu NoSQL lưu trữ user data, history, analytics |
| 8 | **Redis** | ![Redis](https://redis.io/images/favicons/favicon-32x32.png) | Cache Layer | In-memory caching tối ưu hiệu năng, giảm độ trễ phản hồi |
| **INFRASTRUCTURE LAYER** |
| 9 | **Webpack + Babel** | ![Webpack](https://webpack.js.org/icon-square-small.85ba630cf0c5f29ae3e3.svg) | Build System | Công cụ đóng gói và tối ưu code, transpile JavaScript |
| 10 | **Vercel** | ![Vercel](https://assets.vercel.com/image/upload/front/favicon/vercel/180x180.png) | Cloud Platform | Platform deploy tự động với CDN toàn cầu, HTTPS bảo mật |

---

## SHEET 2: CÁCH ÁP DỤNG

| STT | Công Nghệ | Cách Áp Dụng |
|-----|-----------|--------------|
| 1 | **React** | Dùng React để tạo các phần giao diện (nút bấm, form, tab) như lắp ghép Lego. Mỗi phần là một component riêng, dễ tái sử dụng và bảo trì. Khi người dùng tương tác, React tự động cập nhật giao diện mượt mà. |
| 2 | **Fluent UI** | Lấy sẵn các thành phần giao diện (button, input, card) từ Microsoft, chỉ việc dùng. Đảm bảo giao diện giống hệt Office nên người dùng quen thuộc ngay, không cần học cách dùng mới. |
| 3 | **Office.js** | Dùng công cụ chính thức của Microsoft để "nói chuyện" với Excel. Đọc dữ liệu từ Excel, ghi công thức vào ô, lắng nghe khi người dùng thay đổi gì đó. Giống như cầu nối giữa ứng dụng và Excel. |
| 4 | **Google Gemini AI** | Gửi câu hỏi tiếng Việt của người dùng lên Google AI, AI hiểu và trả về công thức Excel. Ví dụ: "Tính tổng doanh thu" → AI trả về `=SUM(D2:D50)`. Không cần tự viết logic phức tạp, AI làm hết. |
| 5 | **Context Service** | Tự viết module để "đọc hiểu" Excel như con người: xem cột nào tên gì, kiểu dữ liệu gì (số/chữ/ngày). Sau đó gửi thông tin này kèm câu hỏi cho AI, AI hiểu chính xác hơn và tạo công thức đúng. |
| 6 | **Node.js + Express** | Tạo server riêng để xử lý các yêu cầu từ người dùng. Khi người dùng gửi yêu cầu, server nhận, xử lý logic, gọi AI, lưu vào database, rồi trả kết quả về. Giống như bộ não xử lý mọi thứ phía sau. |
| 7 | **MongoDB** | Lưu tất cả dữ liệu vào database: thông tin người dùng, lịch sử công thức đã tạo, phản hồi để cải thiện AI. Mỗi khi cần tra cứu hoặc phân tích, chỉ việc lấy từ database ra. |
| 8 | **Redis** | Lưu tạm kết quả thường dùng vào bộ nhớ nhanh. Khi người dùng hỏi câu giống nhau, lấy ngay từ cache thay vì gọi AI lại, nhanh hơn 100 lần và tiết kiệm chi phí. |
| 9 | **Webpack + Babel** | Gộp tất cả code thành ít file, nén nhỏ lại, chuyển đổi code mới thành code cũ để chạy được trên Excel cũ. Giống như đóng gói hành lý gọn gàng trước khi đi. |
| 10 | **Vercel** | Đẩy code lên Internet tự động. Mỗi lần sửa code và đẩy lên Git, Vercel tự động build và đưa lên mạng. Người dùng truy cập qua link, không cần cài đặt gì. Có HTTPS bảo mật sẵn. |

---

*Tài liệu kỹ thuật - eOfficeAI*  
*Phiên bản 1.0 - Cập nhật tháng 11/2024*
