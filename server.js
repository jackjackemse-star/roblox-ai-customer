import express from "express";
import OpenAI from "openai";

const app = express();

app.use(express.json({
  limit: "10kb",
}));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function sendJudgeResponse(res, accepted, reply) {
  return res.json({
    accepted: accepted === true,
    reply: String(reply || "Okay.").slice(0, 120),
  });
}

app.get("/", (req, res) => {
  res.json({
    status: "AI judge backend is running",
  });
});

app.post("/judge-answer", async (req, res) => {
  try {
    const { username, answer } = req.body || {};

    if (typeof answer !== "string" || answer.length < 1 || answer.length > 200) {
      return sendJudgeResponse(
        res,
        false,
        "That answer does not really convince me."
      );
    }

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: `
You are judging a Roblox minigame answer.

The player is trying to convince an NPC customer to buy from their stand.

Player name: ${username || "Unknown"}
Player answer: "${answer}"

Decide if the answer is good enough.

Accept answers that give a real reason to buy, such as:
quality, price, taste, freshness, speed, friendliness, uniqueness, cleanliness, special deals, or good service.

Reject:
spam, begging, threats, insults, random letters, empty answers, or answers that do not explain why the stand is worth buying from.

Return ONLY JSON in this exact format:
{"accepted":true,"reply":"short NPC reply"}

No extra text.
      `,
    });

    const text = response.output_text || "{}";

    console.log("OpenAI raw response:", text);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      return sendJudgeResponse(
        res,
        false,
        "Hmm... I did not really understand that answer."
      );
    }

    return sendJudgeResponse(
      res,
      parsed.accepted === true,
      parsed.reply || "Okay."
    );
  } catch (err) {
    console.error("Server error:", err);

    return sendJudgeResponse(
      res,
      false,
      "Sorry, I changed my mind. I'll pass."
    );
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`AI judge backend running on port ${PORT}`);
});
