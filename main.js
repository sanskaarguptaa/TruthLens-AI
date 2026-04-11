import { GoogleGenAI, Type } from '@google/genai';

const getSystemPrompt = (aiLanguageName) => `You are 'TruthLens AI', an intelligent fact-checking assistant designed to help users evaluate the credibility of news, claims, and information.
Your task is to analyze the user's content (which can be text, an image, or both).
If Google Search grounding is available, you MUST use it to research the claims, find corroborating evidence or debunk it.

CRITICAL REQUIREMENT:
You MUST respond entirely in ${aiLanguageName}. All JSON keys must remain exactly as specified in English, but the VALUES (verdict, reasoningPoints, redFlags, sourcesFound names) must be translated into ${aiLanguageName}.

Guidelines:
1. Analyze the language: Detect exaggeration, sensationalism, emotional manipulation, or bias.
2. Evaluate plausibility: Check whether the claim aligns with general knowledge, logic, and known facts.
3. Assess credibility: Consider whether the information comes from reliable or verifiable sources.
4. Identify red flags: Absolute claims ("always", "instantly"), lack of evidence, or conspiracy-style framing.
5. Do not assume information is true just because it sounds convincing.

Output MUST be purely in JSON format.
{
  "verdict": "Likely Real" | "Likely Fake" | "Unverified" (Translate these strings into ${aiLanguageName}),
  "confidenceScore": number (0-100),
  "reasoningPoints": [ "Detailed point 1 explaining the logic and evidence", "Detailed point 2...", ... ],
  "redFlags": [ "Red flag 1", "Red flag 2" ] (Leave empty if none),
  "sourcesFound": [ "Source 1", "Source 2" ] (Leave empty if no specific sources are referenced)
}`;

// --- DOM Elements ---
const langToggle = document.getElementById('lang-toggle');
const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const apiKeyInput = document.getElementById('api-key-input');
const saveSettingsBtn = document.getElementById('save-settings-btn');

const claimText = document.getElementById('claim-text');
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');
const imagePreview = document.getElementById('image-preview');
const previewImg = document.getElementById('preview-img');
const removeImgBtn = document.getElementById('remove-img-btn');

const analyzeBtn = document.getElementById('analyze-btn');
const inputSection = document.querySelector('.input-section');
const loadingSection = document.getElementById('loading-section');
const resultsSection = document.getElementById('results-section');
const resetBtn = document.getElementById('reset-btn');

const verdictTitle = document.getElementById('verdict-title');
const verdictIcon = document.getElementById('verdict-icon');
const confidenceScoreText = document.getElementById('confidence-score');
const scorePercentage = document.getElementById('score-percentage');
const scoreCircle = document.getElementById('score-circle');

const reasonList = document.getElementById('reason-list');
const redFlagsContainer = document.getElementById('red-flags-container');
const redFlagList = document.getElementById('red-flag-list');
const sourceBox = document.querySelector('.source-box');
const sourceList = document.getElementById('source-list');

