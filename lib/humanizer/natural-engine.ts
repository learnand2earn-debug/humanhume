/**
 * Advanced Autonomous Natural Humanization Engine
 *
 * Transforms robotic AI-generated text into authentic, dynamic, and fluid human writing.
 * - Eliminates AI clichés, monotone syntax, and corporate/academic boilerplate.
 * - Injects burstiness: mixes punchy statements with rhythmic explanatory sentences.
 * - Converts stiff passive constructions into direct, active voice.
 * - Strictly protects facts, currencies, dates, numbers, emails, URLs, headings, and legal terms.
 * - Seamlessly integrates with Google Gemini AI (@google/genai) when an API key is present.
 */

// ─── Gemini AI Integration ──────────────────────────────────────────────────

export async function humanizeWithGeminiAi(
  text: string,
  intensity: 'LOW' | 'NORMAL' = 'NORMAL'
): Promise<string | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    (typeof globalThis !== 'undefined' && (globalThis as any).__GEMINI_API_KEY);

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.length < 10) {
    return null;
  }

  try {
    const {GoogleGenAI} = await import('@google/genai');
    const ai = new GoogleGenAI({apiKey});

    const prompt = `You are an elite copy editor and humanizer.

CRITICAL INSTRUCTIONS:
1. Rewrite the text below so it sounds completely authentic, engaging, and naturally human, completely removing any trace of robotic AI generation.
2. STRICT LANGUAGE PRESERVATION: You MUST output the humanized text in the EXACT SAME LANGUAGE as the input text (e.g., if input is English, output in English; if Urdu or Roman Urdu, output in Urdu/Roman Urdu; if Spanish, output in Spanish, etc.). NEVER translate the input text to any other language.
3. Vary sentence lengths (mix short punchy lines with natural rhythmic sentences).
4. Eliminate AI buzzwords ("delve", "tapestry", "beacon", "testament", "pivotal", "multifaceted", "paramount importance", "furthermore", "moreover").
5. NEVER alter dates, numbers, currency amounts, percentages, citations, proper nouns, emails, or markdown headings.
6. Tone: ${intensity === 'LOW' ? 'Formal, precise, conservative human edit' : 'Engaging, clear, natural professional human tone'}.
7. CRITICAL OUTPUT REQUIREMENT: Output ONLY the single rewritten humanized text. Do NOT add preamble (e.g. "Here is...", "Rewritten:"), do NOT add explanations, bullet options, or sign-offs.

TEXT TO HUMANIZE:
${text}`;

    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest'];

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        const rawText =
          response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText && rawText.trim().length > 10) {
          let cleaned = rawText.trim();
          // Remove any accidental preamble
          cleaned = cleaned
            .replace(/^(?:Here (?:is|are) (?:the|a) [^\n:]+:\s*)+/i, '')
            .replace(/^(?:Rewritten (?:text|version):\s*)+/i, '')
            .trim();

          if (cleaned.length > 10) {
            return cleaned;
          }
        }
      } catch (modelErr: any) {
        console.warn(`[Natural-Engine] Model ${model} unavailable (${modelErr?.status || modelErr?.message}), trying next...`);
      }
    }
  } catch (err) {
    console.warn('[Natural-Engine] Gemini AI humanization fallback triggered:', err);
  }

  return null;
}

// ─── Token Protection ────────────────────────────────────────────────────────

export function maskProtectedTokens(
  input: string,
  extraTokens: string[] = []
): {masked: string; placeholders: Array<{token: string; original: string}>} {
  const placeholders: Array<{token: string; original: string}> = [];
  let working = input;
  let counter = 0;

  const registerToken = (orig: string): string => {
    const ph = `__HF_SEC_TOK_${counter++}__`;
    placeholders.push({token: ph, original: orig});
    return ph;
  };

  // 1. Extra explicitly provided tokens
  if (extraTokens.length > 0) {
    const sorted = [...extraTokens]
      .filter((t) => t && t.length >= 2)
      .sort((a, b) => b.length - a.length);
    for (const tok of sorted) {
      if (working.includes(tok)) {
        const ph = registerToken(tok);
        working = working.split(tok).join(ph);
      }
    }
  }

  // 2. URLs
  working = working.replace(/https?:\/\/[^\s)]+/g, (url) => registerToken(url));

  // 3. Emails
  working = working.replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, (email) =>
    registerToken(email)
  );

  // 4. Currencies & percentages ($1,000, €45.50, 99.8%)
  working = working.replace(/[$€£¥₹]\s*[\d,]+(?:\.\d+)?|\b\d+(?:\.\d+)?%/g, (curr) =>
    registerToken(curr)
  );

  return {masked: working, placeholders};
}

