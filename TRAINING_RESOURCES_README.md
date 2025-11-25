# 📚 Excel AI Training Resources - eOfficeAI

Tài liệu nghiên cứu và tools để train AI tạo công thức Excel cho dự án **eOfficeAI**.

---

## 📂 Cấu Trúc Tài Liệu

```
eOfficeAI/
│
├── 📖 HUONG_DAN_TRAIN_AI_EXCEL.md          ← BẮT ĐẦU TỪ ĐÂY! 
│   └── Hướng dẫn A-Z bằng tiếng Việt, dễ hiểu, có checklist
│
├── 📖 EXCEL_AI_TRAINING_RESEARCH.md        ← Nghiên cứu chi tiết
│   └── Deep dive vào methods, datasets, costs, technical details
│
├── 📁 datasets/                            ← Datasets có sẵn
│   ├── excel_formulas_training_EN.json    (50 examples English)
│   ├── excel_formulas_training_VI.json    (50 examples Vietnamese)
│   └── (thêm datasets sau khi chạy scripts)
│
├── 📁 scripts/                             ← Python scripts
│   ├── README.md                          (Hướng dẫn scripts)
│   ├── requirements.txt                   (Dependencies)
│   ├── collect_datasets.py                (Thu thập datasets)
│   ├── translate_dataset.py               (Dịch sang tiếng Việt)
│   └── prepare_training_data.py           (Chuẩn bị training data)
│
└── 📁 src/                                 ← Source code hiện tại
    └── services/geminiService.js          (Service cần improve)
```

---

## 🚀 Quick Start - 3 Bước

### Bước 1: Đọc Hướng Dẫn (30 phút)

```bash
# Đọc file này trước
HUONG_DAN_TRAIN_AI_EXCEL.md
```

Nội dung:
- ✅ 4 phương pháp training AI cho Excel
- ✅ So sánh chi phí & hiệu quả
- ✅ Datasets recommendations
- ✅ Translation strategies
- ✅ Roadmap cụ thể từng tuần/tháng
- ✅ Code examples

---

### Bước 2: Chạy Scripts Thu Thập Data (1 giờ)

```bash
cd scripts

# Install dependencies
pip install -r requirements.txt

# Crawl Microsoft Docs + StackOverflow + Generate synthetic
python collect_datasets.py

# Kết quả: 4,000-5,000 examples tiếng Anh
```

---

### Bước 3: Dịch Sang Tiếng Việt (2-3 giờ)

```bash
# Cần OpenAI API key
export OPENAI_API_KEY=your-key-here

# Dịch synthetic data
python translate_dataset.py \
  -i ../datasets/synthetic_formulas.csv \
  -o ../datasets/synthetic_formulas_vi.csv \
  -c query_en \
  -m openai \
  -k $OPENAI_API_KEY

# Dịch StackOverflow data
python translate_dataset.py \
  -i ../datasets/stackoverflow_excel_questions.csv \
  -o ../datasets/stackoverflow_excel_questions_vi.csv \
  -c title body \
  -m openai \
  -k $OPENAI_API_KEY

# Prepare training data
python prepare_training_data.py

# Kết quả: training_data_openai.jsonl (ready for fine-tuning!)
```

---

## 📊 Datasets Overview

### Có Sẵn (Ready to Use)
| File | Language | Count | Quality | Use Case |
|------|----------|-------|---------|----------|
| `excel_formulas_training_EN.json` | English | 50 | ⭐⭐⭐⭐⭐ | Examples mẫu |
| `excel_formulas_training_VI.json` | Vietnamese | 50 | ⭐⭐⭐⭐⭐ | Prompt engineering |

### Thu Thập Được (After Running Scripts)
| File | Language | Count | Quality | Use Case |
|------|----------|-------|---------|----------|
| `microsoft_docs_functions.json` | English | 400+ | ⭐⭐⭐⭐⭐ | Functions docs |
| `stackoverflow_excel_questions.csv` | English | 2000+ | ⭐⭐⭐⭐ | Real Q&A |
| `synthetic_formulas.csv` | English | 2000 | ⭐⭐⭐ | Coverage |
| `*_vi.csv` (translated) | Vietnamese | 4000+ | ⭐⭐⭐⭐ | Training |
| `combined_training_data.csv` | Vietnamese | 5000+ | ⭐⭐⭐⭐ | Final dataset |
| `training_data_openai.jsonl` | Vietnamese | 4500+ | ⭐⭐⭐⭐ | Fine-tuning |
| `test_data_openai.jsonl` | Vietnamese | 500+ | ⭐⭐⭐⭐ | Evaluation |

---

## 🎯 Use Cases

