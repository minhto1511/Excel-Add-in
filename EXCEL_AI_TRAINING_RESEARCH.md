# 📊 Nghiên Cứu Sâu: Training AI cho Excel Tasks

## 🎯 Tổng Quan

Nghiên cứu này tổng hợp các phương pháp training AI cho Excel, datasets tiếng Anh chất lượng cao, và chiến lược translate sang tiếng Việt để cải thiện output.

---

## 1️⃣ CÁC PHƯƠNG PHÁP TRAINING AI CHO EXCEL

### 🔥 Method 1: Prompt Engineering (Bạn đang dùng)
**Ưu điểm:**
- Không cần train model từ đầu
- Dễ deploy, update nhanh
- Chi phí thấp
- Linh hoạt với requirements mới

**Nhược điểm:**
- Phụ thuộc vào LLM base (Gemini, GPT-4)
- Context window limit
- Khó control consistency 100%

**Cách optimize:**
- ✅ Few-shot learning với 50-100 examples (bạn đã làm tốt)
- ✅ Chain-of-Thought prompting
- ✅ Structured output (JSON format)
- ⚠️ Thiếu: Self-consistency (generate multiple answers, vote)
- ⚠️ Thiếu: Reflection (AI tự check lại công thức)

---

### 🚀 Method 2: Fine-tuning (Recommended cho Production)
**Models phù hợp:**
- **GPT-3.5-turbo**: Fine-tune qua OpenAI API
- **LLaMA 2/3**: Open-source, train được full
- **CodeLLaMA**: Specialized cho code/formula
- **T5/FLAN-T5**: Google, nhẹ hơn, train nhanh

**Quy trình:**
1. Thu thập 5,000-50,000 cặp (prompt, formula, explanation)
2. Format theo template model
3. Fine-tune 3-5 epochs
4. Evaluate trên test set
5. Deploy model riêng

**Chi phí ước tính:**
- GPT-3.5-turbo fine-tuning: $0.008/1K tokens (training) + $0.012/1K (inference)
- Self-hosted LLaMA: GPU cloud ~$200-500/month
- Dataset collection: 20-40 giờ công (nếu làm manual)

---

### 🧠 Method 3: RAG (Retrieval-Augmented Generation)
**Concept:**
- Build vector database với 10,000+ Excel examples
- Khi user hỏi → retrieve top 5-10 similar examples
- Inject vào prompt → LLM generate answer

**Tech stack:**
- **Vector DB**: Pinecone, Weaviate, ChromaDB (local)
- **Embeddings**: OpenAI text-embedding-3-small, sentence-transformers
- **Retrieval**: Cosine similarity, semantic search

**Benefits:**
- ✅ Dynamic knowledge base (add examples without retrain)
- ✅ Better accuracy với domain-specific examples
- ✅ Giảm hallucination

---

### 💎 Method 4: Specialized Models
**Spreadsheet-specific models:**
- **SheetCopilot** (Microsoft Research 2023)
- **Table2Text** models
- **Code generation models** fine-tuned on Excel formulas

**Approach:**
- Train encoder-decoder architecture
- Input: Natural language + table context
- Output: Excel formula (structured)

---

## 2️⃣ DATASETS TIẾNG ANH CHẤT LƯỢNG CAO

### 📚 Dataset 1: **Enron Spreadsheet Corpus**
**Source:** University of Washington
- **Size:** 15,770 spreadsheets
- **Domain:** Real business spreadsheets (finance, operations)
- **Format:** .xls, .xlsx
- **Formulas:** 1.8M+ formulas
- **Link:** https://github.com/datadavev/enron_spreadsheets

**Use case:** Analyze real-world formula patterns

**Cách xử lý:**
```python
# Extract formulas
import openpyxl
wb = openpyxl.load_workbook('file.xlsx')
ws = wb.active
for row in ws.iter_rows():
    for cell in row:
        if cell.data_type == 'f':  # formula
            print(cell.value, cell.coordinate)
```

---

### 📊 Dataset 2: **SpreadsheetCoder** (Microsoft Research)
**Source:** https://github.com/microsoft/spreadsheetcoder
- **Size:** 5,000+ prompt-formula pairs
- **Quality:** Human-verified
- **Format:** JSON
```json
{
  "instruction": "Calculate the sum of column A",
  "formula": "=SUM(A:A)",
  "explanation": "SUM function aggregates all values in column A"
}
```

**Use case:** Direct training data cho formula generation

---

### 🔢 Dataset 3: **BIRD (Big Bench for Real-world Data)**
**Source:** Yale + Stanford
- **Contains:** Spreadsheet tasks + SQL equivalents
- **Size:** 12,751 questions, 95 databases
- **GitHub:** https://github.com/AlibabaResearch/DAMO-ConvAI/tree/main/bird

