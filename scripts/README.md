# 📚 Excel Dataset Collection & Translation Scripts

Scripts để thu thập và dịch datasets Excel cho AI training.

## 🚀 Cài đặt

### 1. Cài đặt Python dependencies

```bash
cd scripts
pip install -r requirements.txt
```

### 2. Cấu hình API Keys

Tạo file `.env` trong thư mục `scripts/`:

```env
OPENAI_API_KEY=sk-your-openai-api-key-here
STACKOVERFLOW_API_KEY=your-stackoverflow-key  # Optional
```

## 📊 Script 1: Thu thập Datasets

### Chạy script collect_datasets.py

```bash
python collect_datasets.py
```

### Kết quả:

Script sẽ tạo các file trong folder `datasets/`:

1. **microsoft_docs_functions.json** - Tài liệu 400+ Excel functions từ Microsoft
2. **stackoverflow_excel_questions.csv** - Excel questions từ StackOverflow (score cao)
3. **synthetic_formulas.csv** - 2000+ synthetic training examples

### Tùy chỉnh:

```python
# Thu thập thêm StackOverflow pages
collector.collect_stackoverflow(max_pages=50)  # Default: 20

# Tạo thêm synthetic data
collector.generate_synthetic_data(count=5000)  # Default: 2000
```

## 🌍 Script 2: Dịch Datasets

### Option 1: Dùng OpenAI (Recommended)

```bash
python translate_dataset.py \
  --input ../datasets/synthetic_formulas.csv \
  --output ../datasets/synthetic_formulas_vi.csv \
  --columns query_en \
  --method openai \
  --api-key YOUR_OPENAI_KEY
```

### Option 2: Dùng Google Translate (Free)

```bash
python translate_dataset.py \
  --input ../datasets/synthetic_formulas.csv \
  --output ../datasets/synthetic_formulas_vi.csv \
  --columns query_en \
  --method google
```

### Dịch nhiều columns:

```bash
python translate_dataset.py \
  -i ../datasets/stackoverflow_excel_questions.csv \
  -o ../datasets/stackoverflow_excel_questions_vi.csv \
  -c title body \
  -m openai \
  -k YOUR_OPENAI_KEY
```

### Tính năng:

✅ **Protect Excel Functions** - Giữ nguyên tên hàm (SUM, VLOOKUP, IF...)  
✅ **Protect Cell References** - Giữ nguyên A1, B2:D10, $A$1...  
✅ **Protect Formulas** - Giữ nguyên =SUM(A1:A10)  
✅ **Natural Translation** - Dịch context tự nhiên  
✅ **Batch Processing** - Xử lý hàng loạt với rate limiting  

## 📋 Workflow hoàn chỉnh

### Step 1: Thu thập datasets

```bash
python collect_datasets.py
```

Kết quả:
- `datasets/microsoft_docs_functions.json` (400+ functions)
- `datasets/stackoverflow_excel_questions.csv` (2000+ questions)
- `datasets/synthetic_formulas.csv` (2000 examples)

### Step 2: Dịch sang tiếng Việt

```bash
# Dịch synthetic data
python translate_dataset.py \
  -i ../datasets/synthetic_formulas.csv \
  -o ../datasets/synthetic_formulas_vi.csv \
  -c query_en \
  -m openai \
  -k YOUR_OPENAI_KEY

# Dịch StackOverflow data
python translate_dataset.py \
  -i ../datasets/stackoverflow_excel_questions.csv \
  -o ../datasets/stackoverflow_excel_questions_vi.csv \
  -c title body \
  -m openai \
  -k YOUR_OPENAI_KEY
```

### Step 3: Combine datasets

```python
import pandas as pd

# Load all datasets
synthetic = pd.read_csv('../datasets/synthetic_formulas_vi.csv')
stackoverflow = pd.read_csv('../datasets/stackoverflow_excel_questions_vi.csv')
manual = pd.read_json('../datasets/excel_formulas_training_VI.json')

# Standardize columns
synthetic_clean = synthetic[['query_vi', 'formula', 'difficulty']].copy()
synthetic_clean.columns = ['query', 'formula', 'difficulty']

# Combine
combined = pd.concat([
    manual[['query_vi', 'formula']].rename(columns={'query_vi': 'query'}),
    synthetic_clean[['query', 'formula']],
], ignore_index=True)

# Remove duplicates
combined = combined.drop_duplicates(subset=['query'])

# Save
combined.to_csv('../datasets/combined_training_data_vi.csv', index=False)
print(f"Total training examples: {len(combined)}")
```

