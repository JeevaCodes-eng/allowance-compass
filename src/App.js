import React, { useEffect, useMemo, useState } from "react";
import { Activity, ArrowDownLeft, ArrowUpRight, CalendarDays, Check, ChevronDown, CircleDollarSign, CreditCard, Plus, ShieldAlert, Sparkles, Target, Trash2, Wallet, X } from "lucide-react";

const CATEGORIES = ["Food", "Transport", "Education", "Shopping", "Bills", "Health", "Entertainment", "Other"];
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const monthKey = (date) => date.slice(0,7);
const money = (value) => new Intl.NumberFormat("en-IN", { style:"currency", currency:"INR", maximumFractionDigits:0 }).format(Number.isFinite(value) ? value : 0);
const seed = {
  monthlyAllowance: 12000,
  openingBalance: 7600,
  budgets: { Food: 4000, Transport: 1200, Education: 2000, Shopping: 1000, Bills: 1500, Health: 700, Entertainment: 800, Other: 800 },
  expenses: [
    { id: 1, title:"Mess and snacks", amount:180, category:"Food", date:todayISO(), type:"expense" },
    { id: 2, title:"Bus and metro", amount:90, category:"Transport", date:todayISO(), type:"expense" },
    { id: 3, title:"Monthly allowance", amount:12000, category:"Other", date:todayISO(), type:"income" },
    { id: 4, title:"Course materials", amount:650, category:"Education", date:todayISO(), type:"expense" },
    { id: 5, title:"Phone recharge", amount:299, category:"Bills", date:todayISO(), type:"expense" }
  ],
  bills: [
    { id: 11, title:"Phone recharge", amount:299, date:nextDate(3), paid:false },
    { id: 12, title:"Club subscription", amount:250, date:nextDate(6), paid:false },
    { id: 13, title:"Course payment", amount:900, date:nextDate(9), paid:false }
  ]
};
function nextDate(days) {
  const d = new Date(); d.setDate(d.getDate()+days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function loadData() {
  try {
    const raw = localStorage.getItem("pocketpilot-data-v1");
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.expenses) || !Array.isArray(parsed.bills) || !parsed.budgets) return seed;
    return { ...seed, ...parsed };
  } catch { return seed; }
}
function dayGap(date) {
  const a = new Date(todayISO()+"T12:00:00");
  const b = new Date(date+"T12:00:00");
  return Math.round((b-a)/86400000);
}
function prettyDate(date) {
  if (!date) return "No date";
  const d = new Date(date+"T12:00:00");
  if (date===todayISO()) return "Today";
  if (date===nextDate(1)) return "Tomorrow";
  return d.toLocaleDateString("en-IN",{day:"numeric",month:"short"});
}
function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function App() {
  const [data, setData] = useState(loadData);
  const [tab, setTab] = useState("Overview");
  const [modal, setModal] = useState("");
  const [toast, setToast] = useState("");
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState({ title:"", amount:"", category:"Food", date:todayISO(), type:"expense" });
  const [billForm, setBillForm] = useState({ title:"", amount:"", date:nextDate(3) });
  const [allowance, setAllowance] = useState(String(data.monthlyAllowance));
  const [budgetDraft, setBudgetDraft] = useState(data.budgets);
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseName, setPurchaseName] = useState("");

  useEffect(() => {
    try { localStorage.setItem("pocketpilot-data-v1", JSON.stringify(data)); }
    catch { setToast("Browser storage is full. Export or remove older entries."); }
  }, [data]);

  const month = monthKey(todayISO());
  const currentMonth = data.expenses.filter(x => monthKey(x.date) === month);
  const expensesThisMonth = currentMonth.filter(x => x.type === "expense").reduce((s,x)=>s+x.amount,0);
  const incomeThisMonth = currentMonth.filter(x => x.type === "income").reduce((s,x)=>s+x.amount,0);
  const actualBalance = Number(data.openingBalance) + incomeThisMonth - expensesThisMonth;
  const upcomingBills = data.bills.filter(b => !b.paid && b.date >= todayISO()).sort((a,b)=>a.date.localeCompare(b.date));
  const reservedBills = upcomingBills.reduce((s,b)=>s+b.amount,0);
  const availableBalance = actualBalance - reservedBills;
  const daysLeft = new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate() - new Date().getDate() + 1;
  const safeDaily = Math.floor(Math.max(0,availableBalance) / Math.max(1,daysLeft));
  const purchaseCost = Number(purchaseAmount) || 0;