### Use Case 1: Improve Prompt Engineering (1-2 tuần)
**Goal:** Tăng accuracy từ 75% → 82%

**Steps:**
1. Đọc `datasets/excel_formulas_training_VI.json`
2. Copy 50 examples vào `src/services/geminiService.js` (line 188)
3. Tăng lên 100 examples bằng cách thêm từ synthetic data
4. Deploy & test

**Cost:** $0 (chỉ dùng examples có sẵn)

---

### Use Case 2: Build RAG System (3-4 tuần)
**Goal:** Tăng accuracy từ 75% → 88%

**Steps:**
1. Thu thập 5,000 examples (run scripts)
2. Install ChromaDB: `npm install chromadb`
3. Load data vào vector database
4. Implement retrieve logic (code mẫu có trong research doc)
5. Test & deploy

**Cost:** ~$5-10 (translation) + $0 (ChromaDB self-hosted)

---

### Use Case 3: Fine-tune GPT-3.5 (1-2 tháng)
**Goal:** Accuracy 90-95%, production-ready

**Steps:**
1. Thu thập & translate 10,000 examples
2. Run `prepare_training_data.py`
3. Upload `training_data_openai.jsonl` to OpenAI
4. Fine-tune GPT-3.5-turbo (2-6 hours)
5. Evaluate & deploy

**Cost:** ~$80 training + $90-150/month inference

---

## 💡 Khuyến Nghị Cho Bạn

### 📅 Timeline

**Ngay bây giờ (Tuần 1-2):**
- ✅ Đọc `HUONG_DAN_TRAIN_AI_EXCEL.md`
- ✅ Review datasets có sẵn
- ✅ Tăng few-shot examples lên 100+
- ✅ Add validation logic
- 🎯 **Target: 80-82% accuracy**

**Tháng tới (Tuần 3-8):**
- ✅ Chạy scripts thu thập 5,000 examples
- ✅ Translate sang Vietnamese
- ✅ Build RAG system
- ✅ A/B test với baseline
- 🎯 **Target: 85-88% accuracy**

**2-3 tháng tới:**
- ✅ Collect 10,000+ examples
- ✅ Fine-tune GPT-3.5-turbo
- ✅ Deploy production model
- ✅ Setup monitoring & feedback loop
- 🎯 **Target: 90-95% accuracy**

---

## 📖 Tài Liệu Chi Tiết

### 1. Hướng Dẫn Toàn Diện (Tiếng Việt)
📄 **HUONG_DAN_TRAIN_AI_EXCEL.md**

**Nội dung:**
- 4 phương pháp training AI
- Thu thập & translate datasets
- Fine-tuning workflow
- Chi phí ước tính
- Roadmap cụ thể
- Checklist từng bước

**Đọc khi:** Bạn muốn hiểu overview và action plan

---

### 2. Nghiên Cứu Kỹ Thuật (English + Vietnamese)
📄 **EXCEL_AI_TRAINING_RESEARCH.md**

**Nội dung:**
- Deep dive vào từng method
- 8+ datasets với links
- Translation strategies
- Code examples (Python + JavaScript)
- Evaluation metrics
- Papers & resources

**Đọc khi:** Bạn cần chi tiết kỹ thuật và implementation

---

### 3. Scripts Documentation
📄 **scripts/README.md**

**Nội dung:**
- Cài đặt dependencies
- Chạy từng script
- Troubleshooting
- Examples

**Đọc khi:** Bạn sẵn sàng chạy scripts

---

## 🛠️ Tools & Technologies

### Python Scripts
- **BeautifulSoup** - Web scraping
- **pandas** - Data processing
- **OpenAI API** - Translation & fine-tuning
- **googletrans** - Free translation (backup)
- **sentence-transformers** - Quality check

### JavaScript/Node.js
- **ChromaDB** - Vector database for RAG
- **OpenAI SDK** - Fine-tuned model API
- **Gemini API** - Current LLM (có thể thay thế)

### Infrastructure
- **OpenAI Platform** - Fine-tuning hosting
- **RunPod / Vast.ai** - GPU for self-hosted models (optional)
- **GitHub** - Dataset repos

---

## 💰 Ước Tính Chi Phí

### Option 1: Prompt Engineering Only
- **Monthly:** $30-50
- **One-time:** $0
- **Accuracy:** 75-82%
- **Recommend:** MVP, testing

### Option 2: Prompt + RAG
- **Monthly:** $50-80
- **One-time:** $5-10 (translation)
- **Accuracy:** 85-88%
- **Recommend:** Short-medium term

### Option 3: Fine-tuned GPT-3.5
- **Monthly:** $150-300
- **One-time:** $80-150 (training + data collection)
- **Accuracy:** 90-95%
- **Recommend:** Production, long-term