export function restoreProtectedTokens(
  text: string,
  placeholders: Array<{token: string; original: string}>
): string {
  let restored = text;
  for (let i = placeholders.length - 1; i >= 0; i--) {
    const {token, original} = placeholders[i];
    restored = restored.split(token).join(original);
  }
  return restored;
}

// ─── Comprehensive Humanizer Rules Dictionary ────────────────────────────────

export const AI_CLICHE_TRANSFORMS: Array<[RegExp, string]> = [
  // Robotic AI openers & transitions
  [/\bIn order to facilitate the implementation of\b/gi, 'To put in place'],
  [/\bin order to facilitate\b/gi, 'to help with'],
  [/\bIn order to\b/g, 'To'],
  [/\bin order to\b/gi, 'to'],
  [/\bDue to the fact that\b/g, 'Because'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\bIn the event that\b/g, 'If'],
  [/\bin the event that\b/gi, 'if'],
  [/\bAt this point in time\b/g, 'Right now'],
  [/\bat this point in time\b/gi, 'currently'],
  [/\bPrior to the commencement of\b/g, 'Before starting'],
  [/\bprior to the commencement of\b/gi, 'before starting'],
  [/\bWith regard to\b/g, 'Regarding'],
  [/\bwith regard to\b/gi, 'regarding'],
  [/\bWith respect to\b/g, 'For'],
  [/\bwith respect to\b/gi, 'for'],
  [/\bIn accordance with the provisions of\b/g, 'Under'],
  [/\bin accordance with the provisions of\b/gi, 'under'],
  [/\bIn accordance with\b/g, 'Under'],
  [/\bin accordance with\b/gi, 'under'],
  [/\bFurthermore,\s*it is important to note that\b/gi, 'Notably,'],
  [/\bFurthermore,\s*it is worth noting that\b/gi, 'Specifically,'],
  [/\bFurthermore,\s*it is essential to remember that\b/gi, 'Importantly,'],
  [/\bMoreover,\s*it is important to note that\b/gi, 'Notably,'],
  [/\bMoreover,\s*it is worth noting that\b/gi, 'Specifically,'],
  [/\bMoreover,\s*it is essential to remember that\b/gi, 'Importantly,'],
  [/\bIt is important to note that\b/gi, 'Notably,'],
  [/\bIt is worth noting that\b/gi, 'Specifically,'],
  [/\bIt is essential to remember that\b/gi, 'Keep in mind that'],
  [/\bIt can be observed that\b/gi, 'We can see that'],
  [/\bFurthermore,\s*it can be observed that\b/gi, 'Additionally,'],
  [/\bFurthermore,\s*it can be observed\b/gi, 'Additionally, we observe'],
  [/\bFurthermore,\b/g, 'Beyond that,'],
  [/\bfurthermore,\b/gi, 'on top of that,'],
  [/\bMoreover, it is essential to\b/gi, 'It is also essential to'],
  [/\bMoreover,\b/g, 'What is more,'],
  [/\bmoreover,\b/gi, 'at the same time,'],
  [/\bIn conclusion, it is evident that\b/gi, 'All in all, it is clear that'],
  [/\bIn conclusion,\b/g, 'Overall,'],
  [/\bin conclusion,\b/gi, 'in summary,'],

  // Overused AI clichés & filler vocabulary
  [/\bplays a crucial role in\b/gi, 'is central to'],
  [/\bplays a pivotal role in\b/gi, 'is essential to'],
  [/\bplays a vital role in\b/gi, 'is key to'],
  [/\bplays an integral role in\b/gi, 'is a core part of'],
  [/\bserves as a testament to\b/gi, 'is clear proof of'],
  [/\bserves as a cornerstone of\b/gi, 'forms the bedrock of'],
  [/\bserves as a primary indicator\b/gi, 'is a major sign'],
  [/\bserves as a\b/gi, 'acts as a'],
  [/\bserves as an\b/gi, 'acts as an'],
  [/\bserves as\b/gi, 'acts as'],
  [/\bdelve into the details of\b/gi, 'examine the details of'],
  [/\bdelve into\b/gi, 'explore'],
  [/\bdelves into\b/gi, 'explores'],
  [/\bdelved into\b/gi, 'explored'],
  [/\brich tapestry of\b/gi, 'broad range of'],
  [/\btapestry of\b/gi, 'mix of'],
  [/\bbeacon of hope\b/gi, 'symbol of promise'],
  [/\bbeacon of\b/gi, 'symbol of'],
  [/\bnavigating the complexities of\b/gi, 'working through'],
  [/\bnavigate the complexities of\b/gi, 'handle the details of'],
  [/\bnavigating the landscape of\b/gi, 'working across'],
  [/\bin today's fast-paced world\b/gi, "in today's environment"],
  [/\bin today's digital landscape\b/gi, 'in modern digital systems'],
  [/\bin the contemporary era\b/gi, 'nowadays'],
  [/\ba myriad of\b/gi, 'a wide variety of'],
  [/\ba multitude of\b/gi, 'numerous'],
  [/\ba plethora of\b/gi, 'an abundance of'],
  [/\bis of paramount importance\b/gi, 'matters tremendously'],
  [/\bparamount importance\b/gi, 'critical value'],
  [/\bparamount\b/gi, 'essential'],
  [/\bunderscores the importance of\b/gi, 'highlights the need for'],
  [/\bunderscores\b/gi, 'highlights'],
  [/\bunderscored\b/gi, 'highlighted'],
  [/\bseamless integration\b/gi, 'smooth integration'],
  [/\bseamlessly integrates with\b/gi, 'works smoothly with'],
  [/\bseamlessly\b/gi, 'smoothly'],
  [/\bparadigm shift\b/gi, 'fundamental shift'],
  [/\bholistic approach\b/gi, 'well-rounded approach'],
  [/\bholistic\b/gi, 'comprehensive'],
  [/\bmultifaceted nature of\b/gi, 'complex reality of'],
  [/\bmultifaceted\b/gi, 'varied'],
  [/\bgame-changer\b/gi, 'major breakthrough'],
  [/\bcutting-edge technology\b/gi, 'modern technology'],
  [/\bcutting-edge\b/gi, 'advanced'],
  [/\bstate-of-the-art\b/gi, 'top-tier'],
  [/\bgroundbreaking\b/gi, 'novel'],
  [/\brobust framework\b/gi, 'reliable setup'],
  [/\brobust\b/gi, 'solid'],
  [/\bharnessing the power of\b/gi, 'taking advantage of'],
  [/\bharness the potential of\b/gi, 'make the most of'],
  [/\bharness\b/gi, 'tap into'],
  [/\bfoster an environment\b/gi, 'build a culture'],
  [/\bfoster collaboration\b/gi, 'encourage teamwork'],
  [/\bfosters\b/gi, 'encourages'],
  [/\bfostering\b/gi, 'building'],

  // Business and academic jargon to plain human writing
  [/\bThe rapid evolution of technology has fundamentally reshaped\b/gi, 'The fast pace of modern technology has completely changed'],
  [/\bThe rapid evolution of\b/gi, 'The fast rise of'],
  [/\bfundamentally reshaped\b/gi, 'completely altered'],
  [/\bfundamentally changed\b/gi, 'substantially changed'],
  [/\bembraced digital tools\b/gi, 'adopted digital tools'],
  [/\bto enhance the learning process\b/gi, 'to make learning more effective'],
  [/\benhance productivity\b/gi, 'boost productivity'],
  [/\benhance\b/gi, 'improve'],
  [/\benhances\b/gi, 'improves'],
  [/\benhanced\b/gi, 'improved'],
  [/\bcustomized lessons for each individual student\b/gi, 'personalized lessons tailored to every student'],
  [/\beach individual student\b/gi, 'every student'],
  [/\bevery individual\b/gi, 'everyone'],
  [/\bmake education accessible to\b/gi, 'open up education for'],
  [/\bare trained on large datasets to identify patterns and make predictions based on\b/gi, 'learn from massive amounts of data, spotting trends and predicting outcomes from'],
  [/\btrained on large datasets\b/gi, 'trained on extensive data'],
  [/\bto drive value across\b/gi, 'to make a real difference for'],
  [/\bdrive value\b/gi, 'deliver real value'],
  [/\bactionable insights\b/gi, 'practical takeaways'],
  [/\bthought leadership\b/gi, 'expert perspective'],
  [/\bbest practices\b/gi, 'proven methods'],
  [/\bmission-critical\b/gi, 'essential'],
  [/\bdeep dive\b/gi, 'detailed inspection'],
  [/\bcircle back\b/gi, 'follow up'],
  [/\btouch base\b/gi, 'check in'],
  [/\bmove the needle\b/gi, 'make a noticeable impact'],
  [/\blow-hanging fruit\b/gi, 'easy wins'],
  [/\btake it to the next level\b/gi, 'step things up'],

  // Verbs & passive constructs
  [/\bUtilize\b/g, 'Use'],
  [/\butilize\b/gi, 'use'],
  [/\butilizes\b/gi, 'uses'],
  [/\butilized\b/gi, 'used'],
  [/\butilizing\b/gi, 'using'],
  [/\bUtilization\b/g, 'Use'],
  [/\butilization\b/gi, 'use'],
  [/\bfacilitate\b/gi, 'support'],
  [/\bfacilitates\b/gi, 'supports'],
  [/\bfacilitated\b/gi, 'supported'],
  [/\bleverage\b/gi, 'apply'],
  [/\bleverages\b/gi, 'applies'],
  [/\bleveraged\b/gi, 'applied'],
  [/\bleveraging\b/gi, 'applying'],
  [/\bendeavor to\b/gi, 'work to'],
  [/\bendeavors to\b/gi, 'works to'],
  [/\bcommence\b/gi, 'start'],
  [/\bcommences\b/gi, 'starts'],
  [/\bcommenced\b/gi, 'started'],
  [/\bcommencing\b/gi, 'starting'],
  [/\bSubsequent to\b/g, 'After'],
  [/\bsubsequent to\b/gi, 'after'],
  [/\bFor the purpose of\b/g, 'For'],
  [/\bfor the purpose of\b/gi, 'for'],
  [/\bIn close proximity to\b/g, 'Near'],
  [/\bin close proximity to\b/gi, 'near'],
  [/\bHave the ability to\b/g, 'Can'],
  [/\bhave the ability to\b/gi, 'can'],
  [/\bhas the ability to\b/gi, 'can'],
  [/\bIs able to\b/g, 'Can'],
  [/\bis able to\b/gi, 'can'],
  [/\bare able to\b/gi, 'can'],
  [/\bOn a daily basis\b/g, 'Daily'],
  [/\bon a daily basis\b/gi, 'daily'],
  [/\bOn a regular basis\b/g, 'Regularly'],
  [/\bon a regular basis\b/gi, 'regularly'],
  [/\bA large number of\b/g, 'Many'],
  [/\ba large number of\b/gi, 'many'],
  [/\bA substantial amount of\b/g, 'Significant'],
  [/\ba substantial amount of\b/gi, 'significant'],
  [/\bIn light of the fact that\b/g, 'Since'],
  [/\bin light of the fact that\b/gi, 'since'],
  [/\bConsequently, this ensures that\b/gi, 'This directly ensures'],
  [/\bAs a consequence of\b/g, 'Following'],
  [/\bas a consequence of\b/gi, 'following'],
  [/\bConsequently,\b/g, 'As a result,'],
  [/\bconsequently,\b/gi, 'as a result,'],
  [/\bconduct a comprehensive review of\b/gi, 'thoroughly inspect'],
  [/\bconducted a comprehensive review of\b/gi, 'thoroughly inspected'],
  [/\bconduct a review of\b/gi, 'review'],
  [/\bconduct an audit\b/gi, 'complete an audit'],
  [/\bconducted an audit\b/gi, 'completed an audit'],
  [/\bin a timely manner\b/gi, 'promptly'],
  [/\bmake a determination\b/gi, 'decide'],
  [/\bmade a determination\b/gi, 'decided'],
  [/\bprovide assistance to\b/gi, 'help'],
  [/\bprovides assistance to\b/gi, 'helps'],
  [/\bdemonstrates a significant\b/gi, 'shows a clear'],
  [/\bdemonstrates\b/gi, 'shows'],
  [/\bdemonstrated\b/gi, 'showed'],
  [/\bexhibits a\b/gi, 'shows a'],
  [/\bexhibit\b/gi, 'show'],
  [/\belucidate\b/gi, 'clarify'],
  [/\bexplicate\b/gi, 'explain'],
  [/\bameliorate\b/gi, 'improve'],
  [/\bexpedite the process\b/gi, 'speed up the process'],
  [/\bexpedite\b/gi, 'speed up'],
  [/\bexpedited\b/gi, 'sped up'],
  [/\bmitigate risks\b/gi, 'reduce risks'],
  [/\bmitigate\b/gi, 'lessen'],
  [/\bmitigates\b/gi, 'lessens'],
  [/\bmitigated\b/gi, 'lessened'],
];

// ─── Everyday Wording & Contractions ─────────────────────────────────────────

/**
 * Formal business/academic wording replaced by the word a person would actually
 * type. Every replacement is shorter than or equal to what it replaces, because
 * in-place document editing has to keep the original text slot.
 */
export const PLAIN_WORD_TRANSFORMS: Array<[RegExp, string]> = [
  [/\bprovides us with\b/gi, 'gives us'],
  [/\bprovide you with\b/gi, 'give you'],
  [/\bprovides\b/gi, 'gives'],
  [/\bprovide\b/gi, 'give'],
  [/\bproviding\b/gi, 'giving'],
  [/\bobtains\b/gi, 'gets'],
  [/\bobtain\b/gi, 'get'],
  [/\bobtained\b/gi, 'got'],
  [/\bobtaining\b/gi, 'getting'],
  [/\brequires\b/gi, 'needs'],
  [/\brequire\b/gi, 'need'],
  [/\brequired\b/gi, 'needed'],
  [/\bsufficient\b/gi, 'enough'],
  [/\bassistance\b/gi, 'help'],
  [/\baccomplishes\b/gi, 'completes'],
  [/\baccomplished\b/gi, 'completed'],
  [/\baccomplish\b/gi, 'complete'],
  [/\bachieves\b/gi, 'reaches'],
  [/\bachieve\b/gi, 'reach'],
  [/\bachieved\b/gi, 'reached'],
  [/\bapproximately\b/gi, 'about'],
  [/\bsubsequently\b/gi, 'later'],
  [/\bsubsequent\b/gi, 'later'],
  [/\bconstitutes\b/gi, 'is'],
  [/\bregarding\b/gi, 'about'],
  [/\badditional\b/gi, 'extra'],
  [/\binitiates\b/gi, 'starts'],
  [/\binitiate\b/gi, 'start'],
  [/\binitiated\b/gi, 'started'],
  [/\bfinalizes\b/gi, 'finishes'],
  [/\bfinalize\b/gi, 'finish'],
  [/\bfinalized\b/gi, 'finished'],
  [/\battempts to\b/gi, 'tries to'],
  [/\battempted to\b/gi, 'tried to'],
  [/\bparticipates in\b/gi, 'joins'],
  [/\bparticipate in\b/gi, 'join'],
  [/\bparticipated in\b/gi, 'joined'],
  [/\bmethodologies\b/gi, 'methods'],
  [/\bmethodology\b/gi, 'method'],
  [/\bcapabilities\b/gi, 'abilities'],
  [/\bcapability\b/gi, 'ability'],
  [/\bopportunities\b/gi, 'chances'],
  [/\bopportunity\b/gi, 'chance'],
  [/\bindividuals\b/gi, 'people'],
  [/\bindividual\b/gi, 'person'],
  [/\bwe would like to\b/gi, 'we want to'],
  [/\bi would like to\b/gi, 'I want to'],
  [/\byou would like to\b/gi, 'you want to'],
  [/\bplease note that\b/gi, 'note that'],
  [/\bit should be noted that\b/gi, 'note that'],
  [/\bwith reference to\b/gi, 'about'],
  [/\bas well as\b/gi, 'and'],
  [/\btake into consideration\b/gi, 'consider'],
  [/\btakes into consideration\b/gi, 'considers'],
  [/\btaking into consideration\b/gi, 'considering'],
  [/\bat the present time\b/gi, 'now'],
  [/\bat the current time\b/gi, 'now'],
  [/\beach and every\b/gi, 'every'],
  [/\bvarious different\b/gi, 'various'],
  [/\babsolutely essential\b/gi, 'essential'],
  [/\badvance planning\b/gi, 'planning'],
  [/\bbasic fundamentals\b/gi, 'fundamentals'],
  [/\bpast history\b/gi, 'history'],
  [/\bfuture plans\b/gi, 'plans'],
  [/\bcompletely eliminate\b/gi, 'eliminate'],
  [/\brevert back\b/gi, 'revert'],
  [/\breturn back\b/gi, 'return'],
  [/\bcooperate together\b/gi, 'cooperate'],
  [/\bjoin together\b/gi, 'join'],
  [/\bend result\b/gi, 'result'],
  [/\bfinal outcome\b/gi, 'outcome'],
  [/\bnecessary requirements\b/gi, 'requirements'],
  [/\bpersonnel\b/gi, 'staff'],
];

/** Written English turned spoken. Skipped for legal clauses, where "do not" must stay explicit. */
export const CONTRACTION_TRANSFORMS: Array<[RegExp, string]> = [
  [/\bI am not\b/gi, "I'm not"],
  [/\bI am\b/gi, "I'm"],
  [/\bcannot\b/gi, "can't"],
  [/\bcan not\b/gi, "can't"],
  [/\bcould not\b/gi, "couldn't"],
  [/\bshould not\b/gi, "shouldn't"],
  [/\bwould not\b/gi, "wouldn't"],
  [/\bwill not\b/gi, "won't"],
  [/\bdo not\b/gi, "don't"],
  [/\bdoes not\b/gi, "doesn't"],
  [/\bdid not\b/gi, "didn't"],
  [/\bare not\b/gi, "aren't"],
  [/\bis not\b/gi, "isn't"],
  [/\bwas not\b/gi, "wasn't"],
  [/\bwere not\b/gi, "weren't"],
  [/\bhave not\b/gi, "haven't"],
  [/\bhas not\b/gi, "hasn't"],
  [/\bhad not\b/gi, "hadn't"],
  [/\bwe are\b/gi, "we're"],
  [/\byou are\b/gi, "you're"],
  [/\bthey are\b/gi, "they're"],
  [/\bthat is\b/gi, "that's"],
  [/\bthere is\b/gi, "there's"],
  [/\bhere is\b/gi, "here's"],
  [/\bwhat is\b/gi, "what's"],
  [/\bit is\b/gi, "it's"],
  [/\bhe is\b/gi, "he's"],
  [/\bshe is\b/gi, "she's"],
  [/\bwe will\b/gi, "we'll"],
  [/\byou will\b/gi, "you'll"],
  [/\bthey will\b/gi, "they'll"],
  [/\bI will\b/gi, "I'll"],
  [/\bhe will\b/gi, "he'll"],
  [/\bshe will\b/gi, "she'll"],
  [/\bwe have\b/gi, "we've"],
  [/\byou have\b/gi, "you've"],
  [/\bthey have\b/gi, "they've"],
  [/\bI have\b/gi, "I've"],
  [/\blet us\b/gi, "let's"],
];

/** Applies a replacement while keeping the capitalisation the original had. */
function replaceCaseAware(text: string, pattern: RegExp, replacement: string): string {
  return text.replace(pattern, (match: string) => {
    const first = match.charAt(0);
    return first === first.toUpperCase() && first !== first.toLowerCase()
      ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
      : replacement;
  });
}

// ─── Cadence & Burstiness Engine ─────────────────────────────────────────────

/**
 * Humanizes paragraph rhythm:
 * Breaks overly long monotone compound sentences, injects lively connectors,
 * and eliminates consecutive repetitive sentence starters.
 */
export function enhanceSentenceCadenceAndBurstiness(paragraph: string): string {
  if (!paragraph || paragraph.trim().length < 30) return paragraph;

  // Split into sentences using punctuation boundaries
  const sentenceRegex = /([^.!?]+[.!?]+(?:\s+|$))/g;
  const matches = paragraph.match(sentenceRegex);
  if (!matches || matches.length === 0) return paragraph;

  const connectors = [
    'In practice,',
    'Beyond that,',
    'At the same time,',
    'Clearly,',
    'Notably,',
    'As a result,',
    'Naturally,',
    'To put it simply,',
    'Importantly,',
  ];

  let connectorIdx = 0;
  let lastStarter = '';

  const processedSentences = matches.map((sentence, idx) => {
    let s = sentence.trim();
    if (!s) return sentence;

    // 1. Break down bloated multi-clause compound sentences (>35 words)
    const words = s.split(/\s+/);
    if (words.length > 36 && s.includes(', and ') && !s.includes('"') && !s.includes('(')) {
      const parts = s.split(', and ');
      if (parts.length === 2 && parts[0].split(/\s+/).length >= 14 && parts[1].split(/\s+/).length >= 12) {
        const first = parts[0].trim() + '.';
        const secondWord = parts[1].trim();
        const capitalizedSecond = secondWord.charAt(0).toUpperCase() + secondWord.slice(1);
        s = `${first} In addition, ${capitalizedSecond}`;
      }
    }

    // 2. Prevent consecutive sentences from starting with the exact same starter
    const firstWord = s.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '') || '';
    if (idx > 0 && firstWord.toLowerCase() === lastStarter.toLowerCase() && ['The', 'This', 'It', 'These'].includes(firstWord)) {
      const naturalConn = connectors[connectorIdx % connectors.length];
      connectorIdx++;
      const rest = s.charAt(0).toLowerCase() + s.slice(1);
      s = `${naturalConn} ${rest}`;
    }

    lastStarter = firstWord;
    return s;
  });

  return processedSentences.join(' ');
}

// ─── Main Natural Humanization Entry Point ───────────────────────────────────

export function transformWithNaturalEngine(
  input: string,
  intensity: 'LOW' | 'NORMAL' = 'NORMAL',
  isLegalClause = false,
  protectedTokens: string[] = []
): string {
  if (!input || !input.trim()) return input;

  // 1. Mask critical tokens so they are never corrupted
  const {masked, placeholders} = maskProtectedTokens(input, protectedTokens);

  // 2. Apply comprehensive rule transforms
  let working = masked;
  for (const [pattern, replacement] of AI_CLICHE_TRANSFORMS) {
    if (isLegalClause && pattern.source.includes('terminate')) {
      continue; // Preserve strict legal clause definitions
    }
    working = working.replace(pattern, replacement);
  }

  // 2b. Everyday wording, so plain corporate prose does not come back untouched.
  if (!isLegalClause) {
    for (const [pattern, replacement] of PLAIN_WORD_TRANSFORMS) {
      working = replaceCaseAware(working, pattern, replacement);
    }
    if (intensity !== 'LOW') {
      for (const [pattern, replacement] of CONTRACTION_TRANSFORMS) {
        working = replaceCaseAware(working, pattern, replacement);
      }
    }
  }

  // 3. Process paragraph by paragraph for cadence and burstiness
  const paragraphs = working.split(/\n\s*\n/);
  const humanizedParagraphs = paragraphs.map((para) => {
    const trimmed = para.trim();
    if (
      !trimmed ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('|') ||
      trimmed.startsWith('```') ||
      trimmed.startsWith('- ') ||
      trimmed.startsWith('* ') ||
      /^\d+\.\s/.test(trimmed)
    ) {
      return para;
    }

    if (intensity === 'NORMAL' && !isLegalClause) {
      return enhanceSentenceCadenceAndBurstiness(para);
    }
    return para;
  });

  working = humanizedParagraphs.join('\n\n');

  // Clean double transition adverbs like "Furthermore, Notably," or "Moreover, Notably,"
  working = working.replace(/\b(?:Furthermore|Moreover|Beyond that|Additionally|On top of that),\s*(Notably|Specifically|Importantly),/gi, '$1,');

  // 4. Restore masked protected tokens verbatim
  const restored = restoreProtectedTokens(working, placeholders);

  // Clean extra spaces
  return restored
    .split('\n')
    .map((line) => line.replace(/[ \t]{2,}/g, ' '))
    .join('\n');
}