### Step 4: Format cho Fine-tuning

```python
import json

# Load combined data
df = pd.read_csv('../datasets/combined_training_data_vi.csv')

# Format to OpenAI fine-tuning format
with open('../datasets/training_data_openai.jsonl', 'w', encoding='utf-8') as f:
    for _, row in df.iterrows():
        example = {
            "messages": [
                {
                    "role": "system",
                    "content": "Bạn là chuyên gia Excel. Tạo công thức Excel từ mô tả bằng tiếng Việt."
                },
                {
                    "role": "user",
                    "content": row['query']
                },
                {
                    "role": "assistant",
                    "content": json.dumps({
                        "formula": row['formula'],
                        "explanation": row.get('explanation_vi', '')
                    }, ensure_ascii=False)
                }
            ]
        }
        f.write(json.dumps(example, ensure_ascii=False) + '\n')

print("✅ Training data ready for fine-tuning!")
```

## 💡 Tips

### 1. Chi phí ước tính

**OpenAI Translation:**
- GPT-4-turbo: ~$0.01-0.03 per 1K tokens
- Dịch 5000 queries (avg 20 tokens): ~$2-5

**OpenAI Fine-tuning:**
- Training: $0.008/1K tokens
- Inference: $0.012/1K tokens
- 10,000 examples × 100 tokens × 3 epochs: ~$24

### 2. Quality check

```python
from translate_dataset import ExcelDatasetTranslator

translator = ExcelDatasetTranslator(api_key='your-key', method='openai')

# Test một vài examples
test_texts = [
    "Calculate sum of column A",
    "Find maximum value in range B2:B50",
    "If A1 > 100 then 'High' else 'Low'"
]

for text in test_texts:
    translated = translator.translate_text_openai(text)
    print(f"EN: {text}")
    print(f"VI: {translated}")
    print()
```

### 3. Incremental translation

Nếu bị interrupt, script sẽ lưu progress. Để continue:

```python
# Load partially translated data
df = pd.read_csv('output_partial.csv')

# Find untranslated rows
untranslated = df[df['query_vi'].isna()]

# Translate only remaining
translator = ExcelDatasetTranslator(api_key='key', method='openai')
df.loc[df['query_vi'].isna(), 'query_vi'] = translator.translate_batch(
    untranslated['query_en'].tolist()
)

# Save
df.to_csv('output_complete.csv', index=False)
```

## 🐛 Troubleshooting

### Lỗi: "googletrans not working"

```bash
pip uninstall googletrans
pip install googletrans==3.1.0a0
```

### Lỗi: "OpenAI rate limit"

Thêm sleep time hoặc giảm batch size:

```python
translator.translate_batch(texts, batch_size=5)  # Slower but safer
```

### Lỗi: "Module not found"

```bash
pip install -r requirements.txt --upgrade
```

## 📊 Kết quả mong đợi

Sau khi chạy xong toàn bộ workflow:

```
datasets/
├── microsoft_docs_functions.json         (400 functions)
├── stackoverflow_excel_questions.csv     (2000+ questions)
├── stackoverflow_excel_questions_vi.csv  (translated)
├── synthetic_formulas.csv                (2000 examples)
├── synthetic_formulas_vi.csv             (translated)
├── excel_formulas_training_EN.json       (50 curated examples)
├── excel_formulas_training_VI.json       (50 curated, Vietnamese)
├── combined_training_data_vi.csv         (5000+ combined)
└── training_data_openai.jsonl            (ready for fine-tuning)
```

**Total: 5,000-10,000 high-quality Vietnamese examples!**

## 📞 Liên hệ & Hỗ trợ

Nếu gặp vấn đề:
1. Check Python version >= 3.8
2. Check API keys valid
3. Check internet connection
4. Read error messages carefully
5. Try with smaller batch size first

Happy training! 🚀