**Strengths:**
- Complex multi-step reasoning
- Real business scenarios
- Includes execution validation

---

### 🧮 Dataset 4: **FormulaNet** (Facebook AI)
**Source:** Research paper + synthetic generation
- **Size:** 100K+ formulas
- **Coverage:** All Excel function categories
- **Format:** (Description → Formula → Expected output)

**Example:**
```
Input: "Sum values in A1 to A10 if corresponding B column equals 'Sales'"
Formula: =SUMIF(B1:B10,"Sales",A1:A10)
Test: A1:A10=[100,200,300...], B1:B10=["Sales","Marketing",...]
Expected: 600
```

---

### 📖 Dataset 5: **Excel Function Documentation Dataset**
**Source:** Tự crawl từ Microsoft Docs
- **Functions:** 400+ built-in functions
- **Each function:**
  - Name
  - Syntax
  - Parameters
  - 3-5 examples
  - Common errors

**Crawl script:**
```python
import requests
from bs4 import BeautifulSoup

functions_list = [
    "SUM", "AVERAGE", "IF", "VLOOKUP", "INDEX", "MATCH",
    "SUMIF", "SUMIFS", "COUNTIF", "AVERAGEIF", # ... 400+ functions
]

dataset = []
for func in functions_list:
    url = f"https://support.microsoft.com/en-us/office/{func.lower()}-function"
    # Parse documentation
    # Extract examples
    # Format to training data
```

---

### 🌐 Dataset 6: **StackOverflow Excel Questions**
**Source:** StackExchange Data Dump
- **Size:** 500K+ Excel questions + answers
- **Quality:** Community-validated
- **Format:** Question → Best answer (often includes formula)

**Filter criteria:**
- Tags: [excel], [excel-formula], [vba]
- Score > 5
- Has accepted answer
- Answer contains formula (regex detect `=`)

**API:**
```python
import stackapi
SITE = stackapi.StackAPI('stackoverflow')
questions = SITE.fetch('questions', tagged='excel-formula', sort='votes')
```

---

### 🎓 Dataset 7: **Kaggle Excel Challenges**
**Source:** Kaggle competitions + datasets
- **Tasks:** Data analysis, pivot tables, complex formulas
- **Format:** Problem description + solution

**Notable:**
- Excel Formula Prediction Challenge
- Spreadsheet Error Detection
- Formula Auto-completion

---

### 🔬 Dataset 8: **Research Papers Appendices**
**Papers to mine:**
1. **"Spreadsheet Formula Prediction"** (NeurIPS 2021)
2. **"Learning to Generate Excel Formulas"** (ACL 2022)
3. **"Semantic Parsing for Spreadsheets"** (EMNLP 2023)

**Each paper:** 100-1000 examples trong appendix/supplementary materials

---

## 3️⃣ CHIẾN LƯỢC TRANSLATE SANG TIẾNG VIỆT

### 🌍 Translation Pipeline

**Step 1: Machine Translation (First pass)**
```python
from googletrans import Translator
from openai import OpenAI

def translate_batch(texts, method='openai'):
    if method == 'openai':
        client = OpenAI()
        response = client.chat.completions.create(
            model="gpt-4-turbo",
            messages=[{
                "role": "system",
                "content": "Translate Excel task descriptions to Vietnamese. Keep technical terms like SUM, VLOOKUP unchanged."
            }, {
                "role": "user",
                "content": f"Translate:\n{texts}"
            }]
        )
        return response.choices[0].message.content
```

**Step 2: Domain-specific Glossary**
```python
EXCEL_GLOSSARY = {
    # Keep English
    "SUM": "SUM",
    "AVERAGE": "AVERAGE",
    "VLOOKUP": "VLOOKUP",
    "IF": "IF",
    
    # Translate context
    "column": "cột",
    "row": "hàng",
    "cell": "ô",
    "range": "vùng",
    "formula": "công thức",
    "function": "hàm",
    "calculate": "tính toán",
    "sum": "tổng",
    "average": "trung bình",
    "count": "đếm",
}

def apply_glossary(text, glossary):
    for en, vi in glossary.items():
        text = text.replace(en, vi)
    return text
```

**Step 3: Human Validation (Sample 10%)**
- Hire freelancer trên Upwork/Freelancer.vn
- Validate 500-1000 examples randomly
- Fix common errors
- Update glossary

