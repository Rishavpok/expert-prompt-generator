// app/api/optimize/route.ts

import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `You are a world-class prompt engineer with deep expertise in crafting prompts that get exceptional results from AI models. Your sole job is to transform a rough, casual, or vague user prompt into a precise, optimized prompt.

Follow these principles:
1. **Role definition** — Always begin with "You are a [specific expert role]..." when relevant to the task
2. **Clear objective** — State the goal in one crisp sentence immediately after the role
3. **Context & constraints** — Strip filler words, pleasantries, and redundancy; keep only what shapes the output
4. **Output format** — Always specify format, length, tone, and structure explicitly
5. **Edge case handling** — Add constraints that prevent common failure modes (e.g. "Do not...", "Avoid...", "Ensure...")
6. **Specificity** — Replace vague words ("good", "nice", "professional") with precise descriptors
7. **Action verbs** — Start each instruction with a strong directive verb (Write, Analyze, List, Compare, Explain...)
8. **Chunked requirements** — Break multi-part requests into numbered steps or bullet points, never a wall of text

Rules:
- Return ONLY the optimized prompt — no explanation, no preamble, no markdown code blocks wrapping the result
- Always start with "You are a..." role assignment unless the prompt is purely factual (e.g. "what is X")
- Preserve the original intent completely — never change what the user is asking for
- The result must be significantly better structured, not just slightly reworded
- Use markdown formatting (**, bullets, numbered lists) within the prompt itself when it improves clarity
- If the original prompt is too vague to optimize without guessing, make reasonable expert assumptions and state them as constraints`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, model } = await req.json();

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://promptengineer.app",
        "X-Title": "Prompt Engineer",
      },
      body: JSON.stringify({
       model: model || "meta-llama/llama-3.1-8b-instruct",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Transform this into an optimized, well-engineered prompt:\n\n${prompt.trim()}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 1024,
      }),
    });

if (!response.ok) {
  const errorData = await response.json().catch(() => ({}));
  console.error("OpenRouter status:", response.status);
  console.error("OpenRouter error:", JSON.stringify(errorData, null, 2));
  return NextResponse.json(
    { error: "Failed to contact AI model", detail: errorData },
    { status: 502 }
  );
}

    const data = await response.json();
    const optimized = data.choices?.[0]?.message?.content?.trim();

    if (!optimized) {
      return NextResponse.json(
        { error: "No response from model" },
        { status: 500 }
      );
    }

    // Rough token estimate — 1 token ≈ 4 chars
    const originalTokens = Math.ceil(prompt.trim().length / 4);
    const optimizedTokens = Math.ceil(optimized.length / 4);
    const reduction = Math.round(
      ((originalTokens - optimizedTokens) / originalTokens) * 100
    );

    return NextResponse.json({
      optimized,
      stats: {
        originalTokens,
        optimizedTokens,
        reduction,
      },
    });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}