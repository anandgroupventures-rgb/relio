"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { useLeads } from "@/lib/hooks/useLeads";
import { useInventory } from "@/lib/hooks/useInventory";
import {
  ArrowLeft, Bell, Plus, Wallet, CheckCircle, Clock, AlertCircle, Save, X,
  TrendingUp, Users, Handshake, ChevronDown, Receipt, Fuel, Phone, Megaphone,
  PieChart, IndianRupee, Calendar
} from "lucide-react";
import styles from "./deals.module.css";

function loadDeals() {
  if (typeof window === "undefined") return [];
  try { const v = localStorage.getItem("relio_deals"); return v ? JSON.parse(v) : []; } catch { return []; }
}
function saveDeals(deals) {
  try { localStorage.setItem("relio_deals", JSON.stringify(deals)); } catch {}
}
function loadExpenses() {
  if (typeof window === "undefined") return [];
  try { const v = localStorage.getItem("relio_expenses"); return v ? JSON.parse(v) : []; } catch { return []; }
}
function saveExpenses(expenses) {
  try { localStorage.setItem("relio_expenses", JSON.stringify(expenses)); } catch {}
}

const EXPENSE_CATEGORIES = [
  { id: "petrol", label: "Petrol / Travel", icon: <Fuel size={14} /> },
  { id: "phone", label: "Phone Bill", icon: <Phone size={14} /> },
  { id: "marketing", label: "Marketing / Ads", icon: <Megaphone size={14} /> },
  { id: "portal", label: "Portal Subscription", icon: <Receipt size={14} /> },
  { id: "other", label: "Other", icon: <Receipt size={14} /> },
];