**Step 4: Back-translation Quality Check**
```python
def quality_check(original_en, translated_vi):
    # Translate VI → EN
    back_en = translate(translated_vi, 'en')
    
    # Compare semantic similarity
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer('all-MiniLM-L6-v2')
    emb1 = model.encode(original_en)
    emb2 = model.encode(back_en)
    
    similarity = cosine_similarity(emb1, emb2)
    
    if similarity < 0.8:
        # Flag for manual review
        return "LOW_QUALITY", back_en
    return "OK", back_en
```

---

### 📝 Translation Best Practices

**Rule 1: Keep technical terms English**
❌ Bad: "Sử dụng hàm TỔNG để cộng cột A"
✅ Good: "Sử dụng hàm SUM để tính tổng cột A"

**Rule 2: Natural Vietnamese phrasing**
❌ Bad: "Tính toán giá trị trung bình của các ô trong phạm vi"
✅ Good: "Tính trung bình các ô trong vùng dữ liệu"

**Rule 3: Preserve cell references exactly**
❌ Bad: "=TỔNG(A1:A10)" (SAI!)
✅ Good: "=SUM(A1:A10)" trong tiếng Việt vẫn vậy

**Rule 4: Context matters**
- "cell" in "cell phone" → "điện thoại di động"
- "cell" in "Excel cell" → "ô"
- "sum" in "sum up" → "tóm lại"
- "sum" in "calculate sum" → "tính tổng"

---

## 4️⃣ CÁCH ÁP DỤNG CHO PROJECT CỦA BẠN

### 🎯 Lộ trình ngắn hạn (1-2 tuần)

**Phase 1: Tăng cường Few-shot Examples**
```javascript
// Trong geminiService.js, bổ sung thêm 50-100 examples
const FORMULA_EXAMPLES = [
  // Hiện tại bạn có ~30 examples embedded
  // Tăng lên 100 examples covering:
  
  // 1. Statistical functions
  {
    query: "Tính độ lệch chuẩn của cột A",
    formula: "=STDEV.P(A:A)",
    explanation: "STDEV.P tính độ lệch chuẩn cho toàn bộ dữ liệu"
  },
  
  // 2. Date functions
  {
    query: "Tính số tháng giữa 2 ngày trong A1 và B1",
    formula: "=DATEDIF(A1,B1,\"M\")",
    explanation: "DATEDIF với tham số M trả về số tháng"
  },
  
  // 3. Text manipulation
  {
    query: "Chuyển cột A sang chữ hoa",
    formula: "=UPPER(A1)",
    explanation: "UPPER chuyển tất cả ký tự thành in hoa"
  },
  
  // 4. Array formulas
  {
    query: "Tìm top 3 giá trị lớn nhất trong A1:A100",
    formula: "=LARGE(A1:A100,{1;2;3})",
    explanation: "LARGE với array {1;2;3} trả về 3 giá trị lớn nhất"
  },
  
  // 5. Nested complex formulas
  {
    query: "Lấy giá trị từ cột C nếu A='Nam' VÀ B>25 VÀ D='Hà Nội'",
    formula: "=IF(AND(A1=\"Nam\",B1>25,D1=\"Hà Nội\"),C1,\"\")",
    explanation: "AND kết hợp 3 điều kiện, IF trả về C1 nếu đúng"
  },
  
  // ... 95 examples nữa
];

// Inject vào system prompt động
const systemPrompt = `
${BASE_PROMPT}

═══════════════════════════════════════════════════════════════════
📚 EXTENDED TRAINING DATA (100 EXAMPLES):
═══════════════════════════════════════════════════════════════════

${FORMULA_EXAMPLES.map((ex, i) => `
${i+1}. USER: "${ex.query}"
   FORMULA: ${ex.formula}
   EXPLAIN: ${ex.explanation}
`).join('\n')}

═══════════════════════════════════════════════════════════════════
`;
```

---

**Phase 2: Self-Consistency Check**
```javascript
export async function generateExcelFormulaWithValidation(prompt) {
  // Generate 3 candidates
  const candidates = await Promise.all([
    generateExcelFormula(prompt),
    generateExcelFormula(prompt),
    generateExcelFormula(prompt),
  ]);
  
  // Voting: Chọn formula xuất hiện nhiều nhất
  const formulaCounts = {};
  candidates.forEach(c => {
    const formula = c.formula;
    formulaCounts[formula] = (formulaCounts[formula] || 0) + 1;
  });
  
  // Sort by count
  const sorted = Object.entries(formulaCounts).sort((a,b) => b[1] - a[1]);
  const winner = sorted[0][0];
  
  // Return candidate with winning formula
  return candidates.find(c => c.formula === winner);
}
```

---

