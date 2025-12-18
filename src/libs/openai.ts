import OpenAI from "openai";
import type { Presentation, Slide } from "@/types/presentation";
import { getSecret } from "./secrets";

// Cached OpenAI client
let cachedOpenAIClient: OpenAI | null = null;

// Initialize OpenAI client
const getOpenAIClient = async (): Promise<OpenAI> => {
  if (cachedOpenAIClient) {
    return cachedOpenAIClient;
  }

  const apiKey = await getSecret("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required (set in AWS Secrets Manager or env var)");
  }
  
  cachedOpenAIClient = new OpenAI({ apiKey });
  return cachedOpenAIClient;
};

// Model configuration
const MODEL_NAME = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * System prompt for presentation generation
 */
const GENERATION_SYSTEM_PROMPT = `You are a professional presentation designer. Create TEXT-ONLY presentations in JSON format.

CRITICAL: This is a TEXT-ONLY presentation system. DO NOT include any custom images, graphics, or image URLs.
- NO custom image paths (like /images/diagram.png, /images/chart.png, etc.)
- NO image field in slides (except for standard backgrounds)
- Only use text content, metrics, quotes, and structured data

The presentation framework supports these EXACT slide types:

1. "title" - Opening hero slide
   Fields: tagline, title, subtitle, metrics[], cards[]
   Example: { "type": "title", "background": "/images/background1.jpg", "tagline": "INNOVATION", "title": "Our Vision", "subtitle": "Building the future", "metrics": [{"value": "100+", "label": "CUSTOMERS"}], "cards": [{"title": "Project A", "description": "Description here"}] }

2. "section" - Chapter divider with navigation
   Fields: title, sections[]
   Example: { "type": "section", "background": "/images/background2.jpg", "title": "Table of Contents", "sections": [{"number": "01", "title": "Introduction"}, {"number": "02", "title": "Our Approach"}] }

3. "content" - Rich text content slide
   Fields: title, content.sections[], content.deliverables[], content.benefits, content.tips[]
   Example: { "type": "content", "background": "/images/background3.jpg", "title": "Key Points", "content": { "sections": [{"title": "Overview", "content": "Description text here..."}], "deliverables": [{"title": "Item 1", "description": "Details"}], "benefits": {"title": "Benefits", "items": ["Benefit 1", "Benefit 2"]} } }

4. "split" - Two-column layout (TEXT ONLY, no images)
   Fields: title, subtitle, content.sections[], reverse (boolean to flip layout)
   Example: { "type": "split", "background": "/images/background4.jpg", "title": "Deep Dive", "subtitle": "Understanding the details", "content": { "sections": [{"title": "Point 1", "content": "Explanation..."}] }, "reverse": false }

5. "quote" - Large inspirational quote
   Fields: quote.text, quote.author (or just author field)
   Example: { "type": "quote", "background": "/images/background5.jpg", "quote": {"text": "The best way to predict the future is to create it.", "author": "Peter Drucker"} }

6. "metrics-enhanced" - Large KPI display
   Fields: title, enhancedMetrics[]
   Example: { "type": "metrics-enhanced", "background": "/images/background6.jpg", "title": "Key Results", "enhancedMetrics": [{"value": "$2.5M", "label": "Revenue", "sublabel": "Q4 2024", "keyDeals": ["Deal A", "Deal B"]}] }

7. "multi-column" - Three-column feature comparison
   Fields: title, subtitle, columns[]
   Example: { "type": "multi-column", "background": "/images/background7.jpg", "title": "Our Pillars", "subtitle": "What we stand for", "columns": [{"icon": "🚀", "title": "Innovation", "description": "Pushing boundaries"}, {"icon": "🤝", "title": "Partnership", "description": "Working together"}] }

8. "timeline" - Project timeline
   Fields: title, timeline[]
   Example: { "type": "timeline", "background": "/images/background8.jpg", "title": "Project Timeline", "timeline": [{"date": "Q1 2025", "phase": "Phase 1", "duration": "3 months", "description": "Discovery and planning"}] }

Required JSON structure:
{
  "id": "unique-id",
  "title": "Presentation Title",
  "description": "Description",
  "theme": {
    "logo": "image",
    "logoImage": "/logo.svg",
    "colors": "qodea",
    "videoBackground": "/videos/qodea-video.mp4"
  },
  "slides": [ ... array of slides ... ]
}

RULES:
- Create 8-12 slides for a compelling narrative
- Use backgrounds from /images/background1.jpg through /images/background12.jpg (vary them!)
- Keep text concise and impactful
- Use emojis sparingly for icons in columns (🚀 💡 🎯 📊 etc.)
- NEVER reference external images or custom graphics
- Focus on strong typography and structured content`;

/**
 * System prompt for slide updates
 */
