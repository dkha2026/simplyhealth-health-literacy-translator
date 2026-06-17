import React, { useState, useRef, useEffect } from "react";
import { 
  FileText, 
  Upload, 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Eye, 
  BookOpen, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  FileCheck, 
  Maximize2, 
  Clipboard, 
  Printer, 
  Activity, 
  UserPlus, 
  Info, 
  Check, 
  X,
  Type as FontIcon,
  Heart,
  FileImage,
  ArrowRight,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Scale,
  Globe,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { jsPDF } from "jspdf";

// Types for the translator output
interface JargonItem {
  complexTerm: string;
  simpleTerm: string;
  explanation: string;
  analogy: string;
}

interface DiscernTreatmentAssessment {
  treatmentName: string;
  howItWorks: string;
  benefits: string;
  risks: string;
  whatIfNoTreatment: string;
  alternativeChoices: string;
}

interface CulturalConsiderations {
  caldGuidance: string;
  indigenousGuidance: string;
}

interface TranslationResult {
  originalSummary: string;
  keyMessages: string[];
  plainLanguageExplanation: string;
  discernAssessment?: DiscernTreatmentAssessment;
  jargonGlossary: JargonItem[];
  keyActionSteps: string[];
  doctorQuestions: string[];
  culturalConsiderations: CulturalConsiderations;
  urgencyLevel: 'emergency' | 'critical' | 'important' | 'routine';
  urgencyReasoning: string;
  unsupportedRequestDetected?: boolean;
  unsupportedRequestTitle?: string;
  unsupportedRequestMessage?: string;
}

export default function App() {
  // Input states
  const [inputText, setInputText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [readingLevel, setReadingLevel] = useState<"very-simple" | "friendly-plain" | "simple-english">("friendly-plain");
  
  // Accessibility and theme states
  const [darkMode, setDarkMode] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

  // Toggle states for output sections
  const [keyMessagesOpen, setKeyMessagesOpen] = useState(false);
  const [plainTranslationOpen, setPlainTranslationOpen] = useState(false);
  const [discernAssessmentOpen, setDiscernAssessmentOpen] = useState(false);
  const [actionStepsOpen, setActionStepsOpen] = useState(false);
  const [jargonGlossaryOpen, setJargonGlossaryOpen] = useState(false);
  const [doctorQuestionsOpen, setDoctorQuestionsOpen] = useState(false);
  const [culturalConsiderationsOpen, setCulturalConsiderationsOpen] = useState(false);
  const [urgencyOpen, setUrgencyOpen] = useState(false);

  // App running states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<TranslationResult | null>(null);

  // Text to speech (TTS) states
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Drag and drop file drop state
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset all steps checked and collapse sections when translation results change
  useEffect(() => {
    setCompletedSteps({});
    setKeyMessagesOpen(false);
    setPlainTranslationOpen(false);
    setDiscernAssessmentOpen(false);
    setActionStepsOpen(false);
    setJargonGlossaryOpen(false);
    setDoctorQuestionsOpen(false);
    setCulturalConsiderationsOpen(false);
    setUrgencyOpen(false);
  }, [results]);

  // Handle Drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Process dropped/selected list of files (supporting PNG, JPG, JPEG, DOC, and PDF)
  const processImage = (file: File) => {
    const validExtensions = [".png", ".jpg", ".jpeg", ".doc", ".docx", ".pdf"];
    const fileNameLower = file.name.toLowerCase();
    const isValidExt = validExtensions.some(ext => fileNameLower.endsWith(ext));
    const isValidMime = file.type.startsWith("image/") || 
                        file.type === "application/pdf" || 
                        file.type === "application/msword" || 
                        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (!isValidExt && !isValidMime) {
      setErrorMessage("Please upload a valid file type: PNG, JPG, JPEG, DOC, or PDF.");
      return;
    }
    setImageFile(file);
    setErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImage(e.dataTransfer.files[0]);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImage(e.target.files[0]);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetApplication = () => {
    setInputText("");
    clearImage();
    setResults(null);
    setErrorMessage(null);
    setCompletedSteps({});
    
    // Stop any speech synthesis if running
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
    
    // Reset toggle states to collapsed
    setKeyMessagesOpen(false);
    setPlainTranslationOpen(false);
    setDiscernAssessmentOpen(false);
    setActionStepsOpen(false);
    setJargonGlossaryOpen(false);
    setDoctorQuestionsOpen(false);
    setCulturalConsiderationsOpen(false);
    setUrgencyOpen(false);
  };

  // Convert reading levels into human readable descriptions
  const getReadingLevelLabel = (level: string) => {
    switch (level) {
      case "very-simple":
        return "Very Simple (Age ~10 or Analogies)";
      case "simple-english":
        return "Simple English (For Non-Native Speakers)";
      default:
        return "Friendly Plain (Recommended or Everyday)";
    }
  };

  // Main readable standard font class for accessibility
  const getFontClass = () => {
    return "text-base md:text-lg leading-relaxed font-normal text-slate-800 dark:text-slate-100";
  };

  // Web Speech Synthesis (Read Aloud) controller
  const handleReadAloud = () => {
    if (!results) return;

    if (!('speechSynthesis' in window)) {
      alert("Text-to-speech is not supported in this browser. Please open the app in a modern web browser.");
      return;
    }

    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
      return;
    }

    // Build complete narrative for translation output
    const readNarrative = `
      Here is your health breakdown.
      Summary: ${results.originalSummary}.
      ${results.keyMessages && results.keyMessages.length > 0 ? "Key Messages: " + results.keyMessages.join(". ") : ""}
      Explanation: ${results.plainLanguageExplanation}.
      Key Action Steps you should follow: ${results.keyActionSteps.join(". ")}.
      Urgency Information: ${results.urgencyReasoning}.
      Please remember to consult with your General Practitioner or local healthcare team about these results.
    `;

    // Reset synthesis queue
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(readNarrative);
    // Slightly slower reading for older adults and non-native speakers
    utterance.rate = 0.88; 
    utterance.pitch = 1.0;

    // Discover natural sounding English voices
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Natural")) 
      || voices.find(v => v.lang.startsWith("en")) 
      || voices[0];
    
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
    setIsPaused(false);
  };

  const stopReading = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setIsPaused(false);
    }
  };

  // Call Express Translator backend under /api/translate
  const startTranslation = async () => {
    setErrorMessage(null);
    setIsAnalyzing(true);
    // Stop any speech playing to avoid confusion
    stopReading();

    if (!inputText.trim() && !imagePreview) {
      setErrorMessage("Please type some medical instructions, paste clinical discharge summaries, or upload a photo of medical notes.");
      setIsAnalyzing(false);
      return;
    }

    try {
      const payload: any = {
        text: inputText,
        readingLevel: readingLevel
      };

      if (imagePreview) {
        payload.image = {
          data: imagePreview,
          mimeType: imageFile?.type || "image/jpeg"
        };
      }

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned error status ${response.status}`);
      }

      const data: TranslationResult = await response.json();
      setResults(data);
    } catch (err: any) {
      console.error("Translation fail:", err);
      setErrorMessage(err.message || "Something went wrong while simplifying your medical document. Please check your network or try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle printing of the simplified note for user's pocket/fridge/doctor's visit
  const handlePrint = () => {
    window.print();
  };

  // Generate and download a highly structured PDF file of the translation results
  const downloadPDF = () => {
    if (!results) return;

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageHeight = 297;
      const pageWidth = 210;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let y = 20;

      // Helper to add new page if content overflows
      const checkPageBreak = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - margin) {
          doc.addPage();
          drawHeader();
          y = 25; // Reset y for new page
        }
      };

      // Header drawing helper
      const drawHeader = () => {
        // App header banner color
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.rect(margin, y, contentWidth, 2, "F");
        y += 6;
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(110, 110, 110);
        doc.text("PATIENT CARE GUIDE & TRANSLATION", margin, y);
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8);
        doc.text("Australian Communication Safety Guidelines", pageWidth - margin, y, { align: "right" });
        y += 4;
        
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;
      };

      // Draw initial header
      drawHeader();

      // Title
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      const titleLines = doc.splitTextToSize(results.originalSummary || "Medical Document Summary", contentWidth);
      titleLines.forEach((line: string) => {
        checkPageBreak(8);
        doc.text(line, margin, y);
        y += 7;
      });
      y += 3;

      // Urgency Box configuration
      const urgencyMap = {
        emergency: { text: "EMERGENCY CARE", bg: [236, 253, 245], textClr: [11, 45, 34], border: [16, 185, 129] },
        critical: { text: "CRITICAL ACTION REQUIRED", bg: [240, 253, 250], textClr: [11, 37, 34], border: [20, 184, 166] },
        important: { text: "IMPORTANT", bg: [236, 253, 245], textClr: [6, 78, 59], border: [110, 231, 183] },
        routine: { text: "ROUTINE CARE & HEALTH", bg: [241, 245, 249], textClr: [51, 65, 85], border: [226, 232, 240] }
      };

      const urgencyInfo = urgencyMap[results.urgencyLevel] || urgencyMap.routine;
      
      checkPageBreak(25);
      const reasoningLines = doc.splitTextToSize(results.urgencyReasoning || "", contentWidth - 8);
      const boxHeight = 10 + (reasoningLines.length * 5);
      
      doc.setFillColor(urgencyInfo.bg[0], urgencyInfo.bg[1], urgencyInfo.bg[2]);
      doc.setDrawColor(urgencyInfo.border[0], urgencyInfo.border[1], urgencyInfo.border[2]);
      doc.rect(margin, y, contentWidth, boxHeight, "DF");
      
      const boxY = y;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(urgencyInfo.textClr[0], urgencyInfo.textClr[1], urgencyInfo.textClr[2]);
      doc.text(`STATUS: ${urgencyInfo.text}`, margin + 4, boxY + 5);
      
      doc.setFont("Helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(40, 40, 40);
      let reasonY = boxY + 10;
      reasoningLines.forEach((line: string) => {
        doc.text(line, margin + 4, reasonY);
        reasonY += 4.5;
      });
      
      y += boxHeight + 8;

      // Section drawing helper
      const addSectionHeader = (title: string) => {
        checkPageBreak(15);
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(16, 185, 129); // Emerald-500
        doc.text(title.toUpperCase(), margin, y);
        y += 4;
        
        doc.setDrawColor(16, 185, 129);
        doc.line(margin, y, margin + 20, y);
        y += 6;
      };

      // 1. Key Takeaways
      if (results.keyMessages && results.keyMessages.length > 0) {
        addSectionHeader("1. Key Takeaways");
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        
        results.keyMessages.forEach((msg, idx) => {
          const text = `${idx + 1}. ${msg}`;
          const wrapped = doc.splitTextToSize(text, contentWidth);
          checkPageBreak(wrapped.length * 5 + 3);
          wrapped.forEach((line: string) => {
            doc.text(line, margin, y);
            y += 5;
          });
          y += 2.5;
        });
        y += 4;
      }

      // 2. Plain Language Explanation
      if (results.plainLanguageExplanation) {
        addSectionHeader("2. Simplified Clinical Explanation");
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        
        const paragraphs = results.plainLanguageExplanation.split('\n\n');
        paragraphs.forEach((p) => {
          if (!p.trim()) return;
          const lines = doc.splitTextToSize(p, contentWidth);
          checkPageBreak(lines.length * 5 + 6);
          lines.forEach((line: string) => {
            doc.text(line, margin, y);
            y += 5;
          });
          y += 4;
        });
        y += 2;
      }

      // 3. Recommended Action Plan
      if (results.keyActionSteps && results.keyActionSteps.length > 0) {
        addSectionHeader("3. Recommended Action Plan");
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        
        results.keyActionSteps.forEach((step) => {
          checkPageBreak(10);
          doc.setDrawColor(180, 180, 180);
          doc.rect(margin, y - 3, 3.5, 3.5, "S");
          
          const wrapped = doc.splitTextToSize(step, contentWidth - 8);
          wrapped.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin + 6, y);
            y += 5;
          });
          y += 2.5;
        });
        y += 4;
      }

      // 4. Treatment Assessment Profile (DISCERN)
      if (results.discernAssessment) {
        const da = results.discernAssessment;
        addSectionHeader("4. Treatment Assessment Profile");
        
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`Assessed Treatment: ${da.treatmentName}`, margin, y);
        y += 6;

        const subSections = [
          { label: "How It Works", txt: da.howItWorks },
          { label: "Benefits", txt: da.benefits },
          { label: "Risks & Considerations", txt: da.risks },
          { label: "What happens if not taken?", txt: da.whatIfNoTreatment },
          { label: "Alternative choices", txt: da.alternativeChoices }
        ];

        subSections.forEach((sub) => {
          if (!sub.txt) return;
          checkPageBreak(12);
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(50, 50, 50);
          doc.text(`• ${sub.label}`, margin, y);
          y += 4.5;
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(70, 70, 70);
          const wrapped = doc.splitTextToSize(sub.txt, contentWidth - 6);
          wrapped.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin + 4, y);
            y += 4.5;
          });
          y += 3;
        });
        y += 4;
      }

      // 5. Healthcare Jargon Decoder
      if (results.jargonGlossary && results.jargonGlossary.length > 0) {
        addSectionHeader("5. Healthcare Jargon Decoder");
        
        results.jargonGlossary.forEach((item) => {
          checkPageBreak(25);
          doc.setFillColor(245, 247, 250);
          doc.rect(margin, y - 3.5, contentWidth, 5.5, "F");
          
          doc.setFont("Helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(185, 28, 28);
          doc.text(`Medical Word: ${item.complexTerm}`, margin + 2, y);
          
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(16, 185, 129);
          doc.text(`Simplified: ${item.simpleTerm}`, margin + 80, y);
          y += 6;
          
          doc.setFont("Helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(40, 40, 40);
          
          const expText = `Definition: ${item.explanation}`;
          const wrappedExp = doc.splitTextToSize(expText, contentWidth - 2);
          wrappedExp.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin + 2, y);
            y += 4.5;
          });
          
          if (item.analogy) {
            const analgText = `Helper Analogy: ${item.analogy}`;
            const wrappedAnalg = doc.splitTextToSize(analgText, contentWidth - 2);
            doc.setFont("Helvetica", "oblique");
            wrappedAnalg.forEach((line: string) => {
              checkPageBreak(5);
              doc.text(line, margin + 2, y);
              y += 4.5;
            });
            doc.setFont("Helvetica", "normal");
          }
          y += 4;
        });
        y += 4;
      }

      // 6. Questions to Ask Doctor
      if (results.doctorQuestions && results.doctorQuestions.length > 0) {
        addSectionHeader("6. Questions for Doctor Check-in");
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 30);
        
        results.doctorQuestions.forEach((q) => {
          checkPageBreak(10);
          doc.setDrawColor(200, 200, 200);
          doc.rect(margin, y - 3, 3, 3, "S");
          
          const wrapped = doc.splitTextToSize(q, contentWidth - 6);
          wrapped.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin + 5, y);
            y += 5;
          });
          y += 2.5;
        });
        y += 4;
      }

      // 7. Cultural & Translation Support
      if (results.culturalConsiderations) {
        addSectionHeader("7. Cultural & Translation Services Support");
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(8.5);
        
        const cc = results.culturalConsiderations;
        
        if (cc.caldGuidance) {
          checkPageBreak(15);
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(13, 148, 136); // teal-600
          doc.text("Multilingual Support & Translation Services:", margin, y);
          y += 4.5;
          
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(50, 50, 50);
          const wrapped = doc.splitTextToSize(cc.caldGuidance, contentWidth - 4);
          wrapped.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin + 2, y);
            y += 4.5;
          });
          y += 3;
        }

        if (cc.indigenousGuidance) {
          checkPageBreak(15);
          doc.setFont("Helvetica", "bold");
          doc.setTextColor(4, 120, 87); // emerald-700
          doc.text("First Nations Supportive Health Liaison:", margin, y);
          y += 4.5;
          
          doc.setFont("Helvetica", "normal");
          doc.setTextColor(50, 50, 50);
          const wrapped = doc.splitTextToSize(cc.indigenousGuidance, contentWidth - 4);
          wrapped.forEach((line: string) => {
            checkPageBreak(5);
            doc.text(line, margin + 2, y);
            y += 4.5;
          });
          y += 3;
        }
      }

      // Footer notice
      checkPageBreak(20);
      y += 5;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      
      doc.setFont("Helvetica", "oblique");
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      
      const disclaimer = "Disclaimer: This patient care guide is a simplified plain language translation designed to support patient health literacy and clinical communication. It should be used alongside direct advice and instructions from your healthcare practitioner.";
      const wrappedDiscl = doc.splitTextToSize(disclaimer, contentWidth);
      wrappedDiscl.forEach((line: string) => {
        checkPageBreak(3.5);
        doc.text(line, margin, y);
        y += 3.5;
      });

      // Save PDF document
      const filename = `health-guide-${results.originalSummary.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`;
      doc.save(filename);

    } catch (error) {
      console.error("PDF generation failed:", error);
      setErrorMessage("Could not generate the PDF document. Please try printing to PDF instead using the Print button.");
    }
  };

  // Toggle individual checklist steps
  const toggleStep = (idx: number) => {
    setCompletedSteps(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Get color for urgency banner
  const getUrgencyClasses = (level: string) => {
    if (darkMode) {
      switch (level) {
        case "emergency":
          return "bg-emerald-950/25 border-emerald-500/40 text-slate-100 border-2 shadow-[0_0_12px_rgba(16,185,129,0.05)]";
        case "critical":
          return "bg-teal-950/25 border-teal-500/30 text-slate-100 border-2";
        case "important":
          return "bg-emerald-950/15 border-emerald-800/20 text-slate-300 border shadow-sm";
        default:
          return "bg-slate-900/40 border-slate-850 text-slate-300 border shadow-sm";
      }
    } else {
      switch (level) {
        case "emergency":
          return "bg-emerald-50 border-emerald-300 text-emerald-950 border-2";
        case "critical":
          return "bg-teal-50/70 border-teal-300 text-teal-950 border-2";
        case "important":
          return "bg-emerald-50/30 border-emerald-100 text-slate-800 border";
        default:
          return "bg-slate-50 border-slate-200 text-slate-750 border";
      }
    }
  };

  const getUrgencyIcon = (level: string) => {
    if (darkMode) {
      switch (level) {
        case "emergency":
          return <Activity className="h-6 w-6 text-emerald-400 shrink-0" />;
        case "critical":
          return <Activity className="h-6 w-6 text-teal-400 shrink-0" />;
        case "important":
          return <Heart className="h-6 w-6 text-emerald-400 shrink-0" />;
        default:
          return <CheckCircle className="h-6 w-6 text-emerald-400 shrink-0" />;
      }
    } else {
      switch (level) {
        case "emergency":
          return <Activity className="h-6 w-6 text-emerald-600 shrink-0" />;
        case "critical":
          return <Activity className="h-6 w-6 text-teal-600 shrink-0" />;
        case "important":
          return <Heart className="h-6 w-6 text-emerald-500 shrink-0" />;
        default:
          return <CheckCircle className="h-6 w-6 text-emerald-600 shrink-0" />;
      }
    }
  };

  return (
    <div className={`min-h-screen font-sans antialiased transition-colors duration-300 ${
      darkMode 
        ? "bg-slate-900 text-slate-100 selection:bg-emerald-900 selection:text-white" 
        : "bg-slate-50 text-slate-900 selection:bg-emerald-100"
    }`}>
      
      {/* Clinically Styled Header */}
      <header className={`border-b sticky top-0 z-50 transition-colors ${
        darkMode 
          ? "bg-slate-950/95 border-slate-800" 
          : "bg-white/95 backdrop-blur-md border-slate-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-wrap gap-4 items-center justify-between">
          
          {/* Logo & Clinical Badge */}
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl flex items-center justify-center ${
              darkMode ? "bg-emerald-500/20 text-emerald-400 border border-emerald-850" : "bg-emerald-600 text-white"
            }`}>
              <Activity className="h-6 w-6" id="logo-activity-icon" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className={`text-xl font-bold font-display tracking-tight ${
                  darkMode ? "text-emerald-400" : "text-slate-850"
                }`}>
                  SimplyHealth
                </h1>
              </div>
              <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-600"}`}>
                Convert complex clinical notes and health paperwork into simple, approachable language
              </p>
            </div>
          </div>

          {/* Reset Application Header Button */}
          <button
            onClick={resetApplication}
            id="reset-app-header-button"
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold font-sans transition-all active:scale-[0.98] ${
              darkMode 
                ? "bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-200" 
                : "bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 shadow-sm"
            }`}
            title="Reset everything to start a new analysis"
          >
            <RefreshCw className="h-3.5 w-3.5 text-emerald-500" />
            <span>Reset Application</span>
          </button>

        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-8">

        {/* Informational Guidance Alert banner */}
        <div className={`mb-6 p-4 rounded-xl border flex items-start gap-3 transition-colors ${
          darkMode 
            ? "bg-slate-950/40 border-slate-800 text-slate-350" 
            : "bg-emerald-50/70 border-emerald-100 text-emerald-950"
        }`}>
          <Info className={`h-5 w-5 shrink-0 mt-0.5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
          <div className="text-sm">
            <p className="font-semibold mb-0.5">How to use this assistant:</p>
            <p className="opacity-95">
              Paste clinical GP notes, diagnostic lab sheets, immunisation records, or pharmacy labels. 
              You can also click or drag a photograph of medical papers to scan them instantly. Select a comfortable reading 
              level, then press <strong>Simplify Jargon Now</strong>.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: Inputs, upload files, presets, reading levels */}
          <section className="lg:col-span-12 xl:col-span-5 space-y-6">

            {/* Pasting Box Widget */}
            <div className={`p-5 rounded-2xl border transition-all shadow-sm ${
              darkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200/80"
            }`}>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                <label className="flex items-center gap-2 font-display font-semibold text-base">
                  <FileText className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                  Write Medical Terminology/Notes Here:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={resetApplication}
                    id="reset-app-input-button"
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-sans transition-all active:scale-[0.98] ${
                      darkMode 
                        ? "bg-slate-900 border border-slate-800 hover:bg-slate-800 text-rose-400" 
                        : "bg-slate-50 border border-slate-200 hover:bg-slate-100 text-rose-600 shadow-sm"
                    }`}
                    title="Reset everything to starting state"
                  >
                    <RefreshCw className="h-3 w-3 animate-spin-hover" />
                    <span>Reset</span>
                  </button>
                  <span className="text-xs opacity-70 font-mono">
                    Characters: {inputText.length}
                  </span>
                </div>
              </div>

              {/* Textarea */}
              <textarea
                id="medical-input-text"
                rows={7}
                placeholder="Example: 'Mild cardiomegaly note. Ejection fraction measured at 48%. Restrict liquid fluid consumption limits index metric levels, administer Lasix 20mg daily...'"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className={`w-full p-4 rounded-xl text-sm focus:outline-none focus:ring-2 border transition-all resize-y ${
                  darkMode
                    ? "bg-slate-900 border-slate-800 text-white focus:ring-emerald-500 placeholder-slate-500"
                    : "bg-slate-50 border-slate-200 text-slate-800 focus:ring-emerald-500 placeholder-slate-400 focus:bg-white"
                }`}
              />

              {/* Drag and Drop Scan Box */}
              <div className="mt-5 pt-4 border-t border-dashed border-slate-200/50">
                <span className="text-xs font-semibold block mb-2 font-mono uppercase tracking-wider opacity-80">
                  Or Attach Doctor Note/s:
                </span>
                
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`p-4 rounded-xl border-2 border-dashed text-center transition-all ${
                    dragActive
                      ? "border-emerald-500 bg-emerald-50/20"
                      : darkMode
                        ? "border-slate-800 bg-slate-900/50 hover:bg-slate-900"
                        : "border-slate-300 bg-slate-50 hover:bg-slate-100/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="note-image-upload"
                    className="hidden"
                    accept=".png,.jpg,.jpeg,.doc,.docx,.pdf,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleImageSelect}
                  />

                  {imagePreview ? (
                    <div className="relative inline-block max-w-full">
                      {imageFile && (imageFile.type.startsWith("image/") || /\.(png|jpg|jpeg)$/i.test(imageFile.name)) ? (
                        <img
                          src={imagePreview}
                          alt="Uploaded document preview"
                          className="max-h-24 rounded-lg object-contain border border-slate-250 mx-auto"
                        />
                      ) : (
                        <div className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 mx-auto max-w-[220px] ${
                          darkMode ? "bg-slate-900 border-slate-800 text-slate-200" : "bg-slate-50 border-slate-200 text-slate-700"
                        }`}>
                          <FileText className="h-8 w-8 text-emerald-500" />
                          <span className="text-[10px] font-mono truncate max-w-full block" title={imageFile?.name}>
                            {imageFile?.name}
                          </span>
                        </div>
                      )}
                      <button
                        id="btn-clear-image"
                        onClick={clearImage}
                        className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 shadow hover:bg-red-700 cursor-pointer"
                        title="Remove uploaded document"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="text-xs mt-1.5 text-emerald-600 font-medium flex items-center justify-center gap-1">
                        <FileImage className="h-3.5 w-3.5" />
                        Uploaded ({imageFile?.name || "document"})
                      </div>
                    </div>
                  ) : (
                    <button
                      id="btn-trigger-upload"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-full flex flex-col items-center justify-center py-2 text-xs text-slate-500 focus:outline-none cursor-pointer"
                    >
                      <Upload className={`h-8 w-8 mb-2 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                      <p className={`font-semibold ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                        Drag & drop or click to upload file
                      </p>
                      <p className="opacity-85 mt-0.5">Supports PNG, JPG, JPEG, DOC, and PDF</p>
                    </button>
                  )}
                </div>
              </div>

              {/* Healthy Jargon Quick Reference Glossary */}
              <div className="mt-5 pt-4 border-t border-dashed border-slate-200/50">
                <span className="text-xs font-semibold block mb-2 font-mono uppercase tracking-wider opacity-85 text-emerald-800 dark:text-emerald-300">
                  Medical Terminology Translation Examples:
                </span>
                <div className={`p-4 rounded-xl border text-xs leading-relaxed transition-all space-y-2.5 ${
                  darkMode ? "bg-slate-900/50 border-slate-800" : "bg-emerald-50/10 border-emerald-100/50 text-slate-700"
                }`}>
                  <div className="grid grid-cols-2 gap-4 pb-2 border-b border-dashed border-slate-200 dark:border-slate-800 font-bold font-sans text-[11px] uppercase tracking-wide">
                    <span>Clinical Jargon Term</span>
                    <span className="text-emerald-700 dark:text-emerald-400">SimplyHealth Translation</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-4">
                      <span className="font-mono font-medium">Myocardial Infarction</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Heart Attack</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <span className="font-mono font-medium">Hypertension</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">High Blood Pressure</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <span className="font-mono font-medium">Paediatric Otitis Media</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Children's Ear Infection</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <span className="font-mono font-medium">Dyspnoea</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Shortness of Breath</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <span className="font-mono font-medium">NSAIDs (e.g. Ibuprofen)</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Anti-inflammatory painkillers</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-200/40 dark:border-slate-800/40 flex items-center gap-1">
                    <span>💡</span>
                    <span>All explanations are designed for approachable everyday terminology (e.g. GPs, paracetamol, A&E, paediatric).</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Reading Level Selector Widget */}
            <div className={`p-5 rounded-2xl border transition-all shadow-sm ${
              darkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200/80"
            }`}>
              <label className="flex items-center gap-2 font-display font-semibold text-base mb-3">
                <BookOpen className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                Choose Explanation Level
              </label>
              
              <div className="grid grid-cols-1 gap-2.5">
                {[
                  {
                    id: "friendly-plain",
                    title: "Friendly Plain Style",
                    desc: "Perfect for older adults. Conversational paragraphs with short sentences, translating terms inline."
                  },
                  {
                    id: "very-simple",
                    title: "Very Simple Level",
                    desc: "Maximum simplification for people who struggle with details. Uses relatable analogies."
                  },
                  {
                    id: "simple-english",
                    title: "Simple English / ESL",
                    desc: "Best for limited English proficiency. Avoids metaphors/idioms and uses direct literal words."
                  }
                ].map((levelConf) => (
                  <button
                    key={levelConf.id}
                    id={`reading-level-${levelConf.id}`}
                    onClick={() => setReadingLevel(levelConf.id as any)}
                    className={`w-full p-3.5 rounded-xl border text-left transition-all relative ${
                      readingLevel === levelConf.id
                        ? darkMode
                          ? "bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/20"
                          : "bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20"
                        : darkMode
                          ? "bg-slate-900 border-slate-850 hover:border-slate-800"
                          : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold mb-1 col">
                      <span className={readingLevel === levelConf.id ? (darkMode ? "text-emerald-300" : "text-emerald-800") : (darkMode ? "text-slate-300" : "text-slate-800")}>
                        {levelConf.title}
                      </span>
                      {readingLevel === levelConf.id && (
                        <Check className={`h-4.5 w-4.5 shrink-0 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                      )}
                    </div>
                    <p className={`text-xs ${darkMode ? "text-slate-400" : "text-slate-600"} tracking-normal leading-normal`}>{levelConf.desc}</p>
                  </button>
                ))}
              </div>

              {/* Translate Action Button */}
              <button
                id="btn-simplify-action"
                onClick={startTranslation}
                disabled={isAnalyzing}
                className={`w-full mt-6 py-4 px-5 rounded-xl font-bold font-display uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer ${
                  isAnalyzing
                    ? "opacity-60 cursor-not-allowed bg-slate-400 text-slate-800"
                    : "bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white active:bg-emerald-800"
                }`}
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Analyzing clinical jargon...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Simplify Jargon Now
                  </>
                )}
              </button>

              {errorMessage && (
                <div className="mt-4 space-y-3">
                  {errorMessage.includes("GEMINI_API_KEY") || errorMessage.includes("Gemini API client") ? (
                    <div className={`p-4 rounded-xl border text-xs leading-relaxed transition-all shadow-sm ${
                      darkMode ? "bg-amber-950/40 border-amber-800/50 text-slate-200" : "bg-amber-50/70 border-amber-200 text-slate-800"
                    }`}>
                      <div className="flex items-start gap-2.5 mb-3">
                        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-sm text-amber-800 dark:text-amber-400">
                            Gemini API Key Required
                          </p>
                          <p className="opacity-85 mt-0.5 font-sans">
                            The application needs a valid API key to simplify complex medical jargon. Please follow these simple steps to configure it:
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3.5 pl-7 border-l border-amber-200 dark:border-amber-800/50 ml-2.5">
                        <div>
                          <span className="font-semibold block text-amber-700 dark:text-amber-300">1. On Vercel (Production)</span>
                          <span className="opacity-80 block font-sans">Go to your Vercel Dashboard, select this project, then navigate to <strong>Settings</strong> &gt; <strong>Environment Variables</strong>. Add <code>GEMINI_API_KEY</code> with your key and click save. Don't forget to trigger a new deployment for changes to take effect!</span>
                        </div>
                        <div>
                          <span className="font-semibold block text-amber-700 dark:text-amber-300">2. In Google AI Studio Build</span>
                          <span className="opacity-80 block font-sans">Open the <strong>Settings</strong> or <strong>Secrets</strong> panel (gear icon or secrets option in the sidebar), add a secret named <code>GEMINI_API_KEY</code>, and paste your key.</span>
                        </div>
                        <div>
                          <span className="font-semibold block text-amber-700 dark:text-amber-300">3. In Local Development</span>
                          <span className="opacity-80 block font-sans">Create a <code>.env</code> file in your root folder and add: <code>GEMINI_API_KEY=your_key_here</code></span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-900 text-xs rounded-lg flex items-center gap-2">
                      <AlertTriangle className="h-4.5 w-4.5 text-red-600 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </section>

          {/* RIGHT SIDE: Guide Output block */}
          <section className="lg:col-span-7">
            
            <AnimatePresence mode="wait">
              
              {!results && !isAnalyzing ? (
                
                /* Welcome illustration and details */
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`p-8 rounded-3xl border text-center transition-all shadow-sm ${
                    darkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200/80"
                  }`}
                >
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5 ${
                    darkMode ? "bg-teal-500/10 text-teal-400" : "bg-teal-100/60 text-teal-600"
                  }`}>
                    <BookOpen className="h-8 w-8" />
                  </div>
                  
                  <h3 className="text-xl font-bold font-display tracking-tight mb-2">
                    Your SimplyHealth Translation Will Appear Here
                  </h3>
                  
                  <p className={`text-sm max-w-lg mx-auto mb-6 ${
                    darkMode ? "text-slate-400" : "text-slate-500"
                  }`}>
                    This companion assistant helps bridge health communication gaps. It translates 
                    complex doctor instructions, laboratory charts, and prescriptions into comforting, clear, everyday terms.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto pt-6 border-t border-slate-100/10 dark:border-slate-800">
                    <div className={`p-3.5 rounded-xl border flex gap-2.5 items-start ${
                      darkMode ? "bg-slate-900 border-slate-850" : "bg-slate-50/50 border-slate-100"
                    }`}>
                      <div className="p-1 rounded-md bg-sky-100 text-sky-700 shrink-0 mt-0.5">
                        <Heart className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-850 dark:text-slate-200">Caring Tone</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">Supportive explanations suitable for anxious patients.</p>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border flex gap-2.5 items-start ${
                      darkMode ? "bg-slate-900 border-slate-850" : "bg-slate-50/50 border-slate-100"
                    }`}>
                      <div className="p-1 rounded-md bg-amber-100 text-amber-700 shrink-0 mt-0.5">
                        <Eye className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-850 dark:text-slate-200">Patient-Friendly</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">Large, approachably scaled, legible fonts designed for comfortable reading.</p>
                      </div>
                    </div>

                    <div className={`p-3.5 rounded-xl border flex gap-2.5 items-start ${
                      darkMode ? "bg-slate-900 border-slate-850" : "bg-slate-50/50 border-slate-100"
                    }`}>
                      <div className="p-1 rounded-md bg-purple-100 text-purple-700 shrink-0 mt-0.5">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-slate-850 dark:text-slate-200">Partnership First</h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-normal">Prepares questions to help you speak with clinical docs.</p>
                      </div>
                    </div>
                  </div>

                  <div className={`mt-8 p-3.5 rounded-xl text-xs leading-relaxed max-w-xl mx-auto text-left border ${
                    darkMode ? "bg-slate-900 text-slate-400 border-slate-800" : "bg-slate-50 border-slate-200/50 text-slate-600"
                  }`}>
                    ⚠️ <strong>Disclaimer:</strong> This application is for educational purposes only and does not provide medical advice, diagnosis, or treatment. It is design-optimized to assist medical comprehension and should never replace professional clinical consulting, expert diagnosis, or emergency healthcare services.
                  </div>
                </motion.div>

              ) : isAnalyzing ? (

                /* Loading State screen */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`p-10 rounded-3xl border text-center transition-all ${
                    darkMode ? "bg-slate-950 border-slate-800" : "bg-white border-slate-200/80"
                  }`}
                >
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <div className={`absolute inset-0 rounded-full border-4 ${
                      darkMode ? "border-slate-800" : "border-slate-100"
                    }`} />
                    <div className={`absolute inset-0 rounded-full border-4 border-t-transparent animate-spin ${
                      darkMode ? "border-emerald-400" : "border-emerald-600"
                    }`} />
                    <Activity className={`absolute inset-0 m-auto h-8 w-8 animate-pulse ${
                      darkMode ? "text-emerald-400" : "text-emerald-600"
                    }`} />
                  </div>

                  <h3 className="text-xl font-bold font-display mb-1.5 animate-pulse">
                    Translating Into Everyday Words...
                  </h3>
                  
                  <p className="text-xs text-slate-500 max-w-sm mx-auto font-mono uppercase tracking-wider mb-8">
                    Current Reading Level: {getReadingLevelLabel(readingLevel)}
                  </p>

                  <div className={`space-y-3 max-w-md mx-auto text-left py-4 px-5 rounded-2xl border ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-100"
                  }`}>
                    <div className={`flex items-center gap-2.5 text-xs p-1 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Reading complex clinical charts ... Done</span>
                    </div>
                    <div className={`flex items-center gap-2.5 text-xs p-1 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>Stripping heavy Latin jargon terms ... Done</span>
                    </div>
                    <div className={`flex items-center gap-2.5 text-xs p-1 animate-pulse ${darkMode ? "text-slate-300" : "text-slate-600"}`}>
                      <RefreshCw className="h-4 w-4 text-emerald-500 shrink-0 animate-spin" />
                      <span>Creating helpful analogies and guides ...</span>
                    </div>
                  </div>
                </motion.div>

              ) : (

                /* Translation Result Output */
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  id="print-section"
                  className={`rounded-3xl border transition-all overflow-hidden ${
                    darkMode 
                      ? "bg-slate-950 border-slate-800" 
                      : "bg-white border-slate-200/90 shadow-md"
                  }`}
                >
                  
                  {/* Result Header Bar */}
                  <div className={`p-5 flex flex-wrap gap-4 items-center justify-between border-b ${
                    darkMode ? "bg-slate-900 border-slate-800" : "bg-emerald-50/40 border-emerald-100/50"
                  }`}>
                    
                    <div>
                      <span className={`text-xs font-bold font-mono tracking-wider uppercase inline-block mb-1 px-2 py-0.5 rounded ${
                        darkMode ? "bg-emerald-950 text-emerald-300 border border-emerald-800/30" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        Simplified Patient Summary
                      </span>
                      <h3 className={`font-display font-bold text-lg ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                        {results.originalSummary}
                      </h3>
                    </div>

                    {/* Speech / Print widgets */}
                    <div className="flex items-center gap-2 print:hidden">

                                         <button
                        id="btn-read-aloud"
                        onClick={handleReadAloud}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                          isSpeaking
                            ? isPaused
                              ? "bg-amber-450 text-slate-950 hover:bg-amber-400"
                              : "bg-red-600 text-white hover:bg-red-700 animate-pulse"
                            : darkMode
                              ? "bg-slate-800 text-emerald-300 hover:bg-slate-700"
                              : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                        }`}
                        title="Read this explanation aloud to me"
                      >
                        {isSpeaking && !isPaused ? (
                          <>
                            <VolumeX className="h-4 w-4 shrink-0" />
                            Pause Speech
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-4 w-4 shrink-0" />
                            {isPaused ? "Resume Read Aloud" : "Read Aloud"}
                          </>
                        )}
                      </button>

                      {isSpeaking && (
                        <button
                          id="btn-stop-speech"
                          onClick={stopReading}
                          className="p-1.5 rounded-lg text-xs font-bold bg-slate-250 text-slate-755 hover:bg-slate-300 cursor-pointer"
                          title="Stop reading narrative"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}

                      {/* Print translation for doctor/family */}
                      <button
                        id="btn-print-doc"
                        onClick={handlePrint}
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:opacity-90 cursor-pointer border ${
                          darkMode ? "bg-slate-900 text-emerald-300 border-slate-800" : "bg-white border-slate-200 text-slate-700"
                        }`}
                        title="Print document translation for reference"
                      >
                        <Printer className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only">Print</span>
                      </button>

                      {/* Download translation as PDF */}
                      <button
                        id="btn-download-pdf"
                        onClick={downloadPDF}
                        className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:opacity-90 cursor-pointer border ${
                          darkMode ? "bg-emerald-950 text-emerald-300 border-emerald-800/30 hover:bg-emerald-900/20" : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100/60"
                        }`}
                        title="Download simplified care guide as PDF"
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only">Download PDF</span>
                      </button>

                    </div>

                  </div>

                  {/* Body Content area */}
                  <div className="p-6 md:p-8 space-y-8">
                    
                    {results.unsupportedRequestDetected ? (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-6 md:p-8 rounded-2xl border flex flex-col md:flex-row gap-6 items-start transition-all ${
                          darkMode 
                            ? "bg-amber-950/20 border-amber-500/30 text-amber-100" 
                            : "bg-[#fffbeb] border-amber-200 text-amber-900"
                        }`}
                      >
                        <div className={`p-3 rounded-xl shrink-0 ${
                          darkMode ? "bg-amber-950/80 text-amber-400 border border-amber-800/20" : "bg-amber-100/90 text-amber-800 border border-amber-250"
                        }`}>
                          <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div className="space-y-4 flex-1">
                          <h4 className="font-display font-medium text-base md:text-lg tracking-tight text-amber-600 dark:text-amber-400">
                            {results.unsupportedRequestTitle || "Educational Use & Policies"}
                          </h4>
                          <p className={`text-sm leading-relaxed ${
                            darkMode ? "text-amber-200/80" : "text-amber-800/80"
                          }`}>
                            {results.unsupportedRequestMessage}
                          </p>
                          <div className="pt-2 flex flex-wrap gap-3">
                            <button
                              onClick={resetApplication}
                              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 border transition-all cursor-pointer ${
                                darkMode 
                                  ? "bg-amber-950/50 border-amber-850 text-amber-400 hover:bg-amber-900/30" 
                                  : "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200"
                              }`}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Translate Another Document
                            </button>
                            <a
                              href="https://www.healthdirect.gov.au/gp"
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 border transition-all ${
                                darkMode
                                  ? "bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-900"
                                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <HelpCircle className="h-3.5 w-3.5" />
                              Contact Healthcare GP (Australia)
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        {/* ACSQHC Key Messages Section */}
                    {results.keyMessages && results.keyMessages.length > 0 && (
                      <div className={`p-5 rounded-2xl border transition-all ${
                        darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}>
                        <button
                          onClick={() => setKeyMessagesOpen(!keyMessagesOpen)}
                          className="w-full flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg p-1 hover:bg-slate-800/30 transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                            <h4 className={`font-display font-bold text-base ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                              Consumer Key Messages (Limit 3-4)
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-mono hidden sm:inline">
                              {keyMessagesOpen ? "Collapse" : "Expand"}
                            </span>
                            {keyMessagesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {keyMessagesOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <p className="text-xs text-slate-500 mb-4 pt-3">
                                Refined to exactly three or four crucial takeaways to prevent cognitive fatigue:
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.keyMessages.slice(0, 4).map((msg, idx) => (
                                  <div
                                    key={idx}
                                    className={`p-3.5 rounded-xl border flex gap-3 items-start ${
                                      darkMode ? "bg-slate-950 border-slate-900/50" : "bg-white border-slate-100/80"
                                    }`}
                                  >
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-emerald-500/20 text-emerald-400">
                                      {idx + 1}
                                    </div>
                                    <p className="text-sm leading-relaxed">{msg}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Plain Language text explanation */}
                    <div className={`p-5 rounded-2xl border transition-all ${
                      darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                    }`}>
                      
                      <button
                        onClick={() => setPlainTranslationOpen(!plainTranslationOpen)}
                        className="w-full flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg p-1 hover:bg-slate-800/30 transition-all text-left"
                      >
                        <div className="flex items-center gap-2">
                          <FileCheck className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                          <h4 className={`font-display font-bold text-base ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                            Plain Language Translation
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-xs font-mono hidden sm:inline">
                            {plainTranslationOpen ? "Collapse" : "Expand"}
                          </span>
                          {plainTranslationOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {plainTranslationOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className={`prose max-w-none tracking-normal font-sans text-slate-850 pt-3 ${getFontClass()}`}>
                              {results.plainLanguageExplanation.split('\n\n').map((paragraph, index) => (
                                <p key={index} className={`mb-4 font-normal ${darkMode ? "text-slate-200" : "text-slate-800"}`} style={{ fontSize: 'inherit', lineHeight: 'inherit' }}>
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>

                    {/* DISCERN Treatment Choice Quality Panel */}
                    {results.discernAssessment && (
                      <div className={`p-5 rounded-2xl border transition-all ${
                        darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}>
                        <button
                          onClick={() => setDiscernAssessmentOpen(!discernAssessmentOpen)}
                          className="w-full flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg p-1 hover:bg-slate-800/30 transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Scale className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                            <h4 className={`font-display font-bold text-base ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                              Treatment Choices & Quality Assessment (DISCERN)
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-mono hidden sm:inline">
                              {discernAssessmentOpen ? "Collapse" : "Expand"}
                            </span>
                            {discernAssessmentOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {discernAssessmentOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <p className="text-xs text-slate-500 mb-4 pt-3">
                                Validated information on treatment pathways to support clinical governance and shared decision-making:
                              </p>

                              <div className="space-y-4">
                                <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950/45 border-slate-850" : "bg-white border-slate-100"}`}>
                                  <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block mb-1">Assessed Treatment Name</span>
                                  <span className="text-sm font-bold text-emerald-400">{results.discernAssessment.treatmentName}</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950/45 border-slate-850" : "bg-white border-slate-100"}`}>
                                    <h5 className="text-xs font-bold text-slate-300 dark:text-slate-100 mb-1.5 flex items-center gap-1.5">
                                      <span className="inline-block w-2   h-2 rounded-full bg-blue-400"></span>
                                      How Treatment Works
                                    </h5>
                                    <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-300">{results.discernAssessment.howItWorks}</p>
                                  </div>

                                  <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950/45 border-slate-850" : "bg-white border-slate-100"}`}>
                                    <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5 flex items-center gap-1.5">
                                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                                      Benefits of Treatment
                                    </h5>
                                    <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-300">{results.discernAssessment.benefits}</p>
                                  </div>

                                  <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950/45 border-slate-850" : "bg-white border-slate-100"}`}>
                                    <h5 className="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1.5 flex items-center gap-1.5">
                                      <span className="inline-block w-2 h-2 rounded-full bg-rose-400"></span>
                                      Risks of Treatment
                                    </h5>
                                    <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-300">{results.discernAssessment.risks}</p>
                                  </div>

                                  <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950/45 border-slate-850" : "bg-white border-slate-100"}`}>
                                    <h5 className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400"></span>
                                      What Happens Without Treatment?
                                    </h5>
                                    <p className="text-xs leading-relaxed text-slate-400 dark:text-slate-300">{results.discernAssessment.whatIfNoTreatment}</p>
                                  </div>
                                </div>

                                <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950/30 border-slate-850" : "bg-white border-slate-100"}`}>
                                  <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    💡 Alternative Choices & Options
                                  </h5>
                                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">{results.discernAssessment.alternativeChoices}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Key Action Steps Checkable Item list */}
                    {results.keyActionSteps && results.keyActionSteps.length > 0 && (
                      <div className={`p-5 rounded-2xl border transition-all ${
                        darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}>
                        
                        <button
                          onClick={() => setActionStepsOpen(!actionStepsOpen)}
                          className="w-full flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg p-1 hover:bg-slate-800/30 transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                            <h4 className={`font-display font-bold text-base ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                              Your Easy Actions Checklist
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-mono hidden sm:inline">
                              {actionStepsOpen ? "Collapse" : "Expand"}
                            </span>
                            {actionStepsOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {actionStepsOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <p className="text-xs text-slate-500 mb-4 print:hidden pt-3">
                                Click on the checkboxes below as you complete each task so you stay on track:
                              </p>

                              <div className="space-y-3.5">
                                {results.keyActionSteps.map((step, idx) => (
                                  <div
                                    key={idx}
                                    id={`action-item-wrap-${idx}`}
                                    onClick={() => toggleStep(idx)}
                                    className={`flex gap-3 items-start p-3 rounded-lg border transition-all cursor-pointer ${
                                      completedSteps[idx]
                                        ? darkMode
                                          ? "bg-slate-950 border-slate-900/50 opacity-60 line-through select-none"
                                          : "bg-slate-100/70 border-slate-200/50 opacity-60 line-through"
                                        : darkMode
                                          ? "bg-slate-900 border-slate-850 hover:border-slate-800"
                                          : "bg-white border-slate-200/80 hover:bg-slate-50"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      id={`chk-step-${idx}`}
                                      className={`h-5 w-5 shrink-0 rounded flex items-center justify-center border transition-all ${
                                        completedSteps[idx]
                                          ? "bg-green-600 border-green-600 text-white"
                                          : "bg-transparent border-slate-300"
                                      }`}
                                    >
                                      {completedSteps[idx] && <Check className="h-3.5 w-3.5 stroke-[4px]" />}
                                    </button>
                                    
                                    <p className={`text-sm ${completedSteps[idx] ? "text-slate-400" : (darkMode ? "text-slate-200" : "text-slate-800 font-medium")}`}>
                                      {step}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    )}

                    {/* Jargon dictionary / glossary table */}
                    {results.jargonGlossary && results.jargonGlossary.length > 0 && (
                      <div className={`p-5 rounded-2xl border transition-all ${
                        darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}>
                        
                        <button
                          onClick={() => setJargonGlossaryOpen(!jargonGlossaryOpen)}
                          className="w-full flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg p-1 hover:bg-slate-800/30 transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <BookOpen className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                            <h4 className={`font-display font-bold text-base ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                              Healthcare Jargon Decoder (Glossary)
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-mono hidden sm:inline">
                              {jargonGlossaryOpen ? "Collapse" : "Expand"}
                            </span>
                            {jargonGlossaryOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {jargonGlossaryOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                                {results.jargonGlossary.map((gloss, idx) => (
                                  <div
                                    key={idx}
                                    id={`jargon-item-${idx}`}
                                    className={`p-4 rounded-xl border transition-all ${
                                      darkMode 
                                        ? "bg-slate-950 border-slate-900/40" 
                                        : "bg-white border-slate-200/85 hover:shadow-sm"
                                    }`}
                                  >
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2.5">
                                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                        darkMode ? "bg-rose-500/20 text-rose-300 border border-rose-550/30" : "bg-red-50 text-red-700"
                                      }`}>
                                        🩺 Medical Doc Word: {gloss.complexTerm}
                                      </span>
                                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span className={`text-sm font-bold ${darkMode ? "text-emerald-300" : "text-slate-850"}`}>
                                        {gloss.simpleTerm}
                                      </span>
                                    </div>

                                    <p className={`text-xs ${darkMode ? "text-slate-350" : "text-slate-700"} mb-2.5`}>
                                      <strong>What it means:</strong> {gloss.explanation}
                                    </p>

                                    <div className={`p-2.5 rounded-lg text-xs flex gap-2 items-start ${
                                      darkMode ? "bg-slate-900 text-amber-250 border border-amber-950/20" : "bg-amber-50/50 text-slate-600 border border-amber-105"
                                    }`}>
                                      <Sparkles className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                      <div>
                                        <strong>Relatable Analogy:</strong> {gloss.analogy}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    )}

                    {/* Interactive Self-Advocacy Checklist */}
                    {results.doctorQuestions && results.doctorQuestions.length > 0 && (
                      <div className={`p-5 rounded-2xl border transition-all ${
                        darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}>
                        
                        <button
                          onClick={() => setDoctorQuestionsOpen(!doctorQuestionsOpen)}
                          className="w-full flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg p-1 hover:bg-slate-800/30 transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-emerald-600 shrink-0" />
                            <h4 className={`font-display font-bold text-base ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                              Questions to Ask Your Doctor
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-mono hidden sm:inline">
                              {doctorQuestionsOpen ? "Collapse" : "Expand"}
                            </span>
                            {doctorQuestionsOpen ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {doctorQuestionsOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="flex items-center justify-between gap-4 mb-4 mt-3 flex-wrap pt-2">
                                <p className="text-xs text-slate-500 max-w-md">
                                  We recommend copying or taking these questions to your next healthcare appointment to guide your discussion:
                                </p>

                                <button
                                  id="btn-copy-questions"
                                  onClick={() => {
                                    const questionsList = results.doctorQuestions.join("\n");
                                    navigator.clipboard.writeText(questionsList);
                                    alert("Questions copied! You can now paste them into a text note, message to family, or print them.");
                                  }}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    darkMode 
                                      ? "bg-emerald-600 text-white border border-emerald-600 hover:bg-emerald-500" 
                                      : "bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800"
                                  }`}
                                >
                                  <Clipboard className="h-3.5 w-3.5" />
                                  Copy Questions
                                </button>
                              </div>

                              <ul className="space-y-3.5">
                                {results.doctorQuestions.map((q, idx) => (
                                  <li
                                    key={idx}
                                    className={`text-sm p-3 rounded-lg border flex gap-3 items-start ${
                                      darkMode ? "bg-slate-950 border-slate-850 text-slate-300" : "bg-white border-slate-105 text-slate-700"
                                    }`}
                                  >
                                    <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                      darkMode ? "bg-slate-800 text-emerald-300" : "bg-emerald-100 text-emerald-700"
                                    }`}>
                                      ?
                                    </div>
                                    <p className="font-medium">{q}</p>
                                  </li>
                                ))}
                              </ul>
                            </motion.div>
                          )}
                        </AnimatePresence>

                      </div>
                    )}

                    {/* Culturally Tailored Care Advice Section */}
                    {results.culturalConsiderations && (
                      <div className={`p-5 rounded-2xl border transition-all ${
                        darkMode ? "bg-slate-900 border-slate-800" : "bg-slate-50 border-slate-200"
                      }`}>
                        <button
                          onClick={() => setCulturalConsiderationsOpen(!culturalConsiderationsOpen)}
                          className="w-full flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-emerald-550/20 rounded-lg p-1 hover:bg-slate-800/30 transition-all text-left"
                        >
                          <div className="flex items-center gap-2">
                            <Globe className={`h-5 w-5 ${darkMode ? "text-emerald-400" : "text-emerald-600"}`} />
                            <h4 className={`font-display font-bold text-base ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                              Cultural & Language Health Support
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 text-slate-400">
                            <span className="text-xs font-mono hidden sm:inline">
                              {culturalConsiderationsOpen ? "Collapse" : "Expand"}
                            </span>
                            {culturalConsiderationsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </div>
                        </button>

                        <AnimatePresence initial={false}>
                          {culturalConsiderationsOpen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <p className="text-xs text-slate-500 mb-4 pt-3">
                                Professional, supportive guidance aligned with Australian healthcare communication safety guidelines:
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950/45 border-slate-850" : "bg-white border-slate-100"}`}>
                                  <h5 className={`text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${darkMode ? "text-teal-400" : "text-teal-700"}`}>
                                    <Globe className="h-3.5 w-3.5" /> Multilingual Support & Translation Services
                                  </h5>
                                  <p className={`text-xs leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-650"}`}>{results.culturalConsiderations.caldGuidance}</p>
                                </div>

                                <div className={`p-4 rounded-xl border ${darkMode ? "bg-slate-950/45 border-slate-850" : "bg-white border-slate-100"}`}>
                                  <h5 className={`text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 ${darkMode ? "text-emerald-400" : "text-emerald-700"}`}>
                                    <Heart className="h-3.5 w-3.5" /> First Nations Supportive Health Liaison
                                  </h5>
                                  <p className={`text-xs leading-relaxed ${darkMode ? "text-slate-300" : "text-slate-650"}`}>{results.culturalConsiderations.indigenousGuidance}</p>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Urgency Badge & Clinical Triage */}
                    <div className={`p-5 rounded-2xl border transition-all ${getUrgencyClasses(results.urgencyLevel)}`}>
                      <button
                        onClick={() => setUrgencyOpen(!urgencyOpen)}
                        className="w-full flex items-center justify-between focus:outline-none focus:ring-1 focus:ring-emerald-500/20 rounded-lg p-1 text-left"
                      >
                        <div className="flex items-center gap-4">
                          {getUrgencyIcon(results.urgencyLevel)}
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-base tracking-normal text-slate-800 dark:text-slate-200">
                              Clinician Guidelines & Urgency
                            </h4>
                            <span className={`px-2 py-0.5 text-xs font-extrabold rounded-full ${
                              darkMode
                                ? results.urgencyLevel === "emergency"
                                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                                  : results.urgencyLevel === "critical"
                                    ? "bg-teal-500/20 text-teal-300 border border-teal-500/40"
                                    : results.urgencyLevel === "important"
                                      ? "bg-emerald-600/10 text-emerald-400 border border-emerald-600/25"
                                      : "bg-slate-800 text-slate-300 border border-slate-700"
                                : results.urgencyLevel === "emergency"
                                  ? "bg-emerald-600 text-white border border-emerald-700"
                                  : results.urgencyLevel === "critical"
                                    ? "bg-teal-500 text-white border border-teal-600"
                                    : results.urgencyLevel === "important"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-250"
                                      : "bg-slate-200 text-slate-700 border border-slate-300"
                            }`}>
                              {results.urgencyLevel.toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <span className="text-xs font-mono hidden sm:inline">
                            {urgencyOpen ? "Collapse" : "Expand"}
                          </span>
                          {urgencyOpen ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {urgencyOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <p className={`text-sm mt-3 leading-normal font-medium max-w-2xl pt-3 border-t border-dashed border-slate-400/20 dark:border-slate-800/40 ${darkMode ? "text-slate-300" : "text-slate-700"}`}>
                              {results.urgencyReasoning}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                      </>
                    )}

                  </div>

                </motion.div>

              )}

            </AnimatePresence>

          </section>

        </div>

        {/* Persistent Professional Educational Disclaimer */}
        <section className="mt-12 p-6 rounded-2xl border border-slate-800 bg-slate-950/30 text-slate-400 max-w-4xl mx-auto transition-all shadow-sm">
          <div className="flex items-center gap-2 mb-2.5 justify-center text-emerald-500">
            <Heart className="h-4.5 w-4.5 shrink-0 animate-pulse text-emerald-500" />
            <h4 className="text-xs font-bold uppercase tracking-widest font-display text-emerald-450">Educational Referencing Only</h4>
          </div>
          <p className="text-xs text-center max-w-3xl mx-auto leading-relaxed text-slate-400">
            SimplyHealth is an educational reference tool designed to support medical literacy and improve dialogue between patients and health professionals. It does not provide medical diagnostics, therapeutic advice, treatment plans, or clinical solutions. This assistant is not a substitute for professional healthcare assessment. Always consult a doctor, qualified pediatric consultant, pharmacist, or your outpatient healthcare team before making any medical decisions, or starting, modifying, or stopping treatments. In case of an urgent medical situation, please contact emergency services immediately.
          </p>
        </section>

      </main>

      {/* Footer credits */}
      <footer className={`py-8 text-center text-xs opacity-75 border-t mt-12 ${
        darkMode ? "border-slate-800 bg-slate-950/20 text-slate-400" : "border-slate-200 bg-white/40 text-slate-500"
      }`}>
        <p>&copy; {new Date().getFullYear()} Health Literacy Assistant Engine. Supporting patient comprehension.</p>
        <p className="mt-1 text-[10px]">Designed under national guidelines for visual clarity and approachable reading.</p>
      </footer>

    </div>
  );
}
