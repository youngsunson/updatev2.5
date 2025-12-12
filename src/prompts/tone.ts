// src/prompts/tone.ts

/**
 * Tone Instructions (English Logic for better AI understanding)
 */
const toneInstructions: Record<string, string> = {
  'formal': `Role: Expert Bengali Editor. Task: Convert the text to a **Formal (Official)** tone.
   - Use polite pronouns (Apni/Apnar).
   - Use formal verbs (Korun/Bolun).
   - Maintain complete sentence structures.
   - Avoid slang.`,

  'informal': `Role: Friendly Bengali Writer. Task: Convert the text to an **Informal (Casual)** tone.
   - Use casual pronouns (Tumi/Tui) as appropriate.
   - Use conversational verbs.
   - Simple and direct vocabulary.`,

  'professional': `Role: Corporate Communication Expert. Task: Convert the text to a **Professional** tone.
   - Focus on clarity, confidence, and efficiency.
   - Use standard business vocabulary.
   - Avoid overly emotional or vague words.`,

  'friendly': `Role: Social Coordinator. Task: Convert the text to a **Friendly & Warm** tone.
   - Use welcoming and positive language.
   - Add warmth to the phrasing.
   - Suitable for personal connections.`,

  'respectful': `Role: Cultural Etiquette Expert. Task: Convert the text to a **Respectful** tone.
   - Use high honorifics and humble vocabulary.
   - Suitable for addressing elders or dignitaries.`,

  'persuasive': `Role: Marketing Expert. Task: Convert the text to a **Persuasive** tone.
   - Use strong, action-oriented verbs.
   - Create a sense of urgency or benefit.
   - Focus on positive outcomes.`,

  'neutral': `Role: Journalist. Task: Convert the text to a **Neutral (Objective)** tone.
   - Remove emotional bias.
   - Use factual and direct language.
   - Suitable for reporting or documentation.`,

  'academic': `Role: Academic Scholar. Task: Convert the text to an **Academic** tone.
   - Use standard terminology.
   - Use complex sentence structures where necessary for precision.
   - Third-person perspective preferred.`
};

/**
 * Tone Prompt Builder
 */
export const buildTonePrompt = (text: string, tone: string): string => {
  return `${toneInstructions[tone]}

INPUT TEXT:
"""${text}"""

INSTRUCTIONS:
1. Analyze the text word by word.
2. Identify words/phrases that do NOT match the target tone (${tone}).
3. Suggest a replacement in **Bengali**.
4. **"current" field**: Must be an EXACT copy of the word/phrase from the input text.
5. **"position" field**: 0-based word index of the start of the phrase.

OUTPUT FORMAT (JSON ONLY, No Markdown):
{
  "toneConversions": [
    {
      "current": "exact_text_match",
      "suggestion": "better_tone_replacement",
      "reason": "short explanation in Bangla",
      "position": 0
    }
  ]
}

If no changes are needed, return: { "toneConversions": [] }
`;
};

/**
 * UI তে দেখানোর জন্য বাংলা নাম
 */
export const getToneName = (tone: string): string => {
  const map: Record<string, string> = {
    'formal': '📋 আনুষ্ঠানিক',
    'informal': '💬 অনানুষ্ঠানিক',
    'professional': '💼 পেশাদার',
    'friendly': '😊 বন্ধুত্বপূর্ণ',
    'respectful': '🙏 সম্মানজনক',
    'persuasive': '💪 প্রভাবশালী',
    'neutral': '⚖️ নিরপেক্ষ',
    'academic': '📚 শিক্ষামূলক'
  };
  return map[tone] || tone;
};

/**
 * UI Options List
 */
export const TONE_OPTIONS = [
  { id: '', icon: '❌', title: 'কোনটি নয়', desc: 'শুধু বানান ও ব্যাকরণ পরীক্ষা' },
  { id: 'formal', icon: '📋', title: 'আনুষ্ঠানিক (Formal)', desc: 'দাপ্তরিক চিঠি, আবেদন, প্রতিবেদন' },
  { id: 'informal', icon: '💬', title: 'অনানুষ্ঠানিক (Informal)', desc: 'ব্যক্তিগত চিঠি, ব্লগ, সোশ্যাল মিডিয়া' },
  { id: 'professional', icon: '💼', title: 'পেশাদার (Professional)', desc: 'ব্যবসায়িক যোগাযোগ, কর্পোরেট' },
  { id: 'friendly', icon: '😊', title: 'বন্ধুত্বপূর্ণ (Friendly)', desc: 'উষ্ণ, আন্তরিক যোগাযোগ' },
  { id: 'respectful', icon: '🙏', title: 'সম্মানজনক (Respectful)', desc: 'বয়োজ্যেষ্ঠ বা সম্মানিত ব্যক্তি' },
  { id: 'persuasive', icon: '💪', title: 'প্রভাবশালী (Persuasive)', desc: 'মার্কেটিং, বিক্রয়, প্রচারণা' },
  { id: 'neutral', icon: '⚖️', title: 'নিরপেক্ষ (Neutral)', desc: 'সংবাদ, তথ্যমূলক লেখা' },
  { id: 'academic', icon: '📚', title: 'শিক্ষামূলক (Academic)', desc: 'গবেষণা পত্র, প্রবন্ধ' }
];