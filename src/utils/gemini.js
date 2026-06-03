import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Analyzes a sentence spoken/typed by the user to extract intents and entities.
 * Supports English, Telugu, and bilingual mixes.
 * 
 * @param {string} apiKey Google Gemini API Key
 * @param {string} sentence User's transcription or input text
 * @returns {Promise<{intent: string, amount: number|null, category: string|null, date: string|null, note: string}>}
 */
export async function analyzeExpenseSentence(apiKey, sentence) {
  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Using gemini-2.5-flash matching the user's StudySage active model in 2026
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  const prompt = `You are a financial NLP parsing assistant for an expense tracker named SpendWise.
Today's date is ${today} (${dayOfWeek}).

Analyze the user's sentence (which may be in English, Telugu, or a mix like Teenglish) and return ONLY a structured JSON.

Valid intents:
1. "add_expense": The user wants to log/add an expense.
   Examples: "spent 250 on petrol today", "నేను groceries కి 500 ఖర్చు పెట్టాను", "snacks 150 rupees".
2. "get_summary": The user wants to hear or see their spending summary, totals, or breakdowns.
   Examples: "show my total spending", "ఈ నెల ఎంత ఖర్చు అయింది", "how much did I spend this week", "give me a report".
3. "delete_expense": The user wants to remove an expense or transactions.
   Examples: "remove that 300 rupees expense", "groceries ఖర్చు డిలీట్ చెయ్".
4. "clear_all": The user wants to delete all of their expenses.
   Examples: "delete all expenses", "clear everything", "మొత్తం డేటా క్లియర్ చెయ్".
5. "help": The user is asking for instructions or help on how to use the app.
   Examples: "how do I use this?", "help me", "నువ్వు ఏమి చేయగలవు?".
6. "chat": The user is asking general questions, looking for financial advice, planning advice, budget strategies, talking casually, or greeting the assistant.
   Examples: "how can I save money?", "hello", "can you write a simple monthly budget plan for me?", "కిరాణా ఖర్చు తగ్గించుకోవడం ఎలా?".

Rules for entity extraction (only for "add_expense" intent):
- "amount": Number representing the amount of money spent. Ignore currency symbols. Convert text numbers (like "five hundred", "ఐదు వందలు", "వెయ్యి") to numerical values (e.g., 500, 1000). If no amount is specified, return null.
- "category": Categorize the expense into one of these exact lowercase strings: "groceries", "food", "fuel", "bills", "travel", "shopping", "entertainment", "medical", "others". If unclear, use "others".
- "date": The date of the expense in YYYY-MM-DD format. Resolve relative terms (like "today", "yesterday", "నిన్న", "ఈరోజు") relative to today's date (${today}). If not specified, default to ${today}.
- "note": A short, clean description of the expense in the language spoken (e.g., "petrol", "groceries for home", "బిర్యానీ").

Rules for "chat" and "help" intents:
- Provide a friendly, expert, and concise text response in the "chatResponse" field. If the user spoke in Telugu, write this response in natural, conversational Telugu. If in English, write in English.

Return ONLY a valid JSON object matching the schema below. Do not wrap it in markdown block fences (\`\`\`json). Do not add any text before or after the JSON.

JSON Schema:
{
  "intent": "add_expense" | "get_summary" | "delete_expense" | "clear_all" | "help" | "chat" | "unknown",
  "amount": number | null,
  "category": "groceries" | "food" | "fuel" | "bills" | "travel" | "shopping" | "entertainment" | "medical" | "others" | null,
  "date": "YYYY-MM-DD",
  "note": "string summary of transaction",
  "chatResponse": "string (friendly concise answer to user's question, or null if intent is not chat or help)"
}

User Sentence: "${sentence}"
JSON:`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Safety check to remove any markdown styling if Gemini accidentally adds it
    const cleanText = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```$/, "")
      .trim();

    const data = JSON.parse(cleanText);
    return data;
  } catch (error) {
    console.error("Gemini Parsing Error:", error);
    // If the error occurred because the JSON returned by Gemini was malformed, try to extract JSON block using regex first
    try {
      const match = error.message ? error.message.match(/\{.*\}/s) : null;
      if (match) {
        return JSON.parse(match[0]);
      }
    } catch (inner) {}
    
    // Throw the detailed error message so the user can diagnose (e.g. invalid API key, network, quota, etc.)
    throw new Error(`Gemini processing failed: ${error.message || error.toString()}`);
  }
}

/**
 * Translates a given summary response text into Telugu if the query language was Telugu.
 * 
 * @param {string} apiKey Google Gemini API Key
 * @param {string} text Response text to translate
 * @param {string} targetLanguage "te" for Telugu, "en" for English
 * @returns {Promise<string>}
 */
export async function formatResponseSpeech(apiKey, text, targetLanguage) {
  if (targetLanguage !== "te") return text; // Already in English

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Translate the following financial assistant reply into natural, spoken Telugu. 
Keep numbers and key nouns easy to understand (can write Telugu script or simple terms).
Avoid overly formal or complex bookish Telugu; use friendly conversational Telugu.

Original: "${text}"
Telugu translation for Text-To-Speech:`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return text; // Fallback to English
  }
}