**Phase 3: RAG System (Beta)**
```javascript
// Install vector DB
// npm install chromadb @chromadb/client

import { ChromaClient } from 'chromadb';

class ExcelRAG {
  constructor() {
    this.client = new ChromaClient();
    this.collection = null;
  }
  
  async init() {
    this.collection = await this.client.createCollection({
      name: "excel_formulas",
      metadata: { "hnsw:space": "cosine" }
    });
  }
  
  async addExamples(examples) {
    // examples = [{id, query, formula, explanation}, ...]
    await this.collection.add({
      ids: examples.map(e => e.id),
      documents: examples.map(e => e.query),
      metadatas: examples.map(e => ({
        formula: e.formula,
        explanation: e.explanation
      }))
    });
  }
  
  async retrieveSimilar(query, topK = 5) {
    const results = await this.collection.query({
      queryTexts: [query],
      nResults: topK
    });
    
    return results.metadatas[0]; // Top K examples
  }
}

// Usage
export async function generateExcelFormulaRAG(prompt) {
  const rag = new ExcelRAG();
  await rag.init();
  
  // Retrieve similar examples
  const similar = await rag.retrieveSimilar(prompt, 5);
  
  // Inject into prompt
  const enhancedPrompt = `
  ${BASE_SYSTEM_PROMPT}
  
  ═══════════════════════════════════════════════════════════════════
  🎯 MOST RELEVANT EXAMPLES FOR THIS QUERY:
  ═══════════════════════════════════════════════════════════════════
  
  ${similar.map((ex, i) => `
  Example ${i+1}:
  Query: ${ex.query}
  Formula: ${ex.formula}
  Explanation: ${ex.explanation}
  `).join('\n')}
  
  ═══════════════════════════════════════════════════════════════════
  Now generate for: ${prompt}
  `;
  
  // Call Gemini with enhanced prompt
  return callGenerateContent(cachedModel, {
    contents: [{
      parts: [{ text: enhancedPrompt }]
    }]
  });
}
```

---

### 🚀 Lộ trình dài hạn (2-6 tháng)

**Option 1: Fine-tune GPT-3.5-turbo**
1. Thu thập 10,000 cặp (Vietnamese query, Excel formula, explanation)
   - 5,000 từ datasets trên (translated)
   - 3,000 từ user logs của bạn (nếu có)
   - 2,000 synthetic generation
   
2. Format training data:
```jsonl
{"messages": [
  {"role": "system", "content": "Bạn là chuyên gia Excel..."},
  {"role": "user", "content": "Tính tổng cột A đến D"},
  {"role": "assistant", "content": "{\"formula\":\"=SUM(A:D)\",\"explanation\":\"...\"}"}
]}
{"messages": [
  {"role": "system", "content": "Bạn là chuyên gia Excel..."},
  {"role": "user", "content": "Trung bình có điều kiện cột B > 100"},
  {"role": "assistant", "content": "{\"formula\":\"=AVERAGEIF(B:B,\\\">100\\\")\",\"explanation\":\"...\"}"}
]}
```

3. Upload và train:
```python
from openai import OpenAI
client = OpenAI()

# Upload training file
file = client.files.create(
  file=open("excel_formulas_vi.jsonl", "rb"),
  purpose="fine-tune"
)

# Create fine-tuning job
job = client.fine_tuning.jobs.create(
  training_file=file.id,
  model="gpt-3.5-turbo",
  hyperparameters={
    "n_epochs": 3
  }
)

# Wait for completion (2-6 hours)
# ...

# Get fine-tuned model name
model_name = "ft:gpt-3.5-turbo:your-org:excel-vi:abc123"
```

4. Integrate vào code:
```javascript
// geminiService.js → openaiService.js
export async function generateExcelFormula(prompt) {
  const response = await openai.chat.completions.create({
    model: "ft:gpt-3.5-turbo:your-org:excel-vi:abc123",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.2
  });
  
  return JSON.parse(response.choices[0].message.content);
}
```

**Cost estimate:**
- Training: ~$80 (10,000 examples × 3 epochs)
- Inference: ~$0.003/request (rẻ hơn GPT-4 turbo 5x)

---

