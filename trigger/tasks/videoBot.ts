import { task } from "@trigger.dev/sdk/v3";
import { GoogleGenAI } from "@google/generative-ai";
import { fal } from "@fal-ai/client";
import edge_tts from "edge-tts-api"; 
import FormData from "form-data";
import fetch from "node-fetch";

export const generateRedditShort = task({
  id: "generate-reddit-short",
  run: async (payload: { topic: string }) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Write a dramatic Reddit story about "${payload.topic}" for a 45-second YouTube Short. 
    Break it into exactly 4 short sentences. For each sentence, provide a highly detailed illustration prompt.
    The style MUST be: "2D digital art, webtoon manhwa style, cel-shaded anime animation art, clean line art, vibrant and high contrast colors, expressive characters."
    Respond ONLY in strict JSON format: { "story": [{"text": "sentence", "imagePrompt": "prompt"}] }`;

    const aiResponse = await model.generateContent(prompt);
    const data = JSON.parse(aiResponse.response.text());

    const imageUrls = [];
    const audioUrls = [];

    for (let i = 0; i < data.story.length; i++) {
      const imageResult: any = await fal.subscribe("fal-ai/flux/schnell", {
        input: { prompt: data.story[i].imagePrompt, image_size: "1080x1920" },
      });
      imageUrls.push(imageResult.images[0].url);

      const audioUrl = edge_tts.getAudioUrl({
        text: data.story[i].text,
        voice: "en-US-ChristopherNeural", 
      });
      audioUrls.push(audioUrl);
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    
    // Yahan backend images aur audio ko automatic combine karke seedhe link bot ko bhejega
    const messageText = `🎬 Teri Automatic Reddit Short ke Assets Ready Hain!\n\nTopic: ${payload.topic}\n\nPhoto 1: ${imageUrls[0]}\nAudio 1: ${audioUrls[0]}`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: messageText }),
    });

    return { status: "Success" };
  },
});
      
