(function(){
  'use strict';

  function computeMetrics(d){
    const dataRef = d || (typeof getDataRef === 'function' ? getDataRef() : (window.data||{}));
    const sales = dataRef.sales||[]; const payments = dataRef.payments||[]; const expenses = dataRef.expenses||[];
    const stores = dataRef.stores||[]; const inventory = dataRef.inventory||[]; const packages = dataRef.packages||[];
    const totals = {
      sales: sales.reduce((s,x)=> s + (Number(x.total)||0), 0),
      payments: payments.reduce((s,x)=> s + (Number(x.amount)||0), 0),
      expenses: expenses.reduce((s,x)=> s + (Number(x.amount)||0), 0),
      inventoryValue: inventory.reduce((s,x)=> s + (Number(x.quantity)||0) * (Number((packages.find(p=>p.id===x.packageId)||{}).price)||0), 0),
      storesBalance: 0
    };
    totals.storesBalance = stores.reduce((acc, store) => {
      const sSales = sales.filter(s=> s.storeId===store.id).reduce((s,x)=> s + (Number(x.total)||0),0);
      const sPays = payments.filter(p=> p.storeId===store.id).reduce((s,x)=> s + (Number(x.amount)||0),0);
      return acc + (sSales - sPays);
    }, 0);
    totals.netProfit = totals.sales - totals.expenses;
    return totals;
  }

  function renderParityPage(){
    const section = document.getElementById('parityCheck');
    if (!section) return;
    const base = (typeof localStorage!=='undefined') ? (localStorage.getItem('baseline_metrics') || '') : '';
    const baseline = base ? ((typeof safeJsonParse==='function' && FeatureFlags && FeatureFlags.isEnabled('safeJsonParse'))? safeJsonParse(base, null) : JSON.parse(base)) : null;
    const current = computeMetrics();
    const fmt = (typeof formatNumber==='function') ? n=> formatNumber(n) : n=> String(n);
    const card = (label, cur, baseVal)=>{
      const same = (baseline && typeof baseVal==='number') ? Math.abs(cur - baseVal) < 0.0001 : true;
      const diff = baseline ? (cur - (baseVal||0)) : 0;
      return `
        <div class="col-md-4">
          <div class="card ${same?'border-success':'border-danger'}">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <div class="fw-bold mb-1">${label}</div>
                  <div class="small text-muted">${baseline? 'الأساس: '+fmt(baseVal||0) : 'لا يوجد أساس محفوظ'}</div>
                </div>
                <div class="text-end">
                  <div class="h5 mb-0">${fmt(cur)}</div>
                  ${baseline? `<div class="small ${diff===0?'text-success':(diff>0?'text-warning':'text-danger')}">فرق: ${fmt(diff)}</div>`:''}
                </div>
              </div>
            </div>
          </div>
        </div>`;
    };
    const html = `
      <div class="header-bar">
        <h3 class="page-title"><i class="fas fa-balance-scale"></i> فحص التطابق (Parity Check)</h3>
        <div class="d-flex gap-2">
          <button class="btn btn-sm btn-primary" id="saveBaselineBtn"><i class="fas fa-save"></i> حفظ الأساس الحالي</button>
          <button class="btn btn-sm btn-secondary" id="recomputeBtn"><i class="fas fa-sync"></i> إعادة الحساب</button>
        </div>
      </div>
      <div class="row g-3 mt-1">
        ${card('إجمالي المبيعات', current.sales, baseline && baseline.sales)}
        ${card('إجمالي التسديدات', current.payments, baseline && baseline.payments)}
        ${card('إجمالي المصروفات', current.expenses, baseline && baseline.expenses)}
        ${card('صافي الربح', current.netProfit, baseline && baseline.netProfit)}
        ${card('إجمالي أرصدة المحلات', current.storesBalance, baseline && baseline.storesBalance)}
        ${card('قيمة المخزون التقديرية', current.inventoryValue, baseline && baseline.inventoryValue)}
      </div>
      <div class="alert alert-info mt-3">
        هذه الصفحة للعرض فقط ولا تغيّر أي بيانات حسابية. الهدف هو التأكد من التطابق صفر بالمئة بعد أي تحسينات.
      </div>
    `;
    if (typeof FeatureFlags !== 'undefined' && FeatureFlags.isEnabled('safeDomRendering') && typeof setHTML === 'function') { setHTML(section, html); } else { section.innerHTML = html; }
    const saveBtn = document.getElementById('saveBaselineBtn');
    if (saveBtn) saveBtn.onclick = function(){ try{ localStorage.setItem('baseline_metrics', JSON.stringify(current)); showNotification('تم حفظ الأساس الحالي', 'success'); }catch(_){} };
    const recomputeBtn = document.getElementById('recomputeBtn');
    if (recomputeBtn) recomputeBtn.onclick = renderParityPage;
  }

  function showParitySection(){
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    const link = document.querySelector('[data-section="parityCheck"]');
    if (link) link.classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    const sec = document.getElementById('parityCheck');
    if (sec) { sec.style.display = 'block'; renderParityPage(); }
    const title = document.querySelector('.page-title'); if (title) title.textContent = 'فحص التطابق (Parity Check)';
  }

  window.ParityCheck = { computeMetrics, render: renderParityPage, show: showParitySection };

})();