**Option 2: Self-hosted LLaMA với LoRA**
1. Setup GPU server (RunPod, Vast.ai: ~$0.3/hour)
2. Download LLaMA-2-7B hoặc CodeLLaMA-7B
3. Fine-tune với LoRA (Low-Rank Adaptation):
```python
from transformers import AutoModelForCausalLM, TrainingArguments
from peft import LoraConfig, get_peft_model
from trl import SFTTrainer

# Load model
model = AutoModelForCausalLM.from_pretrained("codellama/CodeLlama-7b-hf")

# LoRA config (chỉ train 1% parameters)
peft_config = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "v_proj"],
    task_type="CAUSAL_LM"
)

model = get_peft_model(model, peft_config)

# Train
trainer = SFTTrainer(
    model=model,
    train_dataset=excel_dataset,
    max_seq_length=1024,
    training_args=TrainingArguments(
        num_train_epochs=3,
        per_device_train_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=2e-4,
        fp16=True,
    )
)

trainer.train()
```

4. Deploy với FastAPI:
```python
from fastapi import FastAPI
from transformers import pipeline

app = FastAPI()
generator = pipeline("text-generation", model="./fine-tuned-model")

@app.post("/generate")
def generate_formula(prompt: str):
    result = generator(
        f"### Instruction: {prompt}\n### Response:",
        max_length=256,
        temperature=0.2
    )
    return {"formula": result[0]['generated_text']}
```

**Cost estimate:**
- GPU training: $10-20 (chạy 3-4 giờ)
- Hosting: $200/month (dedicated GPU) hoặc $0.001/request (serverless)

---

## 5️⃣ SCRIPT TỰ ĐỘNG HÓA

### 📦 Dataset Collection Script

```python
# collect_datasets.py
import requests
import pandas as pd
import json
from pathlib import Path

class ExcelDatasetCollector:
    def __init__(self, output_dir='datasets'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def collect_stackoverflow(self, limit=10000):
        """Collect Excel questions from StackOverflow"""
        import stackapi
        SITE = stackapi.StackAPI('stackoverflow')
        
        questions = SITE.fetch(
            'questions',
            tagged='excel-formula',
            sort='votes',
            max_pages=limit//100
        )
        
        data = []
        for q in questions['items']:
            if q.get('accepted_answer_id'):
                # Fetch answer
                answer = SITE.fetch('answers', ids=[q['accepted_answer_id']])
                
                data.append({
                    'question': q['title'],
                    'answer': answer['items'][0]['body'],
                    'score': q['score'],
                    'tags': q['tags']
                })
        
        # Save
        df = pd.DataFrame(data)
        df.to_csv(self.output_dir / 'stackoverflow_excel.csv', index=False)
        return df
    
    def collect_microsoft_docs(self):
        """Scrape Microsoft Excel function docs"""
        from bs4 import BeautifulSoup
        
        functions = [
            "SUM", "AVERAGE", "COUNT", "COUNTA", "COUNTIF", "COUNTIFS",
            "SUMIF", "SUMIFS", "AVERAGEIF", "AVERAGEIFS",
            "IF", "IFS", "IFERROR", "IFNA",
            "VLOOKUP", "HLOOKUP", "INDEX", "MATCH", "XLOOKUP",
            "MAX", "MIN", "LARGE", "SMALL",
            "LEFT", "RIGHT", "MID", "LEN", "TRIM", "CONCATENATE",
            "DATE", "YEAR", "MONTH", "DAY", "TODAY", "NOW",
            # ... Add all 400+ functions
        ]
        
        docs_data = []
        for func in functions:
            url = f"https://support.microsoft.com/en-us/office/{func.lower()}-function"
            try:
                response = requests.get(url)
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract syntax
                syntax = soup.find('code')
                
                # Extract examples
                examples = soup.find_all('div', class_='example')
                
                docs_data.append({
                    'function': func,
                    'url': url,
                    'syntax': syntax.text if syntax else '',
                    'examples': [ex.text for ex in examples]
                })
            except Exception as e:
                print(f"Error scraping {func}: {e}")
        
        # Save
        with open(self.output_dir / 'microsoft_docs.json', 'w') as f:
            json.dump(docs_data, f, indent=2)
        
        return docs_data
    
    def collect_enron(self, enron_path):
        """Extract formulas from Enron spreadsheet corpus"""
        import openpyxl
        from pathlib import Path
        
        formulas = []
        
        for xlsx_file in Path(enron_path).rglob('*.xlsx'):
            try:
                wb = openpyxl.load_workbook(xlsx_file, data_only=False)
                for sheet in wb:
                    for row in sheet.iter_rows():
                        for cell in row:
                            if cell.data_type == 'f':
                                formulas.append({
                                    'file': str(xlsx_file),
                                    'sheet': sheet.title,
                                    'cell': cell.coordinate,
                                    'formula': cell.value
                                })
            except Exception as e:
                print(f"Error processing {xlsx_file}: {e}")
        
        # Save
        df = pd.DataFrame(formulas)
        df.to_csv(self.output_dir / 'enron_formulas.csv', index=False)
        return df
    
    def generate_synthetic(self, count=5000):
        """Generate synthetic training data"""
        import random
        
        templates = [
            ("Tính tổng {range}", "=SUM({range})"),
            ("Trung bình {range}", "=AVERAGE({range})"),
            ("Đếm {range}", "=COUNTA({range})"),
            ("Tìm max {range}", "=MAX({range})"),
            ("Tìm min {range}", "=MIN({range})"),
            ("Tổng nếu {condition}", "=SUMIF({range},\"{criteria}\",{sum_range})"),
            # ... More templates
        ]
        
        ranges = ["A:A", "B1:B100", "C2:C50", "A1:D10"]
        conditions = [">100", "<50", "=0", "<>0"]
        
        data = []
        for _ in range(count):
            template = random.choice(templates)
            range_val = random.choice(ranges)
            
            query = template[0].format(range=range_val)
            formula = template[1].format(range=range_val, criteria=random.choice(conditions))
            
            data.append({
                'query': query,
                'formula': formula,
                'type': 'synthetic'
            })
        
        df = pd.DataFrame(data)
        df.to_csv(self.output_dir / 'synthetic_data.csv', index=False)
        return df

# Usage
collector = ExcelDatasetCollector()
collector.collect_stackoverflow(limit=5000)
collector.collect_microsoft_docs()
collector.generate_synthetic(count=5000)
```