const UPDATE_SYSTEM_PROMPT = `You are a professional presentation editor. Given a presentation and an instruction to update a specific slide, return the affected slides in JSON format.

CRITICAL: This is a TEXT-ONLY presentation system. DO NOT include any custom images or graphics.
- NO custom image paths
- Only use text content, metrics, quotes, and structured data
- Backgrounds must be from /images/background1.jpg through /images/background12.jpg

Return format:
{
  "affectedSlides": [
    {
      "slideIndex": 0,
      "slide": { ... slide object ... }
    }
  ]
}

You may need to update multiple slides if the change affects the overall structure (e.g., updating a section slide might require updating the agenda slide).
Maintain consistency with the existing presentation style and theme.`;

/**
 * Generate a full presentation from title and description
 */
export async function generatePresentation(title: string, description: string): Promise<Presentation> {
  const client = await getOpenAIClient();

  const userPrompt = `Create a presentation with:
Title: ${title}
Description: ${description}

Generate a complete presentation JSON with 8-12 slides that tells a compelling story.`;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: GENERATION_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      // Note: gpt-5-mini doesn't support custom temperature
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);

    // Validate the response has the correct structure
    if (!parsed.slides || !Array.isArray(parsed.slides)) {
      throw new Error("Invalid presentation structure from OpenAI");
    }

    // Generate a unique ID if not provided
    if (!parsed.id) {
      parsed.id = `presentation-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    return parsed as Presentation;
  } catch (error) {
    console.error("Error generating presentation:", error);
    throw error;
  }
}

/**
 * Update slides based on user instruction
 * Returns affected slides (could be one or multiple)
 */
export async function updateSlides(
  presentation: Presentation,
  slideIndex: number,
  instruction: string,
): Promise<{ slideIndex: number; slide: Slide }[]> {
  const client = await getOpenAIClient();

  const userPrompt = `Presentation:
${JSON.stringify(presentation, null, 2)}

Instruction: Update slide ${slideIndex} - ${instruction}

Return the affected slides with their updated content.`;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: UPDATE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      // Note: gpt-5-mini doesn't support custom temperature
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);

    if (!parsed.affectedSlides || !Array.isArray(parsed.affectedSlides)) {
      throw new Error("Invalid response structure from OpenAI");
    }

    return parsed.affectedSlides as { slideIndex: number; slide: Slide }[];
  } catch (error) {
    console.error("Error updating slides:", error);
    throw error;
  }
}

/**
 * Generate a single slide based on context and type
 */
export async function generateSlide(
  presentation: Presentation,
  slideType: string,
  context: string,
): Promise<Slide> {
  const client = await getOpenAIClient();

  const systemPrompt = `You are a professional presentation designer. Generate a single slide that fits within an existing presentation.

Return a JSON object representing the slide with the appropriate structure for the requested type.

Available slide types and their structures:
- title: { type, background, tagline, title, subtitle, metrics, cards }
- section: { type, background, title, sections (array of {number, title}) }
- content: { type, background, title, content: { sections, deliverables, benefits, tips } }
- split: { type, background, title, image, reverse, content }
- quote: { type, background, quote: { text, author } }
- metrics-enhanced: { type, background, title, enhancedMetrics }
- multi-column: { type, background, title, columns }`;

  const userPrompt = `Existing presentation context:
Title: ${presentation.title}
Description: ${presentation.description}
Current slide count: ${presentation.slides.length}

Generate a "${slideType}" slide with the following context: ${context}

Return only the slide JSON object.`;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      // Note: gpt-5-mini doesn't support custom temperature
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);
    return parsed as Slide;
  } catch (error) {
    console.error("Error generating slide:", error);
    throw error;
  }
}

/**
 * Refine entire presentation based on user instruction
 * Returns all affected slides
 */
export async function refinePresentation(
  presentation: Presentation,
  instruction: string,
): Promise<{ slideIndex: number; slide: Slide }[]> {
  const client = await getOpenAIClient();

  const systemPrompt = `You are a professional presentation editor. Given a presentation and an instruction to refine it, return all affected slides in JSON format.

CRITICAL: This is a TEXT-ONLY presentation system. DO NOT include any custom images or graphics.
- NO custom image paths
- Only use text content, metrics, quotes, and structured data
- Backgrounds must be from /images/background1.jpg through /images/background12.jpg

Return format:
{
  "affectedSlides": [
    {
      "slideIndex": 0,
      "slide": { ... slide object ... }
    }
  ]
}

You may need to update multiple slides or all slides depending on the instruction.
Maintain consistency with the existing presentation style and theme.`;

  const userPrompt = `Presentation:
${JSON.stringify(presentation, null, 2)}

Instruction: ${instruction}

Return all affected slides with their updated content.`;

  try {
    const completion = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      // Note: gpt-5-mini doesn't support custom temperature
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from OpenAI");
    }

    const parsed = JSON.parse(content);

    if (!parsed.affectedSlides || !Array.isArray(parsed.affectedSlides)) {
      throw new Error("Invalid response structure from OpenAI");
    }

    return parsed.affectedSlides as { slideIndex: number; slide: Slide }[];
  } catch (error) {
    console.error("Error refining presentation:", error);
    throw error;
  }
}