// --- i18n Translations ---
const i18n = {
  en: {
    appTitle: "TruthLens <span>AI</span>",
    settingsTitle: "Settings",
    settingsDesc: "TruthLens requires a Google Gemini API key to research and verify news directly from your browser. Your key is securely stored locally and never sent to our servers.",
    apiKeyLabel: "Gemini API Key",
    saveKeyBtn: "Save Key",
    analyzeClaimTitle: "Analyze Claim",
    analyzeClaimDesc: "Paste a news article snippet, a claim, or upload an image/screenshot for verification.",
    claimPlaceholder: "e.g., 'NASA just announced they found alien life on Mars!' Or paste a news link to evaluate...",
    dropZoneText: "Drag & Drop an image/screenshot here or ",
    browseTxt: "browse",
    analyzeBtn: "Authenticate Truth",
    loadingText: "Agent Researching...",
    loadingSubtext: "TruthLens AI is cross-referencing sources across the web and analyzing patterns.",
    step1: "Extracting claims",
    step2: "Searching knowledge bases",
    step3: "Reasoning & identifying flags",
    reasoningTitle: "Reasoning & Evidence",
    redFlagsTitle: "Identified Red Flags",
    sourcesTitle: "Agent Sources Checked",
    resetBtn: "Check Another Claim",
    footerText: "TruthLens AI operates using large language models. Always independently verify critical information.",
    aiLanguageName: "English"
  },
  hi: {
    appTitle: "TruthLens <span>AI</span>",
    settingsTitle: "सेटिंग्स",
    settingsDesc: "TruthLens को आपके ब्राउज़र से सीधे समाचारों की जांच और सत्यापन करने के लिए Google Gemini API कुंजी की आवश्यकता है। आपकी कुंजी सुरक्षित रूप से स्थानीय रूप से संग्रहीत है और कभी भी हमारे सर्वर पर नहीं भेजी जाती है।",
    apiKeyLabel: "Gemini API कुंजी",
    saveKeyBtn: "सेव करें",
    analyzeClaimTitle: "दावे का विश्लेषण करें",
    analyzeClaimDesc: "सत्यापन के लिए कोई समाचार लेख, दावा पेस्ट करें, या कोई चित्र/स्क्रीनशॉट अपलोड करें।",
    claimPlaceholder: "उदा., 'NASA ने मंगल ग्रह पर एलियन जीवन मिलने की घोषणा की!' या कोई न्यूज़ लिंक पेस्ट करें...",
    dropZoneText: "यहां चित्र/स्क्रीनशॉट खींचें और छोड़ें या ",
    browseTxt: "ब्राउज़ करें",
    analyzeBtn: "सच्चाई प्रमाणित करें",
    loadingText: "एजेंट शोध कर रहा है...",
    loadingSubtext: "TruthLens AI वेब पर स्रोतों का क्रॉस-रेफरेंस कर रहा है और पैटर्न का विश्लेषण कर रहा है।",
    step1: "दावे निकाले जा रहे हैं",
    step2: "ज्ञानकोष में खोजा जा रहा है",
    step3: "तर्क व लाल झंडों की पहचान",
    reasoningTitle: "तर्क एवं साक्ष्य",
    redFlagsTitle: "पहचाने गए लाल झंडे",
    sourcesTitle: "जाँचे गए स्रोत",
    resetBtn: "कोई अन्य दावा जाँचें",
    footerText: "TruthLens AI बड़े भाषा मॉडल का उपयोग करता है। हमेशा महत्वपूर्ण जानकारी को स्वतंत्र रूप से सत्यापित करें।",
    aiLanguageName: "Hindi"
  }
};

// --- State ---
const API_KEY_STORAGE = 'truthlens_api_key';
const LANG_STORAGE = 'truthlens_lang';
let currentLanguage = 'en';
let currentImageBase64 = null;
let currentImageMimeType = null;

function applyTranslations(lang) {
  const dict = i18n[lang] || i18n.en;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.innerHTML = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });
}

// --- Initialization ---
function init() {
  const savedKey = localStorage.getItem(API_KEY_STORAGE);
  if (savedKey) apiKeyInput.value = savedKey;
  else openSettings();
  
  const savedLang = localStorage.getItem(LANG_STORAGE);
  if (savedLang) {
    currentLanguage = savedLang;
    langToggle.value = currentLanguage;
  }
  applyTranslations(currentLanguage);
}

// --- Event Listeners ---
langToggle.addEventListener('change', (e) => {
  currentLanguage = e.target.value;
  localStorage.setItem(LANG_STORAGE, currentLanguage);
  applyTranslations(currentLanguage);
});

settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
saveSettingsBtn.addEventListener('click', saveApiKey);

function openSettings() { settingsModal.classList.remove('hidden'); }
function closeSettings() { settingsModal.classList.add('hidden'); }
function saveApiKey() {
  const key = apiKeyInput.value.trim();
  if (key) {
    localStorage.setItem(API_KEY_STORAGE, key);
    closeSettings();
  } else {
    alert("Please enter a valid API Key.");
  }
}

// Drag & Drop Image Handling
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFile(e.dataTransfer.files[0]);
  }
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
});

removeImgBtn.addEventListener('click', (e) => {
  e.stopPropagation(); // prevent clicking dropzone
  clearImage();
});

resetBtn.addEventListener('click', () => {
  claimText.value = '';
  clearImage();
  resultsSection.classList.add('hidden');
  inputSection.style.display = 'block';
});

analyzeBtn.addEventListener('click', performAnalysis);

function clearImage() {
  currentImageBase64 = null;
  currentImageMimeType = null;
  fileInput.value = '';
  imagePreview.classList.add('hidden');
  previewImg.src = '';
}

