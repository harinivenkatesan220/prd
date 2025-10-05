import React, { useState, useEffect } from 'react';
import LinearProgress from '@mui/material/LinearProgress';
import { jsPDF } from 'jspdf';
import { ToastContainer, toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';
import { useStrings } from './i18n/strings';
import { useTheme } from './hooks/useTheme';
import EmptyState from './components/EmptyState';

function App() {
  const strings = useStrings('en');
  const theme = useTheme();
  
  const [file, setFile] = useState(null);
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [email, setEmail] = useState('');
  const [country, setCountry] = useState('GLOBAL');
  const [countryRules, setCountryRules] = useState({});
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 
  useEffect(() => {
    const loadCountryRules = async () => {
      try {
        const res = await fetch('http://localhost:5000/analyze/countries');
        const rules = await res.json();
        setCountryRules(rules);
      } catch (err) {
        console.error('Failed to load country rules:', err);
      }
    };
    loadCountryRules();
  }, []);

  const appStyles = {
    minHeight: '100vh',
    backgroundColor: theme.colors.background,
    color: theme.colors.text,
    transition: 'all 0.3s ease',
    padding: `${theme.spacing.xl} 0`
  };

  const panelStyles = {
    maxWidth: '700px',
    width: '100%',
    backgroundColor: theme.colors.surface,
    color: theme.colors.text,
    borderRadius: '1rem',
    padding: theme.spacing.xl,
    boxShadow: theme.isDark 
      ? '0 10px 30px rgba(0,0,0,0.5)' 
      : '0 10px 30px rgba(0,0,0,0.1)',
    border: `1px solid ${theme.colors.border}`,
    transition: 'all 0.3s ease'
  };

  const validFile = () => {
    if (!file) {
      setError(strings.noFileChosen);
      toast.error(strings.noFileChosen);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(strings.fileTooLarge);
      toast.error(strings.fileTooLarge);
      return false;
    }
    if (!["application/json", "text/csv"].includes(file.type)
      && !file.name.endsWith(".csv") && !file.name.endsWith(".json")) {
      setError(strings.invalidFileType);
      toast.error(strings.invalidFileType);
      return false;
    }
    setError("");
    return true;
  };

  const uploadFile = async () => {
    if (!validFile()) return null;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://localhost:5000/upload', { method: 'POST', body: formData });
      if (!res.ok) {
        setLoading(false);
        setError(strings.uploadFailed);
        toast.error(strings.uploadFailed);
        return null;
      }
      const data = await res.json();
      setLoading(false);
      return data.uploadId;
    } catch (err) {
      setLoading(false);
      setError(strings.backendNotReachable);
      toast.error(strings.backendNotReachable);
      return null;
    }
  };

  const analyzeFile = async () => {
    const uploadId = await uploadFile();
    if (!uploadId) return;
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, email, emailOptIn, country }),
      });
      if (!res.ok) {
        setLoading(false);
        setError(strings.analysisFailed);
        toast.error(strings.analysisFailed);
        return;
      }
      const data = await res.json();
      setReport(data);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(strings.backendNotReachable);
      toast.error(strings.backendNotReachable);
    }
  };

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `report_${report.reportId}.json`;
    a.click();
  };

  const handleMappingDownload = () => {
    if (!report?.mappingSkeleton) return;
    const blob = new Blob([JSON.stringify(report.mappingSkeleton, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `mapping_skeleton_${report.reportId}.json`;
    a.click();
    toast.success(strings.mappingDownloaded);
  };

  const handleTestbedHandoff = () => {
    if (!report?.testbedPayload) return;
    
    const message = `This will open a demo testbed with your normalized invoice data and mapping suggestions. The testbed will help you:\n\n• Test field mapping accuracy\n• Validate business rules\n• Generate production-ready configurations\n\nContinue to testbed?`;
    
    if (window.confirm(message)) {
      const demoHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>GETS Testbed - Demo Mode</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background: ${theme.colors.background}; color: ${theme.colors.text}; }
            .container { max-width: 1200px; margin: 0 auto; background: ${theme.colors.surface}; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { color: ${theme.colors.primary}; border-bottom: 2px solid ${theme.colors.primary}; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin: 20px 0; padding: 15px; border: 1px solid ${theme.colors.border}; border-radius: 5px; }
            .success { background: ${theme.colors.success}20; border-color: ${theme.colors.success}; }
            .warning { background: ${theme.colors.warning}20; border-color: ${theme.colors.warning}; }
            .info { background: ${theme.colors.info}20; border-color: ${theme.colors.info}; }
            pre { background: ${theme.colors.background}; padding: 15px; border-radius: 5px; overflow: auto; font-size: 12px; color: ${theme.colors.text}; }
            .badge { padding: 3px 8px; border-radius: 12px; font-size: 11px; margin: 2px; }
            .badge-success { background: ${theme.colors.success}; color: white; }
            .badge-danger { background: ${theme.colors.danger}; color: white; }
            .btn { padding: 10px 20px; margin: 10px 5px; border: none; border-radius: 5px; cursor: pointer; text-decoration: none; display: inline-block; }
            .btn-primary { background: ${theme.colors.primary}; color: white; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="header"> Testbed </h1>
            
            <div class="section info">
              <h3>📊 Analysis Summary</h3>
              <p><strong>Country:</strong> ${report.countryLabel}</p>
              <p><strong>Report ID:</strong> ${report.reportId}</p>
              <p><strong>Overall Score:</strong> ${report.scores.overall}%</p>
            </div>

            <div class="section ${report.gaps.length === 0 ? 'success' : 'warning'}">
              <h3>✅ Validation Results</h3>
              ${report.ruleFindings.map(rule => 
                `<span class="badge ${rule.ok ? 'badge-success' : 'badge-danger'}">${rule.rule}: ${rule.ok ? 'PASS' : 'FAIL'}</span>`
              ).join('')}
            </div>

            <div class="section">
              <h3> Field Mapping Suggestions</h3>
              <pre>${JSON.stringify(report.mappingSkeleton, null, 2)}</pre>
            </div>

            <div class="section">
              <h3> Full Testbed Payload</h3>
              <pre>${JSON.stringify(report.testbedPayload, null, 2)}</pre>
            </div>

            <div class="section info">
              <h3>🔗 Production Integration</h3>
              <p>In a production environment, this would open: <strong>https://testbed.gets-standards.org/analyze</strong></p>
              <a href="#" class="btn btn-primary" onclick="downloadPayload()">Download Payload JSON</a>
            </div>
          </div>

          <script>
            function downloadPayload() {
              const data = ${JSON.stringify(report.testbedPayload)};
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'testbed_payload_${report.reportId}.json';
              a.click();
            }
          </script>
        </body>
        </html>
      `;

      const newWindow = window.open('', '_blank');
      newWindow.document.write(demoHtml);
      newWindow.document.close();
      
      toast.success(strings.testbedOpened);
    }
  };

  const handlePdfExport = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.text('E-Invoicing Readiness Report', 10, 10);
    doc.text(`Report ID: ${report.reportId}`, 10, 20);
    doc.text(`Country: ${report.countryLabel}`, 10, 30);
    doc.text(`Upload ID: ${report.uploadId}`, 10, 40);
    let y = 50;
    for (const [key, value] of Object.entries(report.scores)) {
      doc.text(`${key.charAt(0).toUpperCase() + key.slice(1)} Score: ${value}`, 10, y);
      y += 10;
    }
    doc.save('report.pdf');
  };

  const handleShare = () => {
    if (!report) return;
    const url = `${window.location.origin}/share/${report.reportId}`;
    navigator.clipboard.writeText(url);
    toast.success(strings.shareableLinkCopied);
  };

  return (
    <div style={appStyles} className="d-flex justify-content-center align-items-center">
      <ToastContainer theme={theme.isDark ? 'dark' : 'light'} />
      <div style={panelStyles}>
        {/* Header with Theme Toggle */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="text-center flex-grow-1" style={{ 
            fontWeight: '700', 
            color: theme.colors.primary,
            margin: 0
          }}>
            {strings.appTitle}
          </h1>
          <button
            onClick={theme.toggleTheme}
            className="btn btn-outline-secondary btn-sm"
            style={{ 
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
            title={strings.toggleTheme}
          >
            {theme.isDark ? 'Light' : 'Dark'}
          </button>
        </div>
        
        {/* Country Selection */}
        <div style={{ marginBottom: theme.spacing.lg }}>
          <label className="form-label fw-bold" style={{ color: theme.colors.text }}>
            {strings.countryRegion}
          </label>
          <select 
            className="form-select" 
            value={country} 
            onChange={e => setCountry(e.target.value)}
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
            {Object.entries(countryRules).map(([code, rules]) => (
              <option key={code} value={code}>{rules.label}</option>
            ))}
          </select>
          {countryRules[country] && (
            <small style={{ color: theme.colors.textMuted }}>
              {strings.allowedCurrencies}: {countryRules[country].currencies.join(', ')}
              {countryRules[country].trnLength && ` • ${strings.trnLength}: ${countryRules[country].trnLength} ${strings.characters}`}
            </small>
          )}
        </div>

        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
          className="form-control"
          style={{ 
            marginBottom: theme.spacing.lg,
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
            color: theme.colors.text
          }}
          aria-label={strings.fileUpload}
        />

        <div className="form-check" style={{ marginBottom: theme.spacing.md }}>
          <input 
            type="checkbox" 
            checked={emailOptIn}
            onChange={e => setEmailOptIn(e.target.checked)}
            className="form-check-input"
            id="emailOptInCheck"
          />
          <label className="form-check-label" htmlFor="emailOptInCheck" style={{ color: theme.colors.text }}>
            {strings.emailOptIn}
          </label>
        </div>

        {emailOptIn && (
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="form-control"
            style={{ 
              marginBottom: theme.spacing.lg,
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
            placeholder={strings.emailPlaceholder}
            aria-label={strings.emailPlaceholder}
            required
          />
        )}

        <button
          disabled={loading}
          onClick={analyzeFile}
          className="btn btn-primary w-100"
          style={{ 
            marginBottom: theme.spacing.md,
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary
          }}
        >
          {loading ? strings.processing : strings.analyze}
        </button>

        {error && (
          <div 
            className="alert alert-danger" 
            role="alert"
            style={{ backgroundColor: `${theme.colors.danger}20`, borderColor: theme.colors.danger, color: theme.colors.danger }}
          >
            {error}
          </div>
        )}

        {!report && !loading && !error && (
          <EmptyState
            icon="📊"
            title={strings.noReportYet}
            description={strings.uploadFileToStart}
            theme={theme}
          />
        )}

        {report && (
          <div>
            <div className="row" style={{ marginBottom: theme.spacing.md }}>
              <div className="col-md-6">
                <button 
                  onClick={handlePdfExport} 
                  className="btn btn-secondary w-100 mb-2"
                  style={{ backgroundColor: theme.colors.secondary }}
                >
                  {strings.exportPdf}
                </button>
              </div>
              <div className="col-md-6">
                <button 
                  onClick={handleTestbedHandoff} 
                  className="btn btn-success w-100 mb-2"
                  style={{ backgroundColor: theme.colors.success }}
                >
                  {strings.openTestbed}
                </button>
              </div>
            </div>

            <h2 style={{ marginBottom: theme.spacing.md, color: theme.colors.primary }}>
              {strings.reportFor} {report.countryLabel}
            </h2>
            
            {["data", "coverage", "rules", "posture", "overall"].map(score => (
              <div key={score} style={{ marginBottom: theme.spacing.md }}>
                <div className="fw-bold mb-1" style={{ color: theme.colors.text }}>
                  {strings[score + 'Score'] || (score.charAt(0).toUpperCase() + score.slice(1) + ' Score')}: {report.scores[score]}
                </div>
                <LinearProgress
                  variant="determinate"
                  value={report.scores[score]}
                  color={score === "overall" ? "success" : "info"}
                  style={{ height: 10, borderRadius: 5 }}
                />
              </div>
            ))}

            <div style={{ marginBottom: theme.spacing.lg }}>
              <h3 style={{ color: theme.colors.text }}>{strings.ruleFindings}</h3>
              {report.ruleFindings.map((r, idx) => (
                <div
                  key={idx}
                  style={{ 
                    color: r.ok ? theme.colors.success : theme.colors.danger,
                    fontWeight: r.ok ? 'normal' : 'bold'
                  }}
                >
                  {r.rule}: {r.ok ? strings.pass : strings.fail}
                  {!r.ok && (
                    <span> - {strings.fixTips[r.rule] || r.tip}
                      {r.value && ` (Value: ${r.value})`}
                      {r.exampleLine && ` (Line: ${r.exampleLine})`}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: theme.spacing.lg }}>
              <h4 style={{ color: theme.colors.text }}>{strings.fieldMappingSkeleton}</h4>
              <p style={{ color: theme.colors.textMuted, fontSize: '0.9rem' }}>
                {strings.mappingDescription}
              </p>
              
              {Object.keys(report.mappingSkeleton).length > 0 ? (
                <>
                  <div 
                    style={{ 
                      backgroundColor: theme.colors.background, 
                      padding: theme.spacing.md, 
                      borderRadius: '5px',
                      border: `1px solid ${theme.colors.border}`
                    }}
                  >
                    <pre style={{ fontSize: '0.8rem', margin: 0, color: theme.colors.text }}>
                      {JSON.stringify(report.mappingSkeleton, null, 2)}
                    </pre>
                  </div>
                  <button 
                    onClick={handleMappingDownload} 
                    className="btn btn-outline-info btn-sm mt-2"
                    style={{ borderColor: theme.colors.info, color: theme.colors.info }}
                  >
                    {strings.downloadMapping}
                  </button>
                </>
              ) : (
                <EmptyState
                  icon="🗺️"
                  title={strings.noMappingAvailable}
                  description=""
                  theme={theme}
                />
              )}
            </div>

            <div style={{ marginBottom: theme.spacing.lg }}>
              <h4 style={{ color: theme.colors.text }}>{strings.gaps}:</h4>
              {report.gaps.length > 0 ? (
                <ul>
                  {report.gaps.map((gap, idx) => (
                    <li key={idx} style={{ color: theme.colors.warning }}>{gap}</li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon="✅"
                  title={strings.noGapsFound}
                  description=""
                  theme={theme}
                />
              )}
            </div>

            <div className="d-flex gap-3" style={{ marginBottom: theme.spacing.lg }}>
              <button 
                onClick={handleDownload} 
                className="btn btn-outline-primary flex-fill"
                style={{ borderColor: theme.colors.primary, color: theme.colors.primary }}
              >
                {strings.downloadReport}
              </button>
              <button 
                onClick={handleShare} 
                className="btn btn-outline-secondary flex-fill"
                style={{ borderColor: theme.colors.secondary, color: theme.colors.secondary }}
              >
                {strings.shareReport}
              </button>
            </div>

            <details style={{ marginTop: theme.spacing.lg }}>
              <summary style={{ color: theme.colors.text, cursor: 'pointer' }}>
                {strings.rawJsonOutput}
              </summary>
              <pre style={{
                fontSize: "0.875rem",
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                padding: theme.spacing.md,
                borderRadius: "10px",
                overflowX: "auto",
                border: `1px solid ${theme.colors.border}`,
                marginTop: theme.spacing.sm
              }}>
                {JSON.stringify(report, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
