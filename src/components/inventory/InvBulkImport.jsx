"use client";
import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { addInventory } from "@/lib/firebase/inventory";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "../leads/BulkImport.module.css";

const COL_MAP = {
  projectName:  ["project","project name","property","building"],
  type:         ["type","sale or rent","listing type"],
  bhk:          ["bhk","config","configuration","size type"],
  size:         ["size","sqft","area sqft","carpet area"],
  area:         ["area","location","sector","locality"],
  unit:         ["unit","flat","flat no","unit no"],
  ownerName:    ["owner","owner name","seller"],
  ownerMobile:  ["owner mobile","owner phone","seller mobile","contact"],
  price:        ["price","asking price","cost","rent"],
  remarks:      ["remarks","notes","comment"],
};

function mapCols(header) {
  const map = {};
  header.forEach((h, i) => {
    const key = h?.toString().trim().toLowerCase();
    Object.entries(COL_MAP).forEach(([field, aliases]) => {
      if (aliases.includes(key)) map[field] = i;
    });
  });
  return map;
}

export default function InvBulkImport({ onDone, onCancel }) {
  const { user }     = useAuth();
  const fileRef      = useRef(null);
  const [rows,       setRows]      = useState([]);
  const [colMap,     setColMap]    = useState({});
  const [preview,    setPreview]   = useState([]);
  const [step,       setStep]      = useState(1);
  const [importing,  setImporting] = useState(false);
  const [result,     setResult]    = useState({ imported:0, skipped:0 });

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const wb   = XLSX.read(evt.target.result, { type:"binary" });
      const ws   = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header:1, defval:"" });
      if (data.length < 2) return;
      const hdr = data[0].map(h => h?.toString().trim());
      const map = mapCols(hdr);
      setColMap(map);
      setRows(data.slice(1));
      setPreview(data.slice(1,6).map(row => ({
        project: row[map.projectName] || "",
        owner:   row[map.ownerName]   || "",
        price:   row[map.price]       || "",
      })));
      setStep(2);
    };
    reader.readAsBinaryString(file);
  }

  async function handleImport() {
    setImporting(true);
    let imported=0, skipped=0;
    for (const row of rows) {
      const projectName = row[colMap.projectName]?.toString().trim();
      const ownerName   = row[colMap.ownerName]?.toString().trim();
      const ownerMobile = row[colMap.ownerMobile]?.toString().trim();
      if (!projectName || !ownerName || !ownerMobile) { skipped++; continue; }
      try {
        await addInventory(user.uid, {
          projectName,
          ownerName,
          ownerMobile,
          type:         row[colMap.type]    || "Sale",
          bhk:          row[colMap.bhk]     || "",
          size:         row[colMap.size]    || "",
          area:         row[colMap.area]    || "",
          unit:         row[colMap.unit]    || "",
          price:        row[colMap.price]   || "",
          remarks:      row[colMap.remarks] || "",
          availability: "available",
        });
        imported++;
      } catch { skipped++; }
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
            <p className={styles.uploadSub}>Needs: Project Name, Owner Name, Owner Mobile.</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }}
              onChange={handleFile} />
          </div>
          <div className={styles.template}>
            <p className={styles.templateTitle}>Expected columns:</p>
            <p className={styles.templateCols}>Project Name · Owner Name · Owner Mobile · Type · BHK · Size · Area · Unit · Price · Remarks</p>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className={styles.previewHeader}>
            <span className={styles.previewCount}>Found <strong>{rows.length}</strong> rows</span>
            <button className={styles.reupload} onClick={() => setStep(1)}>↩ Re-upload</button>
          </div>
          <table className={styles.table}>
            <thead><tr><th>Project</th><th>Owner</th><th>Price</th></tr></thead>
            <tbody>
              {preview.map((r,i) => (
                <tr key={i}>
                  <td>{r.project || <span className={styles.missing}>—</span>}</td>
                  <td>{r.owner   || <span className={styles.missing}>—</span>}</td>
                  <td>{r.price   || <span className={styles.missing}>—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 5 && <p className={styles.more}>…and {rows.length-5} more rows</p>}
          <button className="relio-btn relio-btn-primary" onClick={handleImport}
            disabled={importing} style={{ width:"100%", marginTop:8 }}>
            {importing ? "Importing…" : `Import ${rows.length} Properties`}
          </button>
        </>
      )}

      {step === 3 && (
        <div className={styles.done}>
          <span className={styles.doneIcon}>✅</span>
          <p className={styles.doneTitle}>Import complete</p>
          <p className={styles.doneSub}><strong>{result.imported}</strong> properties imported</p>
          {result.skipped > 0 && <p className={styles.skipped}>{result.skipped} rows skipped</p>}
          <button className="relio-btn relio-btn-primary" onClick={onDone} style={{ width:"100%", marginTop:16 }}>Done</button>
        </div>
      )}
      {onCancel && step !== 3 && (
        <button className="relio-btn relio-btn-ghost" onClick={onCancel} style={{ width:"100%", marginTop:8 }}>Cancel</button>
      )}
    </div>
  );
}