---

### 🌍 Translation Script

```python
# translate_dataset.py
from openai import OpenAI
import pandas as pd
from tqdm import tqdm
import time

class DatasetTranslator:
    def __init__(self, api_key):
        self.client = OpenAI(api_key=api_key)
        
        self.glossary = {
            "SUM": "SUM", "AVERAGE": "AVERAGE", "COUNT": "COUNT",
            # ... All Excel function names stay English
            
            "column": "cột", "row": "hàng", "cell": "ô",
            "range": "vùng", "formula": "công thức",
            "calculate": "tính", "sum": "tổng",
            "average": "trung bình", "count": "đếm",
        }
    
    def translate_batch(self, texts, batch_size=10):
        """Translate list of texts in batches"""
        results = []
        
        for i in tqdm(range(0, len(texts), batch_size)):
            batch = texts[i:i+batch_size]
            
            prompt = "Translate these Excel task descriptions to Vietnamese. Keep function names like SUM, AVERAGE unchanged.\n\n"
            for j, text in enumerate(batch):
                prompt += f"{j+1}. {text}\n"
            
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {"role": "system", "content": "You are an expert translator specializing in technical Excel terminology."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3
            )
            
            # Parse numbered responses
            translated = response.choices[0].message.content.split('\n')
            results.extend([t.split('. ', 1)[1] if '. ' in t else t for t in translated if t.strip()])
            
            time.sleep(1)  # Rate limit
        
        return results
    
    def translate_dataset(self, input_csv, output_csv):
        """Translate entire dataset"""
        df = pd.read_csv(input_csv)
        
        # Translate query column
        if 'query' in df.columns:
            df['query_vi'] = self.translate_batch(df['query'].tolist())
        
        if 'question' in df.columns:
            df['question_vi'] = self.translate_batch(df['question'].tolist())
        
        # Translate explanation
        if 'explanation' in df.columns:
            df['explanation_vi'] = self.translate_batch(df['explanation'].tolist())
        
        # Save
        df.to_csv(output_csv, index=False)
        print(f"Translated dataset saved to {output_csv}")
        
        return df
    
    def back_translate_quality_check(self, vietnamese_texts, original_english):
        """Quality check via back-translation"""
        from sentence_transformers import SentenceTransformer
        from sklearn.metrics.pairwise import cosine_similarity
        
        # Translate VI → EN
        back_en = self.translate_batch(vietnamese_texts)
        
        # Compute similarity
        model = SentenceTransformer('all-MiniLM-L6-v2')
        emb_original = model.encode(original_english)
        emb_back = model.encode(back_en)
        
        similarities = cosine_similarity(emb_original, emb_back).diagonal()
        
        # Flag low-quality translations
        low_quality = [i for i, sim in enumerate(similarities) if sim < 0.75]
        
        return {
            'average_similarity': similarities.mean(),
            'low_quality_indices': low_quality,
            'low_quality_count': len(low_quality)
        }

# Usage
translator = DatasetTranslator(api_key='your-openai-key')
translator.translate_dataset(
    'datasets/stackoverflow_excel.csv',
    'datasets/stackoverflow_excel_vi.csv'
)

# Quality check
df = pd.read_csv('datasets/stackoverflow_excel_vi.csv')
quality = translator.back_translate_quality_check(
    df['query_vi'].tolist()[:100],  # Sample 100
    df['query'].tolist()[:100]
)
print(f"Translation quality: {quality['average_similarity']:.2%}")
print(f"Low quality: {quality['low_quality_count']} items")
```

