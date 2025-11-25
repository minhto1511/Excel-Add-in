"""
Script để dịch dataset Excel từ tiếng Anh sang tiếng Việt
Author: eOfficeAI Team
Usage: python translate_dataset.py --input datasets/input.csv --output datasets/output.csv
"""

import pandas as pd
import json
import time
import argparse
from pathlib import Path
from typing import List, Dict
import re

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("⚠️  OpenAI library not installed. Run: pip install openai")

try:
    from googletrans import Translator as GoogleTranslator
    GOOGLETRANS_AVAILABLE = True
except ImportError:
    GOOGLETRANS_AVAILABLE = False
    print("⚠️  googletrans not installed. Run: pip install googletrans==3.1.0a0")


class ExcelDatasetTranslator:
    """
    Translator cho Excel datasets
    Hỗ trợ nhiều translation engines: OpenAI, Google Translate
    """
    
    def __init__(self, api_key=None, method='openai'):
        self.method = method
        
        # Excel terminology glossary
        self.glossary = {
            # Excel functions - GIỮ NGUYÊN tiếng Anh
            "SUM": "SUM", "AVERAGE": "AVERAGE", "COUNT": "COUNT",
            "COUNTA": "COUNTA", "COUNTIF": "COUNTIF", "COUNTIFS": "COUNTIFS",
            "SUMIF": "SUMIF", "SUMIFS": "SUMIFS",
            "AVERAGEIF": "AVERAGEIF", "AVERAGEIFS": "AVERAGEIFS",
            "MAX": "MAX", "MIN": "MIN", "LARGE": "LARGE", "SMALL": "SMALL",
            "IF": "IF", "IFS": "IFS", "AND": "AND", "OR": "OR", "NOT": "NOT",
            "IFERROR": "IFERROR", "IFNA": "IFNA",
            "VLOOKUP": "VLOOKUP", "HLOOKUP": "HLOOKUP", "XLOOKUP": "XLOOKUP",
            "INDEX": "INDEX", "MATCH": "MATCH",
            "LEFT": "LEFT", "RIGHT": "RIGHT", "MID": "MID", "LEN": "LEN",
            "UPPER": "UPPER", "LOWER": "LOWER", "TRIM": "TRIM",
            "CONCATENATE": "CONCATENATE", "CONCAT": "CONCAT", "TEXTJOIN": "TEXTJOIN",
            "TODAY": "TODAY", "NOW": "NOW", "DATE": "DATE",
            "YEAR": "YEAR", "MONTH": "MONTH", "DAY": "DAY",
            "DATEDIF": "DATEDIF", "EOMONTH": "EOMONTH",
            "STDEV": "STDEV", "MEDIAN": "MEDIAN",
            
            # Excel terms - DỊCH sang tiếng Việt
            "column": "cột", "Column": "Cột",
            "row": "hàng", "Row": "Hàng",
            "cell": "ô", "Cell": "Ô",
            "range": "vùng", "Range": "Vùng",
            "formula": "công thức", "Formula": "Công thức",
            "function": "hàm", "Function": "Hàm",
            "calculate": "tính", "Calculate": "Tính",
            "sum": "tổng", "Sum": "Tổng",
            "average": "trung bình", "Average": "Trung bình",
            "mean": "trung bình", "Mean": "Trung bình",
            "count": "đếm", "Count": "Đếm",
            "total": "tổng", "Total": "Tổng",
            "maximum": "lớn nhất", "Maximum": "Lớn nhất",
            "minimum": "nhỏ nhất", "Minimum": "Nhỏ nhất",
            "value": "giá trị", "Value": "Giá trị",
            "data": "dữ liệu", "Data": "Dữ liệu",
            "sheet": "sheet", "Sheet": "Sheet",
            "workbook": "workbook", "Workbook": "Workbook",
            "empty": "rỗng", "Empty": "Rỗng",
            "non-empty": "không rỗng", "Non-empty": "Không rỗng",
            "text": "text", "Text": "Text",
            "number": "số", "Number": "Số",
            "date": "ngày", "Date": "Ngày",
            "time": "giờ", "Time": "Giờ",
            "criteria": "điều kiện", "Criteria": "Điều kiện",
            "condition": "điều kiện", "Condition": "Điều kiện",
            "if": "nếu", "If": "Nếu",
            "then": "thì", "Then": "Thì",
            "else": "không thì", "Else": "Không thì",
            "and": "và", "And": "Và",
            "or": "hoặc", "Or": "Hoặc",
            "greater than": "lớn hơn", "Greater than": "Lớn hơn",
            "less than": "nhỏ hơn", "Less than": "Nhỏ hơn",
            "equal": "bằng", "Equal": "Bằng",
            "equals": "bằng", "Equals": "Bằng",
            "lookup": "tra cứu", "Lookup": "Tra cứu",
            "find": "tìm", "Find": "Tìm",
            "search": "tìm kiếm", "Search": "Tìm kiếm",
            "extract": "trích xuất", "Extract": "Trích xuất",
            "concatenate": "nối", "Concatenate": "Nối",
            "join": "nối", "Join": "Nối",
            "split": "tách", "Split": "Tách",
            "uppercase": "chữ hoa", "Uppercase": "Chữ hoa",
            "lowercase": "chữ thường", "Lowercase": "Chữ thường",
            "character": "ký tự", "Character": "Ký tự",
            "characters": "ký tự", "Characters": "Ký tự",
            "first": "đầu tiên", "First": "Đầu tiên",
            "last": "cuối cùng", "Last": "Cuối cùng",
            "from": "từ", "From": "Từ",
            "to": "đến", "To": "Đến",
            "between": "giữa", "Between": "Giữa",
            "where": "nếu", "Where": "Nếu",
            "return": "trả về", "Return": "Trả về",
            "show": "hiển thị", "Show": "Hiển thị",
            "display": "hiển thị", "Display": "Hiển thị",
        }
        
        # Initialize translator
        if method == 'openai' and OPENAI_AVAILABLE:
            if not api_key:
                raise ValueError("OpenAI API key required for method='openai'")
            self.client = OpenAI(api_key=api_key)
            print("✅ Initialized OpenAI translator")
            
        elif method == 'google' and GOOGLETRANS_AVAILABLE:
            self.translator = GoogleTranslator()
            print("✅ Initialized Google Translate")
            
        else:
            raise ValueError(f"Translation method '{method}' not available or libraries not installed")
    
    def protect_excel_terms(self, text: str) -> tuple:
        """
        Bảo vệ Excel functions và cell references khỏi bị dịch
        Returns: (protected_text, placeholders_dict)
        """
        placeholders = {}
        protected_text = text
        counter = 0
        
        # Protect Excel functions (=FUNCTION(...))
        function_pattern = r'(=[A-Z\.]+\([^\)]*\))'
        for match in re.finditer(function_pattern, text):
            placeholder = f"__FORMULA_{counter}__"
            placeholders[placeholder] = match.group(1)
            protected_text = protected_text.replace(match.group(1), placeholder)
            counter += 1
        
        # Protect cell references (A1, B2:D10, $A$1, etc.)
        cell_pattern = r'(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)'
        for match in re.finditer(cell_pattern, text):
            placeholder = f"__CELL_{counter}__"
            placeholders[placeholder] = match.group(1)
            protected_text = protected_text.replace(match.group(1), placeholder)
            counter += 1
        
        # Protect standalone Excel function names
        function_names = list(self.glossary.keys())
        for func in function_names:
            if func.isupper() and len(func) > 2:  # Excel functions are UPPERCASE
                pattern = r'\b' + re.escape(func) + r'\b'
                for match in re.finditer(pattern, protected_text):
                    placeholder = f"__FUNC_{counter}__"
                    placeholders[placeholder] = match.group(0)
                    protected_text = protected_text.replace(match.group(0), placeholder, 1)
                    counter += 1
        
        return protected_text, placeholders
    
    def restore_excel_terms(self, text: str, placeholders: Dict) -> str:
        """Restore protected terms"""
        restored = text
        for placeholder, original in placeholders.items():
            restored = restored.replace(placeholder, original)
        return restored
    
    def translate_text_openai(self, text: str) -> str:
        """Translate using OpenAI GPT"""
        if not text or not text.strip():
            return text
        
        # Protect Excel terms
        protected_text, placeholders = self.protect_excel_terms(text)
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert translator specializing in Excel and technical documentation.
Translate from English to Vietnamese.

