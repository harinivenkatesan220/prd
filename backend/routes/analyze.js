const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { parse } = require('csv-parse/sync');
const db = require('../db');
const fs = require('fs');
const path = require('path');
const { sendReportEmail } = require('../utils/email');

const router = express.Router();
const schema = JSON.parse(fs.readFileSync(path.join(__dirname, '../gets_v0_1_schema.json'), 'utf8'));


const countryRules = {
  UAE: { currencies: ['AED'], trnLength: 15, label: 'United Arab Emirates' },
  KSA: { currencies: ['SAR'], trnLength: 15, label: 'Kingdom of Saudi Arabia' },
  MY: { currencies: ['MYR'], trnLength: 12, label: 'Malaysia' },
  GLOBAL: { currencies: ['AED', 'SAR', 'MYR', 'USD'], trnLength: null, label: 'Global (All Currencies)' }
};

const ruleTips = {
  DATE_ISO: "Use format YYYY-MM-DD",
  CURRENCY_ALLOWED: "Check allowed currencies for selected country",
  TRN_PRESENT: "TRN must be non-empty",
  TRN_LENGTH: "TRN must match country-specific length requirements",
  LINE_MATH: "line_total = qty * unit_price",
  TOTALS_BALANCE: "total_incl_vat = total_excl_vat + vat_amount"
};

function normalize(str) {
  return str.toLowerCase().replace(/[_\s]/g, '');
}

function parseData(rawData) {
  try {
    if (rawData.trim().startsWith('[') || rawData.trim().startsWith('{')) {
      return JSON.parse(rawData);
    } else {
      return parse(rawData, { columns: true, skip_empty_lines: true, from_line: 1, to_line: 200 });
    }
  } catch (err) {
    throw new Error('Parse error: ' + err.message);
  }
}

function checkTotalsBalance({ total_excl_vat = 0, vat_amount = 0, total_incl_vat = 0 }) {
  const diff = Math.abs(total_excl_vat + vat_amount - total_incl_vat);
  return { ok: diff <= 0.01, difference: diff };
}

function checkLineMath(lines) {
  if (!Array.isArray(lines)) return { ok: true };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const expected = (line.qty || 0) * (line.unit_price || 0);
    const diff = Math.abs(expected - (line.line_total || 0));
    if (diff > 0.01) {
      return { ok: false, exampleLine: i + 1, expected, got: line.line_total };
    }
  }
  return { ok: true };
}

function checkDateIso(dateStr) {
  if (!dateStr) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

function checkCurrency(currency, country = 'GLOBAL') {
  if (!currency) return false;
  return countryRules[country].currencies.includes(currency);
}

function checkTrnLength(trn, country = 'GLOBAL') {
  if (!trn) return false;
  const requiredLength = countryRules[country].trnLength;
  if (!requiredLength) return true; 
  return trn.length === requiredLength;
}

function checkTrn(buyerTrn, sellerTrn, country = 'GLOBAL') {
  const hasValues = !!(buyerTrn && buyerTrn.trim() !== '' && sellerTrn && sellerTrn.trim() !== '');
  if (!hasValues) return { present: false, validLength: false };
  
  const validBuyerLength = checkTrnLength(buyerTrn, country);
  const validSellerLength = checkTrnLength(sellerTrn, country);
  
  return {
    present: true,
    validLength: validBuyerLength && validSellerLength
  };
}

function findField(obj, keys) {
  if (!obj) return '';
  for (let key of keys) {
    if (obj[key] !== undefined) return obj[key];
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = obj;
      let found = true;
      for (let part of parts) {
        if (!current || current[part] === undefined) {
          found = false;
          break;
        }
        current = current[part];
      }
      if (found && current !== undefined) return current;
    }
  }
  return '';
}

function generateMappingSkeleton(invoice) {
  const mapping = {};
  const getsFields = [
    'date', 'currency', 'total_excl_vat', 'vat_amount', 'total_incl_vat',
    'buyer_trn', 'seller_trn', 'lines'
  ];
  
  Object.keys(invoice).forEach(sourceField => {
    const normalizedSource = normalize(sourceField);
    getsFields.forEach(getsField => {
      const normalizedGets = normalize(getsField);
      if (normalizedSource.includes(normalizedGets) || normalizedGets.includes(normalizedSource)) {
        mapping[sourceField] = getsField;
      }
    });
  });
  
  return mapping;
}

