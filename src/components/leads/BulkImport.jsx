"use client";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { addLead, updateLead } from "@/lib/firebase/leads";
import { useAuth } from "@/lib/hooks/useAuth";
import { findDuplicate } from "@/lib/utils/leadHelpers";
import { todayStr } from "@/lib/utils/dateHelpers";
import { BHK_OPTIONS, LEAD_TYPES } from "@/lib/utils/constants";
import styles from "./BulkImport.module.css";

// ─── Flexible column name mapping ───────────────────────────────────────────
const COL_MAP = {
  name:            ["name","full name","client name","lead name","contact","customer name"],
  mobile:          ["mobile","phone","mobile number","phone number","contact number","cell"],
  email:           ["email","email id","email address","e-mail"],
  source:          ["source","lead source","from","channel","referral source"],
  type:            ["type","category","lead type","buy or rent","looking for","client type","lead category"],
  projectInterest: ["project","area","location","project interest","interested in","property","locality","locality interest"],
  budget:          ["budget","price range","asking price","expected price"],
  remarks:         ["remarks","notes","comment","note","comments","additional notes"],
  leadDate:        ["lead date","date","capture date","captured date","entry date","created date","enquiry date","captured on","date captured","date of capture","acquired date","date acquired"],
  bhk:             ["bhk","configuration","unit type","property type","bedroom","bedrooms","unit"],
  status:          ["status","lead status","current status","stage"],
  followUpDate:    ["follow up","follow-up","followup date","next call","reminder","callback date","next follow up"],
  locality:        ["locality","city","neighborhood","sector","block"],
};

// ─── Normalize lead type ─────────────────────────────────────────────────────
function normalizeType(val) {
  if (!val) return "Buyer";
  const v = val.toString().trim().toLowerCase();
  if (v.includes("sell") || v.includes("sell")) return "Seller";
  if (v.includes("buy") || v.includes("purchase")) return "Buyer";
  if (v.includes("rent") && v.includes("out")) return "Landlord";
  if (v.includes("rent") || v.includes("tenant")) return "Tenant";
  if (v.includes("landlord") || v.includes("owner")) return "Landlord";
  if (LEAD_TYPES.includes(val.toString().trim())) return val.toString().trim();
  return "Buyer";
}

// ─── Normalize BHK ───────────────────────────────────────────────────────────
function normalizeBhk(val) {
  if (!val) return "";
  const v = val.toString().trim();
  // Direct match first
  if (BHK_OPTIONS.includes(v)) return v;
  // Fuzzy match
  const lower = v.toLowerCase();
  if (lower.includes("studio")) return "Studio";
  if (lower.includes("1") || lower.includes("one")) return "1 BHK";
  if (lower.includes("2") || lower.includes("two")) return "2 BHK";
  if (lower.includes("3") || lower.includes("three")) return "3 BHK";
  if (lower.includes("4") || lower.includes("four")) return "4 BHK";
  if (lower.includes("5") || lower.includes("five")) return "5 BHK";
  if (lower.includes("villa")) return "Villa";
  if (lower.includes("plot") || lower.includes("land")) return "Plot / Land";
  if (lower.includes("commercial")) return "Commercial";
  return v;
}

