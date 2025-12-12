// src/utils/api.ts

import { parseAIResponse, extractTextFromGeminiResponse } from './jsonFixer';

interface CallGeminiOptions {
  temperature?: number;
}

/**
 * Call Gemini API with JSON response mode
 * Optimized for speed and strictly typed responses
 */
export const callGeminiJson = async (
  prompt: string,
  apiKey: string,
  selectedModel: string,
  options: CallGeminiOptions = {}
): Promise<any | null> => {
  const { temperature = 0.2 } = options;
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json', // Force JSON mode for speed
          temperature
        }
      })
    });
  } catch (err: any) {
    console.error('Network error:', err);
    throw new Error('ইন্টারনেট সংযোগে সমস্যা হয়েছে। দয়া করে নেটওয়ার্ক চেক করে আবার চেষ্টা করুন।');
  }

  if (!response.ok) {
    const status = response.status;
    let userMessage = '';

    if (status === 401 || status === 403) {
      userMessage = 'API Key বা অনুমতি (permission) সংক্রান্ত সমস্যা হয়েছে। Key সঠিক কিনা চেক করুন।';
    } else if (status === 429) {
      userMessage = 'খুব দ্রুত রিকোয়েস্ট পাঠানো হচ্ছে। কিছুক্ষণ অপেক্ষা করে আবার চেষ্টা করুন (Rate Limit)।';
    } else if (status === 404) {
      userMessage = `মডেল (${selectedModel}) খুঁজে পাওয়া যায়নি। সেটিংস থেকে সঠিক মডেল সিলেক্ট করুন।`;
    } else if (status >= 500) {
      userMessage = 'Gemini সার্ভারে সাময়িক সমস্যা হচ্ছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
    } else {
      userMessage = `সার্ভার ত্রুটি (Status: ${status})।`;
    }

    const bodyText = await response.text().catch(() => '');
    console.error('Gemini API error:', status, bodyText);
    throw new Error(userMessage);
  }

  const data = await response.json();
  const raw = extractTextFromGeminiResponse(data);
  
  if (!raw) return null;

  return parseAIResponse(raw);
};