RULES:
1. Keep Excel function names in UPPERCASE English (SUM, VLOOKUP, IF, etc.)
2. Keep cell references unchanged (A1, B2:D10, $A$1, etc.)
3. Keep formulas unchanged (=SUM(A1:A10))
4. Translate technical terms naturally
5. Use Vietnamese terminology from the glossary when provided
6. Keep placeholders like __FORMULA_0__ unchanged

Examples:
- "Calculate sum of column A" → "Tính tổng cột A"
- "=SUM(A:A)" → "=SUM(A:A)" (không đổi)
- "If A1 > 100" → "Nếu A1 > 100"
"""
                    },
                    {
                        "role": "user",
                        "content": f"Translate to Vietnamese:\n{protected_text}"
                    }
                ],
                temperature=0.3,
                max_tokens=500
            )
            
            translated = response.choices[0].message.content.strip()
            
            # Restore protected terms
            translated = self.restore_excel_terms(translated, placeholders)
            
            return translated
            
        except Exception as e:
            print(f"    ⚠️  Translation error: {e}")
            return text
    
    def translate_text_google(self, text: str) -> str:
        """Translate using Google Translate"""
        if not text or not text.strip():
            return text
        
        # Protect Excel terms
        protected_text, placeholders = self.protect_excel_terms(text)
        
        try:
            result = self.translator.translate(protected_text, src='en', dest='vi')
            translated = result.text
            
            # Restore protected terms
            translated = self.restore_excel_terms(translated, placeholders)
            
            return translated
            
        except Exception as e:
            print(f"    ⚠️  Translation error: {e}")
            return text
    
    def translate_batch(self, texts: List[str], batch_size=10) -> List[str]:
        """Translate multiple texts in batches"""
        results = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i+batch_size]
            batch_results = []
            
            for text in batch:
                if self.method == 'openai':
                    translated = self.translate_text_openai(text)
                elif self.method == 'google':
                    translated = self.translate_text_google(text)
                else:
                    translated = text
                
                batch_results.append(translated)
                
                # Rate limiting
                time.sleep(0.2 if self.method == 'google' else 0.5)
            
            results.extend(batch_results)
            
            # Progress
            print(f"    Translated {min(i+batch_size, len(texts))}/{len(texts)} items...")
        
        return results
    
    def translate_dataframe(self, df: pd.DataFrame, columns_to_translate: List[str]) -> pd.DataFrame:
        """Translate specific columns in a DataFrame"""
        df_copy = df.copy()
        
        for col in columns_to_translate:
            if col not in df.columns:
                print(f"⚠️  Column '{col}' not found in DataFrame")
                continue
            
            print(f"\n📝 Translating column: {col}")
            
            # Get texts to translate
            texts = df[col].fillna('').astype(str).tolist()
            
            # Translate
            translated = self.translate_batch(texts, batch_size=10)
            
            # Add new column
            new_col_name = f"{col}_vi"
            df_copy[new_col_name] = translated
            
            print(f"✅ Completed: {col} → {new_col_name}")
        
        return df_copy
    
    def translate_dataset_file(self, input_file: str, output_file: str, columns: List[str]):
        """Translate dataset file (CSV or JSON)"""
        input_path = Path(input_file)
        output_path = Path(output_file)
        
        print(f"\n📂 Reading: {input_path}")
        
        # Read file
        if input_path.suffix == '.csv':
            df = pd.read_csv(input_path)
        elif input_path.suffix == '.json':
            df = pd.read_json(input_path)
        else:
            raise ValueError(f"Unsupported file format: {input_path.suffix}")
        
        print(f"   Rows: {len(df)}")
        print(f"   Columns: {list(df.columns)}")
        
        # Translate
        df_translated = self.translate_dataframe(df, columns)
        
        # Save
        print(f"\n💾 Saving to: {output_path}")
        
        if output_path.suffix == '.csv':
            df_translated.to_csv(output_path, index=False, encoding='utf-8')
        elif output_path.suffix == '.json':
            df_translated.to_json(output_path, orient='records', force_ascii=False, indent=2)
        
        print(f"✅ Done! Translated {len(df_translated)} rows")
        
        return df_translated


def main():
    parser = argparse.ArgumentParser(description='Translate Excel dataset to Vietnamese')
    parser.add_argument('--input', '-i', required=True, help='Input file (CSV or JSON)')
    parser.add_argument('--output', '-o', required=True, help='Output file')
    parser.add_argument('--columns', '-c', nargs='+', required=True, help='Columns to translate')
    parser.add_argument('--method', '-m', choices=['openai', 'google'], default='openai', help='Translation method')
    parser.add_argument('--api-key', '-k', help='OpenAI API key (if using OpenAI)')
    
    args = parser.parse_args()
    
    print("=" * 70)
    print("🌍 EXCEL DATASET TRANSLATOR")
    print("=" * 70)
    
    # Initialize translator
    translator = ExcelDatasetTranslator(api_key=args.api_key, method=args.method)
    
    # Translate
    translator.translate_dataset_file(
        input_file=args.input,
        output_file=args.output,
        columns=args.columns
    )
    
    print("\n" + "=" * 70)
    print("✅ TRANSLATION COMPLETED!")
    print("=" * 70)


if __name__ == "__main__":
    main()

