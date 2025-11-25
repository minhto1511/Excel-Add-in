# eOfficeAI - AI-Powered Excel Add-in

Office Add-in tích hợp AI để hỗ trợ làm việc với Excel thông minh hơn!

## 🚀 Tính năng chính

### 1. **Formula Generator** 🧮
- Tạo công thức Excel từ mô tả tiếng Việt
- AI giải thích chi tiết cách công thức hoạt động
- Copy công thức hoặc insert trực tiếp vào Excel
- Ví dụ: "Tính tổng doanh thu nếu trạng thái là Hoàn thành" → `=SUMIF(...)`

### 2. **Step-by-Step Guide** 📚
- Hướng dẫn chi tiết từng bước cho các task Excel
- Giao diện stepper trực quan, dễ follow
- Có tips và warnings hữu ích
- Ví dụ: Hướng dẫn tạo Pivot Table, biểu đồ, VLOOKUP...

### 3. **API Key Management** 🔑
- User tự nhập Gemini API Key
- Lưu an toàn trong localStorage
- Hướng dẫn chi tiết cách lấy API key miễn phí

## 📦 Cài đặt và chạy

### 1. Install dependencies
```bash
npm install
```

### 2. Chạy development server
```bash
npm run dev-server
```

Server sẽ chạy tại `https://localhost:3000`

### 3. Chạy trong Excel (recommended)
```bash
npm start
```

Lệnh này sẽ:
- Start dev server
- Tự động mở Excel
- Load add-in vào Excel

### 4. Build cho production
```bash
npm run build
```

## 🔑 Lấy Gemini API Key

1. Truy cập [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Đăng nhập bằng tài khoản Google
3. Click "Create API Key"
4. Copy key và paste vào tab "API Settings" trong add-in

**Note:** API key miễn phí với 15 requests/phút

## 🎯 Cách sử dụng

### Formula Generator:
1. Chuyển sang tab "Formula Generator"
2. Nhập mô tả yêu cầu bằng tiếng Việt
   - VD: "Tính tổng các ô từ A1 đến A10"
3. Click "Tạo công thức"
4. Chờ AI xử lý (2-5 giây)
5. Copy hoặc insert công thức vào Excel

### Step-by-Step Guide:
1. Chuyển sang tab "Step-by-Step"
2. Nhập task muốn thực hiện
   - VD: "Tạo biểu đồ cột từ dữ liệu bán hàng"
3. Click "Tạo hướng dẫn"
4. Follow từng bước chi tiết
5. Sử dụng nút "Bước tiếp theo" để di chuyển

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Fluent UI** - Microsoft's design system
- **Office.js** - Tương tác với Excel
- **Gemini API** - Google's AI model
- **Webpack** - Module bundler
- **Babel** - JavaScript compiler

## 📁 Cấu trúc project

```
eOfficeAI/
├── src/
│   ├── taskpane/
│   │   ├── components/
│   │   │   ├── App.jsx                  # Main app với tabs
│   │   │   ├── FormulaGenerator.jsx     # Formula generator component
│   │   │   ├── StepByStepGuide.jsx      # Step-by-step guide component
│   │   │   └── ApiKeySetup.jsx          # API key management
│   │   ├── taskpane.html                # Entry HTML
│   │   └── taskpane.js                  # Entry JS
│   ├── services/
│   │   └── geminiService.js             # Gemini API integration
│   └── commands/
├── manifest.xml                         # Office Add-in manifest
├── package.json
└── webpack.config.js
```

## 🎨 Screenshots

### Formula Generator
![Formula Generator](./docs/screenshot-formula.png)

### Step-by-Step Guide
![Step-by-Step](./docs/screenshot-stepbystep.png)

### API Settings
![API Settings](./docs/screenshot-settings.png)

## ⚙️ Configuration

### manifest.xml
- `<DisplayName>`: Tên add-in hiển thị
- `<SourceLocation>`: URL của add-in (localhost cho dev)
- `<Hosts>`: Hỗ trợ Excel (Workbook)

### Gemini API
- Model được sử dụng: `gemini-2.0-flash-exp` hoặc `gemini-1.5-flash-latest`
- Temperature: 0.7 (cân bằng giữa creativity và accuracy)
- Max tokens: 1024 (Formula), 8192 (Step-by-Step)

## 🐛 Troubleshooting

### Lỗi: "Chưa có API key"
→ Vào tab "API Settings" và nhập Gemini API Key

### Lỗi: "Không thể tạo công thức"
→ Kiểm tra:
- API key có đúng không
- Đã hết quota chưa (15 requests/phút)
- Kết nối internet

### Lỗi: CORS
→ Đảm bảo chạy từ `https://localhost:3000`

### Add-in không load trong Excel
→ Chạy lại `npm start` hoặc restart Excel

## 🚀 Deploy to Production

### Option 1: Azure Static Web Apps
1. Build project: `npm run build`
2. Deploy thư mục `dist/` lên Azure
3. Update `manifest.xml` với URL production
4. Sideload manifest vào Excel

### Option 2: GitHub Pages
1. Build project
2. Push `dist/` lên GitHub Pages
3. Update manifest với GitHub Pages URL

### Option 3: Custom Server
1. Deploy với Node.js server
2. Setup HTTPS (bắt buộc cho Office Add-in)
3. Update manifest

## 📄 License

MIT License - Free to use

## 👨‍💻 Author

Made with ❤️ using React + Fluent UI + Gemini AI

---

## 🎓 Learning Resources

- [Office Add-ins Documentation](https://learn.microsoft.com/en-us/office/dev/add-ins/)
- [Fluent UI React Components](https://react.fluentui.dev/)
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Excel JavaScript API](https://learn.microsoft.com/en-us/office/dev/add-ins/reference/overview/excel-add-ins-reference-overview)

## 🆘 Support

Nếu gặp vấn đề, vui lòng tạo issue hoặc liên hệ support!

---

**Happy Coding! 🎉**

