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
      model: "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            'You are judging a Roblox minigame answer. The player is trying to convince an NPC customer to buy from their stand. Return ONLY valid JSON like {"accepted":true,"reply":"short NPC reply"}. Accept answers with a real reason to buy, such as quality, price, taste, freshness, speed, friendliness, uniqueness, cleanliness, special deals, or good service. Reject spam, begging, threats, insults, random letters, empty answers, or answers that do not explain why the stand is worth buying from. Keep the reply short, friendly, and appropriate for all ages.',
        },
        {
          role: "user",
          content:
            `Player ${username || "Unknown"} answered:\n` +
            `"${answer}"\n\n` +
            `Should the NPC buy from the stand?`,
        },
      ],
      text: {
        format: {
          type: "json_object",
        },
      },
    });

    let parsed;

    try {
      parsed = JSON.parse(response.output_text || "{}");
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