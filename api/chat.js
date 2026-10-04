export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Use POST" });
  }

  const apiKey = process.env.Lumina_API_Key;
  const { message } = req.body;

  const models = ["gemini-flash-latest", "gemini-flash-lite-latest"];
  let lastData = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    const model = models[attempt % 2];

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: message }] }],
          }),
        }
      );

      const data = await response.json();
      lastData = data;
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (reply) {
        return res.status(200).json({ reply });
      }
    } catch (error) {
      lastData = { error: "Network problem" };
    }

    await new Promise((r) => setTimeout(r, 1500));
  }

  res.status(500).json({ error: "No reply", details: lastData });
}
