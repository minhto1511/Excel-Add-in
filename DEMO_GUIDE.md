# 🎯 Demo Guide - eOfficeAI

Hướng dẫn nhanh để demo các tính năng AI cho khách hàng!

## ⚡ Quick Start

### 1. Setup API Key (Lần đầu tiên)
```
1. Mở Excel
2. Load eOfficeAI add-in
3. Chuyển sang tab "API Settings"
4. Click link "Google AI Studio"
5. Login → Create API Key → Copy
6. Paste vào ô input → Click "Lưu API Key"
```

### 2. Chạy Add-in
```bash
npm start
```

Excel sẽ tự động mở với add-in loaded.

---

## 🧮 DEMO 1: Formula Generator

### Scenario: Tính tổng doanh thu theo điều kiện

**Steps:**
1. Chuyển sang tab "Formula Generator"
2. Nhập prompt: 
   ```
   Tính tổng doanh thu từ cột D nếu trạng thái ở cột C là "Hoàn thành"
   ```
3. Click "Tạo công thức"
4. Chờ 3-5 giây
5. **Kết quả:** `=SUMIF(C:C,"Hoàn thành",D:D)`
6. Click "Insert vào Excel" → Công thức được đưa vào cell A1

**Highlight Points:**
- ✅ AI hiểu tiếng Việt tự nhiên
- ✅ Có giải thích chi tiết
- ✅ Insert trực tiếp vào Excel
- ✅ Tiết kiệm thời gian không cần nhớ cú pháp

### Ví dụ prompts khác:

**1. Tìm giá trị lớn nhất:**
```
Tìm giá trị lớn nhất trong cột B
```
→ `=MAX(B:B)`

**2. Đếm có điều kiện:**
```
Đếm số nhân viên có lương > 15 triệu trong cột E
```
→ `=COUNTIF(E:E,">15000000")`

**3. Trung bình có điều kiện:**
```
Tính trung bình điểm của học sinh giới tính Nam trong cột C, giới tính ở cột B
```
→ `=AVERAGEIF(B:B,"Nam",C:C)`

**4. Công thức phức tạp:**
```
Tính tổng doanh thu từ sheet "DuLieu" nếu ngày trong cột A là tháng này và trạng thái là "Hoàn thành"
```
→ `=SUMIFS(DuLieu!D:D, DuLieu!A:A, ">="&DATE(YEAR(TODAY()),MONTH(TODAY()),1), DuLieu!C:C, "Hoàn thành")`

---

## 📚 DEMO 2: Step-by-Step Guide

### Scenario: Tạo biểu đồ cột

**Steps:**
1. Chuyển sang tab "Step-by-Step"
2. Nhập task:
   ```
   Tạo biểu đồ cột để hiển thị doanh thu theo tháng
   ```
3. Click "Tạo hướng dẫn"
4. Chờ 5-7 giây (task phức tạp hơn)
5. **Kết quả:** 5-7 bước hướng dẫn chi tiết
6. Di chuyển qua từng bước bằng nút "Bước tiếp theo"

**Expected Steps:**
```
Bước 1: Chuẩn bị dữ liệu
  - Mở file Excel và chọn worksheet
  - Đảm bảo dữ liệu có cấu trúc rõ ràng
  - Loại bỏ ô trống
  💡 Tips: Dữ liệu tốt nhất là có tiêu đề ở hàng đầu

Bước 2: Chọn dải dữ liệu
  - Click vào ô đầu tiên
  - Kéo đến ô cuối cùng
  - Hoặc Ctrl+Shift+End
  
Bước 3: Chèn biểu đồ
  - Tab Insert → Column Chart
  - Chọn kiểu biểu đồ phù hợp
  💡 Tips: Alt+F1 để tạo biểu đồ nhanh

... (tiếp tục)
```

**Highlight Points:**
- ✅ Từng bước rất chi tiết
- ✅ Có tips và warnings
- ✅ Progress bar trực quan
- ✅ Navigation dễ dàng (Next/Previous)

### Ví dụ tasks khác:

**1. VLOOKUP:**
```
Hướng dẫn cách sử dụng VLOOKUP để tìm kiếm dữ liệu
```

**2. Pivot Table:**
```
Tạo Pivot Table để phân tích dữ liệu bán hàng theo khu vực
```

**3. Conditional Formatting:**
```
Áp dụng Conditional Formatting để highlight các ô có giá trị > 1 triệu
```

**4. Dashboard:**
```
Tạo Dashboard báo cáo với biểu đồ và KPI cards
```

---

## 🎬 Demo Script cho Khách hàng