const balanceAfterPurchase = availableBalance - purchaseCost;
const dailyAfterPurchase = Math.floor(
  Math.max(0, balanceAfterPurchase) / Math.max(1, daysLeft)
);
const purchaseVerdict =
  purchaseCost <= 0 ? "Enter a purchase amount" :
  balanceAfterPurchase < 0 ? "Not affordable — bills at risk" :
  dailyAfterPurchase < safeDaily * 0.5 ? "Affordable, but tight" :
  "Fits your current plan";

  const forecast = actualBalance - (expensesThisMonth / Math.max(1,new Date().getDate())) * new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate() - reservedBills;
  const forecastRisk = forecast < 0 || availableBalance < 0;
  const budgetRows = CATEGORIES.map(category => {
    const spent = currentMonth.filter(x => x.type==="expense" && x.category===category).reduce((s,x)=>s+x.amount,0);
    const limit = Number(data.budgets[category] || 0);
    return { category, spent, limit, percent: limit > 0 ? Math.round(spent/limit*100) : (spent > 0 ? 100 : 0) };
  });
  const overBudget = budgetRows.filter(x=>x.limit>0 && x.spent>x.limit);
  const filteredExpenses = [...data.expenses].filter(x=>filter==="All" || x.type===filter.toLowerCase()).sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id);
  const categoryTotals = budgetRows.filter(x=>x.spent>0).sort((a,b)=>b.spent-a.spent);
  const topCategory = categoryTotals[0];

  function notify(message) {
    setToast(message);
    window.setTimeout(()=>setToast(""),2400);
  }
  function addTransaction(e) {
    e.preventDefault();
    const amount = safeNumber(form.amount);
    if (!form.title.trim()) { notify("Enter a description first."); return; }
    if (!amount) { notify("Amount must be greater than zero."); return; }
    if (form.date > todayISO() && form.type === "expense") { notify("For future spending, add a planned bill instead."); return; }
    setData(prev=>({...prev, expenses:[...prev.expenses,{id:Date.now(),title:form.title.trim(),amount,category:form.category,date:form.date,type:form.type}]}));
    setForm({title:"",amount:"",category:"Food",date:todayISO(),type:"expense"});
    setModal("");
    notify("Transaction saved.");
  }
  function addBill(e) {
    e.preventDefault();
    const amount = safeNumber(billForm.amount);
    if (!billForm.title.trim() || !amount || !billForm.date || billForm.date < todayISO()) { notify("Enter a title, positive amount, and today or a future date."); return; }
    setData(prev=>({...prev,bills:[...prev.bills,{id:Date.now(),title:billForm.title.trim(),amount,date:billForm.date,paid:false}]}));
    setBillForm({title:"",amount:"",date:nextDate(3)});
    setModal("");
    notify("Upcoming bill added and included in your reserve.");
  }
  function markBillPaid(id) {
    const bill = data.bills.find(b=>b.id===id);
    if (!bill) return;
    setData(prev=>({...prev,bills:prev.bills.map(b=>b.id===id?{...b,paid:true}:b), expenses:[...prev.expenses,{id:Date.now(),title:bill.title,amount:bill.amount,category:"Bills",date:todayISO(),type:"expense"}]}));
    notify("Bill marked paid and recorded as an expense.");
  }
  function saveBudgets(e) {
    e.preventDefault();
    const clean = {};
    CATEGORIES.forEach(c=>clean[c]=Math.max(0,Number(budgetDraft[c])||0));
    setData(prev=>({...prev,budgets:clean}));
    setModal("");
    notify("Monthly category budgets updated.");
  }
  function saveAllowance(e) {
    e.preventDefault();
    const amount=safeNumber(allowance);
    if (!amount) { notify("Monthly allowance must be greater than zero."); return; }
    setData(prev=>({...prev,monthlyAllowance:amount}));
    setModal("");
    notify("Monthly allowance updated.");
  }
  function removeTransaction(id) {
    setData(prev=>({...prev,expenses:prev.expenses.filter(x=>x.id!==id)}));
    notify("Transaction removed.");
  }
  function resetDemo() {
    if (!window.confirm("Reset all local data to the demo scenario? This cannot be undone.")) return;
    setData({...seed, expenses:seed.expenses.map(x=>({...x})), bills:seed.bills.map(x=>({...x})), budgets:{...seed.budgets}});
    setBudgetDraft({...seed.budgets});
    notify("Demo data restored.");
  }

  return <div className="shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-symbol"><Wallet size={20}/></div><div><strong>pocket<span>pilot</span></strong><small>STUDENT MONEY PLANNER</small></div></div>
      <div className="nav-caption">YOUR MONEY</div>
      {[
        ["Overview",Activity],["Transactions",ArrowDownLeft],["Upcoming bills",CalendarDays],["Budgets",Target]
      ].map(([name,Icon])=><button key={name} className={"nav "+(tab===name?"active":"")} onClick={()=>setTab(name)}><Icon size={17}/>{name}{name==="Upcoming bills"&&<span className="nav-number">{upcomingBills.length}</span>}</button>)}
      <div className="sidebar-spacer"/>
      <div className="side-tip"><div className="tip-icon"><Sparkles size={17}/></div><b>Money clarity, not guilt.</b><p>Small decisions add up. Use your numbers to make the next one easier.</p></div>
      <div className="storage-status"><span className="green-dot"/> Saved in this browser <button onClick={resetDemo} title="Restore demo data">Reset demo</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="muted">Workspace</span><span className="slash">/</span><b>{tab}</b></div><div className="top-right"><span className="month-label"><CalendarDays size={15}/>{new Date().toLocaleDateString("en-IN",{month:"long",year:"numeric"})}</span><div className="user-dot">P</div></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="overline"><span/> PERSONAL FINANCE, MADE PRACTICAL</div><h1>{tab==="Overview"?"Know what you can spend.":tab==="Transactions"?"Follow where it goes.":tab==="Upcoming bills"?"Nothing should catch you off guard.":"Give every rupee a job."}</h1><p>{tab==="Overview"?"A clear view of your money today and the rest of the month.":tab==="Transactions"?"Your recorded income and spending, in one place.":tab==="Upcoming bills"?"Reserve money for future payments before spending it elsewhere.":"Set realistic category limits and spot overspending early."}</p></div><button className="button-primary" onClick={()=>{setForm({...form,date:todayISO(),type:"expense"});setModal("transaction")}}><Plus size={16}/> Add transaction</button></div>

        {tab==="Overview" && <>
          <section className={"forecast-banner "+(forecastRisk?"risk":"")}>
            <div className="banner-icon">{forecastRisk?<ShieldAlert size={22}/>:<CircleDollarSign size={22}/>}</div>
            <div className="banner-copy"><span className="banner-label">{forecastRisk?"BUDGET CHECK":"YOUR SPENDING SNAPSHOT"}</span><h2>{forecastRisk?"Your current pace may leave a shortfall.":"Your money has a plan."}</h2><p>{forecastRisk?`Your projected month-end balance is ${money(forecast)} after current spending pace and reserved bills. Review your categories before spending more.`:`After reserving ${money(reservedBills)} for upcoming bills, you have ${money(Math.max(0,availableBalance))} unreserved. Keep your daily limit in view.`}</p></div>
            <div className="banner-stat"><span>Safe to spend today</span><strong>{money(safeDaily)}</strong><small>{daysLeft} days including today</small></div>
          
          </section>

          <section className="purchase-panel">
            <div className="purchase-heading">
              <div>
                <div className="purchase-eyebrow">SIGNATURE FEATURE</div>
                <h2>Can I afford this?</h2>
                <p>Test a purchase before spending your allowance.</p>
              </div>
              <div className="purchase-icon">₹</div>
            </div>

            <div className="purchase-fields">
              <label>
                What are you planning to buy?
                <input
                  type="text"
                  maxLength="80"
                  placeholder="e.g. Dinner with friends"
                  value={purchaseName}
                  onChange={e => setPurchaseName(e.target.value)}
                />
              </label>

              <label>
                Purchase amount (₹)
                <input
                  type="number"
                  min="1"
                  max="10000000"
                  step="1"
                  placeholder="e.g. 450"
                  value={purchaseAmount}
                  onChange={e => setPurchaseAmount(e.target.value)}
                />
              </label>
            </div>

            <div className={
              "purchase-result " +
              (purchaseCost <= 0 ? "" :
               balanceAfterPurchase < 0 ? "purchase-danger" :
               dailyAfterPurchase < safeDaily * 0.5 ? "purchase-caution" :
               "purchase-good")
            }>
              <div>
                <span className="purchase-result-label">YOUR PURCHASE CHECK</span>
                <h3>{purchaseVerdict}</h3>
                <p>
                  {purchaseCost <= 0
                    ? "Enter an amount to see how this purchase affects your budget."
                    : balanceAfterPurchase < 0
                    ? "This purchase would leave your balance below the money reserved for upcoming bills."
                    : `After this purchase, you would have ${money(Math.max(0, balanceAfterPurchase))} available after bill reserves.`}
                </p>
              </div>
            </div>

            {purchaseCost > 0 && (
              <div className="purchase-metrics">
                <div>
                  <span>Daily limit now</span>
                  <strong>{money(safeDaily)}</strong>
                </div>
                <div>
                  <span>Daily limit after purchase</span>
                  <strong>{money(dailyAfterPurchase)}</strong>
                </div>
                <div>
                  <span>Remaining after purchase</span>
                  <strong>{money(balanceAfterPurchase)}</strong>
                </div>
              </div>
            )}

            <p className="purchase-note">
              Estimate only. This uses your recorded balance and unpaid bill reserves;
              it does not create a transaction or change your balance.
            </p>
          </section>

          <section className="stat-grid">

            <div className="stat-card"><div className="stat-top"><span>Current balance</span><div className="stat-icon violet"><Wallet size={17}/></div></div><strong>{money(actualBalance)}</strong><small><span className="dot violet-dot"/> Starting balance + recorded net transactions</small></div>
            <div className="stat-card"><div className="stat-top"><span>Reserved for bills</span><div className="stat-icon amber"><CalendarDays size={17}/></div></div><strong>{money(reservedBills)}</strong><small><span className="dot amber-dot"/> {upcomingBills.length} unpaid upcoming payment{upcomingBills.length===1?"":"s"}</small></div>
            <div className="stat-card"><div className="stat-top"><span>Spent this month</span><div className="stat-icon coral"><ArrowUpRight size={17}/></div></div><strong>{money(expensesThisMonth)}</strong><small><span className="dot coral-dot"/> Across {categoryTotals.length} spending categor{categoryTotals.length===1?"y":"ies"}</small></div>
            <div className="stat-card"><div className="stat-top"><span>Month-end forecast</span><div className="stat-icon mint"><Activity size={17}/></div></div><strong className={forecast<0?"negative":""}>{money(forecast)}</strong><small><span className={"dot "+(forecastRisk?"coral-dot":"mint-dot")}/>{forecastRisk?"Needs attention":"Based on current daily spending pace"}</small></div>
          </section>
          <div className="section-title"><div><h2>Spending by category</h2><p>Monthly limits compared with recorded expenses.</p></div><button className="text-button" onClick={()=>setTab("Budgets")}>Manage budgets <ArrowUpRight size={14}/></button></div>
          <section className="content-grid">
            <div className="panel category-panel">
              {budgetRows.filter(x=>x.limit>0||x.spent>0).map(row=><div className="budget-row" key={row.category}><div className="budget-head"><span>{row.category}</span><span><b>{money(row.spent)}</b><em> / {money(row.limit)}</em></span></div><div className="bar"><div className={"bar-fill "+(row.percent>100?"over":"")} style={{width:Math.min(100,row.percent)+"%"}}/></div><div className={"budget-foot "+(row.percent>100?"danger":"")}>{row.percent>100?`Over budget by ${money(row.spent-row.limit)}`:`${Math.max(0,row.limit-row.spent)===0?"Budget used":money(row.limit-row.spent)+" left"} · ${row.percent}% used`}</div></div>)}
              {!budgetRows.some(x=>x.limit>0||x.spent>0)&&<div className="empty">No category data yet.</div>}
            </div>
            <div className="right-stack">
              <div className="panel insight-panel"><div className="panel-title"><div><h3>Quick insight</h3><p>Based on this month's entries</p></div><div className="insight-icon"><Sparkles size={16}/></div></div>{topCategory?<><div className="insight-highlight">{topCategory.category}<span>{money(topCategory.spent)}</span></div><p className="insight-body">{topCategory.limit>0&&topCategory.spent>topCategory.limit?`This category is ${money(topCategory.spent-topCategory.limit)} above its budget. Pause non-essential spending here until you review the limit.`:`This is your highest recorded spending category so far. Check whether the pace fits the rest of your month.`}</p></>:<p className="insight-body">Add a transaction to see where most of your money is going.</p>}</div>
              <div className="panel upcoming-panel"><div className="panel-title"><div><h3>Coming up next</h3><p>Unpaid bills to keep reserved</p></div><button className="small-link" onClick={()=>setTab("Upcoming bills")}>View all</button></div>{upcomingBills.slice(0,3).map(b=><div className="bill-line" key={b.id}><div className="bill-date"><b>{new Date(b.date+"T12:00:00").getDate()}</b><small>{new Date(b.date+"T12:00:00").toLocaleDateString("en-IN",{month:"short"})}</small></div><div className="bill-name">{b.title}<small>{dayGap(b.date)===0?"Due today":dayGap(b.date)<0?"Past due":`In ${dayGap(b.date)} days`}</small></div><strong>{money(b.amount)}</strong></div>)}{!upcomingBills.length&&<p className="empty-inline">No unpaid upcoming bills.</p>}<button className="add-bill-link" onClick={()=>setModal("bill")}><Plus size={14}/> Add an upcoming bill</button></div>
            </div>
          </section>
          <div className="section-title recent-title"><div><h2>Recent transactions</h2><p>Latest activity you've recorded.</p></div><button className="text-button" onClick={()=>setTab("Transactions")}>All transactions <ArrowUpRight size={14}/></button></div>
          <TransactionList items={[...data.expenses].sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).slice(0,4)} onDelete={removeTransaction}/>
        </>}

        {tab==="Transactions" && <><div className="toolbar"><div className="tabs">{["All","Expense","Income"].map(x=><button className={filter===x?"chosen":""} key={x} onClick={()=>setFilter(x)}>{x}</button>)}</div><button className="button-primary" onClick={()=>setModal("transaction")}><Plus size={15}/> Add transaction</button></div><div className="panel full-panel"><TransactionList items={filteredExpenses} onDelete={removeTransaction} emptyText="No transactions match this filter."/></div></>}

        {tab==="Upcoming bills" && <><div className="bill-summary"><div><span>Unpaid bills</span><strong>{upcomingBills.length}</strong></div><div><span>Total reserved</span><strong>{money(reservedBills)}</strong></div><div><span>Unreserved balance</span><strong className={availableBalance<0?"negative":""}>{money(availableBalance)}</strong></div><button className="button-primary" onClick={()=>setModal("bill")}><Plus size={15}/> Add bill</button></div><div className="panel bills-table">{data.bills.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(b=><div className={"bill-item "+(b.paid?"paid":"")} key={b.id}><div className="bill-check">{b.paid?<Check size={16}/>:<CalendarDays size={16}/>}</div><div className="bill-description"><strong>{b.title}</strong><span>{prettyDate(b.date)}{dayGap(b.date)<0&&!b.paid?" · overdue":""}</span></div><strong className="bill-amount">{money(b.amount)}</strong>{b.paid?<span className="status-pill paid-pill">Paid</span>:<button className="mark-paid" onClick={()=>markBillPaid(b.id)}>Mark paid</button>}<button className="icon-button" title="Delete bill" onClick={()=>setData(prev=>({...prev,bills:prev.bills.filter(x=>x.id!==b.id)}))}><Trash2 size={15}/></button></div>)}{!data.bills.length&&<div className="empty">No bills yet. Add your next planned payment.</div>}</div><p className="helper-note">Marking a bill paid records it as an expense today and removes it from the reserved amount, so it won't be counted twice in the forecast.</p></>}

        {tab==="Budgets" && <><div className="budget-intro"><div><h2>Monthly category limits</h2><p>Set limits that fit your actual allowance. Spent amounts update automatically when you record transactions.</p></div><button className="button-primary" onClick={()=>{setBudgetDraft({...data.budgets});setModal("budgets")}}>Edit budgets</button></div><div className="budget-overview">{budgetRows.map(row=><div className="panel budget-tile" key={row.category}><div className="budget-tile-head"><span>{row.category}</span><span className={row.percent>100?"danger":""}>{row.percent}%</span></div><strong>{money(row.spent)} <small>of {money(row.limit)}</small></strong><div className="bar"><div className={"bar-fill "+(row.percent>100?"over":"")} style={{width:Math.min(100,row.percent)+"%"}}/></div><p>{row.percent>100?`Over by ${money(row.spent-row.limit)}`:`${money(Math.max(0,row.limit-row.spent))} remaining`}</p></div>)}</div>{overBudget.length>0&&<div className="alert-box"><ShieldAlert size={18}/><div><strong>{overBudget.length} category{overBudget.length===1?" is":"ies are"} over budget.</strong><p>{overBudget.map(x=>x.category).join(", ")} {overBudget.length===1?"has":"have"} exceeded the limit. Review these before making more non-essential purchases.</p></div></div>}</>}
        <footer className="footer"><span>PocketPilot <i>•</i> Student money planner</span><span><span className="green-dot"/> Local-first · Data stays in this browser</span></footer>
      </div>
    </main>

    {modal && <div className="modal-shade" onMouseDown={e=>{if(e.target===e.currentTarget)setModal("")}}><div className="modal"><div className="modal-head"><div><div className="overline"><span/> POCKETPILOT WORKSPACE</div><h2>{modal==="transaction"?"Add transaction":modal==="bill"?"Add upcoming bill":modal==="budgets"?"Edit monthly budgets":"Update allowance"}</h2><p>{modal==="transaction"?"Record money that has already moved.":modal==="bill"?"Reserve money for a payment you expect to make.":modal==="budgets"?"Choose limits for the categories you spend in.":"Set the amount you expect to receive each month."}</p></div><button className="close" onClick={()=>setModal("")}><X size={18}/></button></div>
      {modal==="transaction"&&<form className="form" onSubmit={addTransaction}><div className="type-switch"><button type="button" className={form.type==="expense"?"selected-expense":""} onClick={()=>setForm({...form,type:"expense"})}><ArrowUpRight size={15}/> Expense</button><button type="button" className={form.type==="income"?"selected-income":""} onClick={()=>setForm({...form,type:"income"})}><ArrowDownLeft size={15}/> Income</button></div><label>Description<input required maxLength="80" placeholder="e.g. Lunch at campus" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><div className="form-two"><label>Amount (₹)<input required type="number" min="1" step="1" max="10000000" placeholder="0" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Date<input required type="date" max={todayISO()} value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label></div><label>Category<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><div className="form-actions"><button type="button" className="button-secondary" onClick={()=>setModal("")}>Cancel</button><button type="submit" className="button-primary">Save transaction</button></div></form>}
      {modal==="bill"&&<form className="form" onSubmit={addBill}><label>Bill / payment name<input required maxLength="80" placeholder="e.g. Phone recharge" value={billForm.title} onChange={e=>setBillForm({...billForm,title:e.target.value})}/></label><div className="form-two"><label>Amount (₹)<input required type="number" min="1" step="1" max="10000000" value={billForm.amount} onChange={e=>setBillForm({...billForm,amount:e.target.value})} placeholder="0"/></label><label>Due date<input required type="date" min={todayISO()} value={billForm.date} onChange={e=>setBillForm({...billForm,date:e.target.value})}/></label></div><p className="form-hint">This amount is deducted from your safe-to-spend balance until you mark the bill as paid.</p><div className="form-actions"><button type="button" className="button-secondary" onClick={()=>setModal("")}>Cancel</button><button type="submit" className="button-primary">Reserve this bill</button></div></form>}
      {modal==="budgets"&&<form className="form" onSubmit={saveBudgets}><div className="budget-edit-list">{CATEGORIES.map(c=><label key={c}>{c}<div className="rupee-input"><span>₹</span><input type="number" min="0" max="10000000" value={budgetDraft[c]??0} onChange={e=>setBudgetDraft({...budgetDraft,[c]:e.target.value})}/></div></label>)}</div><div className="form-actions"><button type="button" className="button-secondary" onClick={()=>setModal("")}>Cancel</button><button type="submit" className="button-primary">Save budgets</button></div></form>}
      {modal==="allowance"&&<form className="form" onSubmit={saveAllowance}><label>Expected monthly allowance (₹)<input required type="number" min="1" max="10000000" value={allowance} onChange={e=>setAllowance(e.target.value)}/></label><p className="form-hint">This is used as a planning reference; the balance is calculated from your opening balance and recorded transactions.</p><div className="form-actions"><button type="button" className="button-secondary" onClick={()=>setModal("")}>Cancel</button><button type="submit" className="button-primary">Save allowance</button></div></form>}
    </div></div>}
  </div>;
}

function TransactionList({items,onDelete,emptyText="No transactions yet."}) {
  if (!items.length) return <div className="empty"><div className="empty-icon"><CreditCard size={20}/></div><strong>{emptyText}</strong><p>Add a transaction to make your budget more accurate.</p></div>;
  return <div className="transaction-list">{items.map(x=><div className="transaction-row" key={x.id}><div className={"transaction-icon "+(x.type==="income"?"income":"expense")}>{x.type==="income"?<ArrowDownLeft size={17}/>:<ArrowUpRight size={17}/>}</div><div className="transaction-info"><strong>{x.title}</strong><span>{x.category} <i>·</i> {prettyDate(x.date)}</span></div><strong className={"transaction-amount "+(x.type==="income"?"positive":"")}>{x.type==="income"?"+":"−"}{money(x.amount)}</strong><button className="icon-button" title="Delete transaction" onClick={()=>onDelete(x.id)}><Trash2 size={15}/></button></div>)}</div>;
}
