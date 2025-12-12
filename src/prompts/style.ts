// src/prompts/style.ts

/**
 * Style Instructions (English Logic)
 */
const styleInstructions: Record<string, string> = {
  'sadhu': `Task: Convert the Bengali text to **Sadhu Bhasha** (High Literary Style).
   - Change verbs to their fuller forms (e.g., 'korchi' -> 'koritechi', 'bollam' -> 'bolilam').
   - Change pronouns to formal forms (e.g., 'tar' -> 'tahar', 'ja' -> 'jaha').
   - Ensure consistency across the text.`,

  'cholito': `Task: Convert the Bengali text to **Cholito Bhasha** (Standard Colloquial Style).
   - Change verbs to their short forms (e.g., 'koritechi' -> 'korchi', 'bolilam' -> 'bollam').
   - Change pronouns to standard forms (e.g., 'tahar' -> 'tar', 'jaha' -> 'ja').
   - Keep the tone standard, not slang.`
};

/**
 * Style Prompt Builder
 */
export const buildStylePrompt = (text: string, style: string): string => {
  return `${styleInstructions[style]}

INPUT TEXT:
"""${text}"""

INSTRUCTIONS:
1. Identify words that do not match the target style (${style}).
2. Provide the corrected word in Bengali.
3. **"current" field**: Must be an EXACT copy from input text.
4. **"position" field**: 0-based word index.

OUTPUT FORMAT (JSON ONLY, No Markdown):
{
  "styleConversions": [
    {
      "current": "exact_word_match",
      "suggestion": "converted_word",
      "type": "Verb/Pronoun/Conjunction",
      "position": 0
    }
  ]
}

If no changes are needed (text is already in target style), return: { "styleConversions": [] }
`;
};

/**
 * Style Types
 */
export type StyleType = 'none' | 'sadhu' | 'cholito';

/**
 * UI Options for Style
 */
export const STYLE_OPTIONS = [
  { id: 'none' as StyleType, icon: '❌', title: 'কোনটি নয়', desc: 'স্বয়ংক্রিয় মিশ্রণ সনাক্তকরণ চালু থাকবে' },
  { id: 'sadhu' as StyleType, icon: '📜', title: 'সাধু রীতি', desc: 'করিতেছি, করিয়াছি, তাহার, যাহা' },
  { id: 'cholito' as StyleType, icon: '💬', title: 'চলিত রীতি', desc: 'করছি, করেছি, তার, যা' }
];