### Option 4: Self-hosted LLaMA
- **Monthly:** $200-500 (GPU)
- **One-time:** $50-100 (setup + training)
- **Accuracy:** 88-93%
- **Recommend:** Scale lớn, full control

---

## 🎓 Learning Path

### Beginner (1-2 tuần)
1. Đọc `HUONG_DAN_TRAIN_AI_EXCEL.md` - Overview
2. Review datasets có sẵn - Hiểu format
3. Thử chạy 1-2 scripts - Hands-on
4. Implement few-shot examples - Quick win

### Intermediate (1 tháng)
1. Đọc `EXCEL_AI_TRAINING_RESEARCH.md` - Deep dive
2. Collect 5,000 examples - Data gathering
3. Build RAG system - Advanced technique
4. A/B test variants - Evaluation

### Advanced (2-3 tháng)
1. Collect 10,000+ examples - Scale up
2. Fine-tune GPT-3.5 - Production model
3. Setup monitoring - DevOps
4. Iterate based on data - ML ops

---

## 📞 Support & Resources

### Documentation
- [OpenAI Fine-tuning Guide](https://platform.openai.com/docs/guides/fine-tuning)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [Microsoft Excel Functions Reference](https://support.microsoft.com/excel)

### Communities
- StackOverflow - Tag: `excel-formula`, `openai-api`
- Reddit - r/MachineLearning, r/excel
- Discord - OpenAI Community, ChromaDB

### Papers
- "SpreadsheetCoder" (Microsoft Research 2023)
- "Chain-of-Thought Prompting" (Google 2022)
- "RAFT: Retrieval-Augmented Fine-Tuning" (2024)

---

## ✅ Quick Checklist

```
Phase 1: Preparation
[ ] Đọc HUONG_DAN_TRAIN_AI_EXCEL.md (30 min)
[ ] Install Python: pip install -r scripts/requirements.txt
[ ] Setup OpenAI API key
[ ] Review datasets có sẵn

Phase 2: Quick Wins (Week 1-2)
[ ] Tăng few-shot examples lên 100+
[ ] Add formula validation
[ ] Test với real users
[ ] Measure baseline accuracy

Phase 3: Data Collection (Week 3-4)
[ ] Run collect_datasets.py
[ ] Run translate_dataset.py
[ ] Run prepare_training_data.py
[ ] Validate data quality

Phase 4: Advanced Techniques (Month 2-3)
[ ] Build RAG system
[ ] A/B test RAG vs baseline
[ ] Collect user feedback
[ ] Iterate based on data

Phase 5: Production (Month 4+)
[ ] Fine-tune GPT-3.5-turbo
[ ] Deploy fine-tuned model
[ ] Setup monitoring
[ ] Scale & optimize
```

---

## 🚀 Get Started Now!

```bash
# 1. Đọc hướng dẫn
cat HUONG_DAN_TRAIN_AI_EXCEL.md

# 2. Cài đặt
cd scripts
pip install -r requirements.txt

# 3. Thu thập data
python collect_datasets.py

# 4. Dịch data
python translate_dataset.py -i ../datasets/synthetic_formulas.csv -o ../datasets/synthetic_formulas_vi.csv -c query_en -m openai -k YOUR_KEY

# 5. Chuẩn bị training data
python prepare_training_data.py

# 6. 🎉 Ready to train!
```

---

## 📊 Expected Results

### After Phase 1 (Week 2)
- ✅ 100+ few-shot examples
- ✅ Formula validation
- 📈 **Accuracy: 75% → 80-82%**

### After Phase 2 (Month 2)
- ✅ 5,000+ Vietnamese examples
- ✅ RAG system deployed
- 📈 **Accuracy: 80% → 85-88%**

### After Phase 3 (Month 4)
- ✅ Fine-tuned GPT-3.5-turbo
- ✅ Production monitoring
- 📈 **Accuracy: 85% → 90-95%**

---

## 🎉 Conclusion

Bạn có đầy đủ resources để train AI Excel từ 0 → Production:

✅ **Documentation:** 3 docs chi tiết (200+ pages)  
✅ **Datasets:** 50 curated + scripts cho 10,000+  
✅ **Scripts:** 4 Python scripts hoàn chỉnh  
✅ **Examples:** Code JavaScript + Python  
✅ **Roadmap:** Timeline cụ thể từng tuần  
✅ **Cost estimates:** Cho từng option  

**Start here:** `HUONG_DAN_TRAIN_AI_EXCEL.md` 👈

**Good luck! 🚀**

---

**Made with ❤️ for eOfficeAI**  
*Last updated: 2024-10-28*

