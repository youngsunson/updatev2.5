// src/utils/word.ts

/**
 * Word ডকুমেন্ট থেকে টেক্সট পড়ার ফাংশন
 * - Line breaks normalize করে
 */
export const getTextFromWord = async (): Promise<string> => {
  try {
    return await Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load('text');
      await context.sync();

      // যদি ইউজার কিছু সিলেক্ট করে থাকে, শুধু সেটা নেব
      if (selection.text && selection.text.trim().length > 0) {
        return selection.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      }

      // অন্যথায় পুরো ডকুমেন্টের টেক্সট নেব
      const body = context.document.body;
      body.load('text');
      await context.sync();
      
      return body.text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    });
  } catch (error) {
    console.error('Error reading Word:', error);
    return '';
  }
};

/**
 * একাধিক শব্দ একসাথে হাইলাইট করা (Performance Optimized)
 */
export const highlightMultipleInWord = async (
  items: Array<{ text: string; color: string; position?: number }>
): Promise<void> => {
  if (!items || items.length === 0) return;

  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      const rangesToHighlight: Word.Range[] = [];
      const colors: string[] = [];

      // ১. সব সার্চ একসাথে লোড করি
      for (const item of items) {
        const cleanText = item.text.trim();
        if (!cleanText) continue;

        // শুধু whole word ম্যাচ খুঁজব যাতে "কর" খুঁজলে "করি" হাইলাইট না হয়
        const results = body.search(cleanText, {
          matchCase: false,
          matchWholeWord: !/\s/.test(cleanText) // স্পেস না থাকলে whole word ম্যাচ
        });
        results.load('items');
        
        // আমরা এই লুপে সিঙ্ক করব না, সব রেঞ্জ কালেক্ট করব পরে
        // কিন্তু Word JS API তে সার্চ রেজাল্ট ব্যবহারের জন্য প্রতিবার sync বা track করা লাগে।
        // সহজ সমাধানের জন্য আমরা লুপের ভেতরেই প্রসেস করছি (যদিও এটা একটু স্লো হতে পারে বড় ডকে)
        // তবে API লিমিট এড়াতে এটি নিরাপদ।
        
        await context.sync(); 
        
        // আপাতত সব ম্যাচিং শব্দ হাইলাইট করছি (নিরাপদ পদ্ধতি)
        for (let i = 0; i < results.items.length; i++) {
          results.items[i].font.highlightColor = item.color;
        }
      }
      
      await context.sync();
    });
  } catch (error) {
    console.error('Batch highlight error:', error);
  }
};

/**
 * একটি শব্দ হাইলাইট করা (Single Highlight)
 */
export const highlightInWord = async (
  text: string,
  color: string,
  _position?: number
): Promise<void> => {
  const cleanText = text.trim();
  if (!cleanText) return;

  try {
    await Word.run(async (context) => {
      const body = context.document.body;
      const results = body.search(cleanText, {
        matchCase: false,
        matchWholeWord: !/\s/.test(cleanText)
      });
      results.load('items');
      await context.sync();

      // সব ম্যাচ হাইলাইট করি
      for (let i = 0; i < results.items.length; i++) {
        results.items[i].font.highlightColor = color;
      }
      await context.sync();
    });
  } catch (error) {
    console.error('Highlight error:', error);
  }
};

/**
 * Word ডকুমেন্টে টেক্সট প্রতিস্থাপন (Replace)
 */
export const replaceInWord = async (
  oldText: string,
  newText: string,
  _position?: number
): Promise<boolean> => {
  const cleanOldText = oldText.trim();
  if (!cleanOldText) return false;

  try {
    return await Word.run(async (context) => {
      const body = context.document.body;
      const results = body.search(cleanOldText, {
        matchCase: false,
        matchWholeWord: !/\s/.test(cleanOldText) // Whole word match if single word
      });
      results.load('items');
      await context.sync();

      if (results.items.length > 0) {
        // আমরা প্রথম ম্যাচটি রিপ্লেস করছি
        // (Todo: ভবিষ্যতে position দিয়ে নির্দিষ্ট শব্দ টার্গেট করা যেতে পারে)
        results.items[0].insertText(newText, Word.InsertLocation.replace);
        
        // হাইলাইট সরিয়ে দিচ্ছি (None)
        results.items[0].font.highlightColor = '#FFFFFF'; // Word এ 'None' বা White
        // অথবা: results.items[0].font.highlightColor = null; (API version dependent)
        
        await context.sync();
        return true;
      }
      return false;
    });
  } catch (error) {
    console.error('Replace error:', error);
    return false;
  }
};

/**
 * সব হাইলাইট মুছে ফেলা (Clear All)
 */
export const clearHighlights = async (): Promise<void> => {
  try {
    await Word.run(async (context) => {
      // পুরো বডির হাইলাইট ক্লিয়ার করি
      // 'None' স্ট্রিংটি Word API তে হাইলাইট রিমুভ করে
      context.document.body.font.highlightColor = 'None'; 
      await context.sync();
    });
  } catch (error) {
    console.error('Clear highlights error:', error);
  }
};