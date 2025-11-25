# 🎯 Context-Aware AI Formula Generator

## ✨ Tính Năng Mới: AI Đọc Context Excel

eOfficeAI giờ có thể **đọc và hiểu dữ liệu thực tế** trong Excel để tạo công thức chính xác hơn!

---

## 🔥 So Sánh: Trước vs Sau

### ❌ Trước (Chỉ dựa vào text)

**User:** "Tính tổng cột doanh thu"

**AI không biết:**
- Cột nào là doanh thu?
- Cột đó là A, B, C, hay D?
- Dữ liệu từ hàng nào đến hàng nào?

**Result:** `=SUM(A:A)` ← Có thể sai cột!

---

### ✅ Sau (Đọc context thực tế)

**User:** "Tính tổng cột doanh thu"

**AI đọc được:**
```
📊 Excel Context:
Sheet: Sales_2024
Dữ liệu: 50 hàng × 5 cột
Cột A: "Ngày" (date)
Cột B: "Sản phẩm" (text)
Cột C: "Số lượng" (number)
Cột D: "Doanh thu" (number) ← TÌM THẤY!
Cột E: "Trạng thái" (text)
```

**Result:** `=SUM(D2:D50)` ← CHÍNH XÁC!

---

## 🛠️ Cách Hoạt Động

### 1. AI Đọc Context Excel

Khi bật "Đọc context Excel", AI sẽ:

✅ **Đọc headers** (tên cột)
✅ **Phân tích data types** (số, text, ngày)
✅ **Xem sample data** (3-5 hàng đầu)
✅ **Hiểu cấu trúc** (số hàng, số cột)

### 2. AI Phân Tích Intent

```javascript
User: "Tính tổng doanh thu tháng này"

AI phân tích:
→ Intent: SUM (từ "tính tổng")
→ Target column: "Doanh thu" (từ keyword + number type)
→ Filter condition: "tháng này" (từ "tháng này" + date column)
```

### 3. AI Generate Công Thức Chính Xác

```
Input: "Tính tổng doanh thu tháng này"
Context: Cột A = Ngày, Cột D = Doanh thu

Output: =SUMIFS(D:D,A:A,">="&EOMONTH(TODAY(),-1)+1,A:A,"<="&EOMONTH(TODAY(),0))
```

---

## 📖 Ví Dụ Sử Dụng

### Ví Dụ 1: Tính Tổng Thông Minh

**Excel có:**
```
| A: Ngày     | B: Sản phẩm  | C: Số lượng | D: Doanh thu |
|-------------|--------------|-------------|--------------|
| 2024-01-01  | Áo           | 10          | 500,000      |
| 2024-01-02  | Quần         | 5           | 300,000      |
```

**User gõ:** "tính tổng doanh thu"

**AI tự động hiểu:**
- "doanh thu" = Cột D
- Data từ hàng 2 đến cuối

**Kết quả:** `=SUM(D2:D50)` ← Tự động detect range!

---

### Ví Dụ 2: Tính Trung Bình Có Điều Kiện

**Excel có:**
```
| A: Tên      | B: Điểm Toán | C: Điểm Văn | D: Xếp loại |
|-------------|--------------|-------------|-------------|
| An          | 8            | 7           | Giỏi        |
| Bình        | 5            | 6           | Trung bình  |
```

**User gõ:** "trung bình điểm toán của học sinh giỏi"

**AI phân tích:**
- "trung bình" → AVERAGEIF
- "điểm toán" → Cột B (number)
- "học sinh giỏi" → Cột D = "Giỏi"

**Kết quả:** `=AVERAGEIF(D:D,"Giỏi",B:B)`

---

### Ví Dụ 3: Đếm Theo Điều Kiện

**Excel có:**
```
| A: Tên      | B: Tuổi | C: Phòng ban  | D: Trạng thái |
|-------------|---------|---------------|---------------|
| An          | 25      | Kinh doanh    | Active        |
| Bình        | 30      | Kỹ thuật      | Active        |
```

**User gõ:** "đếm nhân viên phòng kinh doanh"

**AI phân tích:**
- "đếm" → COUNTIF
- "phòng kinh doanh" → Cột C = "Kinh doanh"

**Kết quả:** `=COUNTIF(C:C,"Kinh doanh")`

---

### Ví Dụ 4: Tìm Max/Min Thông Minh

**Excel có:**
```
| A: Sản phẩm | B: Giá bán | C: Giá nhập | D: Lợi nhuận |
|-------------|------------|-------------|--------------|
| Áo          | 200,000    | 120,000     | 80,000       |
| Quần        | 150,000    | 100,000     | 50,000       |
```

