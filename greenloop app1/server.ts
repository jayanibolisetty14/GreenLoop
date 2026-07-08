import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limit for base64 images
app.use(express.json({ limit: "10mb" }));

// Initialize AI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Classify waste using AI API
app.post("/api/classify", async (req, res) => {
  try {
    const { image } = req.body; // base64 representation of the image, e.g., "data:image/jpeg;base64,..."
    if (!image) {
      return res.status(400).json({ error: "Missing image in request body." });
    }

    // Parse base64 string
    const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    let mimeType = "image/jpeg";
    let base64Data = image;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    const promptText = `
      You are an expert waste classification model. Analyze the provided image.
      Classify the image into exactly one of these categories:
      - "human": if a person, face, or human body is the primary subject of the image.
      - "biodegradable": if the image contains organic kitchen or garden waste such as vegetable skins, fruit scraps, left-over meals, garden weeds/leaves, paper bags, or cardboard.
      - "non-biodegradable": if the image contains plastics, metals, glass, aluminum, cans, bottles, batteries, styrofoam, or other inorganic materials.

      If classified as "biodegradable", assign one of these subcategories:
      - "Vegetable Waste"
      - "Fruit Waste"
      - "Food Waste"
      - "Garden Waste"
      - "Paper"
      If not biodegradable, or if no specific subcategory fits, return null.

      Provide a clear explanation/reason for your decision. Keep it concise, helpful, and friendly.
    `;

    const textPart = { text: promptText };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: "Must be exactly: 'human', 'biodegradable', or 'non-biodegradable'",
            },
            subcategory: {
              type: Type.STRING,
              description: "Must be: 'Vegetable Waste', 'Fruit Waste', 'Food Waste', 'Garden Waste', 'Paper', or null",
            },
            reason: {
              type: Type.STRING,
              description: "Explanation of why this waste belongs in this category and any recycling/bioreactor tips.",
            },
          },
          required: ["category", "subcategory", "reason"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Empty response from AI.");
    }

    const classificationResult = JSON.parse(resultText.trim());
    return res.json(classificationResult);
  } catch (error: any) {
    return res.status(500).json({
      error: "Failed to classify image",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

// Configure Vite or Static Asset Serving
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Setting up Vite Dev Server Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production files from dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GreenLoop Server running on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