---

### 🧪 Fine-tuning Script

```python
# finetune_model.py
import pandas as pd
import json
from openai import OpenAI

class ExcelModelFineTuner:
    def __init__(self, api_key):
        self.client = OpenAI(api_key=api_key)
    
    def prepare_training_data(self, datasets_paths, output_jsonl):
        """Combine datasets và format cho OpenAI fine-tuning"""
        
        all_data = []
        
        for path in datasets_paths:
            df = pd.read_csv(path)
            
            for _, row in df.iterrows():
                if pd.isna(row.get('query_vi')) or pd.isna(row.get('formula')):
                    continue
                
                # Format theo OpenAI fine-tuning spec
                example = {
                    "messages": [
                        {
                            "role": "system",
                            "content": "Bạn là chuyên gia Excel. Tạo công thức Excel từ mô tả. Trả về JSON với format: {\"formula\": \"...\", \"explanation\": \"...\"}"
                        },
                        {
                            "role": "user",
                            "content": row['query_vi']
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
                
                all_data.append(example)
        
        # Write to JSONL
        with open(output_jsonl, 'w', encoding='utf-8') as f:
            for example in all_data:
                f.write(json.dumps(example, ensure_ascii=False) + '\n')
        
        print(f"Prepared {len(all_data)} training examples")
        return output_jsonl
    
    def start_finetuning(self, training_file_path, model="gpt-3.5-turbo"):
        """Upload training data and start fine-tuning"""
        
        # Upload file
        with open(training_file_path, 'rb') as f:
            file_response = self.client.files.create(
                file=f,
                purpose='fine-tune'
            )
        
        print(f"Uploaded file: {file_response.id}")
        
        # Create fine-tuning job
        job = self.client.fine_tuning.jobs.create(
            training_file=file_response.id,
            model=model,
            hyperparameters={
                "n_epochs": 3,
                "batch_size": 4,
                "learning_rate_multiplier": 1.0
            }
        )
        
        print(f"Fine-tuning job created: {job.id}")
        print(f"Status: {job.status}")
        print(f"Track progress at: https://platform.openai.com/finetune/{job.id}")
        
        return job
    
    def monitor_job(self, job_id):
        """Monitor fine-tuning progress"""
        job = self.client.fine_tuning.jobs.retrieve(job_id)
        
        print(f"Job {job_id} status: {job.status}")
        
        if job.status == 'succeeded':
            print(f"Fine-tuned model: {job.fine_tuned_model}")
            return job.fine_tuned_model
        elif job.status == 'failed':
            print(f"Error: {job.error}")
        
        return None

# Usage
finetuner = ExcelModelFineTuner(api_key='your-openai-key')

# Step 1: Prepare data
training_file = finetuner.prepare_training_data(
    datasets_paths=[
        'datasets/stackoverflow_excel_vi.csv',
        'datasets/synthetic_data_vi.csv',
        'datasets/microsoft_examples_vi.csv',
    ],
    output_jsonl='training_data.jsonl'
)

# Step 2: Start fine-tuning
job = finetuner.start_finetuning(training_file)

# Step 3: Wait 2-6 hours, then check
# model_name = finetuner.monitor_job(job.id)
```

---

## 6️⃣ ĐÁNH GIÁ CHẤT LƯỢNG (EVALUATION)

### 📊 Metrics để đo lường

**1. Formula Correctness**
```python
def evaluate_formula_correctness(predicted, ground_truth):
    """Check if formulas are functionally equivalent"""
    
    # Exact match
    exact_match = (predicted == ground_truth)
    
    # Normalize and compare
    def normalize_formula(f):
        # Remove spaces, lowercase
        return f.replace(' ', '').upper()
    
    normalized_match = (normalize_formula(predicted) == normalize_formula(ground_truth))
    
    return {
        'exact_match': exact_match,
        'normalized_match': normalized_match
    }
```

**2. Execution Correctness**
```python
import openpyxl

def test_formula_execution(formula, test_data, expected_result):
    """Test if formula produces correct result"""
    
    wb = openpyxl.Workbook()
    ws = wb.active
    
    # Insert test data
    for cell, value in test_data.items():
        ws[cell] = value
    
    # Insert formula
    ws['Z1'] = formula
    
    # Get result
    result = ws['Z1'].value
    
    return {
        'passed': (result == expected_result),
        'result': result,
        'expected': expected_result
    }
```