**User gõ:** "tìm lợi nhuận cao nhất"

**AI hiểu:**
- "lợi nhuận" → Cột D
- "cao nhất" → MAX

**Kết quả:** `=MAX(D:D)`

---

## ⚙️ Cách Sử Dụng

### Bước 1: Chuẩn bị Excel

Đảm bảo Excel có:
- ✅ **Header row** (hàng đầu tiên có tên cột)
- ✅ **Data có structure** (không quá lộn xộn)
- ✅ **Columns có tên rõ ràng** ("Doanh thu", không phải "Col1")

---

### Bước 2: Bật Context-Aware

Trong eOfficeAI:
1. Mở tab "Formula Generator"
2. Bật switch **"Đọc context Excel"** (màu xanh)
3. Gõ yêu cầu

---

### Bước 3: Viết Prompt Tự Nhiên

Bạn có thể viết tự nhiên như nói chuyện:

✅ **Good prompts:**
- "tính tổng doanh thu"
- "trung bình điểm toán"
- "đếm nhân viên phòng kinh doanh"
- "lợi nhuận cao nhất"
- "tổng lương nếu phòng ban là IT và tuổi > 25"

❌ **Không cần phức tạp:**
- ~~"tính tổng cột D từ D2 đến D50"~~ (không cần!)
- ~~"=SUM(D:D)"~~ (AI sẽ tạo cho bạn!)

---

### Bước 4: Xem Kết Quả

AI sẽ:
1. **Hiển thị context** đã đọc được
2. **Generate công thức** chính xác
3. **Giải thích** từng phần
4. **Ví dụ** minh họa

---

## 🎯 Khi Nào Dùng Context-Aware?

### ✅ Nên Dùng Khi:

1. **Excel có nhiều cột** - AI sẽ tự tìm cột đúng
2. **Tên cột rõ ràng** - "Doanh thu", "Tên", "Ngày"
3. **Muốn nhanh** - Không cần specify range cụ thể
4. **Không rõ range** - Không biết dữ liệu đến hàng mấy
5. **Có điều kiện phức tạp** - AI hiểu context tốt hơn

---

### ⚠️ Có thể Tắt Khi:

1. **Excel đơn giản** - Chỉ 1-2 cột, rõ ràng
2. **Đã biết chính xác range** - "A1:A10"
3. **Muốn generic formula** - Không specific cho file này
4. **Privacy concerns** - Không muốn AI đọc data

---

## 🔍 Technical Details

### Context Thu Thập Được

```javascript
{
  sheetName: "Sales_2024",
  usedRange: "A1:E50",
  rowCount: 50,
  columnCount: 5,
  headers: [
    { name: "Ngày", column: "A", index: 0 },
    { name: "Sản phẩm", column: "B", index: 1 },
    { name: "Số lượng", column: "C", index: 2 },
    { name: "Doanh thu", column: "D", index: 3 },
    { name: "Trạng thái", column: "E", index: 4 }
  ],
  columns: [
    {
      name: "Ngày",
      column: "A",
      type: "date",
      sampleData: ["2024-01-01", "2024-01-02", "2024-01-03"],
      hasData: true,
      rowsWithData: 49
    },
    {
      name: "Doanh thu",
      column: "D",
      type: "number",
      sampleData: [500000, 300000, 450000],
      hasData: true,
      rowsWithData: 49
    }
    // ... more columns
  ],
  sampleData: [
    { Ngày: "2024-01-01", Sản_phẩm: "Áo", Số_lượng: 10, Doanh_thu: 500000 },
    { Ngày: "2024-01-02", Sản_phẩm: "Quần", Số_lượng: 5, Doanh_thu: 300000 }
    // ... 3 more rows
  ]
}
```

---

### AI Prompt Enhancement

Context được inject vào AI prompt:

```
📊 CONTEXT TỪNG EXCEL HIỆN TẠI:
═══════════════════════════════════════════════════════════════════
📄 Sheet: Sales_2024
📏 Kích thước: 50 hàng × 5 cột
📍 Vùng dữ liệu: A1:E50

📋 CẤU TRÚC CỘT:
  • Cột A "Ngày": date (VD: 2024-01-01, 2024-01-02)
  • Cột B "Sản phẩm": text (VD: Áo, Quần)
  • Cột C "Số lượng": number (VD: 10, 5)
  • Cột D "Doanh thu": number (VD: 500000, 300000)
  • Cột E "Trạng thái": text (VD: Active, Inactive)

📊 DỮ LIỆU MẪU (3 hàng đầu):
  Hàng 2: Ngày=2024-01-01, Sản phẩm=Áo, Số lượng=10, Doanh thu=500000
  Hàng 3: Ngày=2024-01-02, Sản phẩm=Quần, Số lượng=5, Doanh thu=300000
  Hàng 4: Ngày=2024-01-03, Sản phẩm=Váy, Số lượng=8, Doanh thu=450000
═══════════════════════════════════════════════════════════════════

Yêu cầu của người dùng: tính tổng doanh thu

💡 GỢI Ý TỰ ĐỘNG:
- Intent phát hiện: SUM
- Cột liên quan: D (Doanh thu, number)
- Range đề xuất: D2:D50
```

