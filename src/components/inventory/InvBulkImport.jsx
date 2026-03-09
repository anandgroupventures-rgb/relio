"use client";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { addLead } from "@/lib/firebase/leads";
import { useAuth } from "@/lib/hooks/useAuth";
import { findDuplicate } from "@/lib/utils/leadHelpers";
import styles from "./BulkImport.module.css";

// Flexible column name mapping
const COL_MAP = {
  name:            ["name","full name","client name","lead name","contact"],
  mobile:          ["mobile","phone","mobile number","phone number","contact number","number"],
  email:           ["email","email id","email address"],
  source:          ["source","lead source","from"],
  type:            ["type","buy or rent","looking for"],
  projectInterest: ["project","area","location","project interest","interested in"],
  budget:          ["budget","price range"],
  remarks:         ["remarks","notes","comment","note"],
};

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

export default function BulkImport({ leads, onDone, onCancel }) {
  const { user }     = useAuth();
  const fileRef      = useRef(null);
  const [rows,       setRows]       = useState([]);
  const [colMap,     setColMap]     = useState({});
  const [headers,    setHeaders]    = useState([]);
  const [preview,    setPreview]    = useState([]);
  const [step,       setStep]       = useState(1); // 1=upload, 2=preview, 3=done
  const [importing,  setImporting]  = useState(false);
  const [result,     setResult]     = useState({ imported:0, skipped:0 });
  const [progress,   setProgress]   = useState(0); // live counter during import

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const wb   = XLSX.read(evt.target.result, { type: "binary" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });
      if (data.length < 2) return;
      const hdr  = data[0].map(h => h?.toString().trim());
      const map  = mapColumns(hdr);
      setHeaders(hdr);
      setColMap(map);
      setRows(data.slice(1));
      const prev = data.slice(1, 6).map(row => ({
        name:   row[map.name]   || "",
        mobile: row[map.mobile] || "",
        source: row[map.source] || "",
      }));
      setPreview(prev);
      setStep(2);
    };
    reader.readAsBinaryString(file);
  }

  async function handleImport() {
    if (!user?.uid) return;
    setImporting(true);
    setProgress(0);
    let imported = 0, skipped = 0;
    for (const row of rows) {
      const name   = row[colMap.name]?.toString().trim();
      const mobile = row[colMap.mobile]?.toString().trim();
      if (!name || !mobile) { skipped++; continue; }
      if (findDuplicate(leads, mobile)) { skipped++; continue; }
      try {
        await addLead(user.uid, {
          name, mobile,
          email:           row[colMap.email]           || "",
          source:          row[colMap.source]          || "",
          type:            row[colMap.type]            || "Buy",
          projectInterest: row[colMap.projectInterest] || "",
          budget:          row[colMap.budget]          || "",
          remarks:         row[colMap.remarks]         || "",
        });
        imported++;
        setProgress(imported); // ← update live counter after each successful write
      } catch (err) {
        console.error("Bulk import row error:", err);
        skipped++;
      }
    }
    setResult({ imported, skipped });
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
            <p className={styles.templateTitle}>Expected columns (any order, any spelling close to these):</p>
            <p className={styles.templateCols}>Name · Mobile · Email · Source · Type · Project · Budget · Remarks</p>
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
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th><th>Mobile</th><th>Source</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r,i) => (
                <tr key={i}>
                  <td>{r.name   || <span className={styles.missing}>—</span>}</td>
                  <td>{r.mobile || <span className={styles.missing}>—</span>}</td>
                  <td>{r.source || <span className={styles.missing}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 5 && <p className={styles.more}>…and {rows.length - 5} more rows</p>}
          <p className={styles.dupNote}>Duplicate mobile numbers will be skipped automatically.</p>
          <button className="relio-btn relio-btn-primary" onClick={handleImport}
            disabled={importing} style={{ width:"100%", marginTop:8 }}>
            {importing ? `Importing… (${progress} done)` : `Import ${rows.length} Leads`}
          </button>
        </>
      )}

      {step === 3 && (
        <div className={styles.done}>
          <span className={styles.doneIcon}>✅</span>
          <p className={styles.doneTitle}>Import complete</p>
          <p className={styles.doneSub}><strong>{result.imported}</strong> leads imported</p>
          {result.skipped > 0 && (
            <p className={styles.skipped}>{result.skipped} rows skipped (duplicates or missing name/mobile)</p>
          )}
          <button className="relio-btn relio-btn-primary" onClick={onDone} style={{ width:"100%", marginTop:16 }}>
            Done
          </button>
        </div>
      )}

      {onCancel && step !== 3 && (
        <button className="relio-btn relio-btn-ghost" onClick={onCancel}
          style={{ width:"100%", marginTop:8 }}>Cancel</button>
      )}
    </div>
  );
}
