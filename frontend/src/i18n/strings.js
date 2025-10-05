const strings = {
  en: {
    
    appTitle: "PRD E-Invoicing Readiness Analyzer",
    
  
    countryRegion: "Country/Region",
    fileUpload: "Choose file to analyze",
    emailOptIn: "Email me the report link",
    emailPlaceholder: "Enter your email address",
    
   
    analyze: "Analyze",
    processing: "Processing...",
    exportPdf: "Export as PDF",
    openTestbed: "Open in Testbed",
    downloadReport: "Download Report JSON",
    shareReport: "Copy Shareable Link",
    downloadMapping: "Download Mapping JSON",
    
   
    toggleTheme: "Toggle Theme",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    
   
    noFileChosen: "No file chosen.",
    fileTooLarge: "File too large! Must be under 5MB.",
    invalidFileType: "Invalid file type! Upload .csv or .json",
    uploadFailed: "File upload failed",
    analysisFailed: "Analysis failed",
    backendNotReachable: "Backend not reachable.",
    

    reportFor: "Report for",
    ruleFindings: "Rule Findings",
    fieldMappingSkeleton: "Field Mapping Skeleton",
    mappingDescription: "Suggested mappings based on field name analysis:",
    gaps: "Gaps:",
    rawJsonOutput: "Raw JSON Output",
    
    
    dataScore: "Data Score",
    coverageScore: "Coverage Score",
    rulesScore: "Rules Score",
    postureScore: "Posture Score",
    overallScore: "Overall Score",
    
    
    pass: "PASS",
    fail: "FAIL",
    
 
    noReportYet: "No analysis report yet",
    uploadFileToStart: "Upload a file and click Analyze to get started",
    noGapsFound: "Great! No validation gaps found.",
    noMappingAvailable: "No field mapping suggestions available",
    

    testbedOpened: "Demo testbed opened! This shows what would be sent to the real testbed.",
    mappingDownloaded: "Mapping skeleton downloaded!",
    shareableLinkCopied: "Shareable report link copied!",
    
 
    allowedCurrencies: "Allowed currencies",
    trnLength: "TRN length",
    characters: "characters",
    

    fixTips: {
      DATE_ISO: "Use format YYYY-MM-DD",
      CURRENCY_ALLOWED: "Check allowed currencies for selected country",
      TRN_PRESENT: "TRN must be non-empty",
      TRN_LENGTH: "TRN must match country-specific length requirements",
      LINE_MATH: "line_total = qty * unit_price",
      TOTALS_BALANCE: "total_incl_vat = total_excl_vat + vat_amount"
    }
  }
};

export const useStrings = (lang = 'en') => {
  return strings[lang] || strings.en;
};

export default strings;