function handleFile(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please upload a valid image file (PNG, JPEG, WebP).');
    return;
  }
  
  currentImageMimeType = file.type;
  const reader = new FileReader();
  reader.onload = (e) => {
    previewImg.src = e.target.result;
    imagePreview.classList.remove('hidden');
    // Extract base64 part only
    currentImageBase64 = e.target.result.split(',')[1];
  };
  reader.readAsDataURL(file);
}

// --- AI Analysis Logic ---
async function performAnalysis() {
  const apiKey = localStorage.getItem(API_KEY_STORAGE);
  const textQuery = claimText.value.trim();

  if (!apiKey) {
    alert("Please enter your Google Gemini API Key in the settings first.");
    openSettings();
    return;
  }

  if (!textQuery && !currentImageBase64) {
    alert("Please provide a text claim or upload an image to analyze.");
    return;
  }

  // UI State update
  inputSection.style.display = 'none';
  loadingSection.classList.remove('hidden');

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    let contentParts = [];
    if (textQuery) contentParts.push(textQuery);
    if (currentImageBase64) {
      contentParts.push({
        inlineData: {
          data: currentImageBase64,
          mimeType: currentImageMimeType
        }
      });
    }

    const aiLanguageName = (i18n[currentLanguage] || i18n.en).aiLanguageName;
    const dynamicPrompt = getSystemPrompt(aiLanguageName);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contentParts,
      config: {
        systemInstruction: dynamicPrompt,
        tools: [{ googleSearch: {} }], // Enable Agentic Search Capabilities
      }
    });

    let responseData = response.text;
    console.log("Raw Response:", responseData);
    
    // Safety check: strip markdown code blocks if the model wrapped the JSON
    responseData = responseData.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/i, '').trim();

    const parsedData = JSON.parse(responseData);
    
    displayResults(parsedData);

  } catch (error) {
    console.error("Analysis Error:", error);
    alert("An error occurred during analysis: " + error.message);
    loadingSection.classList.add('hidden');
    inputSection.style.display = 'block';
  }
}

function displayResults(data) {
  loadingSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');

  // Reset verdict classes
  resultsSection.classList.remove('verdict-real', 'verdict-fake', 'verdict-unverified');
  
  // Set Verdict info
  verdictTitle.innerText = data.verdict;
  confidenceScoreText.innerText = data.confidenceScore + '%';
  scorePercentage.innerText = data.confidenceScore + '%';
  scoreCircle.style.strokeDasharray = `${data.confidenceScore}, 100`;

  let verdictClass = 'verdict-unverified';
  let iconClass = 'ph-fill ph-warning-circle';

  if (data.verdict.toLowerCase().includes('real')) {
    verdictClass = 'verdict-real';
    iconClass = 'ph-fill ph-check-circle';
  } else if (data.verdict.toLowerCase().includes('fake')) {
    verdictClass = 'verdict-fake';
    iconClass = 'ph-fill ph-x-circle';
  }
  
  resultsSection.classList.add(verdictClass);
  verdictIcon.className = iconClass;

  // Render Reasons
  reasonList.innerHTML = '';
  if (data.reasoningPoints && data.reasoningPoints.length > 0) {
    data.reasoningPoints.forEach(pt => {
      const li = document.createElement('li');
      li.innerText = pt;
      reasonList.appendChild(li);
    });
  } else {
    reasonList.innerHTML = '<li>No detailed reasoning provided.</li>';
  }

  // Render Red Flags
  redFlagList.innerHTML = '';
  if (data.redFlags && data.redFlags.length > 0) {
    redFlagsContainer.classList.remove('hidden');
    data.redFlags.forEach(flag => {
      const li = document.createElement('li');
      li.innerText = flag;
      redFlagList.appendChild(li);
    });
  } else {
    redFlagsContainer.classList.add('hidden');
  }

  // Render Sources
  sourceList.innerHTML = '';
  if (data.sourcesFound && data.sourcesFound.length > 0) {
    sourceBox.style.display = 'block';
    data.sourcesFound.forEach(src => {
      const li = document.createElement('li');
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      if (urlRegex.test(src)) {
        li.innerHTML = src.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      } else {
        li.innerText = src;
      }
      sourceList.appendChild(li);
    });
  } else {
    sourceBox.style.display = 'none';
  }
}

// Initialize on start
init();
