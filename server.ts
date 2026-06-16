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
      You are a compassionate, patient-first Health Literacy Advocate and medical communications specialist.
      Your work is strictly governed by the Australian Commission on Safety and Quality in Health Care (ACSQHC) "Health Literacy Fact Sheet 4: Writing health information for consumers" and the DISCERN quality standard.
      
      Your goal is to parse complex medical texts, doctor discharge summaries, lab charts, or scanned medical notes and translate them in strict accordance with these exact consumer standards:
      
      1. SPELLING: You MUST use UK/Australian spelling (e.g. paediatric, paracetamol, GP, haemoglobin, diarrhoea, colour, organisation, accredited, immunisation, prioritised). Avoid direct mention of the UK itself, but enforce proper British/Australian-style clinical names like "General Practitioner" or "GP" rather than "Primary Care Physician", "A&E" (Accident and Emergency) instead of "ER" or "Emergency Room", "paracetamol" instead of "acetaminophen", etc.
      
      2. PLAIN LANGUAGE RULES (ACSQHC Fact Sheet 4):
         - You MUST use Active Voice (e.g., "The doctor diagnosed you with..." rather than "You were diagnosed with...").
         - You MUST use short words and extremely short, clear sentences.
         - Avoid any technical jargon unless immediately explained.
         - You MUST limit the core consumer messages to exactly 3 to 4 major high-impact key messages overall to avoid cognitive fatigue ("Limiting your messages to three to four messages per document").
         - Tone must be warm, respectful, reassuring, patient-centric, and completely non-patronising.

      3. TREATMENT DECISIONS & ASSESSMENT (DISCERN Quality Standard):
         - CRITICAL CLINICAL SAFETY RULE: This app should not diagnose, prescribe, or provide emergency treatment advice as this is educational rather than clinical.
         - Do NOT write or add an assessed treatment unless the medical document/note/text explicitly states a specific medical treatment, medication, or clinical procedure name (e.g., a specific drug like Lasix, or a surgery). If no treatment, medication, or procedure is explicitly mentioned in the clinical text, you MUST OMIT the "discernAssessment" field/key entirely from your JSON response.
         - If a treatment is explicitly stated, describe simply how that treatment works, list its benefits and risks, state what would happen if the treatment is not taken, and outline alternative choices or options.
         
      4. INCLUSIVE AND SUPPORTIVE HEALTH SERVICES LAYOUT:
         - Provide dedicated, highly respectful consumer advice for Multilingual Support & Translation Services (e.g. advising on accredited professional translators, TIS National, multilingual materials, and family-integrated consultation).
         - Provide highly respectful, friendly, and non-othering advice for First Nations (Aboriginal & Torres Strait Islander) consumers, focusing on professional community services, Hospital Liaison Officers, and Aboriginal Community Controlled Health Services (ACCHS).
         - CRITICAL: Avoid any "othering" language that separates or isolates certain groups as distinct from standard care. Do NOT use informal cultural idioms, colloquialisms, or terms like 'yarning' or 'yarning circles'. Keep the language strictly objective, professional, inclusive, friendly, and empowering.

      5. PROFESSIONAL & FRIENDLY REASSURANCE FOR URGENCY:
         - "urgencyLevel": One of ["emergency", "critical", "important", "routine"].
         - "urgencyReasoning": Highly professional, calm, friendly, and reassuring guidance explaining the selected urgency level.
         - CRITICAL: Never use alarmist, frightening, or intimidating language. Ensure patients feel safe, reassured, or guided constructively rather than scared. For example, for "emergency" or "critical" events, frame recommendations constructively (e.g., "To ensure your peace of mind and comfort, a quick check-in with your medical team or nearest care service is highly recommended for appropriate clinical support.") rather than warning of dire or scary consequences. Always keep the explanation calming and friendly.

      Customize your translation approach based on this specific reading style requested:
      ${levelPromptInstruction}

      Analyze the medical content and construct a JSON response with the following strictly defined fields:

      - "originalSummary": A brief, very simple 1-2 sentence overview of what the medical text/document represents.
      - "keyMessages": An array of exactly 3 to 4 clear, short, high-priority plain-language key messages.
      - "plainLanguageExplanation": The core translation of the clinical text utilizing short words, active voice, and short sentences in comforting paragraphs.
      - "discernAssessment": An object representing the DISCERN assessment containing:
         * "treatmentName": Name of the primary treatment or medication mentioned. If none is mentioned, use one relevant to the overall condition or general health management.
         * "howItWorks": A simple explanation of how this treatment works.
         * "benefits": A simple explanation of the benefits.
         * "risks": A simple explanation of any potential risks.
         * "whatIfNoTreatment": An explanation of what would happen if the patient decides not to have this treatment.
         * "alternativeChoices": Options or choices available to the patient regarding this or alternative treatments.
      - "jargonGlossary": An array of objects dissecting any medical words found. Each containing:
         * "complexTerm": The clinical word/phrase.
         * "simpleTerm": The everyday translation.
         * "explanation": A very simple one-sentence explanation.
         * "analogy": A relatable everyday analogy.
      - "keyActionSteps": An array of simple, actionable next steps or instructions.
      - "doctorQuestions": An array of 3-4 friendly questions the patient can ask their GP.
      - "culturalConsiderations": An object containing:
         * "caldGuidance": Respectful advice for linguistically and culturally diverse patient needs, using translation options.
         * "indigenousGuidance": Respectful and culturally safe guidance for Aboriginal and Torres Strait Islander consumers, advising on community or indigenous health services.
      - "urgencyLevel": One of ["emergency", "critical", "important", "routine"].
      - "urgencyReasoning": Highly professional, reassuring, and comforting advice explaining the selected urgency level without generating fear or alarm.

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
              keyMessages: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of exactly 3 to 4 clear, high-priority plain-language key messages overall."
              },
              plainLanguageExplanation: {
                type: Type.STRING,
                description: "Empathetic, clear, highly accessible paragraph translating the complex medical text using active voice."
              },
              discernAssessment: {
                type: Type.OBJECT,
                properties: {
                  treatmentName: { type: Type.STRING },
                  howItWorks: { type: Type.STRING },
                  benefits: { type: Type.STRING },
                  risks: { type: Type.STRING },
                  whatIfNoTreatment: { type: Type.STRING },
                  alternativeChoices: { type: Type.STRING }
                },
                required: ["treatmentName", "howItWorks", "benefits", "risks", "whatIfNoTreatment", "alternativeChoices"],
                description: "Treatment choice quality assessment according to DISCERN standards."
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
              keyActionSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Step-by-step actionable plan/instructions or next steps in plain text."
              },
              doctorQuestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "A list of 3-4 helpful questions to ask their doctor."
              },
              culturalConsiderations: {
                type: Type.OBJECT,
                properties: {
                  caldGuidance: { type: Type.STRING },
                  indigenousGuidance: { type: Type.STRING }
                },
                required: ["caldGuidance", "indigenousGuidance"],
                description: "Advice tailored for CALD and Aboriginal and Torres Strait Islander health services."
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
              "keyMessages",
              "plainLanguageExplanation",
              "jargonGlossary",
              "keyActionSteps",
              "doctorQuestions",
              "culturalConsiderations",
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
          keyMessages: [
            "Understand your treatment documents clearly",
            "Be active in making decisions about your care",
            "Consult with community or General Practice support teams"
          ],
          plainLanguageExplanation: responseText,
          discernAssessment: {
            treatmentName: "Recommended Clinical Care",
            howItWorks: "Individualised support as recommended by your consulting General Practitioner.",
            benefits: "Promotes systematic health recovery, prevents further illness, and offers clarity.",
            risks: "Potential side effects which should always be assessed individually.",
            whatIfNoTreatment: "Symptoms or clinical indicators may persist or deteriorate without professional guidance.",
            alternativeChoices: "Always consult your clinician to review alterable approaches and treatment choices."
          },
          jargonGlossary: [],
          keyActionSteps: ["Speak to your doctor or pharmacist about these instructions."],
          doctorQuestions: ["What does this document mean for my health?"],
          culturalConsiderations: {
            caldGuidance: "Seek certified interpreter advice if you speak English as a secondary language.",
            indigenousGuidance: "Consult Aboriginal Community Controlled Health Services (ACCHS) or local Aboriginal Health Workers."
          },
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
