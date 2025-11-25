"""
Script để chuẩn bị training data từ nhiều nguồn khác nhau
Combine, clean, và format data cho fine-tuning
Author: eOfficeAI Team
"""

import pandas as pd
import json
from pathlib import Path
from typing import List, Dict
import re


class TrainingDataPreparator:
    """Chuẩn bị và format training data cho Excel AI"""
    
    def __init__(self, datasets_dir='datasets'):
        self.datasets_dir = Path(datasets_dir)
        self.datasets_dir.mkdir(exist_ok=True)
    
    def load_all_datasets(self) -> Dict[str, pd.DataFrame]:
        """Load tất cả datasets có sẵn"""
        datasets = {}
        
        print("📂 Loading datasets...")
        
        # 1. Curated Vietnamese examples
        curated_vi_file = self.datasets_dir / 'excel_formulas_training_VI.json'
        if curated_vi_file.exists():
            with open(curated_vi_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                df = pd.DataFrame(data)
                df = df.rename(columns={
                    'query_vi': 'query',
                    'explanation_vi': 'explanation'
                })
                datasets['curated_vi'] = df
                print(f"  ✅ Curated VI: {len(df)} examples")
        
        # 2. Synthetic data (translated)
        synthetic_vi_file = self.datasets_dir / 'synthetic_formulas_vi.csv'
        if synthetic_vi_file.exists():
            df = pd.read_csv(synthetic_vi_file)
            if 'query_vi' in df.columns:
                df = df.rename(columns={'query_vi': 'query'})
            datasets['synthetic'] = df
            print(f"  ✅ Synthetic: {len(df)} examples")
        
        # 3. StackOverflow (translated)
        so_vi_file = self.datasets_dir / 'stackoverflow_excel_questions_vi.csv'
        if so_vi_file.exists():
            df = pd.read_csv(so_vi_file)
            # Extract formulas from body
            if 'body_vi' in df.columns and 'title_vi' in df.columns:
                df['query'] = df['title_vi']
                df['formula'] = df['body'].apply(self.extract_formula_from_text)
            datasets['stackoverflow'] = df
            print(f"  ✅ StackOverflow: {len(df)} examples")
        
        # 4. Microsoft Docs
        ms_docs_file = self.datasets_dir / 'microsoft_docs_functions.json'
        if ms_docs_file.exists():
            with open(ms_docs_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                # Convert to training format
                examples = []
                for func in data:
                    if func.get('examples'):
                        for i, example in enumerate(func['examples'][:2]):  # Max 2 per function
                            examples.append({
                                'query': f"How to use {func['function']} function",
                                'formula': func.get('syntax', ''),
                                'explanation': example[:200],
                                'category': func['function'],
                                'source': 'microsoft_docs'
                            })
                df = pd.DataFrame(examples)
                datasets['microsoft_docs'] = df
                print(f"  ✅ Microsoft Docs: {len(df)} examples")
        
        return datasets
    
    def extract_formula_from_text(self, text: str) -> str:
        """Extract Excel formula from text"""
        if pd.isna(text):
            return ""
        
        # Find =FORMULA(...) patterns
        formulas = re.findall(r'(=[A-Z\.]+\([^\)]*\))', str(text))
        if formulas:
            return formulas[0]
        
        # Find simpler formulas
        formulas = re.findall(r'(=[\w\s\(\)\:\,\.\+\-\*\/\>\<]+)', str(text))
        if formulas:
            return formulas[0]
        
        return ""
    
    def clean_and_combine(self, datasets: Dict[str, pd.DataFrame]) -> pd.DataFrame:
        """Combine và clean datasets"""
        print("\n🧹 Cleaning and combining datasets...")
        
        all_data = []
        
        for source, df in datasets.items():
            # Ensure required columns exist
            if 'query' not in df.columns or 'formula' not in df.columns:
                print(f"  ⚠️  Skipping {source}: missing required columns")
                continue
            
            # Select relevant columns
            df_clean = df[['query', 'formula']].copy()
            
            # Add optional columns if exist
            for col in ['explanation', 'example', 'difficulty', 'category']:
                if col in df.columns:
                    df_clean[col] = df[col]
            
            df_clean['source'] = source
            
            all_data.append(df_clean)
            print(f"  ✅ {source}: {len(df_clean)} examples")
        
        # Combine
        combined = pd.concat(all_data, ignore_index=True)
        print(f"\n📊 Combined: {len(combined)} examples")
        
        # Clean
        print("\n🧹 Cleaning...")
        
        # Remove empty queries or formulas
        before = len(combined)
        combined = combined[combined['query'].notna() & combined['query'].str.strip().ne('')]
        combined = combined[combined['formula'].notna() & combined['formula'].str.strip().ne('')]
        print(f"  - Removed empty: {before - len(combined)}")
        
        # Remove duplicates
        before = len(combined)
        combined = combined.drop_duplicates(subset=['query', 'formula'])
        print(f"  - Removed duplicates: {before - len(combined)}")
        
        # Validate formulas (must start with =)
        before = len(combined)
        combined = combined[combined['formula'].str.startswith('=', na=False)]
        print(f"  - Removed invalid formulas: {before - len(combined)}")
        
        # Clean whitespace
        combined['query'] = combined['query'].str.strip()
        combined['formula'] = combined['formula'].str.strip()
        
        print(f"\n✅ Final dataset: {len(combined)} examples")
        
        return combined
    
    def add_quality_scores(self, df: pd.DataFrame) -> pd.DataFrame:
        """Thêm quality scores để filter"""
        print("\n⭐ Adding quality scores...")
        
        df = df.copy()
        df['quality_score'] = 0
        
        # Score based on formula complexity
        df['quality_score'] += df['formula'].str.count(r'\(').clip(upper=3)  # Nested functions
        
        # Score if has explanation
        if 'explanation' in df.columns:
            df['quality_score'] += df['explanation'].notna().astype(int) * 2
        
        # Score based on query length (meaningful queries are longer)
        df['quality_score'] += (df['query'].str.len() > 20).astype(int)
        df['quality_score'] += (df['query'].str.len() > 40).astype(int)
        
        # Penalty for very short queries
        df['quality_score'] -= (df['query'].str.len() < 10).astype(int) * 2
        
        # Bonus for curated data
        if 'source' in df.columns:
            df['quality_score'] += (df['source'] == 'curated_vi').astype(int) * 3
        
        print(f"  Quality score range: {df['quality_score'].min()} - {df['quality_score'].max()}")
        print(f"  Average quality: {df['quality_score'].mean():.2f}")
        
        return df
    
    def format_for_openai_finetuning(self, df: pd.DataFrame, output_file: str):
        """Format data cho OpenAI fine-tuning"""
        print(f"\n📝 Formatting for OpenAI fine-tuning...")
        
        output_path = Path(output_file)
        
        with open(output_path, 'w', encoding='utf-8') as f:
            for _, row in df.iterrows():
                # Prepare assistant response
                response_data = {
                    "formula": row['formula']
                }
                
                if 'explanation' in row and pd.notna(row['explanation']):
                    response_data['explanation'] = row['explanation']
                
                if 'example' in row and pd.notna(row['example']):
                    response_data['example'] = row['example']
                
                # Format as JSONL
                example = {
                    "messages": [
                        {
                            "role": "system",
                            "content": "Bạn là chuyên gia Excel với 15 năm kinh nghiệm. Tạo công thức Excel chính xác từ mô tả bằng tiếng Việt. Trả về JSON với format: {\"formula\": \"...\", \"explanation\": \"...\", \"example\": \"...\"}"
                        },
                        {
                            "role": "user",
                            "content": row['query']
                        },
                        {
                            "role": "assistant",
                            "content": json.dumps(response_data, ensure_ascii=False)
                        }
                    ]
                }
                
                f.write(json.dumps(example, ensure_ascii=False) + '\n')
        
        print(f"✅ Saved to: {output_path}")
        print(f"   Total examples: {len(df)}")
    
    def split_train_test(self, df: pd.DataFrame, test_size=0.1):
        """Split train/test sets"""
        print(f"\n✂️  Splitting train/test (test_size={test_size})...")
        
        from sklearn.model_selection import train_test_split
        
        train_df, test_df = train_test_split(df, test_size=test_size, random_state=42)
        
        print(f"  Train: {len(train_df)} examples")
        print(f"  Test: {len(test_df)} examples")
        
        return train_df, test_df
    
    def generate_statistics(self, df: pd.DataFrame):
        """Generate statistics report"""
        print("\n" + "=" * 70)
        print("📊 DATASET STATISTICS")
        print("=" * 70)
        
        print(f"\n📈 Overall:")
        print(f"  Total examples: {len(df)}")
        print(f"  Unique queries: {df['query'].nunique()}")
        print(f"  Unique formulas: {df['formula'].nunique()}")
        
        if 'source' in df.columns:
            print(f"\n📚 By Source:")
            for source, count in df['source'].value_counts().items():
                print(f"  - {source}: {count}")
        
        if 'difficulty' in df.columns:
            print(f"\n⭐ By Difficulty:")
            for diff, count in df['difficulty'].value_counts().items():
                print(f"  - {diff}: {count}")
        
        if 'category' in df.columns:
            print(f"\n🏷️  Top Categories:")
            for cat, count in df['category'].value_counts().head(10).items():
                print(f"  - {cat}: {count}")
        
        if 'quality_score' in df.columns:
            print(f"\n⭐ Quality Scores:")
            print(f"  Average: {df['quality_score'].mean():.2f}")
            print(f"  High quality (score >= 5): {(df['quality_score'] >= 5).sum()}")
            print(f"  Medium quality (3-4): {((df['quality_score'] >= 3) & (df['quality_score'] < 5)).sum()}")
            print(f"  Low quality (< 3): {(df['quality_score'] < 3).sum()}")
        
        print(f"\n📏 Query Length:")
        print(f"  Average: {df['query'].str.len().mean():.1f} chars")
        print(f"  Min: {df['query'].str.len().min()}")
        print(f"  Max: {df['query'].str.len().max()}")
        
        print(f"\n🔤 Formula Length:")
        print(f"  Average: {df['formula'].str.len().mean():.1f} chars")
        print(f"  Min: {df['formula'].str.len().min()}")
        print(f"  Max: {df['formula'].str.len().max()}")
        
        print("=" * 70)


def main():
    print("=" * 70)
    print("🚀 EXCEL TRAINING DATA PREPARATOR")
    print("=" * 70)
    
    preparator = TrainingDataPreparator(datasets_dir='datasets')
    
    # Step 1: Load all datasets
    datasets = preparator.load_all_datasets()
    
    if not datasets:
        print("\n❌ No datasets found!")
        print("Please run collect_datasets.py and translate_dataset.py first.")
        return
    
    # Step 2: Clean and combine
    combined = preparator.clean_and_combine(datasets)
    
    # Step 3: Add quality scores
    combined = preparator.add_quality_scores(combined)
    
    # Step 4: Generate statistics
    preparator.generate_statistics(combined)
    
    # Step 5: Save combined dataset
    print("\n💾 Saving combined dataset...")
    combined.to_csv('datasets/combined_training_data.csv', index=False, encoding='utf-8')
    print("  ✅ Saved: datasets/combined_training_data.csv")
    
    # Step 6: Filter high quality only
    high_quality = combined[combined['quality_score'] >= 3].copy()
    print(f"\n⭐ High quality examples: {len(high_quality)}")
    
    # Step 7: Split train/test
    train_df, test_df = preparator.split_train_test(high_quality, test_size=0.1)
    
    # Step 8: Format for OpenAI fine-tuning
    print("\n📝 Formatting training data...")
    preparator.format_for_openai_finetuning(
        train_df,
        'datasets/training_data_openai.jsonl'
    )
    
    preparator.format_for_openai_finetuning(
        test_df,
        'datasets/test_data_openai.jsonl'
    )
    
    # Summary
    print("\n" + "=" * 70)
    print("✅ PREPARATION COMPLETE!")
    print("=" * 70)
    print(f"\n📂 Output Files:")
    print(f"  - datasets/combined_training_data.csv ({len(combined)} examples)")
    print(f"  - datasets/training_data_openai.jsonl ({len(train_df)} examples)")
    print(f"  - datasets/test_data_openai.jsonl ({len(test_df)} examples)")
    
    print(f"\n🎯 Next Steps:")
    print(f"  1. Review combined_training_data.csv")
    print(f"  2. Upload training_data_openai.jsonl to OpenAI")
    print(f"  3. Start fine-tuning job")
    print(f"  4. Evaluate with test_data_openai.jsonl")
    
    print("\n💰 Cost Estimate:")
    total_tokens = len(train_df) * 100  # Rough estimate
    cost = (total_tokens / 1000) * 0.008 * 3  # 3 epochs
    print(f"  Training tokens: ~{total_tokens:,}")
    print(f"  Estimated cost: ~${cost:.2f} USD")
    
    print("=" * 70)


if __name__ == "__main__":
    main()