→ AI có đầy đủ thông tin để generate công thức chính xác!

---

## 🚀 Lợi Ích

### 1. Chính Xác Hơn
- ✅ Không sai cột
- ✅ Range đúng (bỏ qua header)
- ✅ Data type phù hợp

### 2. Nhanh Hơn
- ✅ Không cần đếm hàng
- ✅ Không cần nhớ tên cột
- ✅ Prompt ngắn gọn

### 3. Thông Minh Hơn
- ✅ Hiểu intent từ keywords
- ✅ Match column names
- ✅ Suggest relevant columns

### 4. Dễ Dùng Hơn
- ✅ Viết như nói chuyện
- ✅ Không cần syntax Excel
- ✅ AI handle complexity

---

## 🛡️ Privacy & Performance

### Privacy
- ✅ **Chỉ đọc structure & sample** (3-5 hàng đầu)
- ✅ **Không upload toàn bộ file**
- ✅ **Có thể tắt** bất cứ lúc nào
- ✅ **Local processing** (chỉ gửi metadata đến AI)

### Performance
- ⚡ **Nhanh:** < 1 giây để đọc context
- 📊 **Scale:** Works với files lớn (chỉ đọc sample)
- 💾 **Memory:** Minimal overhead

---

## 🎓 Tips & Best Practices

### Tip 1: Đặt Tên Cột Rõ Ràng
✅ **Good:** "Doanh thu", "Tên khách hàng", "Ngày giao dịch"
❌ **Bad:** "Col1", "Data", "Value"

### Tip 2: Header Ở Hàng Đầu
✅ Đảm bảo hàng 1 là header
❌ Tránh nhiều hàng header hoặc merged cells

### Tip 3: Viết Prompt Tự Nhiên
✅ "tính tổng lương phòng IT"
❌ "=SUMIF(B:B,\"IT\",C:C)"

### Tip 4: Dùng Keywords Rõ Ràng
✅ "doanh thu", "lợi nhuận", "khách hàng"
❌ "cột thứ 3", "ô kia"

### Tip 5: Kiểm Tra Context Hiển Thị
Sau khi generate, xem lại context AI đã đọc → verify đúng không

---

## 🐛 Troubleshooting

### Vấn đề 1: AI Không Tìm Đúng Cột

**Nguyên nhân:** Tên cột không rõ ràng hoặc không match với prompt

**Giải pháp:**
1. Đổi tên cột rõ ràng hơn
2. Hoặc specify trong prompt: "tính tổng cột D (doanh thu)"

---

### Vấn đề 2: Context Không Đọc Được

**Nguyên nhân:** Sheet trống hoặc format không chuẩn

**Giải pháp:**
1. Check sheet có data
2. Đảm bảo hàng 1 là header
3. Tắt context và dùng prompt cụ thể hơn

---

### Vấn đề 3: AI Generate Sai Range

**Nguyên nhân:** Sample data không đại diện

**Giải pháp:**
1. Điều chỉnh prompt: "tổng doanh thu từ hàng 5 đến 100"
2. Hoặc edit công thức sau khi generate

---

## 📊 So Sánh Với Methods Khác

| Feature | Context-Aware | Prompt Only | Manual |
|---------|---------------|-------------|--------|
| **Accuracy** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Speed** | ⚡⚡⚡⚡ | ⚡⚡⚡⚡⚡ | ⚡⚡ |
| **Ease** | 😊😊😊😊😊 | 😊😊😊😊 | 😊😊 |
| **Flexibility** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🎉 Kết Luận

**Context-Aware AI** là bước tiến lớn cho eOfficeAI:

✅ **Chính xác hơn** - Hiểu dữ liệu thực tế
✅ **Nhanh hơn** - Ít phải specify details
✅ **Thông minh hơn** - Auto-detect intent & columns
✅ **Dễ dùng hơn** - Viết như nói chuyện

**Bật ngay để trải nghiệm!** 🚀

---

**Made with ❤️ for eOfficeAI**  
*Version: 1.0 - Context-Aware Formula Generation*

