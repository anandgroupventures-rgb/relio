"use client";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { addLead, updateLead } from "@/lib/firebase/leads";
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
  const [result,     setResult]     = useState({ imported:0, skipped:0, merged:0 });
  const [duplicates, setDuplicates] = useState([]); // rows with duplicate mobiles
  const [mergeMode,  setMergeMode]  = useState(false); // if true, update existing leads instead of skip

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
            if (row[colMap.type]) updates.type = row[colMap.type];
            if (row[colMap.projectInterest]) updates.projectInterest = row[colMap.projectInterest];
            if (row[colMap.budget]) updates.budget = row[colMap.budget];
            if (row[colMap.remarks]) updates.remarks = row[colMap.remarks];
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
          type:            row[colMap.type]            || "Buyer",
          projectInterest: row[colMap.projectInterest] || "",
          budget:          row[colMap.budget]          || "",
          remarks:         row[colMap.remarks]         || "",
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