**3. Human Evaluation**
```python
# Create evaluation interface
def create_eval_batch(predictions, ground_truth, n=100):
    """Create batch for human evaluation"""
    
    import random
    samples = random.sample(list(zip(predictions, ground_truth)), n)
    
    eval_data = []
    for pred, gt in samples:
        eval_data.append({
            'query': pred['query'],
            'predicted_formula': pred['formula'],
            'ground_truth_formula': gt['formula'],
            'rating': None,  # 1-5 scale
            'notes': ''
        })
    
    # Export to CSV for reviewers
    df = pd.DataFrame(eval_data)
    df.to_csv('human_eval_batch.csv', index=False)
    
    return eval_data
```

---

## 7️⃣ KẾT LUẬN & KHUYẾN NGHỊ

### 🎯 Khuyến nghị cho bạn:

**Ngắn hạn (2 tuần tới):**
1. ✅ Tăng few-shot examples từ 30 → 100 (dễ nhất, hiệu quả ngay)
2. ✅ Implement self-consistency voting (3 generations → pick best)
3. ✅ Thêm validation: Check công thức syntax trước khi return

**Trung hạn (1-2 tháng):**
1. 🔥 Build RAG system với ChromaDB (1,000-5,000 examples)
2. 🔥 Collect user feedback → improve dataset
3. 🔥 Translate 2,000-5,000 examples sang tiếng Việt

**Dài hạn (3-6 tháng):**
1. 🚀 Fine-tune GPT-3.5-turbo với 10,000+ Vietnamese examples
2. 🚀 Hoặc self-host LLaMA-2 với LoRA fine-tuning
3. 🚀 Build feedback loop: User corrections → retrain monthly

---

### 💰 So sánh chi phí:

| Method | Setup Time | Cost/Month | Accuracy | Control |
|--------|-----------|-----------|----------|---------|
| **Prompt Engineering** (hiện tại) | 1 week | $50-100 (API calls) | 75-85% | Medium |
| **+ RAG** | 2 weeks | $80-150 | 85-90% | High |
| **Fine-tuned GPT-3.5** | 1 month | $200-300 | 90-95% | High |
| **Self-hosted LLaMA** | 2 months | $200-500 | 88-93% | Full |

---

### 📚 Datasets ưu tiên cho bạn:

**Must-have (5,000 examples):**
1. Microsoft Docs scraping: 400 functions × 5 examples = 2,000
2. Synthetic generation: 2,000
3. StackOverflow curated: 1,000

**Nice-to-have (5,000 examples):**
4. Enron corpus analysis: 2,000
5. SpreadsheetCoder (if available): 2,000
6. User feedback collection: 1,000

**Total: 10,000 examples → Đủ cho fine-tuning chất lượng cao**

---

### 🛠️ Action Plan Cụ Thể:

**Week 1-2:**
- [ ] Chạy script `collect_datasets.py` → Crawl Microsoft Docs
- [ ] Generate synthetic data 2,000 examples
- [ ] Translate 1,000 examples sang Vietnamese

**Week 3-4:**
- [ ] Tăng few-shot examples trong `geminiService.js` lên 100
- [ ] Implement self-consistency voting
- [ ] Add formula syntax validation

**Month 2:**
- [ ] Build RAG system với ChromaDB
- [ ] Collect 5,000 examples total
- [ ] A/B test RAG vs baseline

**Month 3-4:**
- [ ] Translate toàn bộ 10,000 examples
- [ ] Prepare training data format
- [ ] Fine-tune GPT-3.5-turbo

**Month 5-6:**
- [ ] Deploy fine-tuned model
- [ ] Monitor performance
- [ ] Iterate based on user feedback

---

## 📞 Resources & Links

**Datasets:**
- Enron Spreadsheets: https://github.com/datadavev/enron_spreadsheets
- SpreadsheetCoder: https://github.com/microsoft/spreadsheetcoder
- BIRD Benchmark: https://github.com/AlibabaResearch/DAMO-ConvAI/tree/main/bird

**Tools:**
- OpenAI Fine-tuning: https://platform.openai.com/docs/guides/fine-tuning
- ChromaDB: https://www.trychroma.com/
- Sentence Transformers: https://www.sbert.net/

**Papers:**
- "Spreadsheet Formula Prediction" (NeurIPS 2021)
- "SheetCopilot" (Microsoft Research 2023)
- "Chain-of-Thought Prompting" (Google 2022)

---

**Nếu cần code chi tiết hơn hoặc hỗ trợ implement, hãy cho tôi biết phần nào bạn muốn làm trước! 🚀**

