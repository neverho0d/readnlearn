/**
 * Prompt templates for LLM story generation
 *
 * Contains all prompt templates used by the LLM adapter for generating
 * stories, cloze exercises, and other learning content.
 */

export interface LearningContext {
    l1: string; // User's native language
    l2: string; // Target language
    proficiency: "beginner" | "intermediate" | "advanced";
    topic?: string;
    style?: "formal" | "casual" | "academic";
}

export interface Phrase {
    id: string;
    text: string;
    translation?: string;
    context?: string;
    difficulty?: number; // 1-5 scale
}

export interface StoryPrompt {
    phrases: Phrase[];
    context: LearningContext;
    wordCount: number; // Target word count (80-150)
    includeGlosses: boolean;
}

export interface ClozePrompt {
    phrases: Phrase[];
    context: LearningContext;
    exerciseCount: number; // Number of cloze exercises to generate
}

/**
 * Generate a story prompt that includes all provided phrases
 */
export function createStoryPrompt(prompt: StoryPrompt): string {
    const { phrases, context, wordCount, includeGlosses } = prompt;

    const phraseList = phrases
        .map(
            (phrase, index) =>
                `${index + 1}. "${phrase.text}"${phrase.translation ? ` (${phrase.translation})` : ""}`,
        )
        .join("\n");

    const languageNote =
        context.l1 === context.l2
            ? `Note: The user's native language (${context.l1}) is the same as the target language. Provide explanations and context rather than translations.`
            : `Note: User's native language is ${context.l1}, target language is ${context.l2}.`;

    return `You are an expert language learning tutor. Create a coherent, engaging story in ${context.l2} that naturally incorporates all the provided phrases.

**Requirements:**
- Story must be exactly ${wordCount} words (80-150 word range)
- Include ALL ${phrases.length} phrases naturally in the story
- Story should be appropriate for ${context.proficiency} level
- Use ${context.style || "casual"} tone
- Make the story engaging and memorable
- Ensure phrases fit naturally in context

**Phrases to include:**
${phraseList}

${languageNote}

**Output format:**
Return a JSON object with this exact structure:
{
  "story": "Your story text here...",
  "usedPhrases": [
    {
      "phrase": "exact phrase text",
      "position": 42,
      "gloss": "brief explanation or translation"
    }
  ],
  "metadata": {
    "wordCount": 125,
    "difficulty": "intermediate",
    "topics": ["topic1", "topic2"]
  }
}

Generate the story now:`;
}

/**
 * Generate a cloze exercise prompt
 */
export function createClozePrompt(prompt: ClozePrompt): string {
    const { phrases, context, exerciseCount } = prompt;

    const phraseList = phrases
        .map(
            (phrase, index) =>
                `${index + 1}. "${phrase.text}"${phrase.translation ? ` (${phrase.translation})` : ""}`,
        )
        .join("\n");

    return `You are an expert language learning tutor. Create ${exerciseCount} cloze (fill-in-the-blank) exercises using the provided phrases.

**Requirements:**
- Create exactly ${exerciseCount} exercises
- Each exercise should have 1-2 blanks
- Use the provided phrases as the answers
- Make exercises appropriate for ${context.proficiency} level
- Provide clear, unambiguous context
- Ensure only one correct answer per blank

**Phrases to use:**
${phraseList}

**Output format:**
Return a JSON array with this exact structure:
[
  {
    "id": "exercise_1",
    "text": "Complete the sentence: The weather is very _____ today.",
    "blanks": [
      {
        "position": 4,
        "answer": "sunny",
        "alternatives": ["bright", "warm"]
      }
    ],
    "difficulty": 2,
    "explanation": "This exercise tests weather vocabulary."
  }
]

Generate the exercises now:`;
}

/**
 * Generate a story validation prompt
 */
export function createValidationPrompt(story: string, phrases: Phrase[]): string {
    const phraseList = phrases.map((p) => `"${p.text}"`).join(", ");

    return `Analyze this story and verify it meets the requirements:

**Story:**
${story}

**Required phrases to include:**
${phraseList}

**Validation checklist:**
1. Does the story include ALL required phrases naturally?
2. Is the story between 80-150 words?
3. Is the content appropriate and safe?
4. Are the phrases used in correct context?
5. Is the story coherent and engaging?

**Output format:**
Return a JSON object:
{
  "valid": true/false,
  "issues": ["list of any issues found"],
  "missingPhrases": ["phrases not found in story"],
  "wordCount": 125,
  "coverage": 0.95
}

Analyze the story now:`;
}

/**
 * Generate a fallback story template
 */
export function createFallbackStory(phrases: Phrase[], context: LearningContext): string {
    const phraseTexts = phrases.map((p) => p.text).join(", ");

    return `Here are some useful phrases in ${context.l2}: ${phraseTexts}. 
  
Practice using these phrases in your own sentences. Try to create a short story or dialogue that includes each phrase naturally. 
This will help you remember them better and understand how they're used in context.`;
}

/**
 * Generate explanation for L1==L2 case
 */
export function createExplanationPrompt(
    phrase: Phrase,
    context: LearningContext,
    verbosity: "brief" | "normal" | "detailed" = "normal",
): string {
    return `Explain this ${context.l1} phrase in detail:

**Phrase:** "${phrase.text}"
**Context:** ${phrase.context || "No context provided"}

**Explanation level:** ${verbosity}

**Requirements:**
- Provide ${verbosity} explanation appropriate for ${context.proficiency} level
- Include usage examples
- Explain grammar if relevant
- Mention common mistakes or tips
- Keep it educational and clear

**Output format:**
Return a JSON object:
{
  "explanation": "Your detailed explanation here...",
  "examples": ["example 1", "example 2"],
  "grammar": "grammar notes if relevant",
  "tips": ["tip 1", "tip 2"],
  "level": "${verbosity}"
}

Explain the phrase now:`;
}