function analyzeInvoice(data, country = 'GLOBAL') {
  if (!data || !Array.isArray(data) || data.length === 0) {
    throw new Error('No invoice data available for analysis.');
  }
  const invoice = data[0];
  if (!invoice || typeof invoice !== 'object') {
    throw new Error('Invalid invoice data format.');
  }

  const total_excl_vat = invoice.total_excl_vat || 0;
  const vat_amount = invoice.vat_amount || 0;
  const total_incl_vat = invoice.total_incl_vat || 0;

  const ruleFindings = [];

  // Balance check
  const totalBalanceCheck = checkTotalsBalance({ total_excl_vat, vat_amount, total_incl_vat });
  ruleFindings.push({ 
    rule: 'TOTALS_BALANCE', 
    ok: totalBalanceCheck.ok, 
    tip: !totalBalanceCheck.ok ? ruleTips.TOTALS_BALANCE : undefined 
  });

 
  const lineMathCheck = checkLineMath(invoice.lines || []);
  ruleFindings.push({
    rule: 'LINE_MATH',
    ok: lineMathCheck.ok,
    exampleLine: lineMathCheck.exampleLine,
    expected: lineMathCheck.expected,
    got: lineMathCheck.got,
    tip: !lineMathCheck.ok ? ruleTips.LINE_MATH : undefined
  });

  const issueDate = findField(invoice, ['date', 'issue_date', 'invoice.issue_date', 'invoice.issuedate']);
  const dateIsoCheck = checkDateIso(issueDate);
  ruleFindings.push({ 
    rule: 'DATE_ISO', 
    ok: dateIsoCheck, 
    value: issueDate, 
    tip: !dateIsoCheck ? ruleTips.DATE_ISO : undefined 
  });


  const currency = findField(invoice, ['currency', 'invoice.currency']);
  const currencyCheck = checkCurrency(currency, country);
  ruleFindings.push({ 
    rule: 'CURRENCY_ALLOWED', 
    ok: currencyCheck, 
    value: currency, 
    tip: !currencyCheck ? `Allowed currencies for ${countryRules[country].label}: ${countryRules[country].currencies.join(', ')}` : undefined 
  });


  const buyerTrn = findField(invoice, ['buyer_trn', 'buyer.trn']);
  const sellerTrn = findField(invoice, ['seller_trn', 'seller.trn']);
  const trnCheck = checkTrn(buyerTrn, sellerTrn, country);
  
  ruleFindings.push({ 
    rule: 'TRN_PRESENT', 
    ok: trnCheck.present, 
    tip: !trnCheck.present ? ruleTips.TRN_PRESENT : undefined 
  });

  if (countryRules[country].trnLength) {
    ruleFindings.push({
      rule: 'TRN_LENGTH',
      ok: trnCheck.validLength,
      value: `Buyer: ${buyerTrn?.length || 0}, Seller: ${sellerTrn?.length || 0}`,
      tip: !trnCheck.validLength ? `TRN length must be ${countryRules[country].trnLength} characters for ${countryRules[country].label}` : undefined
    });
  }

  const rulesPassed = ruleFindings.filter(r => r.ok).length;
  const scores = {
    data: 100,
    coverage: 100,
    rules: Math.round((rulesPassed / ruleFindings.length) * 100),
    posture: 80,
  };
  scores.overall = Math.round(
    scores.data * 0.25 + scores.coverage * 0.35 + scores.rules * 0.3 + scores.posture * 0.1
  );

  const mappingSkeleton = generateMappingSkeleton(invoice);

  const report = {
    reportId: 'r_' + uuidv4(),
    uploadId: invoice.id || 'unknown',
    created_at: new Date().toISOString(),
    country: country,
    countryLabel: countryRules[country].label,
    scores,
    ruleFindings,
    gaps: ruleFindings.filter(r => !r.ok).map(r => `Failed ${r.rule}`),
    mappingSkeleton,
    testbedPayload: {
      invoice: invoice,
      mapping: mappingSkeleton,
      country: country,
      validationResults: ruleFindings
    },
    meta: { rowsParsed: Array.isArray(data) ? data.length : 1, db: 'sqlite' },
  };

  return report;
}

router.post('/', (req, res) => {
  const { uploadId, email, emailOptIn, country = 'GLOBAL' } = req.body;
  if (!uploadId) return res.status(400).json({ error: 'uploadId required' });


  if (!countryRules[country]) {
    return res.status(400).json({ error: 'Invalid country code' });
  }

  db.get('SELECT raw_data FROM uploads WHERE id=?', [uploadId], (err, row) => {
    if (err || !row) return res.status(404).json({ error: 'Upload not found' });

    let parsedData;
    try {
      parsedData = parseData(row.raw_data);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    let report;
    try {
      report = analyzeInvoice(parsedData, country);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    db.run(
      'INSERT INTO reports (id, upload_id, created_at, report_json) VALUES (?, ?, ?, ?)',
      [report.reportId, uploadId, new Date().toISOString(), JSON.stringify(report)],
      async (insertErr) => {
        if (insertErr) return res.status(500).json({ error: insertErr.message });

        if (emailOptIn && email) {
          const host = req.headers.host;
          const protocol = req.protocol;
          const reportUrl = `${protocol}://${host}/share/${report.reportId}`;
          try {
            await sendReportEmail(email, reportUrl);
          } catch (emailErr) {
            console.error('Failed to send email:', emailErr);
          }
        }

        res.json(report);
      }
    );
  });
});


router.get('/countries', (req, res) => {
  res.json(countryRules);
});

module.exports = router;
