import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Maximize request body limits to allow base64 images of medical notes
  app.use(express.json({ limit: "20mb" }));
  app.use(express.urlencoded({ limit: "20mb", extended: true }));

  // Initialize server-side Gemini client safely
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("Warning: GEMINI_API_KEY environment variable is not defined.");
  }

  // API endpoints

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", geminiConfigured: !!ai });
  });

  // Health Translator translation endpoint
  app.post("/api/translate", async (req: express.Request, res: express.Response) => {
    try {
      const { text, image, readingLevel } = req.body;

      if (!ai) {
        return res.status(500).json({
          error: "Gemini API client is not configured on this server. Please provide a GEMINI_API_KEY."
        });
      }

      if (!text && !image) {
        return res.status(400).json({
          error: "Please enter some medical text or upload an image to translate."
        });
      }

      let userContentParts: any[] = [];

      // If text is provided, add it as a text part
      if (text) {
        userContentParts.push({ text: `Patient's medical text to translate/simplify:\n${text}` });
      }

      // If base64 image is provided, parse and add it as an inlineData part
      if (image && image.data && image.mimeType) {
        // Strip data prefix if present (e.g. "data:image/png;base64,")
        let base64Data = image.data;
        if (base64Data.includes(";base64,")) {
          base64Data = base64Data.split(";base64,")[1];
        }
        
        userContentParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: base64Data
          }
        });
        userContentParts.push({ text: "Here is an image of the medical notes, lab report, discharge papers, or medication bottle. Please extract the medical text from this image and translate/simplify it." });
      }

      // Define standard level descriptions
      let levelPromptInstruction = "";
      if (readingLevel === "very-simple") {
        levelPromptInstruction = `
        - Target Reading Level: Basic/Child-Like simplicity (around 4th to 5th grade reading level).
        - Use ultra-simple terminology and extremely short sentences.
        - Avoid ANY medical terminology unless absolutely essential, and if mentioned, explain it with extremely fun or relatable everyday analogies.
        - Speak like a friendly primary school coach or a highly reassuring family helper.
        `;
      } else if (readingLevel === "simple-english") {
        levelPromptInstruction = `
        - Target Reading Level: Simplified English for non-native English speakers or ESL users.
        - Use highly common, foundational verbs and nouns. Avoid complex idioms, advanced slang, phrasal verbs, or cultural metaphors.
        - State instructions absolutely literally and directly.
        - Keep the grammatical structure simple (Subject-Verb-Object). No compound-complex sentences.
        `;
      } else {
        // friendly-plain (default)
        levelPromptInstruction = `
        - Target Reading Level: Friendly, general plain language (approx. 7th to 8th grade reading level).
        - Suitable for older adults and the general public.
        - Warm, compassionate, conversational tone. Explains terms immediately in logical sentences.
        `;
      }

      const systemInstruction = `
      You are a compassionate, patient-first British Health Literacy Advocate and medical communications specialist.
      Your goal is to parse medical data (which might contain messy handwriting scan text or highly technical doctor jargon) and deliver a soothing, accessible, and crystal-clear explanation suitable for patients with low health literacy or cognitive fatigue.

      RULES:
      1. LANGUAGE: You MUST strictly use British English (UK English) spelling and medical vocabulary across all fields. This includes spelling like "paediatric", "haemoglobin", "anaemia", "analysed", "oesophagus", "diarrhoea", "tumour", "colour", "centre". Use "paracetamol" instead of "acetaminophen", "GP" or "General Practitioner" instead of "Primary Care Physician" or "Doctor", and "A&E" (Accident & Emergency) instead of "ER" or "Emergency Room".
      2. TONE: Warm, highly respectful, empathetic, non-judgmental, reassuring, and patient-centred. Always refer to the patient as "you" or with direct warm verbs. Never use technical jargon without immediately explaining it.
      3. PERSUASIVE DISCLAIMER: You must gently remind patients that this translated summary is purely for education to help them understand, and it must NEVER replace their clinical specialist or physician's instructions.
      4. HIGH RISK ADVICE: If the text suggests critical symptoms, highlight an emergency alert clearly in the response.

      Customize your translation approach based on this specific reading style requested:
      ${levelPromptInstruction}

      Analyze the medical content and construct a JSON response with the following strictly defined fields:

      - "originalSummary": A brief, very simple 1-2 sentence overview of what the medical text/document is (e.g., "This is a record from your heart doctor visit on March 14th.").
      - "plainLanguageExplanation": The core translation of the diagnosis, test results, or doctor's summary in direct, comforting, easy-to-read paragraphs.
      - "keyActionSteps": An array of clear, simple, numbered actionable instructions (e.g., "1. Take the white pill with breakfast daily."). If no specific action steps are needed, provide helpful health tips or preventative advice based on the context.
      - "jargonGlossary": An array of objects dissecting the complex medical terms found in the input. Each object MUST contain:
         * "complexTerm": The original complex medical term (e.g., "Hypertension").
         * "simpleTerm": The simple everyday term (e.g., "High blood pressure").
         * "explanation": A one-sentence simple explanation of why it happens.
         * "analogy": A relatable analogy explaining the concept (e.g., "Like a garden hose turned up too high, which puts extra stretch on the pipe.").
      - "doctorQuestions": An array of 3-4 friendly, low-stress questions the patient can copy/print and ask their doctor to advocate for themselves (e.g., "Will this test hurt?", "What is this medication supposed to fix?").
      - "urgencyLevel": One of ["emergency", "critical", "important", "routine"].
      - "urgencyReasoning": A friendly explanation of why that urgency level is selected and what response is expected (e.g., "This is a routine follow-up. You do not need to call the duty nurse unless you feel sudden dizzy spells.").

      Ensure that the response structure perfectly matches the schema requirements. Return ONLY valid JSON.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userContentParts,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              originalSummary: {
                type: Type.STRING,
                description: "Brief simple 1-2 sentence overview of what this document represents."
              },
              plainLanguageExplanation: {
                type: Type.STRING,
                description: "Empathetic, clear, highly accessible paragraph translating the complex medical text."
              },
              keyActionSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Step-by-step actionable plan/instructions or next steps in plain text."
              },
              jargonGlossary: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    complexTerm: { type: Type.STRING },
                    simpleTerm: { type: Type.STRING },
                    explanation: { type: Type.STRING },
                    analogy: { type: Type.STRING }
                  },
                  required: ["complexTerm", "simpleTerm", "explanation", "analogy"]
                },
                description: "Glossary listing medical dictionary words, their simple definitions, and everyday analogies."
              },
              doctorQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A list of 3-4 helpful questions to ask their doctor."
              },
              urgencyLevel: {
                type: Type.STRING,
                description: "Must be 'emergency', 'critical', 'important', or 'routine'."
              },
              urgencyReasoning: {
                type: Type.STRING,
                description: "Friendly reassurance or action-seeking advice explaining the urgency level."
              }
            },
            required: [
              "originalSummary",
              "plainLanguageExplanation",
              "keyActionSteps",
              "jargonGlossary",
              "doctorQuestions",
              "urgencyLevel",
              "urgencyReasoning"
            ]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        return res.status(500).json({ error: "No response was generated by the translation model." });
      }

      // Try parsing the JSON to verify integrity
      try {
        const parsedData = JSON.parse(responseText);
        return res.json(parsedData);
      } catch (parseErr) {
        console.error("JSON Parse Error on Gemini output:", parseErr);
        console.log("Raw output was:", responseText);
        return res.json({
          originalSummary: "Translated Medical Information",
          plainLanguageExplanation: responseText,
          keyActionSteps: ["Speak to your doctor or pharmacist about these instructions."],
          jargonGlossary: [],
          doctorQuestions: ["What does this document mean for my health?"],
          urgencyLevel: "routine",
          urgencyReasoning: "We simplified your medical information as best as possible, but please talk with your healthcare provider."
        });
      }
    } catch (error: any) {
      console.error("API Error in translate:", error);
      res.status(500).json({
        error: error.message || "An error occurred during medical jargon translation."
      });
    }
  });

  // Integrate Vite dynamically based on environment
  if (process.env.NODE_ENV !== "production") {
    console.log("Development Mode: Loading Vite Server Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Production Mode: Serving static assets from dist folder...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express medical translator server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Fatal: failed to start the server", err);
});