export default function DealsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { leads } = useLeads();
  const { inventory } = useInventory();

  const [deals, setDeals] = useState(loadDeals);
  const [expenses, setExpenses] = useState(loadExpenses);
  const [activeTab, setActiveTab] = useState("deals"); // deals | expenses | dashboard
  const [showAdd, setShowAdd] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [showMilestones, setShowMilestones] = useState(null);

  const [form, setForm] = useState({
    leadId: "", propertyId: "", projectName: "", dealValue: "", commissionPercent: "1",
    status: "pending", notes: "", closedDate: "", tokenAmount: ""
  });
  const [expenseForm, setExpenseForm] = useState({
    category: "petrol", amount: "", note: "", date: new Date().toISOString().split("T")[0]
  });
  const [milestoneForm, setMilestoneForm] = useState({ label: "", amount: "", dueDate: "", status: "pending" });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setExp = (k) => (e) => setExpenseForm(f => ({ ...f, [k]: e.target.value }));

  function handleAddDeal() {
    if (!form.leadId || !form.dealValue) return;
    const lead = leads.find(l => l.id === form.leadId);
    const prop = inventory.find(i => i.id === form.propertyId);
    const value = parseFloat(form.dealValue) || 0;
    const pct = parseFloat(form.commissionPercent) || 0;
    const token = parseFloat(form.tokenAmount) || 0;
    const newDeal = {
      id: Date.now().toString(),
      ...form,
      leadName: lead?.name || "Unknown",
      leadMobile: lead?.mobile || "",
      propertyName: prop?.projectName || form.projectName || "",
      dealValue: value,
      commissionPercent: pct,
      commissionAmount: (value * pct) / 100,
      tokenAmount: token,
      milestones: token > 0 ? [{
        id: "token", label: "Token Amount", amount: token,
        dueDate: form.closedDate || new Date().toISOString().split("T")[0],
        status: form.status === "received" ? "received" : "pending"
      }] : [],
      createdAt: new Date().toISOString(),
    };
    const next = [newDeal, ...deals];
    setDeals(next);
    saveDeals(next);
    setShowAdd(false);
    setForm({ leadId: "", propertyId: "", projectName: "", dealValue: "", commissionPercent: "1", status: "pending", notes: "", closedDate: "", tokenAmount: "" });
  }

  function handleAddExpense() {
    if (!expenseForm.amount) return;
    const newExp = {
      id: Date.now().toString(),
      ...expenseForm,
      amount: parseFloat(expenseForm.amount) || 0,
    };
    const next = [newExp, ...expenses];
    setExpenses(next);
    saveExpenses(next);
    setShowExpense(false);
    setExpenseForm({ category: "petrol", amount: "", note: "", date: new Date().toISOString().split("T")[0] });
  }

  function handleAddMilestone(dealId) {
    if (!milestoneForm.label || !milestoneForm.amount) return;
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;
    const newMilestone = {
      id: Date.now().toString(),
      label: milestoneForm.label,
      amount: parseFloat(milestoneForm.amount) || 0,
      dueDate: milestoneForm.dueDate,
      status: milestoneForm.status,
    };
    const updated = { ...deal, milestones: [...(deal.milestones || []), newMilestone] };
    const next = deals.map(d => d.id === dealId ? updated : d);
    setDeals(next);
    saveDeals(next);
    setMilestoneForm({ label: "", amount: "", dueDate: "", status: "pending" });
  }

  function handleMilestoneStatus(dealId, milestoneId, status) {
    const next = deals.map(d => {
      if (d.id !== dealId) return d;
      return {
        ...d,
        milestones: d.milestones.map(m => m.id === milestoneId ? { ...m, status } : m)
      };
    });
    setDeals(next);
    saveDeals(next);
  }

  function handleStatusChange(id, status) {
    const next = deals.map(d => d.id === id ? { ...d, status } : d);
    setDeals(next);
    saveDeals(next);
  }

  function handleDelete(id) {
    const next = deals.filter(d => d.id !== id);
    setDeals(next);
    saveDeals(next);
  }

  function handleDeleteExpense(id) {
    const next = expenses.filter(e => e.id !== id);
    setExpenses(next);
    saveExpenses(next);
  }

  // ─── Dashboard calculations ────────────────────────────────────────────
  const totalValue = deals.reduce((s, d) => s + (d.dealValue || 0), 0);
  const totalCommission = deals.reduce((s, d) => s + (d.commissionAmount || 0), 0);
  const pendingCommission = deals.filter(d => d.status === "pending").reduce((s, d) => s + (d.commissionAmount || 0), 0);
  const receivedCommission = deals.filter(d => d.status === "received").reduce((s, d) => s + (d.commissionAmount || 0), 0);
  const partialCommission = deals.filter(d => d.status === "partial").reduce((s, d) => s + (d.commissionAmount || 0), 0);
  const closedDeals = deals.filter(d => d.status === "received").length;

  // Monthly breakdown
  const monthly = useMemo(() => {
    const months = {};
    deals.forEach(d => {
      const month = d.closedDate ? d.closedDate.slice(0, 7) : d.createdAt.slice(0, 7);
      if (!months[month]) months[month] = { commission: 0, deals: 0, expenses: 0 };
      if (d.status === "received" || d.status === "partial") {
        months[month].commission += (d.commissionAmount || 0);
        months[month].deals += 1;
      }
    });
    expenses.forEach(e => {
      const month = e.date.slice(0, 7);
      if (!months[month]) months[month] = { commission: 0, deals: 0, expenses: 0 };
      months[month].expenses += (e.amount || 0);
    });
    return Object.entries(months)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 6);
  }, [deals, expenses]);

  // Source ROI
  const sourceROI = useMemo(() => {
    const roi = {};
    deals.forEach(d => {
      const lead = leads.find(l => l.id === d.leadId);
      const source = lead?.source || "Unknown";
      if (!roi[source]) roi[source] = { spent: 0, earned: 0, deals: 0 };
      if (d.status === "received" || d.status === "partial") {
        roi[source].earned += (d.commissionAmount || 0);
        roi[source].deals += 1;
      }
    });
    // Add marketing expenses to source costs
    expenses.filter(e => e.category === "marketing").forEach(e => {
      // Attribute to Meta Ads if note contains it, else generic
      const source = e.note?.toLowerCase().includes("meta") ? "Meta Ads" :
        e.note?.toLowerCase().includes("google") ? "Google Ads" : "Marketing";
      if (!roi[source]) roi[source] = { spent: 0, earned: 0, deals: 0 };
      roi[source].spent += (e.amount || 0);
    });
    return Object.entries(roi).filter(([, v]) => v.earned > 0 || v.spent > 0);
  }, [deals, expenses, leads]);

  const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <button className={styles.backBtn} onClick={() => router.push("/settings")}>
              <ArrowLeft size={22} color="var(--r-primary)" />
            </button>
            <h1 className="text-headline-md" style={{ color: "var(--r-primary)" }}>Deals & Commission</h1>
          </div>
          <button className={styles.notifBtn}>
            <Bell size={20} color="var(--r-on-surface-variant)" />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* Metrics */}
        <div className={styles.metricsGrid}>
          <div className={`r-card ${styles.metricCard}`}>
            <Wallet size={20} color="var(--r-primary)" />
            <span className="text-headline-lg-mobile" style={{ color: "var(--r-primary)", marginTop: 8 }}>₹{totalCommission.toFixed(0)}L</span>
            <span className="text-label-md" style={{ color: "var(--r-outline)" }}>Total Commission</span>
          </div>
          <div className={`r-card ${styles.metricCard}`}>
            <Clock size={20} color="var(--r-secondary)" />
            <span className="text-headline-lg-mobile" style={{ color: "var(--r-primary)", marginTop: 8 }}>₹{pendingCommission.toFixed(0)}L</span>
            <span className="text-label-md" style={{ color: "var(--r-outline)" }}>Pending</span>
          </div>
          <div className={`r-card ${styles.metricCard}`}>
            <Handshake size={20} color="var(--r-success)" />
            <span className="text-headline-lg-mobile" style={{ color: "var(--r-primary)", marginTop: 8 }}>{closedDeals}</span>
            <span className="text-label-md" style={{ color: "var(--r-outline)" }}>Deals Closed</span>
          </div>
          <div className={`r-card ${styles.metricCard}`}>
            <Receipt size={20} color="var(--r-error)" />
            <span className="text-headline-lg-mobile" style={{ color: "var(--r-primary)", marginTop: 8 }}>₹{totalExpenses.toFixed(0)}</span>
            <span className="text-label-md" style={{ color: "var(--r-outline)" }}>Expenses</span>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabBar}>
          {[
            { key: "deals", label: "Deals" },
            { key: "dashboard", label: "Dashboard" },
            { key: "expenses", label: "Expenses" },
          ].map(t => (
            <button key={t.key} className={`${styles.tabBtn} ${activeTab === t.key ? styles.tabBtnActive : ""}`} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Deals Tab */}
        {activeTab === "deals" && (
          <section className={`r-card ${styles.dealsCard}`}>
            <div className={styles.dealsHeader}>
              <h2 className="text-headline-md">Deals</h2>
              <button className="r-btn r-btn-primary r-btn-sm" onClick={() => setShowAdd(true)}>
                <Plus size={16} /> Add Deal
              </button>
            </div>

            {deals.length === 0 && (
              <div className={styles.empty}>
                <TrendingUp size={48} color="var(--r-outline)" />
                <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center" }}>No deals tracked yet. Add your first deal to start tracking commissions.</p>
              </div>
            )}

            <div className={styles.dealsList}>
              {deals.map(deal => (
                <div key={deal.id} className={styles.dealItem}>
                  <div className={styles.dealTop}>
                    <div>
                      <p className="text-body-lg" style={{ fontWeight: 600 }}>{deal.leadName}</p>
                      <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)" }}>{deal.propertyName || deal.projectName || "No project"}</p>
                      {deal.leadMobile && (
                        <p className="text-label-md" style={{ color: "var(--r-outline)", marginTop: 2 }}>{deal.leadMobile}</p>
                      )}
                    </div>
                    <div className={styles.dealValue}>
                      <p className="text-headline-md" style={{ color: "var(--r-primary)" }}>₹{(deal.dealValue / 100).toFixed(1)}Cr</p>
                      <p className="text-data-mono" style={{ color: "var(--r-secondary)" }}>{deal.commissionPercent}% = ₹{(deal.commissionAmount / 100).toFixed(1)}L</p>
                    </div>
                  </div>

                  {/* Milestones */}
                  {deal.milestones && deal.milestones.length > 0 && (
                    <div className={styles.milestoneList}>
                      {deal.milestones.map(m => (
                        <div key={m.id} className={styles.milestoneRow}>
                          <span className="text-body-md" style={{ fontSize: 12 }}>{m.label}: ₹{m.amount}L</span>
                          <span className={`${styles.milestoneBadge} ${m.status === "received" ? styles.milestoneReceived : m.status === "partial" ? styles.milestonePartial : ""}`}>
                            {m.status}
                          </span>
                        </div>
                      ))}
                      <button className="r-btn r-btn-sm r-btn-ghost" onClick={() => setShowMilestones(deal.id)} style={{ marginTop: 4 }}>
                        <Plus size={12} /> Add Milestone
                      </button>
                    </div>
                  )}

                  <div className={styles.dealActions}>
                    <select className={`r-input ${styles.statusSelect}`} value={deal.status} onChange={e => handleStatusChange(deal.id, e.target.value)}>
                      <option value="pending">Pending</option>
                      <option value="partial">Partial</option>
                      <option value="received">Received</option>
                    </select>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(deal.id)}>
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <>
            {/* Monthly Commission */}
            <section className={`r-card ${styles.dealsCard}`}>
              <h2 className="text-headline-md" style={{ marginBottom: 16 }}>Monthly Commission</h2>
              {monthly.length === 0 && (
                <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center" }}>No commission data yet.</p>
              )}
              {monthly.map(([month, data]) => (
                <div key={month} className={styles.monthRow}>
                  <div>
                    <p className="text-body-md" style={{ fontWeight: 600 }}>{month}</p>
                    <p className="text-label-md" style={{ color: "var(--r-outline)" }}>{data.deals} deals closed</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="text-body-md" style={{ fontWeight: 700, color: "var(--r-success)" }}>+₹{data.commission.toFixed(1)}L</p>
                    {data.expenses > 0 && (
                      <p className="text-label-md" style={{ color: "var(--r-error)" }}>-₹{data.expenses.toFixed(0)} exp</p>
                    )}
                  </div>
                </div>
              ))}
            </section>

            {/* Source ROI */}
            <section className={`r-card ${styles.dealsCard}`}>
              <h2 className="text-headline-md" style={{ marginBottom: 16 }}>Lead Source ROI</h2>
              {sourceROI.length === 0 && (
                <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center" }}>No ROI data yet. Close some deals and track marketing expenses.</p>
              )}
              {sourceROI.map(([source, data]) => (
                <div key={source} className={styles.monthRow}>
                  <div>
                    <p className="text-body-md" style={{ fontWeight: 600 }}>{source}</p>
                    <p className="text-label-md" style={{ color: "var(--r-outline)" }}>{data.deals} deals · ₹{data.spent.toFixed(0)} spent</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="text-body-md" style={{ fontWeight: 700, color: data.earned > data.spent ? "var(--r-success)" : "var(--r-warning)" }}>
                      ₹{data.earned.toFixed(1)}L earned
                    </p>
                    {data.spent > 0 && (
                      <p className="text-label-md" style={{ color: data.earned > data.spent ? "var(--r-success)" : "var(--r-error)" }}>
                        {((data.earned / data.spent) * 100).toFixed(0)}% ROI
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <section className={`r-card ${styles.dealsCard}`}>
            <div className={styles.dealsHeader}>
              <h2 className="text-headline-md">Expenses</h2>
              <button className="r-btn r-btn-primary r-btn-sm" onClick={() => setShowExpense(true)}>
                <Plus size={16} /> Add Expense
              </button>
            </div>
            {expenses.length === 0 && (
              <div className={styles.empty}>
                <Receipt size={48} color="var(--r-outline)" />
                <p className="text-body-md" style={{ color: "var(--r-outline)", textAlign: "center" }}>No expenses recorded.</p>
              </div>
            )}
            <div className={styles.dealsList}>
              {expenses.map(exp => (
                <div key={exp.id} className={styles.dealItem}>
                  <div className={styles.dealTop}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {EXPENSE_CATEGORIES.find(c => c.id === exp.category)?.icon}
                      <div>
                        <p className="text-body-md" style={{ fontWeight: 600 }}>{EXPENSE_CATEGORIES.find(c => c.id === exp.category)?.label || exp.category}</p>
                        <p className="text-label-md" style={{ color: "var(--r-outline)" }}>{exp.date}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p className="text-body-lg" style={{ fontWeight: 700, color: "var(--r-error)" }}>₹{exp.amount}</p>
                    </div>
                  </div>
                  {exp.note && <p className="text-body-md" style={{ color: "var(--r-on-surface-variant)", marginTop: 4 }}>{exp.note}</p>}
                  <button className={styles.deleteBtn} onClick={() => handleDeleteExpense(exp.id)} style={{ marginTop: 4 }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Add Deal Sheet */}
      {showAdd && (
        <div className="r-overlay" onClick={() => setShowAdd(false)}>
          <div className={`r-card ${styles.addSheet}`} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className="text-headline-md">Add Deal</h2>
              <button className={styles.closeBtn} onClick={() => setShowAdd(false)}><X size={20} /></button>
            </div>
            <div className={styles.sheetBody}>
              <div className={styles.field}>
                <label className="text-label-md">Lead</label>
                <select className="r-input" value={form.leadId} onChange={set("leadId")}>
                  <option value="">Select lead...</option>
                  {leads.map(l => <option key={l.id} value={l.id}>{l.name} — {l.mobile}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className="text-label-md">Property (optional)</label>
                <select className="r-input" value={form.propertyId} onChange={set("propertyId")}>
                  <option value="">Select property...</option>
                  {inventory.map(i => <option key={i.id} value={i.id}>{i.projectName} — {i.area}</option>)}
                </select>
              </div>
              <div className={styles.field}>
                <label className="text-label-md">Project Name</label>
                <input className="r-input" placeholder="Project name" value={form.projectName} onChange={set("projectName")} />
              </div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className="text-label-md">Deal Value (₹ Lakhs)</label>
                  <input className="r-input" type="number" placeholder="150" value={form.dealValue} onChange={set("dealValue")} />
                </div>
                <div className={styles.field}>
                  <label className="text-label-md">Commission %</label>
                  <input className="r-input" type="number" step="0.1" placeholder="1.0" value={form.commissionPercent} onChange={set("commissionPercent")} />
                </div>
              </div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className="text-label-md">Token Amount (₹ Lakhs)</label>
                  <input className="r-input" type="number" placeholder="5" value={form.tokenAmount} onChange={set("tokenAmount")} />
                </div>
                <div className={styles.field}>
                  <label className="text-label-md">Expected Close Date</label>
                  <input className="r-input" type="date" value={form.closedDate} onChange={set("closedDate")} />
                </div>
              </div>
              <div className={styles.field}>
                <label className="text-label-md">Status</label>
                <select className="r-input" value={form.status} onChange={set("status")}>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="received">Received</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className="text-label-md">Notes</label>
                <textarea className="r-input" rows={3} placeholder="Additional notes..." value={form.notes} onChange={set("notes")} />
              </div>
              <button className="r-btn r-btn-primary" onClick={handleAddDeal} disabled={!form.leadId || !form.dealValue} style={{ width: "100%", marginTop: 8 }}>
                <Save size={16} /> Save Deal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Sheet */}
      {showExpense && (
        <div className="r-overlay" onClick={() => setShowExpense(false)}>
          <div className={`r-card ${styles.addSheet}`} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className="text-headline-md">Add Expense</h2>
              <button className={styles.closeBtn} onClick={() => setShowExpense(false)}><X size={20} /></button>
            </div>
            <div className={styles.sheetBody}>
              <div className={styles.field}>
                <label className="text-label-md">Category</label>
                <select className="r-input" value={expenseForm.category} onChange={setExp("category")}>
                  {EXPENSE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className="text-label-md">Amount (₹)</label>
                  <input className="r-input" type="number" placeholder="500" value={expenseForm.amount} onChange={setExp("amount")} />
                </div>
                <div className={styles.field}>
                  <label className="text-label-md">Date</label>
                  <input className="r-input" type="date" value={expenseForm.date} onChange={setExp("date")} />
                </div>
              </div>
              <div className={styles.field}>
                <label className="text-label-md">Note</label>
                <input className="r-input" placeholder="e.g. Meta Ads campaign" value={expenseForm.note} onChange={setExp("note")} />
              </div>
              <button className="r-btn r-btn-primary" onClick={handleAddExpense} disabled={!expenseForm.amount} style={{ width: "100%", marginTop: 8 }}>
                <Save size={16} /> Save Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Milestone Sheet */}
      {showMilestones && (
        <div className="r-overlay" onClick={() => setShowMilestones(null)}>
          <div className={`r-card ${styles.addSheet}`} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h2 className="text-headline-md">Add Payment Milestone</h2>
              <button className={styles.closeBtn} onClick={() => setShowMilestones(null)}><X size={20} /></button>
            </div>
            <div className={styles.sheetBody}>
              <div className={styles.field}>
                <label className="text-label-md">Milestone Name</label>
                <input className="r-input" placeholder="e.g. 1st Installment" value={milestoneForm.label} onChange={e => setMilestoneForm(f => ({ ...f, label: e.target.value }))} />
              </div>
              <div className={styles.grid2}>
                <div className={styles.field}>
                  <label className="text-label-md">Amount (₹ Lakhs)</label>
                  <input className="r-input" type="number" placeholder="10" value={milestoneForm.amount} onChange={e => setMilestoneForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className={styles.field}>
                  <label className="text-label-md">Due Date</label>
                  <input className="r-input" type="date" value={milestoneForm.dueDate} onChange={e => setMilestoneForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>
              <div className={styles.field}>
                <label className="text-label-md">Status</label>
                <select className="r-input" value={milestoneForm.status} onChange={e => setMilestoneForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="received">Received</option>
                </select>
              </div>
              <button className="r-btn r-btn-primary" onClick={() => { handleAddMilestone(showMilestones); setShowMilestones(null); }} disabled={!milestoneForm.label || !milestoneForm.amount} style={{ width: "100%", marginTop: 8 }}>
                <Save size={16} /> Add Milestone
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
