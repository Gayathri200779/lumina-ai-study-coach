export const config = { maxDuration: 60 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Fast model first, then the backup. "noThinking" makes answers quicker. */
const ATTEMPTS = [
  { model: "gemini-flash-lite-latest", noThinking: true },
  { model: "gemini-flash-latest", noThinking: true },
  { model: "gemini-flash-lite-latest", noThinking: false },
  { model: "gemini-flash-latest", noThinking: false },
];

/* Reads Gemini's stream and writes the text to the browser as it arrives */
async function pipeStream(response, res) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sent = false;

  function handleLine(line) {
    if (!line.startsWith("data:")) return;

    const json = line.slice(5).trim();
    if (!json || json === "[DONE]") return;

    let data;
    try {
      data = JSON.parse(json);
    } catch (error) {
      return;
    }

    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts
      .filter((part) => part.text && !part.thought)
      .map((part) => part.text)
      .join("");

    if (!text) return;

    if (!res.headersSent) {
      res.statusCode = 200;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
    }

    res.write(text);
    sent = true;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop();
    lines.forEach(handleLine);
  }

  if (buffer) handleLine(buffer);

  return sent;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const apiKey = process.env.Lumina_API_Key;
  const message = req.body && req.body.message;

  if (!apiKey) {
    return res.status(500).json({ error: "API key is missing" });
  }

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "No message" });
  }

  let lastError = null;

  for (const { model, noThinking } of ATTEMPTS) {
    const generationConfig = { maxOutputTokens: 3000 };

    if (noThinking) {
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: message }] }],
            generationConfig,
          }),
          signal: AbortSignal.timeout(50000),
        }
      );

      if (!response.ok || !response.body) {
        lastError = {
          model,
          status: response.status,
          body: await response.text().catch(() => ""),
        };
        await sleep(400);
        continue;
      }

      const sent = await pipeStream(response, res);

      if (sent) {
        return res.end();
      }

      lastError = { model, error: "Empty reply" };
    } catch (error) {
      lastError = { model, error: String(error) };

      /* The answer had already started: just finish it */
      if (res.headersSent) {
        return res.end();
      }
    }

    await sleep(400);
  }

  res.status(500).json({ error: "No reply", details: lastError });
}
