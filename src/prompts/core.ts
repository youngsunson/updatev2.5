// src/prompts/core.ts

/**
 * ডকুমেন্ট টাইপ ডেফিনিশন
 */
export type DocType = 'generic' | 'academic' | 'official' | 'marketing' | 'social';

/**
 * ডকুমেন্ট টাইপ কনফিগ ইন্টারফেস
 * - label/description: UI তে দেখানোর জন্য (বাংলা)
 * - roleInstruction: AI এর জন্য ইনস্ট্রাকশন (ইংরেজি - ফাস্ট প্রসেসিং এর জন্য)
 */
export interface DocTypeConfig {
  label: string;
  description: string;
  defaultTone: string; // UI selection help
  roleInstruction: string; // AI Instruction (English)
  checkFocus: string; // Specific focus area (English)
}

/**
 * ডকুমেন্ট টাইপ কনফিগারেশন (Hybrid Approach)
 */
export const DOC_TYPE_CONFIG: { [key in DocType]: DocTypeConfig } = {
  generic: {
    label: 'সাধারণ লেখা',
    description: 'যেকোনো সাধারণ লেখা – নিরপেক্ষভাবে বিশ্লেষণ করবে।',
    defaultTone: '',
    roleInstruction: 'Act as a neutral Bengali language proofreader.',
    checkFocus: 'Focus on standard grammar, spelling clarity, and sentence structure.'
  },
  academic: {
    label: 'একাডেমিক লেখা',
    description: 'গবেষণা পত্র, প্রবন্ধ, থিসিস ইত্যাদি।',
    defaultTone: 'academic',
    roleInstruction: 'Act as an academic editor for Bengali research papers.',
    checkFocus: 'Ensure formal terminology, objective tone, logical flow, and proper citation format.'
  },
  official: {
    label: 'অফিশিয়াল চিঠি',
    description: 'দাপ্তরিক আবেদন, নোটিশ, অফিসিয়াল ইমেইল ইত্যাদি।',
    defaultTone: 'formal',
    roleInstruction: 'Act as an expert in official Bengali correspondence.',
    checkFocus: 'Ensure politeness, formal address (honorifics), clarity of purpose, and professional closing.'
  },
  marketing: {
    label: 'মার্কেটিং কপি',
    description: 'বিজ্ঞাপন, সেলস পেজ, প্রমোশনাল লেখা ইত্যাদি।',
    defaultTone: 'persuasive',
    roleInstruction: 'Act as a professional Bengali copywriter.',
    checkFocus: 'Focus on persuasive language, engagement, clear Call-to-Action (CTA), and customer appeal.'
  },
  social: {
    label: 'সোশ্যাল মিডিয়া পোস্ট',
    description: 'ফেসবুক, ইনস্টাগ্রাম, টুইটার ইত্যাদির লেখা।',
    defaultTone: 'informal',
    roleInstruction: 'Act as a Bengali social media manager.',
    checkFocus: 'Focus on engaging tone, friendly language, hashtags capability, and brevity.'
  }
};

/**
 * UI এর জন্য লেবেল ফাংশন
 */
export const getDocTypeLabel = (t: DocType): string => DOC_TYPE_CONFIG[t].label;

/**
 * মেইন প্রম্পট বিল্ডার (Hybrid Strategy)
 * - Instructions: English (For Logic & Speed)
 * - Content: Bangla (User's Text)
 * - Output: JSON with Bangla Values
 */
export const buildMainPrompt = (text: string, docType: DocType): string => {
  const docCfg = DOC_TYPE_CONFIG[docType];
  
  return `
${docCfg.roleInstruction}
${docCfg.checkFocus}

Your task is to analyze the provided Bengali text and identify errors or improvements.

INPUT TEXT:
"""${text}"""

⚠️ **STRICT RULES:**
1. **Word Indexing (Crucial):** 
   - You must calculate the "position" based on a 0-based word index.
   - Split the text by whitespace/newlines to count words.
   - Example: "আমি ভাত খাই" -> "আমি"(0), "ভাত"(1), "খাই"(2).

2. **Analysis Categories:**
   - **spellingErrors**: Detect ONLY definite typos, wrong "juktakkhor", or grammatical spelling errors. DO NOT change proper names or English terms.
   - **punctuationIssues**: Check for missing or incorrect sentence endings (darii/question mark). Ignore headers/titles.
   - **languageStyleMixing**: Detect if "Sadhu" (Old style) and "Cholito" (Modern style) verbs/pronouns are mixed.
   - **euphonyImprovements**: Suggest changes if a phrase sounds harsh, repetitive, or unnatural.

3. **Output Format**:
   - Return raw JSON only. 
   - NO Markdown code blocks (like \`\`\`json).
   - Values inside JSON must be in **Bengali**.

OUTPUT JSON STRUCTURE:
{
  "spellingErrors": [
    {
      "wrong": "wrong_word_from_text",
      "suggestions": ["correct_bangla_word_1", "correct_bangla_word_2"],
      "position": 0 
    }
  ],
  "languageStyleMixing": {
    "detected": boolean,
    "recommendedStyle": "Sadhu or Cholito (in Bangla)",
    "reason": "Short explanation in Bangla",
    "corrections": [
      {
        "current": "mixed_word",
        "suggestion": "consistent_word",
        "type": "Sadhu->Cholito or Cholito->Sadhu",
        "position": 0
      }
    ]
  },
  "punctuationIssues": [
    {
      "issue": "Short description in Bangla",
      "currentSentence": "Full sentence from text",
      "correctedSentence": "Full sentence with fix",
      "explanation": "Reason in Bangla",
      "position": 0
    }
  ],
  "euphonyImprovements": [
    {
      "current": "Target phrase/word",
      "suggestions": ["Better sounding alternative"],
      "reason": "Why it is better (in Bangla)",
      "position": 0
    }
  ]
}
`;
};