### Opening (30s)
```
"Xin chào! Hôm nay tôi sẽ demo eOfficeAI - trợ lý AI cho Excel. 
Tool này giúp bạn:
1. Tạo công thức Excel chỉ bằng tiếng Việt
2. Học Excel với hướng dẫn chi tiết từng bước
3. Tiết kiệm hàng giờ làm việc mỗi tuần"
```

### Demo 1: Formula Generator (2 phút)
```
"Giả sử bạn cần tính tổng doanh thu nhưng không nhớ cú pháp SUMIF...

[Nhập prompt]
"Tính tổng doanh thu từ cột D nếu trạng thái ở cột C là Hoàn thành"

[Click Tạo công thức]
"Chỉ cần 3 giây, AI đã tạo công thức chính xác..."

[Show kết quả]
"Không những có công thức, còn có giải thích chi tiết...
Và quan trọng nhất - 1 click để insert vào Excel!"

[Click Insert vào Excel]
"Xong! Đơn giản và nhanh chóng."
```

### Demo 2: Step-by-Step (2 phút)
```
"Nếu bạn muốn học cách tạo Pivot Table...

[Nhập task]
"Tạo Pivot Table để phân tích dữ liệu"

[Click Tạo hướng dẫn]
"AI sẽ chia nhỏ thành 6-7 bước dễ hiểu...

[Show step 1]
"Mỗi bước có:
- Tiêu đề và mô tả
- Chi tiết từng hành động
- Tips hữu ích
- Warnings quan trọng"

[Click Next]
"Bạn follow từng bước, không sợ bị bỏ sót..."

[Show progress bar]
"Và luôn biết mình đang ở đâu trong process."
```

### Closing (30s)
```
"Với eOfficeAI:
✅ Không cần nhớ cú pháp phức tạp
✅ Học Excel nhanh hơn
✅ Năng suất tăng 3x

Bạn có thắc mắc gì không?"
```

---

## 💡 Tips cho Demo thành công

### Trước Demo:
- ✅ Test API key hoạt động tốt
- ✅ Chuẩn bị 2-3 prompts hay
- ✅ Đảm bảo internet ổn định
- ✅ Restart Excel để add-in fresh

### Trong Demo:
- ✅ Nói chậm, rõ ràng
- ✅ Giải thích TẠI SAO cần tính năng này
- ✅ Highlight pain points (mất thời gian, hay quên cú pháp...)
- ✅ Show kết quả thực tế

### Sau Demo:
- ✅ Hỏi feedback
- ✅ Giải đáp thắc mắc
- ✅ Share link để khách tự test
- ✅ Follow up trong 1-2 ngày

---

## 🔥 Power Features để Highlight

### 1. Tiếng Việt tự nhiên
```
Không cần:  =SUMIF(C:C,"Hoàn thành",D:D)
Chỉ cần:    "Tính tổng doanh thu nếu hoàn thành"
```

### 2. Giải thích chi tiết
```
AI không chỉ cho công thức, mà còn:
- Giải thích cách hoạt động
- Đưa ví dụ cụ thể
- Tips sử dụng
```

### 3. Integration với Excel
```
Không cần copy-paste thủ công
→ 1 click insert trực tiếp vào cell
```

### 4. Step-by-step learning
```
Thay vì Google hoặc xem video dài
→ Hướng dẫn ngắn gọn, đúng trọng tâm
```

---

## ⚠️ Common Issues & Solutions

### Issue: "Không thể tạo công thức"
**Nguyên nhân:** API rate limit (15/phút)
**Giải pháp:** Chờ 1 phút rồi thử lại

### Issue: "Chưa có API key"
**Nguyên nhân:** Chưa setup
**Giải pháp:** Vào tab API Settings → Setup

### Issue: Response chậm
**Nguyên nhân:** Internet chậm hoặc AI đang xử lý
**Giải pháp:** Bình thường, chờ 3-7 giây

### Issue: Công thức không đúng
**Nguyên nhân:** Prompt không rõ ràng
**Giải pháp:** Viết prompt chi tiết hơn, có context

---

## 🎯 Key Metrics để Track

### Engagement:
- Số lần generate formula
- Số lần xem step-by-step
- Thời gian sử dụng trung bình

### Conversion:
- Số user nhập API key
- Số user insert vào Excel
- Return rate

### Satisfaction:
- Feedback score
- Number of repeat uses
- Feature request count

---

**Chúc bạn demo thành công! 🚀**

---

## 📞 Contact & Support

- Email: support@eofficeai.com
- Docs: https://docs.eofficeai.com
- GitHub: https://github.com/eofficeai

