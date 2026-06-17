import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Lazily initialize server-side Gemini client
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
}

export default async function handler(req: any, res: any) {
  // Only allow POST request
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { text, image, readingLevel } = req.body;

    if (!ai) {
      if (process.env.GEMINI_API_KEY) {
        ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            }
          }
        });
      } else {
        return res.status(500).json({
          error: "Gemini API client is not configured on this server. Please provide a GEMINI_API_KEY."
        });
      }
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
    
    6. CLINICAL BOUNDARIES & UNSUPPORTED REQUESTS:
       - If the user provides a request that asks for direct symptom diagnosis, symptom triaging, writing or copying a medical prescription, ordering laboratory tests, recommending specific medical dosages, or any clinical action that violates consumer self-education (e.g. asking "can you diagnose me?", "write me a prescription for penicillin", "what's my symptom chest pain mean?", etc.), you MUST set:
         * "unsupportedRequestDetected" to true.
         * "unsupportedRequestTitle" to a friendly direct title (e.g., "Educational Use & Prescription Policy").
         * "unsupportedRequestMessage" to a direct, yet extremely friendly, respectful, and comforting explanation of why we cannot diagnose conditions or prescribe medications (e.g., noting that SimplyHealth is an educational health literacy tool, and advising them to consult their General Practitioner or local healthcare team for clinical diagnostics).
       - If the request is a standard translation of a medical document (e.g. discharge summary, referral letter, lab test results), set "unsupportedRequestDetected" to false, "unsupportedRequestTitle" to "", and "unsupportedRequestMessage" to "".

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
    - "unsupportedRequestDetected": Boolean indicating whether the request is asking for an unallowed clinical service (like prescribing or diagnosing).
    - "unsupportedRequestTitle": Clear friendly title explaining the warning. Keep empty if not triggered.
    - "unsupportedRequestMessage": Friendly professional reassurance explaining the limitations of the educational service. Keep empty if not triggered.
    
    Ensure that the response structure perfectly matches the schema requirements. Return ONLY valid JSON.
    `;

    let response = null;
    let lastErr = null;
    const modelsToTry = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-3.5-flash", "gemini-flash-latest"];

    for (const modelName of modelsToTry) {
      let attempts = 0;
      const maxAttempts = 3; // 1 initial try + 2 retries
      while (attempts < maxAttempts) {
        try {
          attempts++;
          console.log(`Processing translation request with model: ${modelName} (Attempt ${attempts}/${maxAttempts})`);
          response = await ai.models.generateContent({
            model: modelName,
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
                  },
                  unsupportedRequestDetected: {
                    type: Type.BOOLEAN,
                    description: "True if user is asking for a prescription, diagnosis, symptom triaging, or clinical advice. False otherwise."
                  },
                  unsupportedRequestTitle: {
                    type: Type.STRING,
                    description: "A clear, reassuring title if unsupportedRequestDetected is true."
                  },
                  unsupportedRequestMessage: {
                    type: Type.STRING,
                    description: "A friendly, direct, reassuring explanation of clinical boundaries."
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
                  "urgencyReasoning",
                  "unsupportedRequestDetected",
                  "unsupportedRequestTitle",
                  "unsupportedRequestMessage"
                ]
              }
            }
          });
          if (response) {
            break;
          }
        } catch (err: any) {
          console.error(`Error querying Gemini model ${modelName} on attempt ${attempts} in serverless api:`, err);
          lastErr = err;
          if (attempts < maxAttempts) {
            const backoffTime = attempts * 1000;
            console.log(`Waiting ${backoffTime}ms before retrying ${modelName}...`);
            await new Promise((resolve) => setTimeout(resolve, backoffTime));
          }
        }
      }
      if (response) {
        break;
      }
    }

    if (!response) {
      throw lastErr || new Error("Failed to get response from any configured Gemini models.");
    }

    const responseText = response.text;
    if (!responseText) {
      return res.status(500).json({ error: "No response was generated by the translation model." });
    }

    // Try parsing the JSON to verify integrity
    try {
      const parsedData = JSON.parse(responseText);
      return res.json(parsedData);
    } catch (parseErr) {
      console.error("JSON Parse Error on Gemini output in serverless api:", parseErr);
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
        urgencyReasoning: "We simplified your medical information as best as possible, but please talk with your healthcare provider.",
        unsupportedRequestDetected: false,
        unsupportedRequestTitle: "",
        unsupportedRequestMessage: ""
      });
    }
  } catch (error: any) {
    console.error("API Error in translate serverless handler:", error);
    return res.status(500).json({
      error: error.message || "An error occurred during medical jargon translation."
    });
  }
}
