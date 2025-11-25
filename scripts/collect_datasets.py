"""
Script để thu thập datasets Excel từ nhiều nguồn
Author: eOfficeAI Team
Usage: python collect_datasets.py
"""

import requests
import pandas as pd
import json
from pathlib import Path
from bs4 import BeautifulSoup
import time
from typing import List, Dict
import re

class ExcelDatasetCollector:
    def __init__(self, output_dir='datasets'):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
    
    def collect_microsoft_docs(self) -> List[Dict]:
        """
        Crawl tài liệu Excel functions từ Microsoft Docs
        Trả về list các function với examples
        """
        print("📚 Đang thu thập Microsoft Excel documentation...")
        
        # Danh sách 400+ hàm Excel phổ biến
        excel_functions = [
            # Math & Statistical
            "SUM", "AVERAGE", "COUNT", "COUNTA", "COUNTBLANK", "COUNTIF", "COUNTIFS",
            "SUMIF", "SUMIFS", "AVERAGEIF", "AVERAGEIFS",
            "MAX", "MIN", "MAXA", "MINA", "LARGE", "SMALL",
            "MEDIAN", "MODE.SNGL", "MODE.MULT",
            "STDEV.S", "STDEV.P", "VAR.S", "VAR.P",
            "PRODUCT", "QUOTIENT", "MOD", "ROUND", "ROUNDUP", "ROUNDDOWN",
            "ABS", "SQRT", "POWER", "EXP", "LN", "LOG", "LOG10",
            "PI", "RAND", "RANDBETWEEN",
            
            # Logical
            "IF", "IFS", "AND", "OR", "NOT", "XOR",
            "IFERROR", "IFNA", "SWITCH",
            "TRUE", "FALSE",
            
            # Lookup & Reference
            "VLOOKUP", "HLOOKUP", "XLOOKUP", "LOOKUP",
            "INDEX", "MATCH", "OFFSET", "INDIRECT", "ROW", "COLUMN", "ROWS", "COLUMNS",
            "CHOOSE", "TRANSPOSE",
            "FILTER", "SORT", "SORTBY", "UNIQUE",
            
            # Text
            "CONCATENATE", "CONCAT", "TEXTJOIN",
            "LEFT", "RIGHT", "MID", "LEN", "LENB",
            "FIND", "FINDB", "SEARCH", "SEARCHB",
            "SUBSTITUTE", "REPLACE", "REPLACEB",
            "UPPER", "LOWER", "PROPER", "TRIM", "CLEAN",
            "TEXT", "VALUE", "NUMBERVALUE",
            "CHAR", "CODE", "UNICHAR", "UNICODE",
            "EXACT", "REPT",
            
            # Date & Time
            "TODAY", "NOW", "DATE", "TIME", "DATEVALUE", "TIMEVALUE",
            "YEAR", "MONTH", "DAY", "HOUR", "MINUTE", "SECOND",
            "WEEKDAY", "WEEKNUM", "ISOWEEKNUM",
            "EDATE", "EOMONTH", "WORKDAY", "WORKDAY.INTL", "NETWORKDAYS", "NETWORKDAYS.INTL",
            "DATEDIF", "DAYS", "DAYS360",
            
            # Financial
            "PMT", "IPMT", "PPMT", "FV", "PV", "NPER", "RATE",
            "NPV", "IRR", "XIRR", "MIRR",
            "DB", "DDB", "SLN", "SYD",
            
            # Database
            "DSUM", "DAVERAGE", "DCOUNT", "DCOUNTA",
            "DMAX", "DMIN", "DGET",
            
            # Information
            "ISBLANK", "ISERROR", "ISERR", "ISNA",
            "ISNUMBER", "ISTEXT", "ISLOGICAL",
            "ISEVEN", "ISODD",
            "TYPE", "CELL", "INFO",
            
            # Array (Dynamic Arrays - Excel 365)
            "SEQUENCE", "RANDARRAY", "SORTBY", "UNIQUE",
        ]
        
        docs_data = []
        
        for i, func in enumerate(excel_functions, 1):
            print(f"  [{i}/{len(excel_functions)}] Crawling {func}...")
            
            try:
                # Microsoft Docs URL pattern
                url = f"https://support.microsoft.com/en-us/office/{func.lower()}-function"
                
                # Tùy chỉnh URL cho một số hàm đặc biệt
                func_lower = func.lower().replace(".", "-")
                url = f"https://support.microsoft.com/en-us/office/{func_lower}-function"
                
                response = requests.get(url, timeout=10)
                
                if response.status_code != 200:
                    print(f"    ⚠️  Không tìm thấy docs cho {func}")
                    continue
                
                soup = BeautifulSoup(response.text, 'html.parser')
                
                # Extract syntax
                syntax_elements = soup.find_all(['code', 'pre'])
                syntax = ""
                if syntax_elements:
                    syntax = syntax_elements[0].get_text(strip=True)
                
                # Extract description
                description = ""
                desc_elem = soup.find('div', class_='ocpArticleContent')
                if desc_elem:
                    paragraphs = desc_elem.find_all('p', limit=3)
                    description = ' '.join([p.get_text(strip=True) for p in paragraphs])
                
                # Extract examples
                examples = []
                example_headers = soup.find_all(['h2', 'h3'], string=re.compile(r'Example', re.I))
                for header in example_headers:
                    # Tìm các element tiếp theo sau header
                    siblings = header.find_next_siblings(['p', 'pre', 'code', 'table'], limit=5)
                    for sibling in siblings:
                        example_text = sibling.get_text(strip=True)
                        if example_text and len(example_text) > 10:
                            examples.append(example_text[:500])  # Limit length
                
                docs_data.append({
                    'function': func,
                    'url': url,
                    'syntax': syntax[:200] if syntax else '',
                    'description': description[:500] if description else '',
                    'examples': examples[:3],  # Giữ tối đa 3 examples
                    'example_count': len(examples)
                })
                
                # Rate limiting
                time.sleep(0.5)
                
            except Exception as e:
                print(f"    ❌ Error scraping {func}: {e}")
                continue
        
        # Save to JSON
        output_file = self.output_dir / 'microsoft_docs_functions.json'
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(docs_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Thu thập xong {len(docs_data)} functions!")
        print(f"💾 Saved to: {output_file}")
        
        return docs_data
    
    def collect_stackoverflow(self, max_pages=50) -> pd.DataFrame:
        """
        Thu thập Excel questions từ StackOverflow
        Sử dụng StackExchange API
        """
        print("\n📚 Đang thu thập StackOverflow Excel questions...")
        
        all_questions = []
        page = 1
        
        while page <= max_pages:
            print(f"  Page {page}/{max_pages}...")
            
            try:
                # StackExchange API
                url = "https://api.stackexchange.com/2.3/questions"
                params = {
                    'page': page,
                    'pagesize': 100,
                    'order': 'desc',
                    'sort': 'votes',
                    'tagged': 'excel-formula',
                    'site': 'stackoverflow',
                    'filter': 'withbody'
                }
                
                response = requests.get(url, params=params, timeout=10)
                
                if response.status_code != 200:
                    print(f"    ⚠️  API error: {response.status_code}")
                    break
                
                data = response.json()
                
                if not data.get('items'):
                    print("    No more items")
                    break
                
                for item in data['items']:
                    # Lọc chỉ lấy câu hỏi có accepted answer
                    if not item.get('accepted_answer_id'):
                        continue
                    
                    # Extract formula từ body (nếu có)
                    body = item.get('body', '')
                    formulas = re.findall(r'=[\w\s\(\)\:\,\.\"\'\+\-\*\/\>\<\&]+', body)
                    
                    all_questions.append({
                        'question_id': item['question_id'],
                        'title': item['title'],
                        'body': body[:500],  # Truncate
                        'score': item['score'],
                        'view_count': item.get('view_count', 0),
                        'answer_count': item['answer_count'],
                        'tags': ','.join(item.get('tags', [])),
                        'has_formula': len(formulas) > 0,
                        'formulas_found': formulas[:3] if formulas else [],
                        'link': item['link']
                    })
                
                # Check if there are more pages
                if not data.get('has_more'):
                    break
                
                page += 1
                
                # API rate limiting (30 requests/second)
                time.sleep(0.5)
                
            except Exception as e:
                print(f"    ❌ Error: {e}")
                break
        
        # Convert to DataFrame
        df = pd.DataFrame(all_questions)
        
        # Save to CSV
        output_file = self.output_dir / 'stackoverflow_excel_questions.csv'
        df.to_csv(output_file, index=False, encoding='utf-8')
        
        print(f"\n✅ Thu thập xong {len(df)} questions!")
        print(f"💾 Saved to: {output_file}")
        
        # Stats
        print(f"\n📊 Statistics:")
        print(f"  - Có formula: {df['has_formula'].sum()}")
        print(f"  - Trung bình score: {df['score'].mean():.1f}")
        print(f"  - Trung bình views: {df['view_count'].mean():.0f}")
        
        return df
    
    def generate_synthetic_data(self, count=2000) -> pd.DataFrame:
        """
        Tạo synthetic training data cho Excel formulas
        """
        print(f"\n🤖 Đang tạo {count} synthetic examples...")
        
        import random
        
        # Templates với các biến thể
        templates = [
            # SUM variations
            ("Calculate sum of column {col}", "=SUM({col}:{col})", "basic"),
            ("Sum range {range}", "=SUM({range})", "basic"),
            ("Total of {col1}, {col2}, {col3}", "=SUM({col1}:{col1},{col2}:{col2},{col3}:{col3})", "intermediate"),
            ("Sum {range} from row {row1} to {row2}", "=SUM({col1}{row1}:{col2}{row2})", "intermediate"),
            
            # AVERAGE
            ("Calculate average of {col}", "=AVERAGE({col}:{col})", "basic"),
            ("Mean of {range}", "=AVERAGE({range})", "basic"),
            ("Average if {col1} > {val}", "=AVERAGEIF({col1}:{col1},\">{val}\",{col2}:{col2})", "advanced"),
            
            # COUNT
            ("Count non-empty cells in {col}", "=COUNTA({col}:{col})", "basic"),
            ("Count numbers in {range}", "=COUNT({range})", "basic"),
            ("Count if {col} {operator} {val}", "=COUNTIF({col}:{col},\"{operator}{val}\")", "intermediate"),
            
            # MAX/MIN
            ("Find maximum in {col}", "=MAX({col}:{col})", "basic"),
            ("Find minimum in {range}", "=MIN({range})", "basic"),
            ("Largest {n}th value in {range}", "=LARGE({range},{n})", "advanced"),
            
            # IF
            ("If {col}{row} > {val} then '{text1}' else '{text2}'", "=IF({col}{row}>{val},\"{text1}\",\"{text2}\")", "intermediate"),
            ("If {col1}{row} = '{text}' return {col2}{row}", "=IF({col1}{row}=\"{text}\",{col2}{row},\"\")", "intermediate"),
            
            # SUMIF
            ("Sum {col1} if {col2} equals '{text}'", "=SUMIF({col2}:{col2},\"{text}\",{col1}:{col1})", "advanced"),
            ("Sum {col1} where {col2} > {val}", "=SUMIF({col2}:{col2},\">{val}\",{col1}:{col1})", "advanced"),
            
            # TEXT
            ("Concatenate {col1} and {col2}", "={col1}{row}&\" \"&{col2}{row}", "intermediate"),
            ("First {n} characters of {col}", "=LEFT({col}{row},{n})", "intermediate"),
            ("Convert {col} to uppercase", "=UPPER({col}{row})", "basic"),
            
            # DATE
            ("Get today's date", "=TODAY()", "basic"),
            ("Extract year from {col}", "=YEAR({col}{row})", "intermediate"),
            ("Days between {col1} and {col2}", "={col2}{row}-{col1}{row}", "intermediate"),
        ]
        
        # Biến thể
        columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
        rows = list(range(1, 101))
        ranges = ['A1:A10', 'B2:B50', 'C1:C100', 'D5:D25', 'A1:D10', 'B2:E50']
        values = [0, 10, 50, 100, 500, 1000]
        operators = ['>', '<', '=', '>=', '<=', '<>']
        texts = ['Pass', 'Fail', 'Complete', 'Pending', 'Active', 'Inactive', 'Yes', 'No']
        
        synthetic_data = []
        
        for i in range(count):
            # Chọn random template
            query_template, formula_template, difficulty = random.choice(templates)
            
            # Fill variables
            variables = {
                'col': random.choice(columns),
                'col1': random.choice(columns),
                'col2': random.choice(columns[:4]),  # A-D
                'col3': random.choice(columns[4:]),  # E-H
                'row': random.choice(rows),
                'row1': random.choice(rows[:20]),
                'row2': random.choice(rows[20:]),
                'range': random.choice(ranges),
                'val': random.choice(values),
                'n': random.choice([1, 2, 3, 5, 10]),
                'operator': random.choice(operators),
                'text': random.choice(texts),
                'text1': random.choice(texts[:4]),
                'text2': random.choice(texts[4:]),
            }
            
            # Format
            try:
                query = query_template.format(**variables)
                formula = formula_template.format(**variables)
                
                synthetic_data.append({
                    'id': f'SYN_{i+1:04d}',
                    'query_en': query,
                    'formula': formula,
                    'difficulty': difficulty,
                    'source': 'synthetic'
                })
            except KeyError:
                # Skip if template has missing variables
                continue
        
        df = pd.DataFrame(synthetic_data)
        
        # Save
        output_file = self.output_dir / 'synthetic_formulas.csv'
        df.to_csv(output_file, index=False, encoding='utf-8')
        
        print(f"✅ Tạo xong {len(df)} synthetic examples!")
        print(f"💾 Saved to: {output_file}")
        
        # Stats
        print(f"\n📊 Statistics:")
        for diff in ['basic', 'intermediate', 'advanced']:
            count = (df['difficulty'] == diff).sum()
            print(f"  - {diff}: {count}")
        
        return df


def main():
    """Main function"""
    print("=" * 70)
    print("🚀 EXCEL DATASET COLLECTOR")
    print("=" * 70)
    
    collector = ExcelDatasetCollector(output_dir='datasets')
    
    # 1. Collect Microsoft Docs
    print("\n" + "=" * 70)
    docs = collector.collect_microsoft_docs()
    
    # 2. Collect StackOverflow
    print("\n" + "=" * 70)
    stackoverflow = collector.collect_stackoverflow(max_pages=20)
    
    # 3. Generate Synthetic Data
    print("\n" + "=" * 70)
    synthetic = collector.generate_synthetic_data(count=2000)
    
    # Summary
    print("\n" + "=" * 70)
    print("✅ HOÀN THÀNH!")
    print("=" * 70)
    print(f"📚 Microsoft Docs: {len(docs)} functions")
    print(f"📚 StackOverflow: {len(stackoverflow)} questions")
    print(f"🤖 Synthetic: {len(synthetic)} examples")
    print(f"📊 TOTAL: {len(docs) + len(stackoverflow) + len(synthetic)} items")
    print("\n💡 Next steps:")
    print("   1. Review datasets trong folder 'datasets/'")
    print("   2. Chạy script translate_dataset.py để dịch sang tiếng Việt")
    print("   3. Combine và clean data")
    print("=" * 70)


if __name__ == "__main__":
    main()