// ─── Normalize date ────────────────────────────────────────────────────────
function normalizeDate(val) {
  if (!val) return todayStr();

  // Already ISO → return as-is
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;

  // JS Date object (from XLSX auto-parse)
  if (val instanceof Date && !isNaN(val.getTime())) {
    return `${val.getFullYear()}-${String(val.getMonth() + 1).padStart(2, '0')}-${String(val.getDate()).padStart(2, '0')}`;
  }

  const str = val.toString().trim();

  // DD/MM/YYYY or DD-MM-YYYY (Indian / European format)
  const ddmm = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (ddmm) {
    const [, day, month, year] = ddmm;
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    // If day > 12, it's definitely DD/MM/YYYY
    // If month > 12, it's definitely DD/MM/YYYY
    // Otherwise default to DD/MM/YYYY since user's data is in this format
    if (d > 12 || m > 12 || d <= 12) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  // Try native Date parse as last resort
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  return todayStr();
}

// ─── Normalize status ──────────────────────────────────────────────────────
function normalizeStatus(val) {
  if (!val) return "new";
  const v = val.toString().trim().toLowerCase().replace(/\s+/g, "_");
  const valid = [
    "new","contacted","interested","details_shared","visit_scheduled",
    "visit_done","negotiating","converted","call_back","not_answering",
    "busy","switched_off","not_interested","lost","invalid_number"
  ];
  if (valid.includes(v)) return v;
  // Common synonyms
  if (v.includes("new")) return "new";
  if (v.includes("contact")) return "contacted";
  if (v.includes("interest")) return "interested";
  if (v.includes("detail")) return "details_shared";
  if (v.includes("visit_scheduled")) return "visit_scheduled";
  if (v.includes("visit_done") || v.includes("visited")) return "visit_done";
  if (v.includes("negotiat")) return "negotiating";
  if (v.includes("convert") || v.includes("won") || v.includes("closed")) return "converted";
  if (v.includes("call_back") || v.includes("callback")) return "call_back";
  if (v.includes("not_answer") || v.includes("no answer")) return "not_answering";
  if (v.includes("busy")) return "busy";
  if (v.includes("switch")) return "switched_off";
  if (v.includes("not_interest") || v.includes("not interested")) return "not_interested";
  if (v.includes("lost") || v.includes("dead")) return "lost";
  if (v.includes("invalid") || v.includes("wrong")) return "invalid_number";
  return "new";
}

function mapColumns(header) {
  const map = {};
  header.forEach((h, i) => {
    const key = h?.toString().trim().toLowerCase();
    Object.entries(COL_MAP).forEach(([field, aliases]) => {
      if (aliases.includes(key)) map[field] = i;
    });
  });
  return map;
}

// Build a human-readable mapping summary
function buildMappingSummary(map, headers) {
  const summary = [];
  Object.entries(COL_MAP).forEach(([field, aliases]) => {
    const idx = map[field];
    if (idx !== undefined && headers[idx]) {
      summary.push({ field, header: headers[idx], aliases });
    }
  });
  return summary;
}

export default function BulkImport({ leads, onDone, onCancel }) {
  const { user }     = useAuth();
  const fileRef      = useRef(null);
  const [rows,       setRows]       = useState([]);
  const [colMap,     setColMap]     = useState({});
  const [headers,    setHeaders]    = useState([]);
  const [preview,    setPreview]    = useState([]);
  const [step,       setStep]       = useState(1); // 1=upload, 2=preview, 3=done
  const [importing,  setImporting]  = useState(false);
  const [result,     setResult]     = useState({ imported:0, skipped:0, merged:0 });
  const [duplicates, setDuplicates] = useState([]); // rows with duplicate mobiles
  const [mergeMode,  setMergeMode]  = useState(false);
  const [mappingSummary, setMappingSummary] = useState([]);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const wb   = XLSX.read(evt.target.result, { type: "binary" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:"", raw:true });
      if (data.length < 2) return;
      const hdr  = data[0].map(h => h?.toString().trim());
      const map  = mapColumns(hdr);
      setHeaders(hdr);
      setColMap(map);
      setMappingSummary(buildMappingSummary(map, hdr));
      const allRows = data.slice(1);
      // Detect duplicates
      const dups = [];
      const cleanRows = [];
      for (const row of allRows) {
        const mobile = row[map.mobile]?.toString().trim();
        const dup = mobile ? findDuplicate(leads, mobile) : null;
        if (dup) dups.push({ row, dup, mobile });
        else cleanRows.push(row);
      }
      setDuplicates(dups);
      setRows(allRows);
      const prev = allRows.slice(0, 5).map(row => ({
        name:     row[map.name]   || "",
        mobile:   row[map.mobile] || "",
        source:   row[map.source] || "",
        type:     normalizeType(row[map.type]),
        bhk:      normalizeBhk(row[map.bhk]),
        leadDate: normalizeDate(row[map.leadDate]),
      }));
      setPreview(prev);
      setStep(2);
    };
    reader.readAsBinaryString(file);
  }

  async function handleImport() {
    setImporting(true);
    let imported = 0, skipped = 0, merged = 0;
    for (const row of rows) {
      const name   = row[colMap.name]?.toString().trim();
      const mobile = row[colMap.mobile]?.toString().trim();
      if (!name || !mobile) { skipped++; continue; }
      const dup = findDuplicate(leads, mobile);
      if (dup) {
        if (mergeMode) {
          // Merge new data into existing lead
          try {
            const updates = {};
            if (row[colMap.email]) updates.email = row[colMap.email];
            if (row[colMap.source]) updates.source = row[colMap.source];
            if (row[colMap.type]) updates.type = normalizeType(row[colMap.type]);
            if (row[colMap.projectInterest]) updates.projectInterest = row[colMap.projectInterest];
            if (row[colMap.budget]) updates.budget = row[colMap.budget];
            if (row[colMap.remarks]) updates.remarks = row[colMap.remarks];
            if (row[colMap.bhk]) updates.bhk = normalizeBhk(row[colMap.bhk]);
            if (row[colMap.status]) updates.status = normalizeStatus(row[colMap.status]);
            if (row[colMap.followUpDate]) updates.followUpDate = row[colMap.followUpDate];
            if (row[colMap.locality]) updates.locality = row[colMap.locality];
            if (row[colMap.leadDate]) updates.leadDate = normalizeDate(row[colMap.leadDate]);
            if (Object.keys(updates).length > 0) {
              await updateLead(user.uid, dup.id, updates);
              merged++;
            } else {
              skipped++;
            }
          } catch { skipped++; }
        } else {
          skipped++;
        }
        continue;
      }
      try {
        await addLead(user.uid, {
          name, mobile,
          email:           row[colMap.email]           || "",
          source:          row[colMap.source]          || "",
          type:            normalizeType(row[colMap.type]),
          projectInterest: row[colMap.projectInterest] || row[colMap.locality] || "",
          budget:          row[colMap.budget]          || "",
          remarks:         row[colMap.remarks]         || "",
          bhk:             normalizeBhk(row[colMap.bhk]),
          status:          normalizeStatus(row[colMap.status]),
          followUpDate:    row[colMap.followUpDate]    || "",
          locality:        row[colMap.locality]        || "",
          leadDate:        normalizeDate(row[colMap.leadDate]),
        });
        imported++;
      } catch { skipped++; }
    }
    setResult({ imported, skipped, merged });
    setStep(3);
    setImporting(false);
  }

  return (
    <div className={styles.wrap}>

      {step === 1 && (
        <>
          <div className={styles.uploadZone} onClick={() => fileRef.current?.click()}>
            <span className={styles.uploadIcon}>📂</span>
            <p className={styles.uploadTitle}>Tap to upload Excel or CSV</p>
            <p className={styles.uploadSub}>Columns should include: Name, Mobile. All others optional.</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
              onChange={handleFile} />
          </div>
          <div className={styles.template}>
            <p className={styles.templateTitle}>Expected columns (any order, close spelling works):</p>
            <p className={styles.templateCols}>
              Name · Mobile · Email · Source · Type/Category · BHK · Project/Area · Locality · Budget · Status · Follow-up Date · Lead Date · Remarks
            </p>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className={styles.previewHeader}>
            <span className={styles.previewCount}>Found <strong>{rows.length}</strong> rows</span>
            <button className={styles.reupload} onClick={() => { setStep(1); fileRef.current.value=""; }}>
              ↩ Re-upload
            </button>
          </div>

          {/* Column mapping summary */}
          {mappingSummary.length > 0 && (
            <div className={styles.mappingBox}>
              <p className={styles.mappingTitle}>Matched columns</p>
              <div className={styles.mappingList}>
                {mappingSummary.map(m => (
                  <span key={m.field} className={styles.mappingChip}>
                    <strong>{m.header}</strong> → {m.field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}
                  </span>
                ))}
              </div>
              {Object.keys(colMap).length === 0 && (
                <p className={styles.mappingWarn}>No recognizable columns found. Make sure headers are in the first row.</p>
              )}
            </div>
          )}

          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th><th>Mobile</th><th>Type</th><th>BHK</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r,i) => (
                <tr key={i}>
                  <td>{r.name   || <span className={styles.missing}>—</span>}</td>
                  <td>{r.mobile || <span className={styles.missing}>—</span>}</td>
                  <td>{r.type   || <span className={styles.missing}>—</span>}</td>
                  <td>{r.bhk    || <span className={styles.missing}>—</span>}</td>
                  <td>{r.leadDate || <span className={styles.missing}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 5 && <p className={styles.more}>…and {rows.length - 5} more rows</p>}
          <p className={styles.dupNote}>Duplicate mobile numbers will be skipped automatically.</p>
          {duplicates.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: 10, background: "var(--r-warning-bg)", borderRadius: "var(--r-radius)" }}>
              <span className="text-body-md" style={{ color: "var(--r-warning)", fontWeight: 600 }}>
                {duplicates.length} duplicate{duplicates.length > 1 ? "s" : ""} found
              </span>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", cursor: "pointer" }}>
                <input type="checkbox" checked={mergeMode} onChange={e => setMergeMode(e.target.checked)} />
                <span className="text-body-md" style={{ color: "var(--r-on-surface-variant)" }}>Update existing leads</span>
              </label>
            </div>
          )}
          <button className="r-btn r-btn-primary" onClick={handleImport}
            disabled={importing} style={{ width:"100%", marginTop:8 }}>
            {importing ? `Importing… (${result.imported} done)` : `Import ${rows.length} Leads`}
          </button>
        </>
      )}

      {step === 3 && (
        <div className={styles.done}>
          <span className={styles.doneIcon}>✅</span>
          <p className={styles.doneTitle}>Import complete</p>
          <p className={styles.doneSub}><strong>{result.imported}</strong> leads imported</p>
          {result.merged > 0 && (
            <p className={styles.doneSub} style={{ color: "var(--r-warning)" }}><strong>{result.merged}</strong> existing leads updated</p>
          )}
          {result.skipped > 0 && (
            <p className={styles.skipped}>{result.skipped} rows skipped (missing name/mobile)</p>
          )}
          <button className="r-btn r-btn-primary" onClick={onDone} style={{ width:"100%", marginTop:16 }}>
            Done
          </button>
        </div>
      )}

      {onCancel && step !== 3 && (
        <button className="r-btn r-btn-ghost" onClick={onCancel}
          style={{ width:"100%", marginTop:8 }}>Cancel</button>
      )}
    </div>
  );
}
