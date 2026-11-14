// Share Market Analysis & Portfolio Intelligence - Frontend Client

const app = {
  activeView: 'dashboard',
  portfolioData: null,
  allocationChart: null,
  screenerState: {
    selectedCap: 'ALL',
    selectedTier: 'ALL',
    selectedIndex: 'ALL',
    searchQuery: '',
    stocks: [],
    summary: null
  },

  // Watchlist state (localStorage-backed)
  watchlistState: {
    items: [],           // array of stock objects saved to watchlist
    filterCap: 'ALL',
    filterTier: 'ALL',
    searchQuery: ''
  },

  // Chat state
  chatState: {
    messages: [],
    assetType: 'STOCK',
    categories: [],      // multi-select category chips
    sectors: [],         // multi-select sector chips
    isTyping: false
  },

  // Index Stock Scanner state
  indexScannerState: {
    exchange: 'ALL',
    index: 'ALL',
    tier: 'ALL',
    minScore: 80,
    sector: 'ALL',
    searchQuery: '',
    results: [],
    hasRun: false
  },

  // Today's Stock Opportunities state
  opportunitiesState: {
    hasGenerated: false,
    isLoading: false,
    summary: null,
    allOpportunities: [],
    buyCandidates: [],
    holdCandidates: [],
    sellCandidates: [],
    filters: {
      marketCap: 'ALL',
      signal: 'ALL',
      minScore: 80,
      valuationStatus: 'ALL',
      riskLevel: 'ALL',
      sector: 'ALL',
      searchQuery: ''
    },
    sortOption: 'cheapest_fair_value',
    lastGeneratedTime: null
  },

  init() {
    this.bindNavigation();
    this.bindModals();
    this.bindStockSearch();
    this.bindMfSearch();
    this.bindScreenerFilters();
    this.bindSettingsForm();
    this.bindWatchlistFilters();
    this.bindIndexScannerFilters();
    this.bindOpportunities();
    this.initChat();

    // Mobile Responsive & Format Switcher initializers
    this.initViewModeToggle();
    this.initMenubarToggle();
    this.bindWatchlistLayoutToggle();

    // Default dates
    const today = new Date().toISOString().split('T')[0];
    const mfDateInput = document.getElementById('modalMfStartDate');
    if (mfDateInput) mfDateInput.value = today;

    // Refresh buttons
    document.getElementById('refreshDataBtn')?.addEventListener('click', () => this.refreshAllData(true));
    document.getElementById('refreshAlertsBtn')?.addEventListener('click', () => this.loadAlerts());

    // Top alert bell
    document.getElementById('topAlertBellBtn')?.addEventListener('click', () => this.navigateTo('alerts'));

    // FAB chat button
    document.getElementById('fabChatBtn')?.addEventListener('click', () => this.navigateTo('chat'));

    // Load watchlist from SQLite database (with automatic localStorage migration)
    this.loadWatchlist();

    // Initial load
    this.refreshAllData(false);
  },

  navigateTo(viewId) {
    this.activeView = viewId;
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewId);
    });

    // Update bottom nav active state
    document.querySelectorAll('.mobile-bottom-nav-item[data-view]').forEach(el => {
      el.classList.toggle('active', el.dataset.view === viewId);
    });

    // Auto-close mobile drawer if open
    document.querySelector('.sidebar')?.classList.remove('mobile-open');
    document.getElementById('mobileDrawerBackdrop')?.classList.remove('active');
    document.body.classList.remove('drawer-open');

    // Scroll to top of view
    window.scrollTo({ top: 0, behavior: 'smooth' });

    document.querySelectorAll('.view-section').forEach(el => {
      el.classList.toggle('active', el.id === `view-${viewId}`);
    });

    const titles = {
      'dashboard': 'Investment Dashboard',
      'stocks': 'Indian Stock Screener & 100-Pt Analysis',
      'screener': 'Quality Tiers (Category A, B, C) Across Market Caps',
      'watchlist': 'My Watchlist — Stocks on Radar',
      'mutual-funds': '4-Fund Disciplined SIP Strategy',
      'portfolio': 'Portfolio Asset Buckets & Rebalancing',
      'alerts': 'Alerts, Concentration & Drift Warnings',
      'audit': 'Audit Trail & Strategy Methodology',
      'chat': 'AI Market Analysis Chat',
      'settings': 'Configurable Strategy Rules',
      'index-scanner': 'Index Stock Scanner — NSE & BSE Index Filter',
      'opportunities': "Today's Stock Opportunities — Disciplined Watchlist Valuation"
    };

    const heading = document.getElementById('pageTitleHeading');
    if (heading) heading.textContent = titles[viewId] || 'Investment Intelligence';

    // Show/hide FAB
    const fab = document.getElementById('fabChatBtn');
    if (fab) fab.classList.toggle('hidden', viewId === 'chat');

    // Lazy load per view
    if (viewId === 'dashboard') this.loadDashboard();
    else if (viewId === 'stocks') { /* ready for search */ }
    else if (viewId === 'screener') this.loadScreener();
    else if (viewId === 'watchlist') this.renderWatchlistTable();
    else if (viewId === 'opportunities') this.loadOpportunitiesView();
    else if (viewId === 'mutual-funds') this.loadMutualFunds();
    else if (viewId === 'portfolio') this.loadPortfolio();
    else if (viewId === 'alerts') this.loadAlerts();
    else if (viewId === 'audit') this.loadAuditTrail();
    else if (viewId === 'chat') { /* already initialized */ }
    else if (viewId === 'settings') this.loadSettings();
    else if (viewId === 'index-scanner') { /* waiting for user to hit Run */ }
  },

  // Mobile / Web Format Toggle Button
  initViewModeToggle() {
    const btn = document.getElementById('viewModeToggleBtn');
    if (!btn) return;

    // Read stored preference, or default based on screen width
    let currentMode = localStorage.getItem('sma_view_format');
    if (!currentMode) {
      currentMode = window.innerWidth <= 768 ? 'mobile' : 'web';
    }

    const applyMode = (mode, notify = false) => {
      currentMode = mode;
      localStorage.setItem('sma_view_format', mode);
      const isMobile = mode === 'mobile';

      document.body.classList.toggle('mobile-format-active', isMobile);
      document.body.classList.toggle('web-format-forced', !isMobile);

      const icon = document.getElementById('viewModeIcon');
      const text = document.getElementById('viewModeText');

      if (isMobile) {
        btn.classList.add('is-mobile');
        if (icon) icon.textContent = '💻';
        if (text) text.textContent = 'Web View';
        btn.title = 'Switch to Full Desktop / Web Format';
        if (notify) this.showToast('📱 Switched to Mobile View (Android Optimized)', 'info');
      } else {
        btn.classList.remove('is-mobile');
        if (icon) icon.textContent = '📱';
        if (text) text.textContent = 'Mobile View';
        btn.title = 'Switch to Mobile / Android Format';
        if (notify) this.showToast('💻 Switched to Desktop / Web Format', 'info');
      }

      // Re-render watchlist table / cards if on watchlist screen
      if (this.activeView === 'watchlist') {
        this.renderWatchlistTable();
      }
    };

    applyMode(currentMode, false);

    btn.addEventListener('click', () => {
      const nextMode = currentMode === 'mobile' ? 'web' : 'mobile';
      applyMode(nextMode, true);
    });

    // Auto-detect on resize if no manual override stored
    window.addEventListener('resize', () => {
      if (!localStorage.getItem('sma_view_format')) {
        const autoMode = window.innerWidth <= 768 ? 'mobile' : 'web';
        if (autoMode !== currentMode) {
          applyMode(autoMode, false);
        }
      }
    });
  },

  // Menubar Hide / Show Toggle & Navigation Controls (Desktop & Mobile)
  initMenubarToggle() {
    const toggleBtn = document.getElementById('menuToggleBtn') || document.getElementById('mobileMenuToggleBtn');
    const closeBtn = document.getElementById('sidebarCloseBtn');
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    const sidebar = document.querySelector('.sidebar');
    const moreMenuBtn = document.getElementById('mobileMoreMenuBtn');

    const isMobileFormat = () => {
      return window.innerWidth <= 768 || document.body.classList.contains('mobile-format-active');
    };

    const updateToggleBtnState = () => {
      const isHidden = document.body.classList.contains('sidebar-hidden');
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
        toggleBtn.title = isHidden ? 'Show Menubar (☰)' : 'Hide Menubar (☰)';
      }
    };

    // Restore desktop menubar hidden state preference
    if (!isMobileFormat()) {
      const storedHidden = localStorage.getItem('sma_sidebar_hidden');
      if (storedHidden === 'true') {
        document.body.classList.add('sidebar-hidden');
      }
      updateToggleBtnState();
    }

    const openDrawer = () => {
      sidebar?.classList.add('mobile-open');
      backdrop?.classList.add('active');
      document.body.classList.add('drawer-open');
    };

    const closeDrawer = () => {
      sidebar?.classList.remove('mobile-open');
      backdrop?.classList.remove('active');
      document.body.classList.remove('drawer-open');
    };

    const toggleMenubar = () => {
      if (isMobileFormat()) {
        // Mobile drawer toggle
        if (sidebar?.classList.contains('mobile-open')) {
          closeDrawer();
        } else {
          openDrawer();
        }
      } else {
        // Desktop sidebar hide/show
        const isHiddenNow = document.body.classList.toggle('sidebar-hidden');
        localStorage.setItem('sma_sidebar_hidden', isHiddenNow ? 'true' : 'false');
        updateToggleBtnState();
        this.showToast(isHiddenNow ? 'Menubar hidden (full width view)' : 'Menubar visible', 'info');
      }
    };

    const hideMenubar = () => {
      if (isMobileFormat()) {
        closeDrawer();
      } else {
        document.body.classList.add('sidebar-hidden');
        localStorage.setItem('sma_sidebar_hidden', 'true');
        updateToggleBtnState();
        this.showToast('Menubar hidden (full width view)', 'info');
      }
    };

    toggleBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenubar();
    });

    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      hideMenubar();
    });

    backdrop?.addEventListener('click', closeDrawer);
    moreMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      openDrawer();
    });

    // Close drawer when any nav link is tapped on mobile
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
      item.addEventListener('click', () => {
        if (isMobileFormat()) {
          closeDrawer();
        }
      });
    });

    // Bottom nav clicks
    document.querySelectorAll('.mobile-bottom-nav-item[data-view]').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.dataset.view;
        if (view) {
          this.navigateTo(view);
          closeDrawer();
        }
      });
    });
  },

  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        this.navigateTo(item.dataset.view);
      });
    });
  },

  async refreshAllData(showToast = false) {
    await this.loadDashboard();
    await this.loadAlerts();
    if (showToast) {
      this.showToast('Data refreshed from live website feeds', 'info');
    }
  },

  // --- 1. DASHBOARD ---
  async loadDashboard() {
    try {
      const res = await fetch('/api/v1/portfolios/default-portfolio/analysis');
      const json = await res.json();
      const data = json.data;
      this.portfolioData = data;

      // Update Metric Cards
      document.getElementById('dashTotalValue').textContent = `₹${data.totalValue.toLocaleString('en-IN')}`;

      const pnlSub = document.getElementById('dashTotalPnlSub');
      const sign = data.totalPnl >= 0 ? '+' : '';
      pnlSub.textContent = `${sign}₹${data.totalPnl.toLocaleString('en-IN')} (${sign}${data.totalPnlPercent}%)`;
      pnlSub.className = `metric-sub ${data.totalPnl >= 0 ? 'positive' : 'negative'}`;

      document.getElementById('dashComplianceScore').textContent = `${data.complianceScore}%`;

      // Holdings count
      const holdingsRes = await fetch('/api/v1/portfolios/default-portfolio/holdings');
      const holdingsJson = await holdingsRes.json();
      document.getElementById('dashHoldingsCount').textContent = (holdingsJson.data || []).length;

      // Alerts count
      const alertCount = (data.alerts || []).length;
      document.getElementById('dashAlertsCount').textContent = alertCount;
      document.getElementById('headerAlertCount').textContent = alertCount;
      document.getElementById('dashAlertsSub').textContent = alertCount > 0 ? `${alertCount} items need attention` : 'All rules compliant';

      // Profit Trigger Banner
      const profitBanner = document.getElementById('dashboardProfitBanner');
      if (data.midSmallCapSellTriggers && data.midSmallCapSellTriggers.length > 0) {
        const trigger = data.midSmallCapSellTriggers[0];
        profitBanner.style.display = 'block';
        profitBanner.className = 'profit-trigger-banner';
        profitBanner.innerHTML = `
          <div class="profit-trigger-content">
            <div class="profit-trigger-icon">🎯</div>
            <div>
              <div style="font-weight: 700; color: #fff; font-size: 0.95rem;">Profit Review Trigger: ${trigger.holding.symbol} (+${trigger.pnlPercent.toFixed(1)}%)</div>
              <div style="font-size: 0.82rem; color: #f8fafc; opacity: 0.9; margin-top: 2px;">${trigger.suggestion}</div>
            </div>
          </div>
          <button class="secondary-btn" style="white-space: nowrap; font-size: 0.8rem;" onclick="app.navigateTo('portfolio')">Review Holding</button>
        `;
      } else {
        profitBanner.style.display = 'none';
      }

      // Render Allocation Chart & List
      this.renderAllocationChart(data.equityAllocation);

      // Render Rule Compliance List
      this.renderRuleStatusList(data.ruleResults);

      // Top Stock Recommendations
      this.loadTopRecommendations();

      // MF Overview
      this.loadDashboardMfOverview();

    } catch (err) {
      console.error('Failed to load dashboard:', err);
    }
  },

  renderAllocationChart(alloc) {
    const ctx = document.getElementById('dashAllocationChart');
    if (!ctx) return;

    const labels = ['Large-Cap (Tgt 40%)', 'Mid-Cap (Tgt 30%)', 'Small-Cap (Tgt 20%)', 'Gold/Silver ETF (Tgt 10%)'];
    const actualData = [
      alloc.largeCap.actual,
      alloc.midCap.actual,
      alloc.smallCap.actual,
      alloc.goldSilverEtf.actual
    ];

    if (this.allocationChart) {
      this.allocationChart.destroy();
    }

    this.allocationChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: actualData,
          backgroundColor: ['#6366f1', '#06b6d4', '#f59e0b', '#10b981'],
          borderWidth: 2,
          borderColor: '#0b101d'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#94a3b8', boxWidth: 12, padding: 12, font: { family: 'Outfit', size: 11 } }
          }
        }
      }
    });

    const breakdown = document.getElementById('allocationBreakdownList');
    if (breakdown) {
      const items = [
        { name: 'Large-Cap', data: alloc.largeCap },
        { name: 'Mid-Cap', data: alloc.midCap },
        { name: 'Small-Cap', data: alloc.smallCap },
        { name: 'Gold/Silver ETF', data: alloc.goldSilverEtf }
      ];

      breakdown.innerHTML = items.map(item => `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; padding: 6px 10px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm);">
          <span style="color: var(--text-primary); font-weight: 500;">${item.name}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: var(--text-secondary);">₹${item.data.value.toLocaleString('en-IN')} (${item.data.actual}%)</span>
            <span class="badge ${item.data.status.toLowerCase()}">${item.data.status}</span>
          </div>
        </div>
      `).join('');
    }
  },

  renderRuleStatusList(ruleResults) {
    const container = document.getElementById('dashRuleStatusList');
    if (!container) return;

    container.innerHTML = (ruleResults || []).map(r => `
      <div style="padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="color: #fff; font-size: 0.85rem;">${r.ruleName}</strong>
          <span class="badge ${r.status.toLowerCase()}">${r.status}</span>
        </div>
        <div style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 4px;">${r.explanation}</div>
        <div style="font-size: 0.75rem; color: #a5b4fc;">💡 ${r.suggestedAction}</div>
      </div>
    `).join('');
  },

  async loadTopRecommendations() {
    const list = document.getElementById('dashTopStocksList');
    if (!list) return;
    try {
      const res = await fetch('/api/v1/recommendations/stocks');
      const json = await res.json();
      const stocks = (json.data || []).slice(0, 4);

      list.innerHTML = stocks.map(s => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); cursor: pointer;" onclick="app.analyzeStockSymbol('${s.symbol}')">
          <div>
            <div style="font-weight: 600; color: #fff; font-size: 0.88rem;">${s.name} (${s.symbol})</div>
            <div style="font-size: 0.75rem; color: var(--text-secondary);">ROCE ${s.metrics.roce}% | D/E ${s.metrics.debtEquity} | P/E ${s.metrics.pe}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 1.1rem; font-weight: 700; color: #10b981;">${s.totalScore}<span style="font-size: 0.7rem; color: var(--text-muted);">/100</span></div>
            <span class="badge ${s.suitability === 'EXCELLENT' ? 'pass' : 'info'}" style="font-size: 0.65rem;">${s.suitability}</span>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.warn('Could not load top stocks:', e);
    }
  },

  async loadDashboardMfOverview() {
    const container = document.getElementById('dashMfOverview');
    if (!container) return;
    try {
      const res = await fetch('/api/v1/mutual-funds/portfolio/analysis');
      const json = await res.json();
      const data = json.data;

      container.innerHTML = `
        <div style="padding: 14px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); border-left: 3px solid var(--accent-emerald);">
          <div style="font-size: 0.85rem; font-weight: 600; color: #fff;">4-Fund Rule Status: <span class="badge ${data.fourFundRuleStatus.toLowerCase()}">${data.fourFundRuleStatus}</span></div>
          <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
            Total Monthly SIP: <strong>₹${data.totalMonthlySip.toLocaleString('en-IN')}</strong> | 15-Yr Projected Corpus: <strong>₹${(data.totalProjected15YCorpus / 10000000).toFixed(2)} Cr</strong> (at 12% CAGR).
          </div>
        </div>
        <div style="font-size: 0.78rem; color: var(--text-secondary);">
          Diversified across Nifty Index (${data.categoryAllocation.niftyIndex.actualPct}%), Multi-Cap (${data.categoryAllocation.multiCap.actualPct}%), Mid-Small (${data.categoryAllocation.midSmallCap.actualPct}%), and Debt (${data.categoryAllocation.debtMoneyMarket.actualPct}%).
        </div>
      `;
    } catch (e) {
      console.warn('Could not load dashboard MF overview:', e);
    }
  },

  // --- 2. STOCK ANALYSIS ---
  bindStockSearch() {
    const input = document.getElementById('stockSearchInput');
    const dropdown = document.getElementById('stockSearchDropdown');
    let debounceTimer = null;

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = input.value.trim().toUpperCase();
        if (q.length > 0) {
          dropdown.classList.remove('active');
          this.analyzeStockSymbol(q);
        }
      }
    });

    input?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(debounceTimer);
      if (q.length < 2) {
        dropdown.classList.remove('active');
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/v1/stocks/search?q=${encodeURIComponent(q)}`);
          const json = await res.json();
          const items = json.data || [];
          if (items.length === 0) {
            dropdown.innerHTML = `<div class="search-item" style="color: var(--text-muted);">No Indian stocks found for "${q}"</div>`;
          } else {
            dropdown.innerHTML = items.map(item => `
              <div class="search-item" onclick="app.analyzeStockSymbol('${item.symbol}')">
                <span style="font-weight: 600; color: #fff;">${item.name}</span>
                <span class="badge info">${item.symbol}</span>
              </div>
            `).join('');
          }
          dropdown.classList.add('active');
        } catch (err) {
          console.error(err);
        }
      }, 250);
    });

    document.addEventListener('click', (e) => {
      if (!input?.contains(e.target) && !dropdown?.contains(e.target)) {
        dropdown?.classList.remove('active');
      }
    });
  },

  async analyzeStockSymbol(symbol) {
    document.getElementById('stockSearchDropdown')?.classList.remove('active');
    const container = document.getElementById('stockAnalysisResult');
    container.innerHTML = `
      <div class="card" style="text-align: center; padding: 40px;">
        <div class="pulse-dot" style="margin: 0 auto 16px; width: 16px; height: 16px;"></div>
        <h3>Fetching Live Market Data for ${symbol}...</h3>
        <p style="color: var(--text-secondary); margin-top: 8px;">Retrieving consolidated financials from Screener.in and live prices from NSE/Yahoo Finance...</p>
      </div>
    `;

    this.navigateTo('stocks');

    try {
      const [analysisRes, compRes] = await Promise.all([
        fetch(`/api/v1/stocks/${encodeURIComponent(symbol)}/analysis`),
        fetch(`/api/v1/stocks/${encodeURIComponent(symbol)}/competitors`)
      ]);

      const analysisJson = await analysisRes.json();
      const compJson = await compRes.json();
      const analysis = analysisJson.data;
      const competitors = compJson?.data?.competitors || [];

      this.renderStockAnalysis(analysis, competitors);
    } catch (err) {
      container.innerHTML = `
        <div class="card" style="border-left: 3px solid var(--accent-rose); padding: 24px;">
          <h3 style="color: var(--accent-rose);">Analysis Error</h3>
          <p style="color: var(--text-secondary); margin-top: 8px;">Failed to fetch analysis for ${symbol}: ${err.message}</p>
        </div>
      `;
    }
  },

  renderStockAnalysis(anl, competitors) {
    const container = document.getElementById('stockAnalysisResult');
    const m = anl.metrics;

    const aiPillClass = anl.aiRisk.toLowerCase();
    const aiPillIcon = anl.aiRisk === 'BENEFICIARY' ? '🛡️ AI Beneficiary' : anl.aiRisk === 'NEUTRAL' ? '⚖️ AI Neutral' : '⚠️ AI Vulnerable';

    // 100-point circle offset
    const circumference = 2 * Math.PI * 45; // r=45
    const strokeDashoffset = circumference - (anl.totalScore / 100) * circumference;

    // Watchlist state
    const isWatched = this.watchlistState.items.some(i => i.symbol === anl.symbol);
    const wlBtnId = `wlBtn_${anl.symbol}`;

    // Dividend & 5-Year Return metrics
    const divYield = m.dividendYield !== undefined && m.dividendYield !== null ? m.dividendYield : (m.roce > 30 ? 2.4 : m.roce > 20 ? 1.5 : 1.1);
    const divPayout = m.dividendPayout !== undefined && m.dividendPayout !== null ? m.dividendPayout : (divYield >= 2.0 ? 45.0 : 32.0);
    const dps = m.dividendPerShare ?? Math.round((m.price * (divYield / 100)) * 10) / 10;
    const return5Y = m.return5Y ?? Math.round((m.profitCagr5Y || 15) * 1.05 * 10) / 10;
    const return3Y = m.return3Y ?? Math.round((return5Y * 1.15) * 10) / 10;
    const return1Y = m.return1Y ?? Math.round((return5Y * 0.95) * 10) / 10;
    const fcfCoverage = (m.fcfCr > 0 && divPayout > 0) ? Math.min(10, Math.max(0.5, Math.round(((m.fcfCr / (m.patCr * (divPayout / 100) || 1))) * 10) / 10)) : 1.8;
    const multiplier5Y = Math.pow(1 + (return5Y / 100), 5);
    const wealth5Y = Math.round(100000 * multiplier5Y);
    const totalReturn5YPct = Math.round((multiplier5Y - 1) * 100 * 10) / 10;

    container.innerHTML = `
      <!-- Header Overview Card -->
      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
              <h2 style="font-size: 1.6rem; color: #fff;">${anl.name}</h2>
              <span class="badge info" style="font-size: 0.85rem;">${anl.symbol}</span>
              <span class="badge pass">${m.marketCapCategory}</span>
            </div>
            <div style="color: var(--text-secondary); font-size: 0.85rem;">
              Sector: <strong style="color: #fff;">${m.sector}</strong> | Industry: <strong style="color: #fff;">${m.industry}</strong> | Market Cap: <strong style="color: #fff;">₹${m.marketCapCr.toLocaleString('en-IN')} Cr</strong>
            </div>
          </div>
          
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="text-align: right;">
              <div style="font-size: 1.75rem; font-weight: 800; color: #fff;">₹${m.price.toLocaleString('en-IN')}</div>
              <div style="font-size: 0.78rem; color: var(--text-secondary);">Source: Official NSE &amp; BSE (Till Previous Date) + Screener</div>
            </div>
            <button id="${wlBtnId}" class="secondary-btn" style="padding: 8px 14px; font-size: 0.82rem; ${isWatched ? 'color: var(--accent-amber); border-color: rgba(245,158,11,0.5);' : ''}" onclick="app.toggleWatchlist(${JSON.stringify(anl).replace(/"/g, '&quot;')})">
              ${isWatched ? '⭐ Watchlisted' : '☆ Add to Watchlist'}
            </button>
            <button class="primary-btn" onclick="app.quickAddHoldingFromStock('${anl.symbol}', ${m.price}, '${m.marketCapCategory}')">
              <span>➕</span> Add to Portfolio
            </button>
          </div>
        </div>
      </div>

      <!-- Official Exchange Data (NSE & BSE — Previous Trading Date Data) -->
      <div class="card" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.85) 100%); border: 1px solid rgba(255, 255, 255, 0.08);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
          <div>
            <h3 style="font-size: 1.1rem; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>🏛️ Official Exchange Market Data (NSE &amp; BSE)</span>
              <span class="badge pass" style="font-size: 0.7rem;">Till Previous Trading Day</span>
            </h3>
            <span style="font-size: 0.78rem; color: var(--text-muted);">
              Official EOD prices and trading session statistics directly from National Stock Exchange (NSE) and Bombay Stock Exchange (BSE)
            </span>
          </div>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 0.72rem; border: 1px solid rgba(56, 189, 248, 0.3);">🏛️ NSE Feed</span>
            <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; font-size: 0.72rem; border: 1px solid rgba(245, 158, 11, 0.3);">🏛️ BSE Feed</span>
            <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 0.72rem; border: 1px solid rgba(16, 185, 129, 0.3);">📊 Screener.in Ratios</span>
          </div>
        </div>

        <div class="grid-2" style="gap: 16px;">
          <!-- NSE Box -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 800; font-size: 1rem; color: #38bdf8;">NSE (National Stock Exchange)</span>
                <span class="badge info" style="font-size: 0.68rem;">EQ Series</span>
              </div>
              <span style="font-size: 0.72rem; color: var(--text-muted);">Trade Date: <strong>${m.nseQuote?.tradingDate || m.previousCloseDate || 'Previous Session'}</strong></span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px;">
              <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.7rem; color: var(--text-muted);">Prev Day Close</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #fff;">₹${(m.nseQuote?.previousClose ?? m.previousClose ?? m.price).toLocaleString('en-IN')}</div>
              </div>
              <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.7rem; color: var(--text-muted);">Close / LTP</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: ${(m.nseQuote?.change ?? 0) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                  ₹${(m.nseQuote?.closePrice ?? m.price).toLocaleString('en-IN')}
                </div>
              </div>
              <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.7rem; color: var(--text-muted);">Day Change</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: ${(m.nseQuote?.change ?? 0) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                  ${(m.nseQuote?.change ?? 0) >= 0 ? '+' : ''}${m.nseQuote?.change ?? 0} (${(m.nseQuote?.changePercent ?? 0) >= 0 ? '+' : ''}${m.nseQuote?.changePercent ?? 0}%)
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-secondary); padding: 6px 4px 0; flex-wrap: wrap; gap: 8px;">
              <div>Day High / Low: <strong style="color: #fff;">₹${m.nseQuote?.dayHigh ?? '—'}</strong> / <strong style="color: #fff;">₹${m.nseQuote?.dayLow ?? '—'}</strong></div>
              <div>52W High / Low: <strong style="color: #fff;">₹${m.nseQuote?.high52 ?? '—'}</strong> / <strong style="color: #fff;">₹${m.nseQuote?.low52 ?? '—'}</strong></div>
              <div>Volume: <strong style="color: #fff;">${m.nseQuote?.volume ? m.nseQuote.volume.toLocaleString('en-IN') : '—'}</strong></div>
            </div>
          </div>

          <!-- BSE Box -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-weight: 800; font-size: 1rem; color: #fbbf24;">BSE (Bombay Stock Exchange)</span>
                <span class="badge warning" style="font-size: 0.68rem;">Scrip: ${m.bseQuote?.scripCode || 'BSE Listed'}</span>
              </div>
              <span style="font-size: 0.72rem; color: var(--text-muted);">Trade Date: <strong>${m.bseQuote?.tradingDate || m.previousCloseDate || 'Previous Session'}</strong></span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 10px;">
              <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.7rem; color: var(--text-muted);">Prev Day Close</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: #fff;">₹${(m.bseQuote?.previousClose ?? m.previousClose ?? m.price).toLocaleString('en-IN')}</div>
              </div>
              <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.7rem; color: var(--text-muted);">Close / LTP</div>
                <div style="font-size: 1.15rem; font-weight: 800; color: ${(m.bseQuote?.change ?? 0) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                  ₹${(m.bseQuote?.closePrice ?? m.price).toLocaleString('en-IN')}
                </div>
              </div>
              <div style="background: rgba(0,0,0,0.25); padding: 10px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.7rem; color: var(--text-muted);">Day Change</div>
                <div style="font-size: 1.05rem; font-weight: 700; color: ${(m.bseQuote?.change ?? 0) >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                  ${(m.bseQuote?.change ?? 0) >= 0 ? '+' : ''}${m.bseQuote?.change ?? 0} (${(m.bseQuote?.changePercent ?? 0) >= 0 ? '+' : ''}${m.bseQuote?.changePercent ?? 0}%)
                </div>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; color: var(--text-secondary); padding: 6px 4px 0; flex-wrap: wrap; gap: 8px;">
              <div>Day High / Low: <strong style="color: #fff;">₹${m.bseQuote?.dayHigh ?? '—'}</strong> / <strong style="color: #fff;">₹${m.bseQuote?.dayLow ?? '—'}</strong></div>
              <div>52W High / Low: <strong style="color: #fff;">₹${m.bseQuote?.high52 ?? '—'}</strong> / <strong style="color: #fff;">₹${m.bseQuote?.low52 ?? '—'}</strong></div>
              <div>Status: <strong style="color: var(--accent-emerald);">Official BSE Feed</strong></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Score & AI Disruption Row -->
      <div class="grid-3">
        <!-- 100 Point Score Gauge with Priority 10 Checks Integration -->
        <div class="card score-circle-container">
          <div class="metric-label">100-Point Quality Score</div>
          <div class="score-circle">
            <svg viewBox="0 0 100 100">
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#6366f1"/>
                  <stop offset="100%" stop-color="#10b981"/>
                </linearGradient>
              </defs>
              <circle class="bg-circle" cx="50" cy="50" r="45"/>
              <circle class="progress-circle" cx="50" cy="50" r="45" style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${strokeDashoffset};"/>
            </svg>
            <div class="score-value-display">
              <div class="score-number">${anl.totalScore}</div>
              <div class="score-total">out of 100</div>
            </div>
          </div>

          <!-- Priority 10 Investment Checks Mini-Meter (10 Checks = 100 Pts) -->
          <div class="priority10-mini-track" title="Priority 10 Checks: ${anl.passedChecks.length}/10 Passed (${anl.priority10Score ?? (anl.passedChecks.length * 10)}/100 Pts)">
            ${anl.priority10Checks.map((chk, i) => `
              <div class="priority10-mini-segment ${chk.passed ? 'passed' : 'failed'}" title="#${i + 1} ${chk.name}: ${chk.passed ? 'PASSED (+' + (chk.score ?? 10) + ' pts)' : 'FAILED (' + (chk.score ?? 0) + ' pts)'}"></div>
            `).join('')}
          </div>
          <div style="font-size: 0.78rem; font-weight: 600; color: ${anl.passedChecks.length >= 8 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}; margin-top: 4px; text-align: center;">
            Priority 10: ${anl.passedChecks.length}/10 Passed (${anl.priority10Score ?? (anl.passedChecks.length * 10)}/100 Pts)
          </div>

          <div style="margin-top: 10px; text-align: center;">
            <span class="badge ${anl.suitability === 'EXCELLENT' ? 'pass' : anl.suitability === 'GOOD' ? 'info' : 'warning'}" style="font-size: 0.85rem;">
              Suitability: ${anl.suitability}
            </span>
          </div>
        </div>

        <!-- AI Disruption Assessment -->
        <div class="card">
          <div class="metric-label">AI Disruption Risk</div>
          <div style="margin: 12px 0;">
            <span class="ai-pill ${aiPillClass}">${aiPillIcon}</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: 8px;">Confidence: ${(anl.aiConfidence * 100).toFixed(0)}%</span>
          </div>
          <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 12px;">
            ${anl.aiReasoning}
          </p>
          <div style="padding: 10px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm); font-size: 0.78rem;">
            <strong style="color: #fff;">Investment Attractiveness Index:</strong> <span style="color: var(--accent-cyan); font-weight: 700;">${anl.investmentAttractivenessIndex}/100</span>
          </div>
        </div>

        <!-- Technical & 200-DMA Status -->
        <div class="card">
          <div class="metric-label">Technical Momentum (200-DMA)</div>
          <div style="margin: 12px 0;">
            <span class="badge ${m.priceAboveDma200 ? 'pass' : 'warning'}" style="font-size: 0.85rem;">
              ${m.priceAboveDma200 ? '✅ Trading Above 200-DMA' : '⚠️ Trading Below 200-DMA'}
            </span>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.6;">
            <div>Current Price: <strong>₹${m.price}</strong></div>
            <div>200-Day DMA: <strong>₹${m.dma200 ? m.dma200.toFixed(1) : 'Calculating'}</strong></div>
            <div>Relative Strength: <strong>${m.relativeStrengthRank}/100</strong></div>
          </div>
          <div style="margin-top: 14px; font-size: 0.75rem; color: var(--text-muted);">
            Preferred criteria: Buy high-quality compounders with positive 200-DMA alignment.
          </div>
        </div>
      </div>

      <!-- Recommended Price Ranges: Better to BUY and Better to SELL Cards -->
      ${(() => {
        const ptr = anl.priceTargetRange || (() => {
          const price = m.price || 100;
          const dma200 = m.dma200 || (m.priceAboveDma200 !== false ? Math.round(price * 0.95) : Math.round(price * 1.05));
          const nseHigh52 = m.nseQuote?.high52 || m.bseQuote?.high52;
          const nseLow52 = m.nseQuote?.low52 || m.bseQuote?.low52;
          const high52 = nseHigh52 || Math.round(price * 1.25);
          const low52 = nseLow52 || Math.round(price * 0.75);
          const isLargeCap = m.marketCapCategory === 'LARGE_CAP';
          const isMidSmallCap = m.marketCapCategory === 'MID_CAP' || m.marketCapCategory === 'SMALL_CAP';

          let buyRangeMin, buyRangeMax;
          if (anl.totalScore >= 75) {
            if (m.priceAboveDma200 !== false) {
              buyRangeMin = Math.round(Math.max(dma200 * 0.98, price * 0.92));
              buyRangeMax = Math.round(Math.min(price * 1.02, Math.max(price * 0.98, buyRangeMin * 1.08)));
            } else {
              buyRangeMin = Math.round(Math.max(low52 * 1.05, price * 0.90));
              buyRangeMax = Math.round(price * 0.98);
            }
          } else {
            buyRangeMin = Math.round(Math.max(low52, price * 0.85));
            buyRangeMax = Math.round(price * 0.93);
          }
          if (buyRangeMin >= buyRangeMax) buyRangeMin = Math.round(buyRangeMax * 0.92);

          let sellRangeMin, sellRangeMax;
          if (isMidSmallCap) {
            sellRangeMin = Math.round(price * 1.10);
            sellRangeMax = Math.round(price * 1.15);
          } else {
            sellRangeMin = Math.round(price * 1.15);
            sellRangeMax = Math.round(Math.max(high52, price * 1.25));
          }
          if (sellRangeMax <= sellRangeMin) sellRangeMax = Math.round(sellRangeMin * 1.08);

          const stopLoss = Math.round(Math.min(price * 0.92, dma200 ? dma200 * 0.96 : price * 0.92));
          const target1 = sellRangeMin;
          const target2 = sellRangeMax;
          const supportLevel = Math.round(Math.min(buyRangeMin, dma200));
          const resistanceLevel = Math.round(Math.max(sellRangeMax, high52));

          let buyStatus, buyStatusLabel;
          if (price >= buyRangeMin && price <= buyRangeMax) {
            buyStatus = 'IN_BUY_ZONE';
            buyStatusLabel = '🟢 Currently in Optimal Buy Zone';
          } else if (price < buyRangeMin) {
            buyStatus = 'DEEP_VALUE';
            buyStatusLabel = '💎 Deep Value / Discount Zone';
          } else {
            buyStatus = 'WAIT_FOR_PULLBACK';
            buyStatusLabel = `⏳ Wait for Pullback (${((price - buyRangeMax) / buyRangeMax * 100).toFixed(1)}% above entry)`;
          }

          const isValuationExtreme = (m.pe > 75) ||
            (m.industryPe > 0 && m.pe > m.industryPe * 1.8) ||
            (m.peg !== undefined && m.peg >= 2.5);
          const isNearResistance = high52 > 0 && price >= high52 * 0.98;

          let sellStatus, sellStatusLabel;
          if (isValuationExtreme) {
            sellStatus = 'OVERVALUED_EXTREME';
            sellStatusLabel = '⚠️ Valuation Stretched — Consider Trimming';
          } else if (price >= sellRangeMin || isNearResistance) {
            sellStatus = 'IN_SELL_ZONE';
            sellStatusLabel = '🎯 In Profit Booking Zone / Resistance';
          } else {
            sellStatus = 'UPSIDE_AHEAD';
            sellStatusLabel = `📈 Room to Run (+${((sellRangeMin - price) / price * 100).toFixed(1)}% to Target 1)`;
          }

          const buyStrategy = isLargeCap
            ? `Large-cap accumulation: Stagger buys in 3 tranches between ₹${buyRangeMin.toLocaleString('en-IN')} and ₹${buyRangeMax.toLocaleString('en-IN')}. Strong compounding horizon (3-10 years).`
            : `Value Accumulation: Enter selectively between ₹${buyRangeMin.toLocaleString('en-IN')} and ₹${buyRangeMax.toLocaleString('en-IN')} on dips towards support with tight stop-loss.`;

          const sellStrategy = isMidSmallCap
            ? `Portfolio Rule: Small/Mid-cap 10–15% profit rule active. Book 50% partial profit at ₹${sellRangeMin.toLocaleString('en-IN')} (+10%) and full profit near ₹${sellRangeMax.toLocaleString('en-IN')} (+15%) to reduce volatility.`
            : `Portfolio Rule: Large-cap long-term holding rule. Core holding for multi-year compounding. Consider trimming only above ₹${sellRangeMax.toLocaleString('en-IN')} or on extreme valuation stretch.`;

          const upsidePercentMin = Math.round(((sellRangeMin - price) / price) * 1000) / 10;
          const upsidePercentMax = Math.round(((sellRangeMax - price) / price) * 1000) / 10;

          return {
            buyRangeMin,
            buyRangeMax,
            buyStatus,
            buyStatusLabel,
            buyStrategy,
            sellRangeMin,
            sellRangeMax,
            sellStatus,
            sellStatusLabel,
            sellStrategy,
            target1,
            target2,
            stopLoss,
            supportLevel,
            resistanceLevel,
            upsidePercentMin,
            upsidePercentMax
          };
        })();

        const price = m.price || 100;
        const low52 = m.nseQuote?.low52 || m.bseQuote?.low52 || Math.round(price * 0.75);
        const high52 = m.nseQuote?.high52 || m.bseQuote?.high52 || Math.round(price * 1.25);
        const dma200Val = m.dma200 || (m.priceAboveDma200 !== false ? Math.round(price * 0.95) : Math.round(price * 1.05));

        // Visual Slider calculations for Buy Zone
        const buyMinAnchor = Math.min(low52, ptr.buyRangeMin * 0.92);
        const buyMaxAnchor = Math.max(price * 1.08, ptr.buyRangeMax * 1.12);
        const buySpan = Math.max(1, buyMaxAnchor - buyMinAnchor);
        const buyLeft = Math.max(4, Math.min(75, Math.round(((ptr.buyRangeMin - buyMinAnchor) / buySpan) * 100)));
        const buyRight = Math.max(buyLeft + 12, Math.min(94, Math.round(((ptr.buyRangeMax - buyMinAnchor) / buySpan) * 100)));
        const buyWidth = buyRight - buyLeft;
        const cmpBuyPos = Math.max(3, Math.min(97, Math.round(((price - buyMinAnchor) / buySpan) * 100)));

        // Visual Slider calculations for Sell Zone
        const sellMinAnchor = Math.min(ptr.stopLoss * 0.96, price * 0.96);
        const sellMaxAnchor = Math.max(high52 * 1.06, ptr.sellRangeMax * 1.08);
        const sellSpan = Math.max(1, sellMaxAnchor - sellMinAnchor);
        const sellLeft = Math.max(12, Math.min(72, Math.round(((ptr.sellRangeMin - sellMinAnchor) / sellSpan) * 100)));
        const sellRight = Math.max(sellLeft + 12, Math.min(94, Math.round(((ptr.sellRangeMax - sellMinAnchor) / sellSpan) * 100)));
        const sellWidth = sellRight - sellLeft;
        const cmpSellPos = Math.max(3, Math.min(97, Math.round(((price - sellMinAnchor) / sellSpan) * 100)));

        const isCurrentlyInBuy = price >= ptr.buyRangeMin && price <= ptr.buyRangeMax;
        const isDeepDiscount = price < ptr.buyRangeMin;
        const isCurrentlyInSell = price >= ptr.sellRangeMin;

        return `
        <div style="margin-bottom: 24px;">
          <!-- Section Heading -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
            <div>
              <h3 style="font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 8px;">
                <span>🎯 Strategic Price Guidance: Better to BUY &amp; Better to SELL</span>
              </h3>
              <span style="font-size: 0.78rem; color: var(--text-muted);">
                Rule-based valuation zones, technical support/resistance anchors, and risk-managed profit booking targets
              </span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: #34d399; font-size: 0.75rem; border: 1px solid rgba(16, 185, 129, 0.3);">
                ${ptr.buyStatusLabel}
              </span>
              <span class="badge" style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; font-size: 0.75rem; border: 1px solid rgba(245, 158, 11, 0.3);">
                ${ptr.sellStatusLabel}
              </span>
            </div>
          </div>

          <div class="grid-2" style="gap: 18px;">
            <!-- CARD 1: BETTER PRICE RANGE TO BUY -->
            <div class="card" style="background: linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.85) 100%); border: 1px solid rgba(16, 185, 129, 0.3); position: relative; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.25);">
              <!-- Top Glow Bar -->
              <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #10b981, #06b6d4);"></div>

              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-size: 1.3rem;">🟢</span>
                    <h4 style="font-size: 1.1rem; color: #fff; font-weight: 700;">Price Range: Better to BUY</h4>
                  </div>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Optimal Accumulation &amp; Margin of Safety Band</span>
                </div>
                <span class="badge ${isCurrentlyInBuy ? 'pass' : isDeepDiscount ? 'info' : 'warning'}" style="font-size: 0.75rem; padding: 4px 10px;">
                  ${isCurrentlyInBuy ? '✅ In Buy Band' : isDeepDiscount ? '💎 Deep Discount' : '⏳ Wait For Dip'}
                </span>
              </div>

              <!-- Main Target Price Range Display -->
              <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-md); padding: 16px; text-align: center; margin-bottom: 14px;">
                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Recommended Accumulation Range</div>
                <div style="font-size: 1.85rem; font-weight: 800; color: #34d399; letter-spacing: -0.02em;">
                  ₹${ptr.buyRangeMin.toLocaleString('en-IN')} — ₹${ptr.buyRangeMax.toLocaleString('en-IN')}
                </div>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
                  CMP: <strong style="color: #fff;">₹${price.toLocaleString('en-IN')}</strong> 
                  (${price > ptr.buyRangeMax ? '<span style="color: var(--accent-amber);">+' + ((price - ptr.buyRangeMax) / ptr.buyRangeMax * 100).toFixed(1) + '% above ideal zone</span>' : price < ptr.buyRangeMin ? '<span style="color: var(--accent-cyan);">' + ((ptr.buyRangeMin - price) / price * 100).toFixed(1) + '% discount below entry</span>' : '<span style="color: var(--accent-emerald);">Directly in accumulation zone</span>'})
                </div>
              </div>

              <!-- Interactive Visual Gauge / Range Track -->
              <div style="background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 6px;">
                  <span>52W Low: ₹${low52.toLocaleString('en-IN')}</span>
                  <span style="color: #34d399; font-weight: 700;">Buy Band: ₹${ptr.buyRangeMin.toLocaleString('en-IN')} - ₹${ptr.buyRangeMax.toLocaleString('en-IN')}</span>
                  <span>Extended Level</span>
                </div>
                <div style="position: relative; height: 10px; background: rgba(255, 255, 255, 0.08); border-radius: 100px; margin: 8px 0;">
                  <!-- Buy Zone Gradient Bar -->
                  <div style="position: absolute; left: ${buyLeft}%; width: ${buyWidth}%; height: 100%; background: linear-gradient(90deg, #10b981, #06b6d4); border-radius: 100px; opacity: 0.9; box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);"></div>
                  <!-- Current Market Price Pointer -->
                  <div style="position: absolute; left: ${cmpBuyPos}%; top: -4px; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 3px solid ${isCurrentlyInBuy ? '#10b981' : isDeepDiscount ? '#06b6d4' : '#f59e0b'}; transform: translateX(-50%); box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);" title="Current Market Price: ₹${price.toLocaleString('en-IN')}"></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; margin-top: 4px;">
                  <span style="color: var(--text-muted);">Floor Support</span>
                  <span style="color: ${isCurrentlyInBuy ? 'var(--accent-emerald)' : isDeepDiscount ? 'var(--accent-cyan)' : 'var(--accent-amber)'}; font-weight: 600;">
                    ▲ CMP ₹${price.toLocaleString('en-IN')} (${isCurrentlyInBuy ? 'In Zone' : isDeepDiscount ? 'Deep Value' : 'Wait for Dip'})
                  </span>
                  <span style="color: var(--text-muted);">Pivot High</span>
                </div>
              </div>

              <!-- 3 Key Level Indicators -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
                <div style="background: rgba(0,0,0,0.22); padding: 8px 10px; border-radius: var(--radius-sm); text-align: center;">
                  <div style="font-size: 0.68rem; color: var(--text-muted);">Entry Ceiling</div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: #fff;">₹${ptr.buyRangeMax.toLocaleString('en-IN')}</div>
                  <div style="font-size: 0.65rem; color: var(--text-muted);">Max Recommended Buy</div>
                </div>
                <div style="background: rgba(0,0,0,0.22); padding: 8px 10px; border-radius: var(--radius-sm); text-align: center;">
                  <div style="font-size: 0.68rem; color: var(--text-muted);">Accumulation Floor</div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: #34d399;">₹${ptr.buyRangeMin.toLocaleString('en-IN')}</div>
                  <div style="font-size: 0.65rem; color: var(--text-muted);">Dip Target Level</div>
                </div>
                <div style="background: rgba(0,0,0,0.22); padding: 8px 10px; border-radius: var(--radius-sm); text-align: center;">
                  <div style="font-size: 0.68rem; color: var(--text-muted);">200-DMA Dynamic</div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: #a5b4fc;">₹${dma200Val.toLocaleString('en-IN')}</div>
                  <div style="font-size: 0.65rem; color: ${m.priceAboveDma200 !== false ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${m.priceAboveDma200 !== false ? 'Above DMA' : 'Below DMA'}</div>
                </div>
              </div>

              <!-- Strategy Guidance -->
              <div style="background: rgba(255, 255, 255, 0.03); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.76rem; color: var(--text-secondary); line-height: 1.45; border-left: 3px solid var(--accent-emerald);">
                <strong style="color: #fff;">💡 Accumulation Strategy:</strong> ${ptr.buyStrategy}
              </div>
            </div>

            <!-- CARD 2: BETTER PRICE RANGE TO SELL -->
            <div class="card" style="background: linear-gradient(145deg, rgba(244, 63, 94, 0.08) 0%, rgba(15, 23, 42, 0.85) 100%); border: 1px solid rgba(244, 63, 94, 0.3); position: relative; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.25);">
              <!-- Top Glow Bar -->
              <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #f59e0b, #f43f5e);"></div>

              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                    <span style="font-size: 1.3rem;">🎯</span>
                    <h4 style="font-size: 1.1rem; color: #fff; font-weight: 700;">Price Range: Better to SELL</h4>
                  </div>
                  <span style="font-size: 0.75rem; color: var(--text-muted);">Target Profit Booking &amp; Resistance Band</span>
                </div>
                <span class="badge ${isCurrentlyInSell ? 'warning' : 'pass'}" style="font-size: 0.75rem; padding: 4px 10px;">
                  ${isCurrentlyInSell ? '💰 In Sell Zone' : '📈 Room to Run'}
                </span>
              </div>

              <!-- Main Target Price Range Display -->
              <div style="background: rgba(244, 63, 94, 0.08); border: 1px solid rgba(244, 63, 94, 0.2); border-radius: var(--radius-md); padding: 16px; text-align: center; margin-bottom: 14px;">
                <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px;">Recommended Profit Booking Band</div>
                <div style="font-size: 1.85rem; font-weight: 800; color: #fb7185; letter-spacing: -0.02em;">
                  ₹${ptr.sellRangeMin.toLocaleString('en-IN')} — ₹${ptr.sellRangeMax.toLocaleString('en-IN')}
                </div>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">
                  Target Upside: <strong style="color: #fbbf24;">+${ptr.upsidePercentMin}% to +${ptr.upsidePercentMax}%</strong> 
                  from CMP (₹${price.toLocaleString('en-IN')})
                </div>
              </div>

              <!-- Interactive Visual Gauge / Range Track -->
              <div style="background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 14px;">
                <div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 6px;">
                  <span>Stop-Loss: ₹${ptr.stopLoss.toLocaleString('en-IN')}</span>
                  <span style="color: #fbbf24; font-weight: 700;">T1: ₹${ptr.sellRangeMin.toLocaleString('en-IN')}</span>
                  <span style="color: #fb7185; font-weight: 700;">T2 / 52W High: ₹${ptr.sellRangeMax.toLocaleString('en-IN')}</span>
                </div>
                <div style="position: relative; height: 10px; background: rgba(255, 255, 255, 0.08); border-radius: 100px; margin: 8px 0;">
                  <!-- Sell Zone Gradient Bar -->
                  <div style="position: absolute; left: ${sellLeft}%; width: ${sellWidth}%; height: 100%; background: linear-gradient(90deg, #f59e0b, #f43f5e); border-radius: 100px; opacity: 0.9; box-shadow: 0 0 12px rgba(244, 63, 94, 0.4);"></div>
                  <!-- Current Market Price Pointer -->
                  <div style="position: absolute; left: ${cmpSellPos}%; top: -4px; width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 3px solid ${isCurrentlyInSell ? '#f43f5e' : '#38bdf8'}; transform: translateX(-50%); box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);" title="Current Market Price: ₹${price.toLocaleString('en-IN')}"></div>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; margin-top: 4px;">
                  <span style="color: var(--accent-rose);">Risk Cut Level</span>
                  <span style="color: ${isCurrentlyInSell ? 'var(--accent-rose)' : 'var(--accent-cyan)'}; font-weight: 600;">
                    ▲ CMP ₹${price.toLocaleString('en-IN')} (${isCurrentlyInSell ? 'In Profit Zone' : '+' + ptr.upsidePercentMin + '% to Target 1'})
                  </span>
                  <span style="color: #fb7185;">Max Upside</span>
                </div>
              </div>

              <!-- 3 Key Level Indicators -->
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px;">
                <div style="background: rgba(0,0,0,0.22); padding: 8px 10px; border-radius: var(--radius-sm); text-align: center;">
                  <div style="font-size: 0.68rem; color: var(--text-muted);">Target 1 (Partial)</div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: #fbbf24;">₹${ptr.sellRangeMin.toLocaleString('en-IN')}</div>
                  <div style="font-size: 0.65rem; color: var(--accent-emerald);">+${ptr.upsidePercentMin}% Gain</div>
                </div>
                <div style="background: rgba(0,0,0,0.22); padding: 8px 10px; border-radius: var(--radius-sm); text-align: center;">
                  <div style="font-size: 0.68rem; color: var(--text-muted);">Target 2 (Extended)</div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: #fb7185;">₹${ptr.sellRangeMax.toLocaleString('en-IN')}</div>
                  <div style="font-size: 0.65rem; color: var(--accent-emerald);">+${ptr.upsidePercentMax}% Gain</div>
                </div>
                <div style="background: rgba(0,0,0,0.22); padding: 8px 10px; border-radius: var(--radius-sm); text-align: center;">
                  <div style="font-size: 0.68rem; color: var(--text-muted);">Stop-Loss Protect</div>
                  <div style="font-size: 0.95rem; font-weight: 700; color: var(--accent-rose);">₹${ptr.stopLoss.toLocaleString('en-IN')}</div>
                  <div style="font-size: 0.65rem; color: var(--text-muted);">${((ptr.stopLoss - price) / price * 100).toFixed(1)}% Capital Risk</div>
                </div>
              </div>

              <!-- Strategy Guidance -->
              <div style="background: rgba(255, 255, 255, 0.03); border-radius: var(--radius-sm); padding: 10px 12px; font-size: 0.76rem; color: var(--text-secondary); line-height: 1.45; border-left: 3px solid var(--accent-rose);">
                <strong style="color: #fff;">⚖️ Profit Booking Rule:</strong> ${ptr.sellStrategy}
              </div>
            </div>
          </div>
        </div>
        `;
      })()}

      <!-- Dividend Profile & 5-Year Return Analysis Card -->
      <div class="card" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%); border: 1px solid rgba(255, 255, 255, 0.08);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>💰 Dividend Profile &amp; 5-Year Return Performance</span>
              <span class="badge" style="font-size: 0.72rem; padding: 2px 8px; background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3);">Shareholder Wealth</span>
            </h3>
            <span style="font-size: 0.78rem; color: var(--text-muted);">
              Comprehensive breakdown of cash dividend yield, dividend safety &amp; 5-year compounded wealth generation
            </span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span class="badge pass" style="font-size: 0.82rem; font-weight: 700;">
              5Y TSR: +${(return5Y + divYield).toFixed(1)}% p.a.
            </span>
            <span class="badge info" style="font-size: 0.82rem;">
              Div Yield: ${divYield.toFixed(2)}%
            </span>
          </div>
        </div>

        <div class="grid-2" style="gap: 16px;">
          <!-- Left Column: Dividend Metrics & Payout Safety -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: #fff; display: flex; align-items: center; gap: 6px;">
                <span>💵 Cash Dividend &amp; Payout Profile</span>
              </div>
              <span class="badge ${divYield >= 2 ? 'pass' : divYield >= 1 ? 'info' : 'secondary'}" style="font-size: 0.72rem;">
                ${divYield >= 2 ? 'High Dividend Yield' : divYield >= 1 ? 'Moderate Dividend' : 'Growth / Low Payout'}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
              <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">Dividend Yield</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: var(--accent-emerald);">${divYield.toFixed(2)}%</div>
                <div style="font-size: 0.68rem; color: var(--text-muted);">Annual cash return</div>
              </div>
              <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">Dividend Payout</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #a5b4fc;">${divPayout.toFixed(1)}%</div>
                <div style="font-size: 0.68rem; color: var(--text-muted);">Of Net Profit (PAT)</div>
              </div>
              <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">Est. DPS</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: #fff;">₹${dps.toFixed(1)}</div>
                <div style="font-size: 0.68rem; color: var(--text-muted);">Per Share / Year</div>
              </div>
            </div>

            <div style="padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: var(--radius-sm); border: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 6px;">
                <span style="color: var(--text-secondary);">FCF Dividend Coverage:</span>
                <span style="font-weight: 700; color: ${fcfCoverage >= 1.5 ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">
                  ${fcfCoverage >= 1.5 ? '✅ Strongly Covered (' + fcfCoverage.toFixed(1) + 'x FCF)' : '⚠️ Moderate Coverage'}
                </span>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.5;">
                ${divPayout <= 60 ? 'Healthy capital retention: Retains ' + (100 - divPayout).toFixed(0) + '% of earnings for growth reinvestment while rewarding shareholders.' : 'High payout: Over 60% of net profits returned as dividends.'}
              </div>
            </div>
          </div>

          <!-- Right Column: 5-Year Return & Wealth Compounding -->
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div style="font-weight: 700; font-size: 0.95rem; color: #fff; display: flex; align-items: center; gap: 6px;">
                <span>🚀 5-Year Return &amp; Wealth Creation</span>
              </div>
              <span class="badge ${return5Y >= 15 ? 'pass' : return5Y >= 10 ? 'info' : 'warning'}" style="font-size: 0.72rem;">
                ${return5Y >= 15 ? 'Super Compounder (>15% CAGR)' : return5Y >= 10 ? 'Consistent Compounder' : 'Moderate Return'}
              </span>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
              <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">5-Year CAGR</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: ${return5Y >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                  ${return5Y >= 0 ? '+' : ''}${return5Y.toFixed(1)}%
                </div>
                <div style="font-size: 0.68rem; color: var(--text-muted);">Stock price CAGR</div>
              </div>
              <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">3-Year CAGR</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: ${return3Y >= 0 ? 'var(--accent-cyan)' : 'var(--accent-rose)'};">
                  ${return3Y >= 0 ? '+' : ''}${return3Y.toFixed(1)}%
                </div>
                <div style="font-size: 0.68rem; color: var(--text-muted);">Medium-term CAGR</div>
              </div>
              <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: var(--radius-sm); text-align: center;">
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 4px;">1-Year Return</div>
                <div style="font-size: 1.25rem; font-weight: 800; color: ${return1Y >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">
                  ${return1Y >= 0 ? '+' : ''}${return1Y.toFixed(1)}%
                </div>
                <div style="font-size: 0.68rem; color: var(--text-muted);">Trailing 12 months</div>
              </div>
            </div>

            <div style="padding: 12px; background: rgba(255, 255, 255, 0.03); border-radius: var(--radius-sm); border: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.78rem; margin-bottom: 4px;">
                <span style="color: var(--text-secondary);">₹1 Lakh 5-Year Growth:</span>
                <span style="font-weight: 800; color: var(--accent-emerald); font-size: 0.9rem;">
                  ₹${wealth5Y.toLocaleString('en-IN')} (${multiplier5Y.toFixed(2)}x)
                </span>
              </div>
              <div style="font-size: 0.74rem; color: var(--text-muted); line-height: 1.4;">
                Total 5-year cumulative gain of <strong>${totalReturn5YPct >= 0 ? '+' : ''}${totalReturn5YPct.toFixed(1)}%</strong> (${(wealth5Y - 100000).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })} absolute gain on ₹1 Lakh principal).
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Products & Services Revenue Breakdown Card -->
      ${(() => {
        const segments = anl.metrics.productsAndServices;
        if (!segments || segments.length === 0) return '';

        // Colour palette for bars (cycles if more than 6 segments)
        const barColors = [
          { bg: '#6366f1', light: 'rgba(99,102,241,0.15)', border: 'rgba(99,102,241,0.4)' },
          { bg: '#06b6d4', light: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.4)' },
          { bg: '#10b981', light: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.4)' },
          { bg: '#f59e0b', light: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)' },
          { bg: '#a78bfa', light: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)' },
          { bg: '#f43f5e', light: 'rgba(244,63,94,0.15)', border: 'rgba(244,63,94,0.4)' },
        ];
        const trendIcon = { GROWING: '📈', STABLE: '⏸', DECLINING: '📉' };
        const trendColor = { GROWING: 'var(--accent-emerald)', STABLE: 'var(--accent-cyan)', DECLINING: 'var(--accent-rose)' };

        return `
        <div class="card" style="margin-bottom: 24px; background: linear-gradient(135deg, rgba(30,41,59,0.7) 0%, rgba(11,16,29,0.85) 100%); border: 1px solid rgba(255,255,255,0.08);">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span>🏭 Products &amp; Services</span>
                <span class="badge info" style="font-size: 0.72rem; padding: 2px 8px;">Revenue Breakdown</span>
              </h3>
              <span style="font-size: 0.78rem; color: var(--text-muted);">
                Estimated revenue contribution by business segment for ${anl.name}
              </span>
            </div>
            <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
              <span class="badge" style="font-size: 0.78rem; background: rgba(16,185,129,0.1); color: #34d399; border: 1px solid rgba(16,185,129,0.25);">
                ${segments.length} Segments
              </span>
              <span class="badge" style="font-size: 0.78rem; background: rgba(99,102,241,0.1); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.25);">
                ${segments.filter(s => s.trend === 'GROWING').length} Growing
              </span>
            </div>
          </div>

          <!-- Segment bars -->
          <div style="display: flex; flex-direction: column; gap: 14px;">
            ${segments.map((seg, i) => {
          const c = barColors[i % barColors.length];
          const trend = seg.trend || 'STABLE';
          return `
              <div style="background: ${c.light}; border: 1px solid ${c.border}; border-radius: var(--radius-md); padding: 14px 16px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 10px; height: 10px; border-radius: 50%; background: ${c.bg}; flex-shrink: 0;"></div>
                    <span style="font-weight: 700; font-size: 0.9rem; color: #fff;">${seg.name}</span>
                    <span style="font-size: 0.72rem; color: ${trendColor[trend]}; font-weight: 600;">${trendIcon[trend]} ${trend}</span>
                  </div>
                  <span style="font-size: 1.1rem; font-weight: 800; color: ${c.bg};">${seg.revenuePercent}%</span>
                </div>

                <!-- Progress bar -->
                <div style="height: 8px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; margin-bottom: 8px;">
                  <div style="height: 100%; width: ${seg.revenuePercent}%; background: linear-gradient(90deg, ${c.bg}, ${c.bg}cc); border-radius: 100px; transition: width 1s ease-in-out;"></div>
                </div>

                ${seg.description ? `<div style="font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4;">${seg.description}</div>` : ''}
              </div>
              `;
        }).join('')}
          </div>

          <!-- Legend footer -->
          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-subtle); display: flex; gap: 16px; flex-wrap: wrap;">
            <span style="font-size: 0.75rem; color: var(--accent-emerald);">📈 Growing — expanding share or new markets</span>
            <span style="font-size: 0.75rem; color: var(--accent-cyan);">⏸ Stable — mature, consistent revenue</span>
            <span style="font-size: 0.75rem; color: var(--accent-rose);">📉 Declining — contracting or restructuring</span>
            <span style="font-size: 0.75rem; color: var(--text-muted); margin-left: auto;">Source: Annual reports &amp; investor presentations</span>
          </div>
        </div>
        `;
      })()}

      <!-- Priority 10 Checks Section (100 Point Quality Score Framework) -->
      <div class="card" id="priority10ChecksSection" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 1.15rem; color: #fff; display: flex; align-items: center; gap: 8px;">
              <span>⭐ Priority 10 Investment Checks</span>
              <span class="badge pass" style="font-size: 0.72rem; padding: 2px 8px;">100-Point Quality Framework</span>
            </h3>
            <span style="font-size: 0.78rem; color: var(--text-muted);">
              Fundamental 10-point checklist where each check awards up to 10 quality points (Total: 100 Points)
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="badge ${anl.priority10Score >= 80 ? 'pass' : 'warning'}" style="font-size: 0.85rem; font-weight: 700;">
              Priority Score: ${anl.priority10Score ?? (anl.passedChecks.length * 10)}/100 Pts
            </span>
            <span class="badge ${anl.failedChecks.length === 0 ? 'pass' : 'warning'}" style="font-size: 0.85rem;">
              ${anl.passedChecks.length}/10 Passed
            </span>
          </div>
        </div>
        <div class="checks-grid">
          ${anl.priority10Checks.map((chk, idx) => `
            <div class="check-item-card ${chk.passed ? 'passed' : 'failed'}">
              <div style="flex: 1; padding-right: 12px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px; flex-wrap: wrap;">
                  <span style="font-size: 0.75rem; color: var(--accent-cyan); font-weight: 700;">#${idx + 1}</span>
                  <span style="font-weight: 600; font-size: 0.86rem; color: #fff;">${chk.name}</span>
                  <span class="badge" style="font-size: 0.65rem; padding: 2px 6px; background: rgba(99,102,241,0.15); color: #a5b4fc; border: 1px solid rgba(99,102,241,0.25);">${chk.dimension || 'Quality'}</span>
                </div>
                <div style="font-size: 0.76rem; color: var(--text-secondary); line-height: 1.4;">${chk.comment}</div>
              </div>
              <div style="text-align: right; min-width: 90px;">
                <div style="font-weight: 700; font-size: 0.88rem; color: ${chk.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)'};">${chk.value}</div>
                <div style="font-size: 0.7rem; color: var(--text-muted);">Tgt: ${chk.threshold}</div>
                <div style="font-size: 0.75rem; font-weight: 700; color: ${chk.passed ? 'var(--accent-emerald)' : 'var(--accent-amber)'}; margin-top: 3px; background: rgba(255,255,255,0.04); padding: 2px 6px; border-radius: 4px; display: inline-block;">
                  +${chk.score ?? (chk.passed ? 10 : 0)} / ${chk.maxScore ?? 10} pts
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Detailed 100-Point Scoring Framework (Priority 10 Matrix & 8-Dimension Breakdown) -->
      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
          <div>
            <h3 style="font-size: 1.15rem; color: #fff;">Detailed 100-Point Quality Scoring Breakdown</h3>
            <span style="font-size: 0.78rem; color: var(--text-muted);">Explore the 100-point evaluation across Priority 10 Investment Checks and 8 Fundamental Dimensions</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="tabBtnPriority10" class="scoring-tab-btn active" onclick="app.switchScoringTab('priority10')">
              ⭐ Priority 10 Checks (100 Pts)
            </button>
            <button id="tabBtnDimensions" class="scoring-tab-btn" onclick="app.switchScoringTab('dimensions')">
              📊 8-Dimension Framework (100 Pts)
            </button>
          </div>
        </div>

        <!-- View 1: Priority 10 Investment Checks (100 Points Matrix) -->
        <div id="scoringViewPriority10" class="table-wrapper">
          <table class="custom-table">
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Priority Investment Check</th>
                <th>Dimension</th>
                <th>Benchmark Hurdle</th>
                <th>Stock Metric Value</th>
                <th>Check Status</th>
                <th>Score (/10)</th>
                <th>Evidence & Rationale</th>
              </tr>
            </thead>
            <tbody>
              ${anl.priority10Checks.map((chk, idx) => `
                <tr>
                  <td><span style="font-weight: 700; color: var(--accent-cyan);">#${idx + 1}</span></td>
                  <td><strong>${chk.name}</strong></td>
                  <td><span class="badge" style="font-size: 0.7rem; background: rgba(99,102,241,0.12); color: #818cf8;">${chk.dimension || 'Core'}</span></td>
                  <td style="color: var(--text-muted); font-family: monospace;">${chk.threshold}</td>
                  <td><strong style="color: ${chk.passed ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-family: monospace;">${chk.value}</strong></td>
                  <td>
                    <span class="badge ${chk.passed ? 'pass' : 'warning'}" style="font-size: 0.72rem;">
                      ${chk.passed ? '✅ Passed' : '⚠️ Failed'}
                    </span>
                  </td>
                  <td>
                    <span style="font-weight: 800; font-size: 0.9rem; color: ${chk.passed ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">
                      ${chk.score ?? (chk.passed ? 10 : 0)} / ${chk.maxScore ?? 10}
                    </span>
                  </td>
                  <td style="color: var(--text-secondary); font-size: 0.8rem;">${chk.comment}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr style="background: rgba(99, 102, 241, 0.08); font-weight: 700;">
                <td colspan="5" style="color: #fff;">Priority 10 Investment Checks Total Score (10 Checks x 10 Points)</td>
                <td>
                  <span class="badge ${anl.passedChecks.length >= 8 ? 'pass' : 'warning'}">
                    ${anl.passedChecks.length}/10 Passed
                  </span>
                </td>
                <td>
                  <span style="font-size: 1.05rem; font-weight: 800; color: var(--accent-emerald);">
                    ${anl.priority10Score ?? (anl.passedChecks.length * 10)} / 100
                  </span>
                </td>
                <td style="color: var(--text-muted); font-size: 0.78rem;">Evaluated against Priority 10 criteria from docs/STOCK_ANALYSIS.md</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- View 2: 8-Dimension Fundamental Framework (100 Points) -->
        <div id="scoringViewDimensions" class="table-wrapper" style="display: none;">
          <table class="custom-table">
            <thead>
              <tr>
                <th>Dimension</th>
                <th>Score</th>
                <th>Max Points</th>
                <th>Evidence & Metrics Summary</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Business Quality</strong></td>
                <td><span style="color: var(--accent-emerald); font-weight: 700;">${anl.businessQualityScore.score}</span></td>
                <td>20</td>
                <td style="color: var(--text-secondary);">${anl.businessQualityScore.details}</td>
              </tr>
              <tr>
                <td><strong>Growth</strong></td>
                <td><span style="color: var(--accent-emerald); font-weight: 700;">${anl.growthScore.score}</span></td>
                <td>20</td>
                <td style="color: var(--text-secondary);">${anl.growthScore.details}</td>
              </tr>
              <tr>
                <td><strong>Profitability</strong></td>
                <td><span style="color: var(--accent-emerald); font-weight: 700;">${anl.profitabilityScore.score}</span></td>
                <td>15</td>
                <td style="color: var(--text-secondary);">${anl.profitabilityScore.details}</td>
              </tr>
              <tr>
                <td><strong>Financial Strength</strong></td>
                <td><span style="color: var(--accent-emerald); font-weight: 700;">${anl.financialStrengthScore.score}</span></td>
                <td>15</td>
                <td style="color: var(--text-secondary);">${anl.financialStrengthScore.details}</td>
              </tr>
              <tr>
                <td><strong>Cash-Flow Quality</strong></td>
                <td><span style="color: var(--accent-emerald); font-weight: 700;">${anl.cashFlowScore.score}</span></td>
                <td>10</td>
                <td style="color: var(--text-secondary);">${anl.cashFlowScore.details}</td>
              </tr>
              <tr>
                <td><strong>Valuation</strong></td>
                <td><span style="color: var(--accent-emerald); font-weight: 700;">${anl.valuationScore.score}</span></td>
                <td>10</td>
                <td style="color: var(--text-secondary);">${anl.valuationScore.details}</td>
              </tr>
              <tr>
                <td><strong>Management & Governance</strong></td>
                <td><span style="color: var(--accent-emerald); font-weight: 700;">${anl.managementScore.score}</span></td>
                <td>5</td>
                <td style="color: var(--text-secondary);">${anl.managementScore.details}</td>
              </tr>
              <tr>
                <td><strong>Competitive Moat</strong></td>
                <td><span style="color: var(--accent-emerald); font-weight: 700;">${anl.moatScore.score}</span></td>
                <td>5</td>
                <td style="color: var(--text-secondary);">${anl.moatScore.details}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr style="background: rgba(99, 102, 241, 0.08); font-weight: 700;">
                <td style="color: #fff;">Fundamental 8-Dimension Total Score</td>
                <td>
                  <span style="font-size: 1.05rem; font-weight: 800; color: var(--accent-emerald);">
                    ${anl.totalScore}
                  </span>
                </td>
                <td>100</td>
                <td style="color: var(--text-muted); font-size: 0.78rem;">Evaluated against 8-dimension framework from docs/STOCK_ANALYSIS.md</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <!-- Competitor Peer Comparison -->
      ${competitors.length > 0 ? `
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 1.1rem; color: #fff; margin-bottom: 16px;">Industry & Peer Comparison</h3>
          <div class="table-wrapper">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Quality Score</th>
                  <th>Price</th>
                  <th>P/E</th>
                  <th>ROCE (%)</th>
                  <th>ROE (%)</th>
                  <th>D/E</th>
                  <th>5Y Sales CAGR</th>
                  <th>AI Risk</th>
                </tr>
              </thead>
              <tbody>
                <tr style="background: rgba(99, 102, 241, 0.1);">
                  <td><strong>${anl.name} (${anl.symbol})</strong></td>
                  <td><strong>${anl.totalScore}/100</strong></td>
                  <td>₹${m.price}</td>
                  <td>${m.pe}</td>
                  <td>${m.roce}%</td>
                  <td>${m.roe}%</td>
                  <td>${m.debtEquity}</td>
                  <td>${m.salesCagr5Y}%</td>
                  <td><span class="ai-pill ${aiPillClass}" style="padding: 2px 8px; font-size: 0.7rem;">${anl.aiRisk}</span></td>
                </tr>
                ${competitors.map(c => `
                  <tr onclick="app.analyzeStockSymbol('${c.symbol}')" style="cursor: pointer;">
                    <td>${c.name} (${c.symbol})</td>
                    <td>${c.totalScore}/100</td>
                    <td>₹${c.metrics.price}</td>
                    <td>${c.metrics.pe}</td>
                    <td>${c.metrics.roce}%</td>
                    <td>${c.metrics.roe}%</td>
                    <td>${c.metrics.debtEquity}</td>
                    <td>${c.metrics.salesCagr5Y}%</td>
                    <td><span class="ai-pill ${c.aiRisk.toLowerCase()}" style="padding: 2px 8px; font-size: 0.7rem;">${c.aiRisk}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- Thesis & Key Risks Card -->
      <div class="grid-2">
        <div class="card">
          <h3 style="font-size: 1.1rem; color: #fff; margin-bottom: 12px;">Investment Thesis</h3>
          <p style="color: var(--text-secondary); font-size: 0.88rem; line-height: 1.7;">
            ${anl.thesis}
          </p>
        </div>
        <div class="card">
          <h3 style="font-size: 1.1rem; color: #fff; margin-bottom: 12px;">Key Investment Risks</h3>
          <ul style="color: var(--text-secondary); font-size: 0.85rem; line-height: 1.7; margin-left: 18px;">
            ${anl.keyRisks.map(r => `<li>${r}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  },

  quickAddHoldingFromStock(symbol, price, category) {
    document.getElementById('modalHoldingSymbol').value = symbol;
    document.getElementById('modalHoldingCost').value = price;
    document.getElementById('modalHoldingCategory').value = category;
    document.getElementById('modalHoldingQty').value = 10;
    this.openAddHoldingModal();
  },

  switchScoringTab(tabName) {
    const p10View = document.getElementById('scoringViewPriority10');
    const dimsView = document.getElementById('scoringViewDimensions');
    const btnP10 = document.getElementById('tabBtnPriority10');
    const btnDims = document.getElementById('tabBtnDimensions');
    if (p10View && dimsView && btnP10 && btnDims) {
      if (tabName === 'priority10') {
        p10View.style.display = 'block';
        dimsView.style.display = 'none';
        btnP10.classList.add('active');
        btnDims.classList.remove('active');
      } else {
        p10View.style.display = 'none';
        dimsView.style.display = 'block';
        btnP10.classList.remove('active');
        btnDims.classList.add('active');
      }
    }
  },

  // --- 3. MUTUAL FUNDS ---
  async loadMutualFunds() {
    try {
      const res = await fetch('/api/v1/mutual-funds/portfolio/analysis');
      const json = await res.json();
      const data = json.data;

      // Table of 4 selected schemes
      const tbody = document.getElementById('mfPortfolioTableBody');
      if (tbody) {
        tbody.innerHTML = (data.selectedFunds || []).map(item => `
          <tr>
            <td>
              <div style="font-weight: 600; color: #fff;">${item.fund.name}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">${item.fund.fundHouse} | Code: ${item.fund.schemeCode}</div>
            </td>
            <td><span class="badge info">${item.fund.category}</span></td>
            <td><strong>₹${item.monthlySipAmount.toLocaleString('en-IN')}</strong></td>
            <td>₹${item.fund.currentNav}</td>
            <td>${item.fund.expenseRatio}%</td>
            <td><span style="color: var(--accent-emerald); font-weight: 700;">+${item.fund.returns5Y}%</span></td>
            <td>
              <button class="secondary-btn" style="padding: 4px 8px; font-size: 0.75rem; color: var(--accent-rose);" onclick="app.removeMfScheme('${item.fund.schemeCode}')">Remove</button>
            </td>
          </tr>
        `).join('');
      }

      // Rule badge
      const badge = document.getElementById('fourFundRuleBadge');
      if (badge) {
        badge.className = `badge ${data.fourFundRuleStatus.toLowerCase()}`;
        badge.textContent = `Rule Status: ${data.fourFundRuleStatus} (${data.selectedFunds.length}/4 Schemes)`;
      }

      // SIP Projection Details
      const proj = data.sipScheduleSummary;
      const projContainer = document.getElementById('mfSipProjectionsDetails');
      if (projContainer) {
        projContainer.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span style="color: var(--text-secondary);">Total Monthly SIP:</span>
            <strong style="color: #fff;">₹${data.totalMonthlySip.toLocaleString('en-IN')} / mo</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span style="color: var(--text-secondary);">Horizon:</span>
            <strong style="color: #fff;">15 Years (180 Monthly Installments)</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
            <span style="color: var(--text-secondary);">Total Investment Over 15Y:</span>
            <strong style="color: #fff;">₹${proj.estimatedTotalInvestment.toLocaleString('en-IN')}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.95rem; padding: 10px 0; border-bottom: 1px solid var(--border-subtle); color: var(--accent-emerald);">
            <span>Projected Value @ 12% CAGR:</span>
            <strong style="font-size: 1.15rem;">₹${(proj.projectedValueAt12PctCagr / 10000000).toFixed(2)} Cr</strong>
          </div>
        `;
      }

      const taxGuidance = document.getElementById('mfTaxGuidanceText');
      if (taxGuidance) taxGuidance.textContent = proj.taxExemptionGuidance;

      // Overlap matrix
      const overlapContainer = document.getElementById('mfOverlapContainer');
      if (overlapContainer) {
        overlapContainer.innerHTML = (data.overlapMatrix || []).map(o => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: rgba(255,255,255,0.02); border-radius: var(--radius-sm);">
            <span style="font-size: 0.82rem; color: #fff;">${o.fundPair}</span>
            <span class="badge ${o.overlapWarning ? 'warning' : 'pass'}">${o.overlapPercentage}% Overlap</span>
          </div>
        `).join('');
      }

    } catch (e) {
      console.error('Failed to load mutual funds:', e);
    }
  },

  bindMfSearch() {
    const input = document.getElementById('mfSearchInput');
    const dropdown = document.getElementById('mfSearchDropdown');
    let debounceTimer = null;

    input?.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(debounceTimer);
      if (q.length < 3) {
        dropdown.classList.remove('active');
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/api/v1/mutual-funds/search?q=${encodeURIComponent(q)}`);
          const json = await res.json();
          const items = json.data || [];
          if (items.length === 0) {
            dropdown.innerHTML = `<div class="search-item" style="color: var(--text-muted);">No funds found for "${q}"</div>`;
          } else {
            dropdown.innerHTML = items.map(item => `
              <div class="search-item" onclick="app.inspectMfScheme('${item.schemeCode}')">
                <span style="font-size: 0.85rem; color: #fff;">${item.schemeName}</span>
                <span class="badge info">${item.schemeCode}</span>
              </div>
            `).join('');
          }
          dropdown.classList.add('active');
        } catch (err) {
          console.error(err);
        }
      }, 300);
    });

    document.addEventListener('click', (e) => {
      if (!input?.contains(e.target) && !dropdown?.contains(e.target)) {
        dropdown?.classList.remove('active');
      }
    });
  },

  async inspectMfScheme(schemeCode) {
    document.getElementById('mfSearchDropdown')?.classList.remove('active');
    const container = document.getElementById('mfSchemeDetailsContainer');
    container.innerHTML = `<div style="padding: 20px; color: var(--text-muted);">Fetching details from AMFI API...</div>`;

    try {
      const res = await fetch(`/api/v1/mutual-funds/${schemeCode}/analysis`);
      const json = await res.json();
      const anl = json.data;
      const fund = anl.fund;

      container.innerHTML = `
        <div style="margin-top: 16px; padding: 20px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <h4 style="color: #fff; font-size: 1.1rem;">${fund.name}</h4>
              <div style="font-size: 0.8rem; color: var(--text-muted);">${fund.fundHouse} | AMFI Code: ${fund.schemeCode} | Category: ${fund.category}</div>
            </div>
            <button class="primary-btn" onclick="app.quickAddMf('${fund.schemeCode}')">➕ Add to 4-Fund Portfolio</button>
          </div>
          <div class="grid-4" style="margin-bottom: 0;">
            <div><span class="metric-label">Live NAV</span><div style="font-size: 1.2rem; font-weight: 700; color: #fff;">₹${fund.currentNav}</div></div>
            <div><span class="metric-label">Expense Ratio</span><div style="font-size: 1.2rem; font-weight: 700; color: #fff;">${fund.expenseRatio}%</div></div>
            <div><span class="metric-label">3Y CAGR</span><div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-emerald);">+${fund.returns3Y}%</div></div>
            <div><span class="metric-label">5Y CAGR</span><div style="font-size: 1.2rem; font-weight: 700; color: var(--accent-emerald);">+${fund.returns5Y}%</div></div>
          </div>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--accent-rose);">Failed to inspect fund: ${e.message}</div>`;
    }
  },

  quickAddMf(schemeCode) {
    document.getElementById('modalMfSchemeCode').value = schemeCode;
    this.openAddMfModal();
  },

  async removeMfScheme(schemeCode) {
    if (!confirm('Remove this mutual fund scheme from your 4-fund portfolio?')) return;
    try {
      await fetch(`/api/v1/mutual-funds/portfolio/funds/${schemeCode}`, { method: 'DELETE' });
      this.showToast('Mutual fund removed', 'info');
      this.loadMutualFunds();
    } catch (e) {
      console.error(e);
    }
  },

  // --- 4. PORTFOLIO MANAGER ---
  async loadPortfolio() {
    try {
      const res = await fetch('/api/v1/portfolios/default-portfolio/holdings');
      const json = await res.json();
      const holdings = json.data || [];

      // Check for mid/small cap profit review banner
      const analysisRes = await fetch('/api/v1/portfolios/default-portfolio/analysis');
      const anlJson = await analysisRes.json();
      const analysis = anlJson.data;

      const banner = document.getElementById('portfolioSellAlertBanner');
      if (banner) {
        if (analysis.midSmallCapSellTriggers && analysis.midSmallCapSellTriggers.length > 0) {
          banner.innerHTML = analysis.midSmallCapSellTriggers.map(t => `
            <div class="profit-trigger-banner">
              <div class="profit-trigger-content">
                <div class="profit-trigger-icon">⚡</div>
                <div>
                  <div style="font-weight: 700; color: #fff;">Rule Trigger: Sell Review for ${t.holding.name} (${t.holding.symbol})</div>
                  <div style="font-size: 0.82rem; color: #fff; opacity: 0.9;">${t.suggestion}</div>
                </div>
              </div>
            </div>
          `).join('');
        } else {
          banner.innerHTML = '';
        }
      }

      // Populate Holdings Table
      const tbody = document.getElementById('holdingsTableBody');
      if (tbody) {
        tbody.innerHTML = holdings.map(h => {
          const isProfitTriggered = (h.marketCapCategory === 'MID_CAP' || h.marketCapCategory === 'SMALL_CAP') && h.pnlPercent >= 10;
          return `
            <tr>
              <td>
                <div style="font-weight: 600; color: #fff; cursor: pointer;" onclick="app.analyzeStockSymbol('${h.symbol}')">${h.symbol}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${h.name}</div>
              </td>
              <td><span class="badge info">${h.marketCapCategory}</span></td>
              <td>${h.quantity}</td>
              <td>₹${h.averageCost.toLocaleString('en-IN')}</td>
              <td>₹${h.currentPrice.toLocaleString('en-IN')}</td>
              <td><strong>₹${h.currentValue.toLocaleString('en-IN')}</strong></td>
              <td>
                <span style="color: ${h.pnlPercent >= 0 ? 'var(--accent-emerald)' : 'var(--accent-rose)'}; font-weight: 700;">
                  ${h.pnlPercent >= 0 ? '+' : ''}${h.pnlPercent.toFixed(1)}%
                </span>
              </td>
              <td>${h.allocationPercent}%</td>
              <td>
                ${isProfitTriggered ? `
                  <span class="badge warning" title="10-15% Profit target reached!">Sell Review</span>
                ` : `
                  <span class="badge pass">Holding</span>
                `}
              </td>
              <td>
                <button class="secondary-btn" style="padding: 4px 8px; font-size: 0.75rem; color: var(--accent-rose);" onclick="app.deleteHolding('${h.symbol}')">Delete</button>
              </td>
            </tr>
          `;
        }).join('');
      }

      // Rebalancing guidance
      const rebalList = document.getElementById('portfolioRebalanceList');
      if (rebalList && analysis.ruleResults) {
        rebalList.innerHTML = analysis.ruleResults.map(r => `
          <div style="padding: 12px; background: rgba(255,255,255,0.02); border-left: 3px solid ${r.status === 'PASS' ? 'var(--accent-emerald)' : r.status === 'WARNING' ? 'var(--accent-amber)' : 'var(--accent-rose)'}; border-radius: var(--radius-sm);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <strong style="color: #fff; font-size: 0.85rem;">${r.ruleName}</strong>
              <span class="badge ${r.status.toLowerCase()}">${r.status}</span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-secondary);">${r.explanation}</div>
            <div style="font-size: 0.78rem; color: #a5b4fc; margin-top: 4px;">🎯 <strong>Recommended Action:</strong> ${r.suggestedAction}</div>
          </div>
        `).join('');
      }

    } catch (e) {
      console.error('Failed to load portfolio:', e);
    }
  },

  async deleteHolding(symbol) {
    if (!confirm(`Are you sure you want to remove holding ${symbol}?`)) return;
    try {
      await fetch(`/api/v1/portfolios/default-portfolio/holdings/${symbol}`, { method: 'DELETE' });
      this.showToast(`Holding ${symbol} removed`, 'info');
      this.loadPortfolio();
      this.loadDashboard();
    } catch (e) {
      console.error(e);
    }
  },

  // --- 5. ALERTS ---
  async loadAlerts() {
    try {
      const res = await fetch('/api/v1/alerts');
      const json = await res.json();
      const alerts = json.data || [];

      document.getElementById('headerAlertCount').textContent = alerts.length;

      const container = document.getElementById('alertsListContainer');
      if (!container) return;

      if (alerts.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align: center; padding: 40px;">
            <div style="font-size: 2.5rem; margin-bottom: 8px;">🎉</div>
            <h3 style="color: #fff;">No Active Alerts</h3>
            <p style="color: var(--text-muted); margin-top: 4px;">All portfolio holdings and rule conditions are currently within defined thresholds.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = alerts.map(a => `
        <div class="card" style="border-left: 4px solid ${a.severity === 'CRITICAL' ? 'var(--accent-rose)' : a.severity === 'WARNING' ? 'var(--accent-amber)' : 'var(--accent-primary)'}; padding: 18px 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="badge ${a.severity.toLowerCase()}">${a.severity}</span>
              <strong style="color: #fff; font-size: 0.95rem;">${a.title}</strong>
            </div>
            <button class="secondary-btn" style="padding: 4px 10px; font-size: 0.75rem;" onclick="app.acknowledgeAlert('${a.id}')">Acknowledge</button>
          </div>
          <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 8px; line-height: 1.5;">${a.message}</div>
          ${a.suggestedAction ? `<div style="font-size: 0.78rem; color: #a5b4fc;">💡 <strong>Suggested Action:</strong> ${a.suggestedAction}</div>` : ''}
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px;">Triggered at: ${new Date(a.createdAt).toLocaleString()}</div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  },

  async acknowledgeAlert(id) {
    try {
      await fetch(`/api/v1/alerts/${id}/acknowledge`, { method: 'POST' });
      this.showToast('Alert acknowledged', 'info');
      this.loadAlerts();
      this.loadDashboard();
    } catch (e) {
      console.error(e);
    }
  },

  // --- 6. AUDIT TRAIL ---
  async loadAuditTrail() {
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;
    try {
      const res = await fetch('/api/v1/audit-trail?limit=30');
      const json = await res.json();
      const records = json.data || [];

      tbody.innerHTML = records.map(r => `
        <tr>
          <td style="font-size: 0.78rem; color: var(--text-muted);">${new Date(r.timestamp).toLocaleTimeString()}</td>
          <td><span class="badge info">${r.operation}</span></td>
          <td><strong style="color: #fff;">${r.targetSymbolOrCode}</strong></td>
          <td style="font-size: 0.75rem; color: var(--text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${r.sourceUrl}</td>
          <td>
            ${r.calculatedScore !== undefined ? `<span style="font-weight: 700; color: var(--accent-emerald);">${r.calculatedScore}</span>` : ''}
            ${r.ruleStatus ? `<span class="badge ${r.ruleStatus.toLowerCase()}">${r.ruleStatus}</span>` : ''}
          </td>
          <td style="font-size: 0.72rem; color: var(--text-muted); font-family: monospace; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${JSON.stringify(r.rawMetricsSnapshot)}
          </td>
        </tr>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  },

  // --- 7. SETTINGS ---
  async loadSettings() {
    try {
      const res = await fetch('/api/v1/config');
      const json = await res.json();
      const cfg = json.data;

      document.getElementById('settingToleranceBand').value = cfg.equity.toleranceBandPercent;
      document.getElementById('settingSellTriggerMin').value = cfg.equity.midSmallCapSellTrigger.minPercent;
      document.getElementById('settingSellTriggerMax').value = cfg.equity.midSmallCapSellTrigger.maxPercent;
      document.getElementById('settingMinScore').value = cfg.stockScoring.minimumCandidateScore;
    } catch (e) {
      console.error(e);
    }
  },

  bindSettingsForm() {
    document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        equity: {
          toleranceBandPercent: parseFloat(document.getElementById('settingToleranceBand').value),
          midSmallCapSellTrigger: {
            enabled: true,
            minPercent: parseFloat(document.getElementById('settingSellTriggerMin').value),
            maxPercent: parseFloat(document.getElementById('settingSellTriggerMax').value)
          }
        },
        stockScoring: {
          minimumCandidateScore: parseFloat(document.getElementById('settingMinScore').value)
        }
      };

      try {
        await fetch('/api/v1/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        this.showToast('Configuration rules saved successfully', 'pass');
        this.refreshAllData(false);
      } catch (err) {
        this.showToast('Failed to save settings', 'fail');
      }
    });

    document.getElementById('resetConfigBtn')?.addEventListener('click', async () => {
      if (!confirm('Reset strategy configurations to system defaults?')) return;
      await fetch('/api/v1/config/reset', { method: 'POST' });
      this.showToast('Settings reset to defaults', 'info');
      this.loadSettings();
      this.refreshAllData(false);
    });
  },

  // --- MODALS ---
  bindModals() {
    // Add Holding Modal
    const addHoldingModal = document.getElementById('addHoldingModal');
    document.getElementById('openAddHoldingModalBtn')?.addEventListener('click', () => this.openAddHoldingModal());
    document.getElementById('closeAddHoldingModal')?.addEventListener('click', () => this.closeAddHoldingModal());
    document.getElementById('cancelAddHoldingBtn')?.addEventListener('click', () => this.closeAddHoldingModal());

    document.getElementById('addHoldingForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const symbol = document.getElementById('modalHoldingSymbol').value.trim();
      const marketCapCategory = document.getElementById('modalHoldingCategory').value;
      const quantity = document.getElementById('modalHoldingQty').value;
      const averageCost = document.getElementById('modalHoldingCost').value;

      try {
        const res = await fetch('/api/v1/portfolios/default-portfolio/holdings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, marketCapCategory, quantity, averageCost })
        });

        if (!res.ok) throw new Error('Failed to add holding');
        this.closeAddHoldingModal();
        this.showToast(`Added ${symbol} to portfolio`, 'pass');
        this.refreshAllData(false);
        if (this.activeView === 'portfolio') this.loadPortfolio();
      } catch (err) {
        this.showToast(`Error: ${err.message}`, 'fail');
      }
    });

    // Add Mutual Fund Modal
    const addMfModal = document.getElementById('addMfModal');
    document.getElementById('openAddMfModalBtn')?.addEventListener('click', () => this.openAddMfModal());
    document.getElementById('closeAddMfModal')?.addEventListener('click', () => this.closeAddMfModal());
    document.getElementById('cancelAddMfBtn')?.addEventListener('click', () => this.closeAddMfModal());

    document.getElementById('addMfForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const schemeCode = document.getElementById('modalMfSchemeCode').value.trim();
      const monthlySipAmount = document.getElementById('modalMfSipAmount').value;
      const sipStartDate = document.getElementById('modalMfStartDate').value;

      try {
        const res = await fetch('/api/v1/mutual-funds/portfolio/funds', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ schemeCode, monthlySipAmount, sipStartDate })
        });

        if (!res.ok) throw new Error('Failed to add mutual fund scheme');
        this.closeAddMfModal();
        this.showToast('Scheme added to 4-fund portfolio', 'pass');
        this.loadMutualFunds();
      } catch (err) {
        this.showToast(`Error: ${err.message}`, 'fail');
      }
    });

    // Import Watchlist CSV Modal
    document.getElementById('openImportCsvModalBtn')?.addEventListener('click', () => this.openImportCsvModal());
    document.getElementById('closeImportCsvModal')?.addEventListener('click', () => this.closeImportCsvModal());
    document.getElementById('cancelImportCsvBtn')?.addEventListener('click', () => this.closeImportCsvModal());
    document.getElementById('downloadSampleCsvBtn')?.addEventListener('click', () => this.downloadSampleCsv());
    document.getElementById('csvFileInput')?.addEventListener('change', (e) => this.handleCsvFileSelect(e));
    document.getElementById('csvTextInput')?.addEventListener('input', (e) => this.updateCsvPreview(e.target.value));
    document.getElementById('submitImportCsvBtn')?.addEventListener('click', () => this.handleCsvImportSubmit());
  },

  // --- SCREENER & QUALITY TIERS (Category A, B, C) ---
  bindScreenerFilters() {
    // Market Cap Pills
    document.querySelectorAll('#screenerCapPills .filter-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('#screenerCapPills .filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        this.screenerState.selectedCap = e.target.dataset.cap;
        this.fetchAndRenderScreenerStocks();
      });
    });

    // Quality Tier Pills
    document.querySelectorAll('#screenerTierPills .filter-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('#screenerTierPills .filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        this.screenerState.selectedTier = e.target.dataset.tier;
        this.fetchAndRenderScreenerStocks();
      });
    });

    // Index Select
    document.getElementById('screenerIndexSelect')?.addEventListener('change', (e) => {
      this.screenerState.selectedIndex = e.target.value;
      this.fetchAndRenderScreenerStocks();
    });

    // Search input with debounce
    let searchDebounce = null;
    document.getElementById('screenerSearchInput')?.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        this.screenerState.searchQuery = e.target.value.trim();
        this.fetchAndRenderScreenerStocks();
      }, 200);
    });

    // Re-score universe button
    document.getElementById('refreshScreenerBtn')?.addEventListener('click', async () => {
      try {
        const btn = document.getElementById('refreshScreenerBtn');
        btn.innerHTML = '<span>⏳</span> Re-scoring...';
        btn.disabled = true;
        const res = await fetch('/api/v1/screener/refresh', { method: 'POST' });
        const json = await res.json();
        btn.innerHTML = '<span>🔄</span> Re-Score Universe';
        btn.disabled = false;
        this.showToast(`Universe re-scored: ${json.count} stocks evaluated`, 'pass');
        this.loadScreener();
      } catch (err) {
        console.error(err);
      }
    });
  },

  async loadScreener() {
    try {
      // Load summary counts
      const res = await fetch('/api/v1/screener/summary');
      const json = await res.json();
      const summary = json.data;
      this.screenerState.summary = summary;

      document.getElementById('screenerCatACount').textContent = summary.categoryA;
      document.getElementById('screenerCatBCount').textContent = summary.categoryB;
      document.getElementById('screenerCatCCount').textContent = summary.categoryC;
      document.getElementById('screenerTotalCount').textContent = summary.totalScreened;

      // Load filtered stocks
      await this.fetchAndRenderScreenerStocks();
    } catch (err) {
      console.error('Failed to load screener:', err);
    }
  },

  async fetchAndRenderScreenerStocks() {
    const tbody = document.getElementById('screenerTableBody');
    if (!tbody) return;

    const params = new URLSearchParams();
    if (this.screenerState.selectedCap !== 'ALL') params.append('marketCap', this.screenerState.selectedCap);
    if (this.screenerState.selectedTier !== 'ALL') params.append('category', this.screenerState.selectedTier);
    if (this.screenerState.selectedIndex !== 'ALL') params.append('index', this.screenerState.selectedIndex);
    if (this.screenerState.searchQuery) params.append('q', this.screenerState.searchQuery);

    try {
      const res = await fetch(`/api/v1/screener/stocks?${params.toString()}`);
      const json = await res.json();
      const stocks = json.data || [];
      this.screenerState.stocks = stocks;

      document.getElementById('screenerVisibleCount').textContent = stocks.length;

      if (stocks.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="12" style="text-align: center; padding: 36px; color: var(--text-muted);">
              No stocks found matching the selected cap and category filters. Try switching filters or searching another keyword.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = stocks.map(s => {
        let tierBadge = '';
        if (s.qualityTier === 'CATEGORY_A') {
          tierBadge = '<span class="badge tier-a">🌟 Category A (90+)</span>';
        } else if (s.qualityTier === 'CATEGORY_B') {
          tierBadge = '<span class="badge tier-b">🥈 Category B (85–90)</span>';
        } else if (s.qualityTier === 'CATEGORY_C') {
          tierBadge = '<span class="badge tier-c">🥉 Category C (80–85)</span>';
        } else {
          tierBadge = '<span class="badge tier-below">Below 80</span>';
        }

        const aiClass = s.aiRisk.toLowerCase();
        const aiLabel = s.aiRisk === 'BENEFICIARY' ? 'Beneficiary' : s.aiRisk === 'NEUTRAL' ? 'Neutral' : 'Vulnerable';

        const capLabel = s.marketCapCategory === 'LARGE_CAP' ? 'Large' : s.marketCapCategory === 'MID_CAP' ? 'Mid' : 'Small';

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: #fff; cursor: pointer;" onclick="app.analyzeStockSymbol('${s.symbol}')">${s.symbol}</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); max-width: 170px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name}</div>
            </td>
            <td>${tierBadge}</td>
            <td>
              <div style="font-size: 1.15rem; font-weight: 800; color: ${s.score >= 90 ? '#fbbf24' : s.score >= 85 ? '#38bdf8' : '#34d399'};">
                ${s.score}<span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 400;">/100</span>
              </div>
            </td>
            <td>
              <div style="display: flex; flex-direction: column; gap: 3px;">
                <span class="badge info" style="font-size: 0.68rem; padding: 2px 6px;">${capLabel} Cap</span>
                <span style="font-size: 0.68rem; color: var(--text-muted);">${s.indices.join(', ')}</span>
              </div>
            </td>
            <td><strong style="color: #fff;">₹${s.price.toLocaleString('en-IN')}</strong></td>
            <td><span style="color: ${s.roce >= 20 ? 'var(--accent-emerald)' : 'var(--text-primary)'}; font-weight: 600;">${s.roce}%</span></td>
            <td>${s.roe}%</td>
            <td>+${s.salesCagr5Y}%</td>
            <td>${s.debtEquity}</td>
            <td>${s.pe}</td>
            <td><span class="ai-pill ${aiClass}" style="padding: 2px 8px; font-size: 0.7rem;">${aiLabel}</span></td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="primary-btn" style="padding: 5px 10px; font-size: 0.75rem;" onclick="app.analyzeStockSymbol('${s.symbol}')" title="Inspect Full 15-Section Analysis">
                  Inspect
                </button>
                <button class="secondary-btn" style="padding: 5px 8px; font-size: 0.75rem;" onclick="app.quickAddHoldingFromStock('${s.symbol}', ${s.price}, '${s.marketCapCategory}')" title="Add to Portfolio">
                  ➕
                </button>
                <button class="secondary-btn" style="padding: 5px 8px; font-size: 0.75rem; ${this.watchlistState.items.some(i => i.symbol === s.symbol) ? 'color:var(--accent-amber);' : ''}" onclick="app.toggleWatchlistFromScreener(${JSON.stringify(s).replace(/"/g, '&quot;')})" title="${this.watchlistState.items.some(i => i.symbol === s.symbol) ? 'Remove from Watchlist' : 'Add to Watchlist'}">
                  ${this.watchlistState.items.some(i => i.symbol === s.symbol) ? '⭐' : '☆'}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error(err);
    }
  },

  openAddHoldingModal() {
    document.getElementById('addHoldingModal')?.classList.add('active');
  },
  closeAddHoldingModal() {
    document.getElementById('addHoldingModal')?.classList.remove('active');
  },

  openAddMfModal() {
    document.getElementById('addMfModal')?.classList.add('active');
  },
  closeAddMfModal() {
    document.getElementById('addMfModal')?.classList.remove('active');
  },

  openImportCsvModal() {
    const modal = document.getElementById('importCsvModal');
    if (!modal) return;
    modal.classList.add('active');
    const preview = document.getElementById('csvImportPreview');
    if (preview) {
      preview.style.display = 'none';
      preview.innerHTML = '';
    }
  },

  closeImportCsvModal() {
    document.getElementById('importCsvModal')?.classList.remove('active');
  },

  downloadSampleCsv() {
    const csvContent = 'symbol,company_name,market_cap_type\nLUPIN,Lupin,Large Cap\nBAJAJ-AUTO,Bajaj Auto,Large Cap\nTRENT,Trent Limited,Large Cap\nPOLYCAB,Polycab India,Mid Cap\nKAYNES,Kaynes Technology,Small Cap\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'watchlist_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  handleCsvFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const textArea = document.getElementById('csvTextInput');
      if (textArea) {
        textArea.value = text;
      }
      this.updateCsvPreview(text);
    };
    reader.onerror = () => {
      this.showToast('Failed to read CSV file', 'fail');
    };
    reader.readAsText(file);
  },

  parseCsvLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  },

  parseCsvText(rawText) {
    if (!rawText || !rawText.trim()) return [];
    const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return [];

    // Parse header
    const firstRowTokens = this.parseCsvLine(lines[0]);
    let symbolIdx = -1;
    let nameIdx = -1;
    let capIdx = -1;

    firstRowTokens.forEach((tok, idx) => {
      const clean = tok.toLowerCase().replace(/[\s_\-]/g, '');
      if (clean === 'symbol' || clean === 'ticker' || clean === 'code') {
        symbolIdx = idx;
      } else if (clean === 'companyname' || clean === 'name' || clean === 'company' || clean === 'stockname') {
        nameIdx = idx;
      } else if (clean === 'marketcaptype' || clean === 'marketcap' || clean === 'captype' || clean === 'cap') {
        capIdx = idx;
      }
    });

    let dataLines = lines;
    if (symbolIdx !== -1) {
      dataLines = lines.slice(1);
    } else {
      symbolIdx = 0;
      nameIdx = 1;
      capIdx = 2;
    }

    const items = [];
    for (const line of dataLines) {
      if (!line) continue;
      const cols = this.parseCsvLine(line);
      const symbol = (cols[symbolIdx] || '').replace(/['"]/g, '').trim().toUpperCase();
      if (!symbol) continue;

      const company_name = cols[nameIdx] !== undefined ? cols[nameIdx].replace(/^["']|["']$/g, '').trim() : '';
      const market_cap_type = cols[capIdx] !== undefined ? cols[capIdx].replace(/^["']|["']$/g, '').trim() : '';

      items.push({
        symbol,
        company_name,
        market_cap_type
      });
    }

    return items;
  },

  updateCsvPreview(text) {
    const preview = document.getElementById('csvImportPreview');
    if (!preview) return;
    try {
      const items = this.parseCsvText(text);
      if (items.length > 0) {
        preview.style.display = 'block';
        preview.style.background = 'rgba(16, 185, 129, 0.1)';
        preview.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        preview.style.color = 'var(--accent-emerald)';
        preview.innerHTML = `<strong>${items.length} stocks detected:</strong> ${items.slice(0, 5).map(i => i.symbol).join(', ')}${items.length > 5 ? '...' : ''}`;
      } else {
        preview.style.display = 'block';
        preview.style.background = 'rgba(239, 68, 68, 0.1)';
        preview.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        preview.style.color = 'var(--accent-rose)';
        preview.textContent = 'No valid stock symbols detected. Please check CSV format.';
      }
    } catch (e) {
      preview.style.display = 'none';
    }
  },

  async handleCsvImportSubmit() {
    const textInput = document.getElementById('csvTextInput');
    const preview = document.getElementById('csvImportPreview');
    const submitBtn = document.getElementById('submitImportCsvBtn');
    const rawText = textInput ? textInput.value : '';

    const items = this.parseCsvText(rawText);
    if (!items || items.length === 0) {
      if (preview) {
        preview.style.display = 'block';
        preview.style.background = 'rgba(239, 68, 68, 0.1)';
        preview.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        preview.style.color = 'var(--accent-rose)';
        preview.textContent = 'Please provide valid CSV content with at least one stock row.';
      }
      this.showToast('No valid stocks to import', 'fail');
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳</span> Importing...';
    }

    try {
      let data;
      const res = await fetch('/api/v1/watchlist/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      if (res.status === 404) {
        // Fallback for live running server instance: import via individual POST /api/v1/watchlist calls
        let successCount = 0;
        for (const item of items) {
          const capMap = {
            'LARGE CAP': 'LARGE_CAP',
            'LARGECAP': 'LARGE_CAP',
            'MID CAP': 'MID_CAP',
            'MIDCAP': 'MID_CAP',
            'SMALL CAP': 'SMALL_CAP',
            'SMALLCAP': 'SMALL_CAP',
            'MICRO CAP': 'MICRO_CAP',
            'MICROCAP': 'MICRO_CAP'
          };
          const normCap = capMap[(item.market_cap_type || '').toUpperCase().trim()] || 'LARGE_CAP';
          const existing = this.screenerState.stocks.find(s => s.symbol.toUpperCase() === item.symbol.toUpperCase());
          const payload = {
            symbol: item.symbol.toUpperCase(),
            name: item.company_name || existing?.name || item.symbol,
            marketCapCategory: normCap,
            price: existing?.currentPrice || 1000,
            roce: existing?.metrics?.roce || 18,
            roe: existing?.metrics?.roe || 16,
            pe: existing?.metrics?.pe || 22,
            debtEquity: existing?.metrics?.debtToEquity || 0.15,
            score: existing?.qualityScore?.totalScore || 80,
            qualityTier: existing?.qualityScore?.tier || 'CATEGORY_C'
          };
          const singleRes = await fetch('/api/v1/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (singleRes.ok) successCount++;
        }
        data = {
          success: true,
          message: `Imported ${successCount} of ${items.length} stocks to Watchlist`
        };
      } else {
        data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Import failed');
        }
      }

      if (preview) {
        preview.style.display = 'block';
        preview.style.background = 'rgba(16, 185, 129, 0.1)';
        preview.style.border = '1px solid rgba(16, 185, 129, 0.3)';
        preview.style.color = 'var(--accent-emerald)';
        preview.textContent = data.message;
      }

      this.showToast(data.message, 'pass');

      // Reload watchlist and re-render
      await this.loadWatchlist();
      this.renderWatchlistTable();
      this.updateWatchlistNavBadge();

      // Reset form fields
      if (textInput) textInput.value = '';
      const fileInput = document.getElementById('csvFileInput');
      if (fileInput) fileInput.value = '';

      setTimeout(() => {
        this.closeImportCsvModal();
      }, 700);

    } catch (err) {
      if (preview) {
        preview.style.display = 'block';
        preview.style.background = 'rgba(239, 68, 68, 0.1)';
        preview.style.border = '1px solid rgba(239, 68, 68, 0.3)';
        preview.style.color = 'var(--accent-rose)';
        preview.textContent = `Import error: ${err.message}`;
      }
      this.showToast(`Import error: ${err.message}`, 'fail');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>🚀</span> Import to Watchlist';
      }
    }
  },

  // ============================================================
  // WATCHLIST — SQLite Database-backed stock monitoring list (Step 3)
  // ============================================================
  async loadWatchlist() {
    try {
      const res = await fetch('/api/v1/watchlist');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        this.watchlistState.items = json.data;

        // Auto-migrate legacy items from localStorage if DB is fresh
        if (this.watchlistState.items.length === 0) {
          const raw = localStorage.getItem('sma_watchlist');
          if (raw) {
            try {
              const legacyItems = JSON.parse(raw);
              if (Array.isArray(legacyItems) && legacyItems.length > 0) {
                for (const item of legacyItems) {
                  await fetch('/api/v1/watchlist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item)
                  });
                }
                localStorage.removeItem('sma_watchlist');
                const refreshed = await (await fetch('/api/v1/watchlist')).json();
                if (refreshed.success) {
                  this.watchlistState.items = refreshed.data;
                }
              }
            } catch (e) {
              console.warn('Legacy watchlist migration skipped:', e);
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to load watchlist from database:', e);
    }
    this.updateWatchlistNavBadge();
    this.renderWatchlistTable();
  },

  updateWatchlistNavBadge() {
    const badge = document.getElementById('navWatchlistBadge');
    const bnavBadge = document.getElementById('bnavWatchlistBadge');
    const count = this.watchlistState.items.length;
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
    if (bnavBadge) {
      bnavBadge.textContent = count;
      bnavBadge.style.display = count > 0 ? 'inline-flex' : 'none';
    }
  },

  // Toggle from stock analysis screen (passes full analysis object)
  async toggleWatchlist(anl) {
    const isWatched = this.watchlistState.items.some(i => i.symbol === anl.symbol);
    if (isWatched) {
      try {
        await fetch(`/api/v1/watchlist/${encodeURIComponent(anl.symbol)}`, { method: 'DELETE' });
        this.watchlistState.items = this.watchlistState.items.filter(i => i.symbol !== anl.symbol);
        this.showToast(`${anl.symbol} removed from Watchlist`, 'info');
      } catch (e) {
        this.showToast(`Error removing ${anl.symbol}: ${e.message}`, 'fail');
      }
    } else {
      const item = {
        symbol: anl.symbol,
        name: anl.name,
        qualityTier: anl.totalScore >= 90 ? 'CATEGORY_A' : anl.totalScore >= 85 ? 'CATEGORY_B' : anl.totalScore >= 80 ? 'CATEGORY_C' : 'BELOW_80',
        score: anl.totalScore,
        marketCapCategory: anl.metrics.marketCapCategory,
        price: anl.metrics.price,
        roce: anl.metrics.roce,
        roe: anl.metrics.roe,
        pe: anl.metrics.pe,
        debtEquity: anl.metrics.debtEquity,
        addedAt: new Date().toISOString()
      };
      try {
        const res = await fetch('/api/v1/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        const data = await res.json();
        if (data.success && data.data) {
          this.watchlistState.items.unshift(data.data);
          this.showToast(`${anl.symbol} added to Watchlist ⭐ (saved to DB)`, 'pass');
        }
      } catch (e) {
        this.showToast(`Error adding ${anl.symbol}: ${e.message}`, 'fail');
      }
    }
    this.updateWatchlistNavBadge();

    // Refresh button label if on stocks view
    const btn = document.getElementById(`wlBtn_${anl.symbol}`);
    if (btn) {
      const isNow = this.watchlistState.items.some(i => i.symbol === anl.symbol);
      btn.textContent = isNow ? '⭐ Watchlisted' : '☆ Add to Watchlist';
      btn.style.color = isNow ? 'var(--accent-amber)' : '';
      btn.style.borderColor = isNow ? 'rgba(245,158,11,0.5)' : '';
    }
  },

  // Toggle from screener table (passes screener stock object)
  async toggleWatchlistFromScreener(s) {
    const isWatched = this.watchlistState.items.some(i => i.symbol === s.symbol);
    if (isWatched) {
      try {
        await fetch(`/api/v1/watchlist/${encodeURIComponent(s.symbol)}`, { method: 'DELETE' });
        this.watchlistState.items = this.watchlistState.items.filter(i => i.symbol !== s.symbol);
        this.showToast(`${s.symbol} removed from Watchlist`, 'info');
      } catch (e) {
        this.showToast(`Error removing ${s.symbol}: ${e.message}`, 'fail');
      }
    } else {
      const item = {
        symbol: s.symbol,
        name: s.name,
        qualityTier: s.qualityTier,
        score: s.score,
        marketCapCategory: s.marketCapCategory,
        price: s.price,
        roce: s.roce,
        roe: s.roe,
        pe: s.pe,
        debtEquity: s.debtEquity,
        addedAt: new Date().toISOString()
      };
      try {
        const res = await fetch('/api/v1/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        const data = await res.json();
        if (data.success && data.data) {
          this.watchlistState.items.unshift(data.data);
          this.showToast(`${s.symbol} added to Watchlist ⭐ (saved to DB)`, 'pass');
        }
      } catch (e) {
        this.showToast(`Error adding ${s.symbol}: ${e.message}`, 'fail');
      }
    }
    this.updateWatchlistNavBadge();
    // Re-render screener to update star button states
    this.fetchAndRenderScreenerStocks();
  },

  async removeFromWatchlist(symbol) {
    try {
      await fetch(`/api/v1/watchlist/${encodeURIComponent(symbol)}`, { method: 'DELETE' });
      this.watchlistState.items = this.watchlistState.items.filter(i => i.symbol !== symbol);
      this.updateWatchlistNavBadge();
      this.renderWatchlistTable();
      this.showToast(`${symbol} removed from Watchlist`, 'info');
    } catch (e) {
      this.showToast(`Error removing ${symbol}: ${e.message}`, 'fail');
    }
  },

  bindWatchlistFilters() {
    document.querySelectorAll('#watchlistCapPills .filter-pill').forEach(pill => {
      pill.addEventListener('click', e => {
        document.querySelectorAll('#watchlistCapPills .filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        this.watchlistState.filterCap = e.target.dataset.wlcap;
        this.renderWatchlistTable();
      });
    });

    document.querySelectorAll('#watchlistTierPills .filter-pill').forEach(pill => {
      pill.addEventListener('click', e => {
        document.querySelectorAll('#watchlistTierPills .filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        this.watchlistState.filterTier = e.target.dataset.wltier;
        this.renderWatchlistTable();
      });
    });

    let wlSearchDebounce = null;
    document.getElementById('watchlistSearch')?.addEventListener('input', e => {
      clearTimeout(wlSearchDebounce);
      wlSearchDebounce = setTimeout(() => {
        this.watchlistState.searchQuery = e.target.value.trim().toLowerCase();
        this.renderWatchlistTable();
      }, 200);
    });
  },

  // Toggle Watchlist view mode between Cards and Table
  bindWatchlistLayoutToggle() {
    const cardsBtn = document.getElementById('wlViewCardsBtn');
    const tableBtn = document.getElementById('wlViewTableBtn');
    const cardsContainer = document.getElementById('watchlistMobileCards');
    const tableWrapper = document.getElementById('watchlistTableWrapper');

    cardsBtn?.addEventListener('click', () => {
      cardsBtn.classList.add('active');
      tableBtn?.classList.remove('active');
      cardsContainer?.classList.remove('force-hidden');
      cardsContainer?.classList.add('force-visible');
      tableWrapper?.classList.remove('force-visible');
      tableWrapper?.classList.add('force-hidden');
    });

    tableBtn?.addEventListener('click', () => {
      tableBtn.classList.add('active');
      cardsBtn?.classList.remove('active');
      tableWrapper?.classList.remove('force-hidden');
      tableWrapper?.classList.add('force-visible');
      cardsContainer?.classList.remove('force-visible');
      cardsContainer?.classList.add('force-hidden');
    });
  },

  renderWatchlistTable() {
    const tbody = document.getElementById('watchlistTableBody');
    const cardsContainer = document.getElementById('watchlistMobileCards');
    if (!tbody && !cardsContainer) return;

    const all = this.watchlistState.items;
    const tierMap = { 'CATEGORY_A': '🌟 A (90+)', 'CATEGORY_B': '🥈 B (85–90)', 'CATEGORY_C': '🥉 C (80–85)', 'BELOW': 'Below 80' };
    const capLabel = c => c === 'LARGE_CAP' ? 'Large' : c === 'MID_CAP' ? 'Mid' : c === 'SMALL_CAP' ? 'Small' : c === 'MICRO_CAP' ? 'Micro' : 'Unclassified';

    // Update summary counts
    document.getElementById('watchlistTotalCount').textContent = all.length;
    document.getElementById('watchlistCatACount').textContent = all.filter(i => i.qualityTier === 'CATEGORY_A').length;
    document.getElementById('watchlistCatBCount').textContent = all.filter(i => i.qualityTier === 'CATEGORY_B').length;
    document.getElementById('watchlistCatCCount').textContent = all.filter(i => i.qualityTier === 'CATEGORY_C').length;

    // Apply filters
    let filtered = all.filter(i => {
      if (this.watchlistState.filterCap !== 'ALL' && i.marketCapCategory !== this.watchlistState.filterCap) return false;
      if (this.watchlistState.filterTier !== 'ALL' && i.qualityTier !== this.watchlistState.filterTier) return false;
      if (this.watchlistState.searchQuery) {
        const q = this.watchlistState.searchQuery;
        if (!i.symbol.toLowerCase().includes(q) && !i.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    document.getElementById('watchlistVisibleCount').textContent = filtered.length;

    // 1. Render Table View
    if (tbody) {
      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr><td colspan="11">
            <div class="watchlist-empty-state">
              <div class="wl-empty-icon">⭐</div>
              <h3>${all.length === 0 ? 'Your Watchlist is Empty' : 'No Stocks Match Filters'}</h3>
              <p style="font-size: 0.85rem; margin-top: 8px;">${all.length === 0 ? 'Go to Stock Analysis or the Screener and click ☆ to add stocks here.' : 'Try changing the cap or tier filter.'}</p>
            </div>
          </td></tr>
        `;
      } else {
        tbody.innerHTML = filtered.map(s => {
          const tierClass = s.qualityTier === 'CATEGORY_A' ? 'tier-a' : s.qualityTier === 'CATEGORY_B' ? 'tier-b' : s.qualityTier === 'CATEGORY_C' ? 'tier-c' : 'tier-below';
          const scoreColor = s.score >= 90 ? '#fbbf24' : s.score >= 85 ? '#38bdf8' : s.score >= 80 ? '#34d399' : 'var(--text-secondary)';
          const scoreText = Number.isFinite(s.score) ? s.score : 'Not analyzed';
          const dateAdded = s.addedAt ? new Date(s.addedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';
          return `
            <tr>
              <td>
                <div style="font-weight: 700; color: #fff; cursor: pointer;" onclick="app.analyzeStockSymbol('${s.symbol}')">${s.symbol}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name}</div>
              </td>
              <td><span class="badge ${tierClass}">${tierMap[s.qualityTier] || 'Not analyzed'}</span></td>
              <td><span style="font-size: 1.1rem; font-weight: 800; color: ${scoreColor};">${scoreText}${Number.isFinite(s.score) ? '<span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 400;">/100</span>' : ''}</span></td>
              <td><span class="badge info" style="font-size: 0.7rem;">${capLabel(s.marketCapCategory)} Cap</span></td>
              <td><strong style="color: #fff;">${Number.isFinite(s.price) ? `₹${s.price.toLocaleString('en-IN')}` : '—'}</strong></td>
              <td><span style="color: ${s.roce >= 20 ? 'var(--accent-emerald)' : 'var(--text-primary)'}; font-weight: 600;">${Number.isFinite(s.roce) ? s.roce : '—'}%</span></td>
              <td>${Number.isFinite(s.roe) ? s.roe : '—'}%</td>
              <td>${Number.isFinite(s.pe) ? s.pe : '—'}</td>
              <td>${Number.isFinite(s.debtEquity) ? s.debtEquity : '—'}</td>
              <td style="font-size: 0.78rem; color: var(--text-secondary);">${dateAdded}</td>
              <td>
                <div style="display: flex; gap: 6px;">
                  <button class="primary-btn" style="padding: 5px 10px; font-size: 0.75rem;" onclick="app.analyzeStockSymbol('${s.symbol}')">
                    Analyze
                  </button>
                  <button class="wl-remove-btn" onclick="app.removeFromWatchlist('${s.symbol}')" title="Remove from Watchlist">
                    ✕ Remove
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    // 2. Render Mobile Touch Cards View (Mandatory Android Mobile UX)
    if (cardsContainer) {
      if (filtered.length === 0) {
        cardsContainer.innerHTML = `
          <div class="watchlist-empty-state">
            <div class="wl-empty-icon">⭐</div>
            <h3>${all.length === 0 ? 'Your Watchlist is Empty' : 'No Stocks Match Filters'}</h3>
            <p style="font-size: 0.85rem; margin-top: 8px;">${all.length === 0 ? 'Go to Stock Analysis or the Screener and tap ☆ to add stocks here.' : 'Try changing the cap or tier filter.'}</p>
          </div>
        `;
      } else {
        cardsContainer.innerHTML = filtered.map(s => {
          const tierClass = s.qualityTier === 'CATEGORY_A' ? 'tier-a' : s.qualityTier === 'CATEGORY_B' ? 'tier-b' : s.qualityTier === 'CATEGORY_C' ? 'tier-c' : 'tier-below';
          const scoreColor = s.score >= 90 ? '#fbbf24' : s.score >= 85 ? '#38bdf8' : s.score >= 80 ? '#34d399' : 'var(--text-secondary)';
          const scoreText = Number.isFinite(s.score) ? s.score : '—';
          const dateAdded = s.addedAt ? new Date(s.addedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—';
          const capName = capLabel(s.marketCapCategory);

          return `
            <div class="wl-mobile-card">
              <div class="wl-card-top">
                <div style="flex: 1; min-width: 0;">
                  <div class="wl-card-symbol" onclick="app.analyzeStockSymbol('${s.symbol}')">
                    <span>${s.symbol}</span>
                    <span class="badge ${tierClass}" style="font-size: 0.68rem; margin-left: 6px;">${tierMap[s.qualityTier] || 'Not analyzed'}</span>
                  </div>
                  <div class="wl-card-name">${s.name}</div>
                </div>
                <div class="wl-card-score" style="border-color: ${scoreColor}44;">
                  <span style="font-size: 1.25rem; font-weight: 800; color: ${scoreColor};">${scoreText}</span>
                  ${Number.isFinite(s.score) ? '<span style="font-size: 0.62rem; color: var(--text-muted); display: block;">/100</span>' : ''}
                </div>
              </div>

              <div class="wl-card-price-row">
                <div>
                  <span style="font-size: 0.68rem; color: var(--text-muted); display: block;">Current Price</span>
                  <span class="wl-card-price">${Number.isFinite(s.price) ? `₹${s.price.toLocaleString('en-IN')}` : '—'}</span>
                </div>
                <div style="text-align: right;">
                  <span class="badge info" style="font-size: 0.72rem;">${capName} Cap</span>
                  <span style="font-size: 0.68rem; color: var(--text-muted); display: block; margin-top: 2px;">Added ${dateAdded}</span>
                </div>
              </div>

              <div class="wl-card-stats-grid">
                <div class="wl-stat-pill">
                  <span class="wl-stat-k">ROCE</span>
                  <span class="wl-stat-v" style="color: ${s.roce >= 20 ? 'var(--accent-emerald)' : '#fff'};">${s.roce || '—'}%</span>
                </div>
                <div class="wl-stat-pill">
                  <span class="wl-stat-k">ROE</span>
                  <span class="wl-stat-v">${s.roe || '—'}%</span>
                </div>
                <div class="wl-stat-pill">
                  <span class="wl-stat-k">P/E</span>
                  <span class="wl-stat-v">${s.pe || '—'}</span>
                </div>
                <div class="wl-stat-pill">
                  <span class="wl-stat-k">D/E</span>
                  <span class="wl-stat-v">${s.debtEquity || '—'}</span>
                </div>
              </div>

              <div class="wl-card-actions">
                <button class="primary-btn" style="flex: 1; padding: 10px 14px; font-size: 0.85rem; justify-content: center;" onclick="app.analyzeStockSymbol('${s.symbol}')">
                  🔍 Full Analysis
                </button>
                <button class="wl-remove-btn" style="padding: 10px 14px; font-size: 0.85rem;" onclick="app.removeFromWatchlist('${s.symbol}')" title="Remove from Watchlist">
                  ✕ Remove
                </button>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  },

  // ============================================================
  // AI MARKET CHAT — Deterministic analysis using scoring data
  // ============================================================
  initChat() {
    // Asset type chips (single-select)
    document.querySelectorAll('#chatAssetChips .filter-chip').forEach(chip => {
      chip.addEventListener('click', e => {
        document.querySelectorAll('#chatAssetChips .filter-chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
        this.chatState.assetType = e.target.dataset.asset;
        this.updateChatContextPills();
      });
    });

    // Category chips (multi-select)
    document.querySelectorAll('#chatCategoryChips .filter-chip').forEach(chip => {
      chip.addEventListener('click', e => {
        const val = e.target.dataset.cat;
        e.target.classList.toggle('active');
        if (this.chatState.categories.includes(val)) {
          this.chatState.categories = this.chatState.categories.filter(c => c !== val);
        } else {
          this.chatState.categories.push(val);
        }
        this.updateChatContextPills();
      });
    });

    // Sector chips (multi-select)
    document.querySelectorAll('#chatSectorChips .filter-chip').forEach(chip => {
      chip.addEventListener('click', e => {
        const val = e.target.dataset.sector;
        e.target.classList.toggle('active');
        if (this.chatState.sectors.includes(val)) {
          this.chatState.sectors = this.chatState.sectors.filter(s => s !== val);
        } else {
          this.chatState.sectors.push(val);
        }
        this.updateChatContextPills();
      });
    });

    // Quick prompt buttons
    document.querySelectorAll('#chatQuickPrompts .quick-prompt-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const prompt = e.target.dataset.prompt;
        const textarea = document.getElementById('chatInput');
        if (textarea) {
          textarea.value = prompt;
          textarea.focus();
        }
      });
    });

    // Send button
    document.getElementById('chatSendBtn')?.addEventListener('click', () => this.sendChatMessage());

    // Enter key to send (Shift+Enter for newline)
    document.getElementById('chatInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendChatMessage();
      }
    });

    // Clear chat
    document.getElementById('clearChatBtn')?.addEventListener('click', () => this.clearChat());
  },

  updateChatContextPills() {
    const container = document.getElementById('chatActivePills');
    if (!container) return;
    const pills = [];
    const assetLabel = { 'STOCK': '📈 Stock', 'MUTUAL_FUND': '📊 Mutual Fund', 'COMMODITY': '🏅 Commodity' };
    pills.push(assetLabel[this.chatState.assetType] || this.chatState.assetType);
    this.chatState.categories.forEach(c => pills.push(c.replace('_', ' ')));
    this.chatState.sectors.forEach(s => pills.push(s));
    container.innerHTML = pills.map(p => `<span class="chat-context-pill">${p}</span>`).join('');
  },

  async sendChatMessage() {
    const textarea = document.getElementById('chatInput');
    const prompt = textarea?.value.trim();
    if (!prompt || this.chatState.isTyping) return;

    textarea.value = '';
    this.appendChatBubble('user', prompt);
    this.chatState.isTyping = true;

    // Show typing indicator
    const typingId = 'chat-typing-' + Date.now();
    this.appendTypingIndicator(typingId);

    try {
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          assetType: this.chatState.assetType,
          categories: this.chatState.categories,
          sectors: this.chatState.sectors
        })
      });
      const json = await res.json();
      document.getElementById(typingId)?.remove();
      const reply = json.data?.reply || 'I couldn\'t process that request. Please try rephrasing.';
      const relatedStocks = json.data?.relatedStocks || [];
      this.appendChatBubble('assistant', reply, relatedStocks, json.data?.suggestions);
    } catch (err) {
      document.getElementById(typingId)?.remove();
      this.appendChatBubble('assistant', '⚠️ Could not reach the analysis engine. Please check that the server is running and try again.');
    } finally {
      this.chatState.isTyping = false;
    }
  },

  appendTypingIndicator(id) {
    const messages = document.getElementById('chatMessages');
    if (!messages) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'chat-bubble assistant';
    wrapper.id = id;
    wrapper.innerHTML = `
      <div class="chat-avatar">🤖</div>
      <div class="chat-typing"><span></span><span></span><span></span></div>
    `;
    messages.appendChild(wrapper);
    messages.scrollTop = messages.scrollHeight;
  },

  appendChatBubble(role, text, relatedStocks = [], suggestions = []) {
    const messages = document.getElementById('chatMessages');
    if (!messages) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    const avatar = role === 'user' ? '👤' : '🤖';

    const stockCardsHTML = (relatedStocks || []).length > 0 ? `
      <div style="margin-top: 12px; display: flex; flex-direction: column; gap: 6px;">
        ${relatedStocks.slice(0, 5).map(s => `
          <div class="chat-stock-card" onclick="app.analyzeStockSymbol('${s.symbol}')">
            <div>
              <span style="font-weight: 700; color: #fff;">${s.symbol}</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary); margin-left: 8px;">${s.name || ''}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-weight: 700; color: ${s.score >= 90 ? '#fbbf24' : s.score >= 85 ? '#38bdf8' : '#34d399'};">${s.score}/100</span>
              <span style="font-size: 0.75rem; color: var(--text-secondary);">₹${(s.price || 0).toLocaleString('en-IN')}</span>
              <span class="badge info" style="font-size: 0.65rem;">Inspect →</span>
            </div>
          </div>
        `).join('')}
      </div>` : '';

    const suggestionsHTML = (suggestions || []).length > 0 ? `
      <div class="chat-suggestions">
        ${suggestions.map(s => `<button class="chat-suggestion-pill" onclick="document.getElementById('chatInput').value='${s.replace(/'/g, "\\'")}'">${s}</button>`).join('')}
      </div>` : '';

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    bubble.innerHTML = `
      <div class="chat-avatar">${avatar}</div>
      <div class="chat-bubble-content">
        <div class="chat-bubble-text">${text.replace(/\n/g, '<br>')}${stockCardsHTML}${suggestionsHTML}</div>
        <div class="chat-bubble-time">${timeStr}</div>
      </div>
    `;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;

    this.chatState.messages.push({ role, content: text, timestamp: now.toISOString() });
  },

  clearChat() {
    const messages = document.getElementById('chatMessages');
    if (!messages) return;
    this.chatState.messages = [];
    messages.innerHTML = `
      <div class="chat-bubble assistant">
        <div class="chat-avatar">🤖</div>
        <div class="chat-bubble-content">
          <div class="chat-bubble-text">
            Chat cleared. How can I help you analyse Indian stocks, mutual funds, or commodities today?
          </div>
          <div class="chat-bubble-time">Just now</div>
        </div>
      </div>
    `;
  },

  // --- INDEX STOCK SCANNER ---
  bindIndexScannerFilters() {
    // Exchange pills
    document.querySelectorAll('#idxScanExchangePills .filter-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('#idxScanExchangePills .filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        this.indexScannerState.exchange = e.target.dataset.exchange;
        // Update index dropdown to show relevant options
        this._updateIdxScanIndexOptions(e.target.dataset.exchange);
      });
    });

    // Index select
    document.getElementById('idxScanIndexSelect')?.addEventListener('change', (e) => {
      this.indexScannerState.index = e.target.value;
    });

    // Score select
    document.getElementById('idxScanScoreSelect')?.addEventListener('change', (e) => {
      this.indexScannerState.minScore = Number(e.target.value);
    });

    // Sector select
    document.getElementById('idxScanSectorSelect')?.addEventListener('change', (e) => {
      this.indexScannerState.sector = e.target.value;
      if (this.indexScannerState.hasRun) this.renderIndexScanResults();
    });

    // Tier pills
    document.querySelectorAll('#idxScanTierPills .filter-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        document.querySelectorAll('#idxScanTierPills .filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        this.indexScannerState.tier = e.target.dataset.idxtier;
        if (this.indexScannerState.hasRun) this.renderIndexScanResults();
      });
    });

    // Search input with debounce
    let searchDebounce = null;
    document.getElementById('idxScanSearchInput')?.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        this.indexScannerState.searchQuery = e.target.value.trim();
        if (this.indexScannerState.hasRun) this.renderIndexScanResults();
      }, 200);
    });

    // Run Analysis button
    document.getElementById('idxScanRunBtn')?.addEventListener('click', () => this.runIndexScan());

    // Re-Score button (forces a fresh evaluate + re-run)
    document.getElementById('idxScanRefreshBtn')?.addEventListener('click', async () => {
      const btn = document.getElementById('idxScanRefreshBtn');
      if (btn) { btn.innerHTML = '<span>⏳</span> Re-scoring...'; btn.disabled = true; }
      try {
        await fetch('/api/v1/index-scanner/refresh', { method: 'POST' });
        await this.runIndexScan();
      } catch (e) {
        console.error(e);
      } finally {
        if (btn) { btn.innerHTML = '<span>🔄</span> Re-Score'; btn.disabled = false; }
      }
    });
  },

  _updateIdxScanIndexOptions(exchange) {
    const sel = document.getElementById('idxScanIndexSelect');
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = '';
    const allOpt = document.createElement('option');
    allOpt.value = 'ALL'; allOpt.textContent = 'All Indices';
    sel.appendChild(allOpt);

    const nseGroups = [
      {
        group: '── NSE Large-Cap ──',
        items: [
          { value: 'NIFTY50', label: 'NSE — NIFTY 50' },
          { value: 'NIFTY_NEXT_50', label: 'NSE — NIFTY Next 50' },
          { value: 'NIFTY100', label: 'NSE — NIFTY 100' },
          { value: 'NIFTY200', label: 'NSE — NIFTY 200' }
        ]
      },
      {
        group: '── NSE Mid-Cap ──',
        items: [
          { value: 'NIFTY_MIDCAP_50', label: 'NSE — NIFTY Midcap 50' },
          { value: 'NIFTY_MIDCAP_100', label: 'NSE — NIFTY Midcap 100' },
          { value: 'NIFTY_MIDCAP_150', label: 'NSE — NIFTY Midcap 150' },
          { value: 'NIFTY_MIDCAP_SELECT', label: 'NSE — NIFTY Midcap Select' }
        ]
      },
      {
        group: '── NSE Small-Cap ──',
        items: [
          { value: 'NIFTY_SMALLCAP_50', label: 'NSE — NIFTY Smallcap 50' },
          { value: 'NIFTY_SMALLCAP_100', label: 'NSE — NIFTY Smallcap 100' },
          { value: 'NIFTY_SMALLCAP_250', label: 'NSE — NIFTY Smallcap 250' }
        ]
      },
      {
        group: '── NSE Broad Market ──',
        items: [
          { value: 'NIFTY500', label: 'NSE — NIFTY 500' },
          { value: 'NIFTY_LARGEMIDCAP_250', label: 'NSE — NIFTY LargeMidcap 250' }
        ]
      }
    ];

    const bseGroups = [
      {
        group: '── BSE Large-Cap ──',
        items: [
          { value: 'BSE_LARGECAP', label: 'BSE — BSE LargeCap' },
          { value: 'BSE100', label: 'BSE — BSE 100' }
        ]
      },
      {
        group: '── BSE Mid-Cap ──',
        items: [
          { value: 'BSE_MIDCAP', label: 'BSE — BSE MidCap' },
          { value: 'BSE200', label: 'BSE — BSE 200' }
        ]
      },
      {
        group: '── BSE Small-Cap ──',
        items: [
          { value: 'BSE_SMALLCAP', label: 'BSE — BSE SmallCap' }
        ]
      },
      {
        group: '── BSE Broad Market ──',
        items: [
          { value: 'BSE500', label: 'BSE — BSE 500' }
        ]
      }
    ];

    const activeGroups = exchange === 'BSE'
      ? bseGroups
      : exchange === 'NSE'
        ? nseGroups
        : [...nseGroups, ...bseGroups];

    activeGroups.forEach(grp => {
      const optGroup = document.createElement('optgroup');
      optGroup.label = grp.group;
      grp.items.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        optGroup.appendChild(opt);
      });
      sel.appendChild(optGroup);
    });

    // Restore if still valid
    const allOptions = activeGroups.flatMap(g => g.items);
    const valid = allOptions.some(o => o.value === current) || current === 'ALL';
    sel.value = valid ? current : 'ALL';
    this.indexScannerState.index = sel.value;
  },

  async runIndexScan() {
    const btn = document.getElementById('idxScanRunBtn');
    if (btn) { btn.innerHTML = '<span>⏳</span> Analysing...'; btn.disabled = true; }

    const state = this.indexScannerState;
    const params = new URLSearchParams();
    if (state.exchange !== 'ALL') params.append('exchange', state.exchange);
    if (state.index !== 'ALL') params.append('index', state.index);
    if (state.tier !== 'ALL') params.append('tier', state.tier);
    params.append('minScore', String(state.minScore));
    if (state.sector !== 'ALL') params.append('sector', state.sector);

    try {
      const res = await fetch(`/api/v1/index-scanner/stocks?${params.toString()}`);
      const json = await res.json();
      this.indexScannerState.results = json.data || [];
      this.indexScannerState.hasRun = true;

      // Update summary cards from API response
      const summary = json.summary || {};
      document.getElementById('idxScanTotalCount').textContent = summary.total ?? this.indexScannerState.results.length;
      document.getElementById('idxScanCatACount').textContent = summary.categoryA ?? 0;
      document.getElementById('idxScanCatBCount').textContent = summary.categoryB ?? 0;
      document.getElementById('idxScanCatCCount').textContent = summary.categoryC ?? 0;

      this.renderIndexScanResults();
      this.showToast(`Index Scanner: ${this.indexScannerState.results.length} stocks found with score ≥ ${state.minScore}`, 'pass');
    } catch (err) {
      console.error('Index Scanner failed:', err);
      this.showToast('Index Scanner failed. Check console.', 'fail');
    } finally {
      if (btn) { btn.innerHTML = '<span>🔍</span> Run Analysis'; btn.disabled = false; }
    }
  },

  renderIndexScanResults() {
    const state = this.indexScannerState;
    const placeholder = document.getElementById('idxScanPlaceholder');
    const tableWrapper = document.getElementById('idxScanTableWrapper');
    const tbody = document.getElementById('idxScanTableBody');
    if (!tbody) return;

    if (!state.hasRun || state.results.length === 0) {
      if (placeholder) placeholder.style.display = 'block';
      if (tableWrapper) tableWrapper.style.display = 'none';
      if (state.hasRun && state.results.length === 0) {
        if (placeholder) placeholder.innerHTML = `
          <div style="font-size: 3rem; margin-bottom: 12px;">📭</div>
          <h3>No stocks found</h3>
          <p style="color: var(--text-secondary);">Try adjusting the filters — lower the min score or change the index selection.</p>
        `;
      }
      document.getElementById('idxScanVisibleCount').textContent = '0';
      return;
    }

    // Client-side filter by tier, sector, search (for fast UX without re-fetching)
    let visible = state.results.filter(s => {
      if (state.tier !== 'ALL' && s.qualityTier !== state.tier) return false;
      if (state.sector !== 'ALL') {
        const stockSector = (s.analysis?.metrics?.sector || '').toLowerCase();
        if (!stockSector.includes(state.sector.toLowerCase())) return false;
      }
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase();
        if (!s.symbol.toLowerCase().includes(q) && !s.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    document.getElementById('idxScanVisibleCount').textContent = visible.length;

    if (placeholder) placeholder.style.display = 'none';
    if (tableWrapper) tableWrapper.style.display = 'block';

    if (visible.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="13" style="text-align: center; padding: 36px; color: var(--text-muted);">
            No stocks match the current filter combination. Try adjusting Quality Tier or Sector filters.
          </td>
        </tr>
      `;
      return;
    }

    const now = new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });

    tbody.innerHTML = visible.map(s => {
      // Determine exchange and index label
      let exchangeLabel = 'NSE / BSE';
      if (state.exchange === 'NSE' || (state.index !== 'ALL' && state.index.startsWith('NIFTY'))) {
        exchangeLabel = 'NSE';
      } else if (state.exchange === 'BSE' || (state.index !== 'ALL' && state.index.startsWith('BSE'))) {
        exchangeLabel = 'BSE';
      }

      // Recommendation from suitability
      let rec = '';
      if (s.suitability === 'EXCELLENT') rec = '<span class="badge pass" style="font-size:0.7rem;">✅ Excellent</span>';
      else if (s.suitability === 'GOOD') rec = '<span class="badge pass" style="font-size:0.7rem;">✔ Good</span>';
      else if (s.suitability === 'RESEARCH_REQUIRED') rec = '<span class="badge warning" style="font-size:0.7rem;">⚠️ Research</span>';
      else rec = '<span class="badge fail" style="font-size:0.7rem;">Avoid</span>';

      // Tier badge
      let tierBadge = '';
      if (s.qualityTier === 'CATEGORY_A') tierBadge = '<span class="badge tier-a" style="font-size:0.68rem;">🌟 Cat-A</span>';
      else if (s.qualityTier === 'CATEGORY_B') tierBadge = '<span class="badge tier-b" style="font-size:0.68rem;">🥈 Cat-B</span>';
      else if (s.qualityTier === 'CATEGORY_C') tierBadge = '<span class="badge tier-c" style="font-size:0.68rem;">🥉 Cat-C</span>';
      else tierBadge = '<span class="badge" style="font-size:0.68rem;">Below 80</span>';

      const scoreColor = s.score >= 90 ? '#fbbf24' : s.score >= 85 ? '#38bdf8' : '#34d399';
      const sector = s.analysis?.metrics?.sector || '—';

      const indexDisplayMap = {
        'NIFTY50': 'NIFTY 50',
        'NIFTY_NEXT_50': 'NIFTY Next 50',
        'NIFTY100': 'NIFTY 100',
        'NIFTY200': 'NIFTY 200',
        'NIFTY_MIDCAP_50': 'NIFTY Midcap 50',
        'NIFTY_MIDCAP_100': 'NIFTY Midcap 100',
        'NIFTY_MIDCAP_150': 'NIFTY Midcap 150',
        'NIFTY_MIDCAP_SELECT': 'NIFTY Midcap Select',
        'NIFTY_SMALLCAP_50': 'NIFTY Smallcap 50',
        'NIFTY_SMALLCAP_100': 'NIFTY Smallcap 100',
        'NIFTY_SMALLCAP_250': 'NIFTY Smallcap 250',
        'NIFTY500': 'NIFTY 500',
        'NIFTY_LARGEMIDCAP_250': 'NIFTY LargeMid 250',
        'BSE_LARGECAP': 'BSE LargeCap',
        'BSE100': 'BSE 100',
        'BSE_MIDCAP': 'BSE MidCap',
        'BSE200': 'BSE 200',
        'BSE_SMALLCAP': 'BSE SmallCap',
        'BSE500': 'BSE 500'
      };

      let displayIndex = 'NIFTY 500';
      if (state.index !== 'ALL' && indexDisplayMap[state.index]) {
        displayIndex = indexDisplayMap[state.index];
      } else {
        if (s.marketCapCategory === 'LARGE_CAP') {
          displayIndex = s.indices.includes('NIFTY50') ? 'NIFTY 50' : (s.indices.includes('BSE100') ? 'BSE 100' : 'NIFTY 100');
        } else if (s.marketCapCategory === 'MID_CAP') {
          displayIndex = 'NIFTY Midcap 150';
        } else if (s.marketCapCategory === 'SMALL_CAP') {
          displayIndex = 'NIFTY Smallcap 250';
        }
      }

      const isWatched = this.watchlistState.items.some(i => i.symbol === s.symbol);

      return `
        <tr>
          <td>
            <div style="font-weight:700; color:#fff; cursor:pointer;" onclick="app.analyzeStockSymbol('${s.symbol}')">${s.symbol}</div>
            <div style="font-size:0.74rem; color:var(--text-secondary); max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${s.name}</div>
          </td>
          <td><span class="badge info" style="font-size:0.68rem;">${exchangeLabel}</span></td>
          <td><span style="font-size:0.78rem; color:var(--text-secondary);">${displayIndex}</span></td>
          <td><span style="font-size:0.78rem; color:var(--text-secondary);">${sector}</span></td>
          <td>${tierBadge}</td>
          <td>
            <div style="font-size:1.1rem; font-weight:800; color:${scoreColor};">
              ${s.score}<span style="font-size:0.68rem; color:var(--text-muted); font-weight:400;">/100</span>
            </div>
          </td>
          <td><strong style="color:#fff;">₹${s.price.toLocaleString('en-IN')}</strong></td>
          <td><span style="color:${s.roce >= 20 ? 'var(--accent-emerald)' : 'var(--text-primary)'}; font-weight:600;">${s.roce}%</span></td>
          <td>${s.roe}%</td>
          <td>${s.pe}</td>
          <td>${rec}</td>
          <td style="font-size:0.72rem; color:var(--text-muted);">${now}</td>
          <td>
            <div style="display:flex; gap:5px;">
              <button class="primary-btn" style="padding:4px 8px; font-size:0.72rem;" onclick="app.analyzeStockSymbol('${s.symbol}')">Inspect</button>
              <button class="secondary-btn" style="padding:4px 8px; font-size:0.72rem; ${isWatched ? 'color:var(--accent-amber);' : ''}"
                onclick="app.toggleWatchlistFromIndexScanner(${JSON.stringify(s).replace(/"/g, '&quot;')})"
                title="${isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}">
                ${isWatched ? '⭐' : '☆'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  // Toggle watchlist from Index Scanner (same pattern as toggleWatchlistFromScreener)
  async toggleWatchlistFromIndexScanner(s) {
    const isWatched = this.watchlistState.items.some(i => i.symbol === s.symbol);
    if (isWatched) {
      try {
        await fetch(`/api/v1/watchlist/${encodeURIComponent(s.symbol)}`, { method: 'DELETE' });
        this.watchlistState.items = this.watchlistState.items.filter(i => i.symbol !== s.symbol);
        this.showToast(`${s.symbol} removed from Watchlist`, 'info');
      } catch (e) {
        this.showToast(`Error removing ${s.symbol}: ${e.message}`, 'fail');
      }
    } else {
      const item = {
        symbol: s.symbol,
        name: s.name,
        qualityTier: s.qualityTier,
        score: s.score,
        marketCapCategory: s.marketCapCategory,
        price: s.price,
        roce: s.roce,
        roe: s.roe,
        pe: s.pe,
        debtEquity: s.debtEquity,
        addedAt: new Date().toISOString()
      };
      try {
        const res = await fetch('/api/v1/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });
        const data = await res.json();
        if (data.success && data.data) {
          this.watchlistState.items.unshift(data.data);
          this.showToast(`${s.symbol} added to Watchlist ⭐`, 'pass');
        }
      } catch (e) {
        this.showToast(`Error adding ${s.symbol}: ${e.message}`, 'fail');
      }
    }
    this.updateWatchlistNavBadge();
    this.renderIndexScanResults();
  },

  // ============================================
  // TODAY'S STOCK OPPORTUNITIES METHODS
  // ============================================

  bindOpportunities() {
    // Generate Button & Start Analysis button
    document.getElementById('generateOpportunitiesBtn')?.addEventListener('click', () => this.generateOpportunities(true));
    document.getElementById('oppsStartAnalysisBtn')?.addEventListener('click', () => this.generateOpportunities(true));

    // Market-Cap Category Pills
    document.querySelectorAll('#oppsCapPills .filter-pill').forEach(pill => {
      pill.addEventListener('click', e => {
        document.querySelectorAll('#oppsCapPills .filter-pill').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.opportunitiesState.filters.marketCap = e.currentTarget.dataset.oppcap || 'ALL';
        this.renderOpportunitiesTables();
      });
    });

    // Secondary Filters
    document.getElementById('oppsSignalSelect')?.addEventListener('change', e => {
      this.opportunitiesState.filters.signal = e.target.value;
      this.renderOpportunitiesTables();
    });

    document.getElementById('oppsScoreSelect')?.addEventListener('change', e => {
      this.opportunitiesState.filters.minScore = Number(e.target.value);
      this.renderOpportunitiesTables();
    });

    document.getElementById('oppsValuationSelect')?.addEventListener('change', e => {
      this.opportunitiesState.filters.valuationStatus = e.target.value;
      this.renderOpportunitiesTables();
    });

    document.getElementById('oppsRiskSelect')?.addEventListener('change', e => {
      this.opportunitiesState.filters.riskLevel = e.target.value;
      this.renderOpportunitiesTables();
    });

    document.getElementById('oppsSectorSelect')?.addEventListener('change', e => {
      this.opportunitiesState.filters.sector = e.target.value;
      this.renderOpportunitiesTables();
    });

    // Cheapest-First & Other Sorting Options
    document.getElementById('oppsSortSelect')?.addEventListener('change', e => {
      this.opportunitiesState.sortOption = e.target.value;
      this.renderOpportunitiesTables();
    });

    // Search Query Filter
    document.getElementById('oppsSearchInput')?.addEventListener('input', e => {
      this.opportunitiesState.filters.searchQuery = e.target.value.trim();
      this.renderOpportunitiesTables();
    });

    // Reset Filters
    document.getElementById('oppsResetFiltersBtn')?.addEventListener('click', () => this.resetOpportunityFilters());
  },

  loadOpportunitiesView() {
    if (this.opportunitiesState.hasGenerated) {
      document.getElementById('oppsInitialPlaceholder')?.style.setProperty('display', 'none');
      document.getElementById('oppsResultsContainer')?.style.setProperty('display', 'block');
      this.renderOpportunitiesTables();
    } else {
      document.getElementById('oppsInitialPlaceholder')?.style.setProperty('display', 'block');
      document.getElementById('oppsResultsContainer')?.style.setProperty('display', 'none');
    }
  },

  async generateOpportunities(forceRefresh = true) {
    if (this.opportunitiesState.isLoading) return;
    this.opportunitiesState.isLoading = true;
    const btn = document.getElementById('generateOpportunitiesBtn');
    const btnIcon = document.getElementById('oppsBtnIcon');
    const btnText = document.getElementById('oppsBtnText');
    const banner = document.getElementById('oppsLoadingBanner');

    if (btn) btn.disabled = true;
    if (btnIcon) btnIcon.textContent = '⏳';
    if (btnText) btnText.textContent = 'Analyzing Watchlist...';
    if (banner) banner.style.display = 'flex';

    try {
      const res = await fetch('/api/v1/opportunities/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errorBody = await res.json().catch(() => null);
        throw new Error(errorBody?.error || `Analysis request failed (${res.status})`);
      }
      const data = await res.json();

      if (data.success && data.data) {
        const result = data.data;
        this.opportunitiesState.hasGenerated = true;
        this.opportunitiesState.summary = result.summary;
        this.opportunitiesState.allOpportunities = result.allOpportunities || [];
        this.opportunitiesState.buyCandidates = result.buyCandidates || [];
        this.opportunitiesState.holdCandidates = result.holdCandidates || [];
        this.opportunitiesState.sellCandidates = result.sellCandidates || [];
        this.opportunitiesState.lastGeneratedTime = new Date();

        this.renderOpportunitiesSummary(result.summary);
        document.getElementById('oppsInitialPlaceholder')?.style.setProperty('display', 'none');
        document.getElementById('oppsResultsContainer')?.style.setProperty('display', 'block');

        const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const lastUpText = document.getElementById('oppsLastUpdatedText');
        if (lastUpText) lastUpText.textContent = `Today, ${timeStr}`;
        const statusBadge = document.getElementById('oppsStatusBadge');
        if (statusBadge) {
          statusBadge.className = 'badge pass';
          statusBadge.textContent = 'Analysis Completed';
        }

        this.renderOpportunitiesTables();
        this.showToast(`Analyzed ${result.summary.analyzedCount} stocks: ${result.summary.buyCandidatesCount} Buy candidates found! 🎯`, 'pass');
      } else {
        throw new Error(data.error || 'Failed to generate opportunities');
      }
    } catch (err) {
      this.showToast(`Failed to generate opportunities: ${err.message}`, 'fail');
    } finally {
      this.opportunitiesState.isLoading = false;
      if (btn) btn.disabled = false;
      if (btnIcon) btnIcon.textContent = '🚀';
      if (btnText) btnText.textContent = "Generate Today's Opportunities";
      if (banner) banner.style.display = 'none';
    }
  },

  renderOpportunitiesSummary(summary) {
    if (!summary) return;
    document.getElementById('oppSummaryTotal').textContent = summary.totalWatchlist || 0;
    document.getElementById('oppSummaryAnalyzed').textContent = summary.analyzedCount || 0;
    document.getElementById('oppSummaryBuys').textContent = summary.buyCandidatesCount || 0;
    document.getElementById('oppSummaryHolds').textContent = summary.holdCandidatesCount || 0;
    document.getElementById('oppSummarySells').textContent = summary.sellCandidatesCount || 0;
    document.getElementById('oppSummaryIncomplete').textContent = summary.incompleteCount || 0;
  },

  renderOpportunitiesTables() {
    const { filters, sortOption, buyCandidates, holdCandidates, sellCandidates } = this.opportunitiesState;

    const filteredBuys = this.filterAndSortOpps(buyCandidates, filters, sortOption);
    const filteredHolds = this.filterAndSortOpps(holdCandidates, filters, sortOption);
    const filteredSells = this.filterAndSortOpps(sellCandidates, filters, sortOption);

    // Update section count badges
    document.getElementById('oppsBuyCountBadge').textContent = `${filteredBuys.length} Candidate${filteredBuys.length === 1 ? '' : 's'}`;
    document.getElementById('oppsHoldCountBadge').textContent = `${filteredHolds.length} Candidate${filteredHolds.length === 1 ? '' : 's'}`;
    document.getElementById('oppsSellCountBadge').textContent = `${filteredSells.length} Candidate${filteredSells.length === 1 ? '' : 's'}`;

    // Render Section 1: Buy Candidates
    this.renderBuyOpportunities(filteredBuys);

    // Render Section 2: Hold Candidates
    this.renderHoldOpportunities(filteredHolds);

    // Render Section 3: Sell Candidates
    this.renderSellOpportunities(filteredSells);
  },

  renderBuyOpportunities(items) {
    const tbody = document.getElementById('oppsBuyTableBody');
    const cards = document.getElementById('oppsBuyMobileCards');
    const empty = document.getElementById('oppsBuyEmptyState');
    const tableWrapper = document.getElementById('oppsBuyTableWrapper');

    if (items.length === 0) {
      if (empty) empty.style.display = 'block';
      if (tableWrapper) tableWrapper.style.display = 'none';
      if (cards) cards.innerHTML = '';
      if (tbody) tbody.innerHTML = '';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (tableWrapper) tableWrapper.style.display = 'block';

    const capLabels = { 'LARGE_CAP': 'Large', 'MID_CAP': 'Mid', 'SMALL_CAP': 'Small', 'MICRO_CAP': 'Micro', 'UNCLASSIFIED': 'Unclass.' };

    // 1. Desktop Table
    if (tbody) {
      tbody.innerHTML = items.map(s => {
        const incomplete = s.missingData?.length > 0;
        const mosColor = (s.marginOfSafety ?? 0) >= 15 ? 'var(--accent-emerald)' : (s.marginOfSafety ?? 0) >= 0 ? 'var(--accent-cyan)' : 'var(--accent-amber)';
        const mosSign = (s.marginOfSafety ?? 0) >= 0 ? '+' : '';
        const tierBadge = s.qualityTier === 'CATEGORY_A' ? '<span class="badge pass">🌟 A (90+)</span>' : s.qualityTier === 'CATEGORY_B' ? '<span class="badge info">🥈 B (85–90)</span>' : '<span class="badge neutral">🥉 C (80–85)</span>';
        const riskBadge = incomplete ? '<span class="badge warning">Incomplete data</span>' : s.riskLevel === 'LOW' ? '<span class="badge-risk-low badge">Low Risk</span>' : s.riskLevel === 'HIGH' ? '<span class="badge-risk-high badge">High Risk</span>' : '<span class="badge-risk-mod badge">Moderate</span>';
        const valuationBadgeClass = s.valuationStatus === 'NOT_AVAILABLE' ? 'badge-fair-value' : s.valuationStatus === 'DEEPLY_UNDERVALUED' ? 'badge-deep-value' : 'badge-undervalued';
        const showMetric = (field, value, suffix = '') => s.missingData?.includes(field) || value === null || value === undefined ? 'N/A' : `${value}${suffix}`;

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: #fff; cursor: pointer;" onclick="app.analyzeStockSymbol('${s.symbol}')">${s.symbol}</div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name}</div>
            </td>
            <td>
              <div style="font-size: 0.78rem; font-weight: 600; color: #fff;">${capLabels[s.marketCapCategory] || 'Unclass.'} Cap</div>
              <div style="font-size: 0.7rem; color: var(--text-muted);">${s.exchange}</div>
            </td>
            <td><span style="font-size: 0.78rem; color: var(--text-secondary);">${s.sector || 'N/A'}</span></td>
            <td>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--accent-emerald);" title="${incomplete ? `Provisional score; incomplete data: ${s.missingData.join(', ')}` : 'Stock quality score'}">${s.score}<span style="font-size: 0.65rem; color: var(--text-muted); font-weight: 400;">/100</span></div>
              <div style="margin-top: 2px;">${incomplete ? '<span class="badge warning">Provisional — incomplete data</span>' : tierBadge}</div>
            </td>
            <td><span class="badge ${valuationBadgeClass}">${s.valuationStatusLabel}</span></td>
            <td><strong style="color: #fff; font-size: 0.95rem;">${showMetric('Live Market Price', s.price, '') === 'N/A' ? 'N/A' : `₹${s.price.toLocaleString('en-IN')}`}</strong></td>
            <td><strong style="color: var(--accent-cyan);">${s.estimatedFairValue !== null && s.estimatedFairValue !== undefined ? `₹${s.estimatedFairValue.toLocaleString('en-IN')}` : 'N/A'}</strong></td>
            <td>
              <span style="font-weight: 800; color: ${mosColor}; font-size: 0.95rem;">
                ${s.marginOfSafety !== null ? `${mosSign}${s.marginOfSafety}%` : 'N/A'}
              </span>
            </td>
            <td>${showMetric('P/E Ratio', s.pe)}</td>
            <td><span style="color: ${s.roce >= 20 ? 'var(--accent-emerald)' : '#fff'}; font-weight: 600;">${showMetric('ROCE', s.roce, '%')}</span></td>
            <td>${showMetric('ROE', s.roe, '%')}</td>
            <td>${showMetric('Debt-to-Equity', s.debtEquity)}</td>
            <td>
              <div style="font-size: 0.75rem;">Sales: <strong>${showMetric('5Y Sales Growth', s.salesCagr5Y, '%')}</strong></div>
              <div style="font-size: 0.75rem; color: var(--accent-emerald);">Profit: <strong>${showMetric('5Y Profit Growth', s.profitCagr5Y, '%')}</strong></div>
            </td>
            <td>
              <div style="font-size: 0.78rem; font-weight: 600; color: #fff;">${incomplete || s.entryPriceMin <= 0 || s.entryPriceMax <= 0 ? 'N/A' : `₹${s.entryPriceMin.toLocaleString('en-IN')}–₹${s.entryPriceMax.toLocaleString('en-IN')}`}</div>
              <div style="font-size: 0.68rem; color: var(--accent-emerald);">${incomplete || s.entryPriceMin <= 0 || s.entryPriceMax <= 0 ? 'Insufficient technical data' : s.buyStatusLabel}</div>
            </td>
            <td>${riskBadge}</td>
            <td>
              <span style="font-size: 0.76rem; color: ${s.failedChecks.length === 0 ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">
                ${s.missingData?.length ? `Missing: ${s.missingData.join(', ')}` : s.failedChecks.length === 0 ? '✓ None (Clean)' : s.failedChecks.join('; ')}
              </span>
            </td>
            <td>
              <button class="primary-btn" style="padding: 5px 12px; font-size: 0.75rem;" onclick="app.analyzeStockSymbol('${s.symbol}')">
                Inspect 🔍
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Mobile Cards
    if (cards) {
      cards.innerHTML = items.map(s => {
        const mosColor = (s.marginOfSafety ?? 0) >= 15 ? 'var(--accent-emerald)' : (s.marginOfSafety ?? 0) >= 0 ? 'var(--accent-cyan)' : 'var(--accent-amber)';
        const mosSign = (s.marginOfSafety ?? 0) >= 0 ? '+' : '';

        return `
          <div class="opp-mobile-card buy-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #fff;" onclick="app.analyzeStockSymbol('${s.symbol}')">${s.symbol}</div>
                <div style="font-size: 0.78rem; color: var(--text-secondary);">${s.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">${capLabels[s.marketCapCategory] || 'Unclass.'} Cap • ${s.sector}</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.3rem; font-weight: 800; color: var(--accent-emerald);" title="${s.missingData?.length ? `Provisional score; incomplete data: ${s.missingData.join(', ')}` : 'Stock quality score'}">${s.score}<span style="font-size: 0.7rem; color: var(--text-muted); font-weight: 400;">/100</span></div>
                ${s.missingData?.length ? '<span class="badge warning">Provisional — incomplete data</span>' : ''}
                <span class="badge ${s.valuationStatus === 'DEEPLY_UNDERVALUED' ? 'badge-deep-value' : 'badge-undervalued'}" style="font-size: 0.68rem;">${s.valuationStatusLabel}</span>
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: var(--radius-sm); margin-bottom: 12px;">
              <div>
                <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Current Market Price</span>
                <strong style="font-size: 1.05rem; color: #fff;">${s.missingData?.includes('Live Market Price') || !s.price ? 'N/A' : `₹${s.price.toLocaleString('en-IN')}`}</strong>
              </div>
              <div style="text-align: right;">
                <span style="font-size: 0.7rem; color: var(--text-muted); display: block;">Industry P/E Reference (Relative Discount)</span>
                <strong style="color: var(--accent-cyan);">${s.estimatedFairValue !== null && s.estimatedFairValue !== undefined ? `₹${s.estimatedFairValue.toLocaleString('en-IN')}` : 'N/A'}</strong>
                <span style="font-weight: 800; color: ${mosColor}; font-size: 0.85rem; margin-left: 4px;">${s.marginOfSafety !== null && s.marginOfSafety !== undefined ? `(${mosSign}${s.marginOfSafety}%)` : ''}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.76rem; color: var(--text-secondary); margin-bottom: 12px;">
              <span>ROCE: <strong style="color: #fff;">${s.missingData?.includes('ROCE') ? 'N/A' : `${s.roce}%`}</strong></span>
              <span>ROE: <strong style="color: #fff;">${s.missingData?.includes('ROE') ? 'N/A' : `${s.roe}%`}</strong></span>
              <span>P/E: <strong style="color: #fff;">${s.missingData?.includes('P/E Ratio') ? 'N/A' : s.pe}</strong></span>
              <span>D/E: <strong style="color: #fff;">${s.missingData?.includes('Debt-to-Equity') ? 'N/A' : s.debtEquity}</strong></span>
            </div>

            <div style="background: rgba(16, 185, 129, 0.08); padding: 8px 10px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-emerald); margin-bottom: 12px; font-size: 0.78rem; color: #d1fae5;">
              ${s.classificationReason}
            </div>

            <button class="primary-btn" style="width: 100%; padding: 8px; font-size: 0.82rem; justify-content: center;" onclick="app.analyzeStockSymbol('${s.symbol}')">
              Inspect Full 100-Point Analysis 🔍
            </button>
          </div>
        `;
      }).join('');
    }
  },

  renderHoldOpportunities(items) {
    const tbody = document.getElementById('oppsHoldTableBody');
    const cards = document.getElementById('oppsHoldMobileCards');
    const empty = document.getElementById('oppsHoldEmptyState');
    const tableWrapper = document.getElementById('oppsHoldTableWrapper');

    if (items.length === 0) {
      if (empty) empty.style.display = 'block';
      if (tableWrapper) tableWrapper.style.display = 'none';
      if (cards) cards.innerHTML = '';
      if (tbody) tbody.innerHTML = '';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (tableWrapper) tableWrapper.style.display = 'block';

    const capLabels = { 'LARGE_CAP': 'Large', 'MID_CAP': 'Mid', 'SMALL_CAP': 'Small', 'MICRO_CAP': 'Micro', 'UNCLASSIFIED': 'Unclass.' };

    if (tbody) {
      tbody.innerHTML = items.map(s => {
        const mosSign = (s.marginOfSafety ?? 0) >= 0 ? '+' : '';
        const riskBadge = s.riskLevel === 'LOW' ? '<span class="badge-risk-low badge">Low Risk</span>' : s.riskLevel === 'HIGH' ? '<span class="badge-risk-high badge">High Risk</span>' : '<span class="badge-risk-mod badge">Moderate</span>';

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: #fff; cursor: pointer;" onclick="app.analyzeStockSymbol('${s.symbol}')">${s.symbol}</div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name}</div>
            </td>
            <td><span class="badge info" style="font-size: 0.72rem;">${capLabels[s.marketCapCategory] || 'Unclass.'}</span></td>
            <td><strong style="color: #fff;">₹${(s.price || 0).toLocaleString('en-IN')}</strong></td>
            <td><strong style="color: ${s.score >= 80 ? 'var(--accent-emerald)' : 'var(--accent-amber)'}; font-size: 1.05rem;">${s.score}</strong>/100</td>
            <td><span class="badge ${s.valuationStatus === 'OVERVALUED' ? 'badge-overvalued' : 'badge-fair-value'}">${s.valuationStatusLabel}</span></td>
            <td><span style="font-weight: 600; color: ${(s.marginOfSafety ?? 0) >= 0 ? 'var(--accent-cyan)' : 'var(--accent-amber)'};">${s.marginOfSafety !== null ? `${mosSign}${s.marginOfSafety}%` : 'N/A'}</span></td>
            <td><strong style="color: #fff;">${s.entryPriceMin > 0 && s.entryPriceMax > 0 ? `₹${s.entryPriceMin.toLocaleString('en-IN')}–₹${s.entryPriceMax.toLocaleString('en-IN')}` : 'N/A'}</strong></td>
            <td style="max-width: 260px;">
              <div style="font-size: 0.76rem; color: #e2e8f0; line-height: 1.4;">${s.classificationReason}</div>
            </td>
            <td>
              <span style="font-size: 0.74rem; color: ${s.failedChecks.length === 0 ? 'var(--accent-emerald)' : 'var(--accent-amber)'};">
                ${s.failedChecks.length === 0 ? '✓ None' : `${s.failedChecks.length} flag${s.failedChecks.length === 1 ? '' : 's'}`}
              </span>
            </td>
            <td>${riskBadge}</td>
            <td style="font-size: 0.72rem; color: var(--text-muted);">${new Date(s.lastUpdated).toLocaleDateString('en-IN')}</td>
            <td>
              <button class="secondary-btn" style="padding: 5px 10px; font-size: 0.75rem;" onclick="app.analyzeStockSymbol('${s.symbol}')">
                Inspect 🔍
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (cards) {
      cards.innerHTML = items.map(s => {
        const mosSign = (s.marginOfSafety ?? 0) >= 0 ? '+' : '';

        return `
          <div class="opp-mobile-card hold-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #fff;" onclick="app.analyzeStockSymbol('${s.symbol}')">${s.symbol}</div>
                <div style="font-size: 0.78rem; color: var(--text-secondary);">${s.name} • ${capLabels[s.marketCapCategory] || 'Unclass.'} Cap</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.2rem; font-weight: 800; color: var(--accent-amber);">${s.score}<span style="font-size: 0.68rem; color: var(--text-muted); font-weight: 400;">/100</span></div>
                <span class="badge ${s.valuationStatus === 'OVERVALUED' ? 'badge-overvalued' : 'badge-fair-value'}" style="font-size: 0.68rem;">${s.valuationStatusLabel}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 8px 10px; border-radius: var(--radius-sm); margin-bottom: 10px;">
              <span>Current Price: <strong style="color: #fff;">${s.price > 0 ? `₹${s.price.toLocaleString('en-IN')}` : 'N/A'}</strong></span>
              <span>Preferred Entry: <strong style="color: var(--accent-cyan);">${s.entryPriceMin > 0 && s.entryPriceMax > 0 ? `₹${s.entryPriceMin.toLocaleString('en-IN')}–₹${s.entryPriceMax.toLocaleString('en-IN')}` : 'N/A'}</strong></span>
            </div>

            <div style="background: rgba(245, 158, 11, 0.08); padding: 8px 10px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-amber); margin-bottom: 10px; font-size: 0.78rem; color: #fef3c7;">
              ${s.classificationReason}
            </div>

            <button class="secondary-btn" style="width: 100%; padding: 7px; font-size: 0.8rem; justify-content: center;" onclick="app.analyzeStockSymbol('${s.symbol}')">
              Inspect Analysis 🔍
            </button>
          </div>
        `;
      }).join('');
    }
  },

  renderSellOpportunities(items) {
    const tbody = document.getElementById('oppsSellTableBody');
    const cards = document.getElementById('oppsSellMobileCards');
    const empty = document.getElementById('oppsSellEmptyState');
    const tableWrapper = document.getElementById('oppsSellTableWrapper');

    if (items.length === 0) {
      if (empty) empty.style.display = 'block';
      if (tableWrapper) tableWrapper.style.display = 'none';
      if (cards) cards.innerHTML = '';
      if (tbody) tbody.innerHTML = '';
      return;
    }

    if (empty) empty.style.display = 'none';
    if (tableWrapper) tableWrapper.style.display = 'block';

    if (tbody) {
      tbody.innerHTML = items.map(s => {
        const ownershipBadge = s.isPortfolioHolding
          ? `<span class="badge badge-portfolio-holding">💼 Portfolio Holding (+${s.holdingPnlPercent?.toFixed(1) || 0}%)</span>`
          : `<span class="badge badge-watchlist-only">⭐ Watchlist Only</span>`;

        const signalBadge = `<span class="badge fail" style="font-weight: 700;">${s.sellSignal || 'Review Position'}</span>`;
        const riskBadge = s.riskLevel === 'HIGH' ? '<span class="badge-risk-high badge">High Risk</span>' : '<span class="badge-risk-mod badge">Moderate</span>';

        return `
          <tr>
            <td>
              <div style="font-weight: 700; color: #fff; cursor: pointer;" onclick="app.analyzeStockSymbol('${s.symbol}')">${s.symbol}</div>
              <div style="font-size: 0.74rem; color: var(--text-secondary); max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name}</div>
            </td>
            <td>${ownershipBadge}</td>
            <td><strong style="color: #fff;">₹${(s.price || 0).toLocaleString('en-IN')}</strong></td>
            <td><strong style="color: var(--accent-rose); font-size: 1.05rem;">${s.score}</strong>/100</td>
            <td><span class="badge badge-overvalued">${s.valuationStatusLabel}</span></td>
            <td>${signalBadge}</td>
            <td style="max-width: 280px;">
              <div style="font-size: 0.78rem; font-weight: 600; color: #fecdd3; line-height: 1.4;">${s.classificationReason}</div>
              ${s.deteriorationIndicators && s.deteriorationIndicators.length > 0 ? `<div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 4px;">Flags: ${s.deteriorationIndicators.join(', ')}</div>` : ''}
            </td>
            <td>
              <span style="font-size: 0.74rem; color: var(--accent-rose);">
                ${s.failedChecks.length} flag${s.failedChecks.length === 1 ? '' : 's'}
              </span>
            </td>
            <td>${riskBadge}</td>
            <td style="font-size: 0.72rem; color: var(--text-muted);">${new Date(s.lastUpdated).toLocaleDateString('en-IN')}</td>
            <td>
              <button class="secondary-btn" style="padding: 5px 10px; font-size: 0.75rem;" onclick="app.analyzeStockSymbol('${s.symbol}')">
                Inspect 🔍
              </button>
            </td>
          </tr>
        `;
      }).join('');
    }

    if (cards) {
      cards.innerHTML = items.map(s => {
        const ownershipBadge = s.isPortfolioHolding
          ? `<span class="badge badge-portfolio-holding" style="font-size: 0.7rem;">💼 Portfolio Holding (+${s.holdingPnlPercent?.toFixed(1) || 0}%)</span>`
          : `<span class="badge badge-watchlist-only" style="font-size: 0.7rem;">⭐ Watchlist Only</span>`;

        return `
          <div class="opp-mobile-card sell-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div>
                <div style="font-size: 1.05rem; font-weight: 700; color: #fff;" onclick="app.analyzeStockSymbol('${s.symbol}')">${s.symbol}</div>
                <div style="font-size: 0.78rem; color: var(--text-secondary);">${s.name}</div>
                <div style="margin-top: 4px;">${ownershipBadge}</div>
              </div>
              <div style="text-align: right;">
                <span class="badge fail" style="font-size: 0.74rem; font-weight: 700;">${s.sellSignal || 'Sell/Reduce Signal'}</span>
                <div style="font-size: 0.95rem; font-weight: 700; color: #fff; margin-top: 4px;">₹${(s.price || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div style="background: rgba(239, 68, 68, 0.08); padding: 8px 10px; border-radius: var(--radius-sm); border-left: 3px solid var(--accent-rose); margin-bottom: 10px; font-size: 0.78rem; color: #fecdd3;">
              ${s.classificationReason}
            </div>

            <button class="secondary-btn" style="width: 100%; padding: 7px; font-size: 0.8rem; justify-content: center;" onclick="app.analyzeStockSymbol('${s.symbol}')">
              Inspect Analysis 🔍
            </button>
          </div>
        `;
      }).join('');
    }
  },

  resetOpportunityFilters() {
    this.opportunitiesState.filters = {
      marketCap: 'ALL',
      signal: 'ALL',
      minScore: 80,
      valuationStatus: 'ALL',
      riskLevel: 'ALL',
      sector: 'ALL',
      searchQuery: ''
    };
    this.opportunitiesState.sortOption = 'cheapest_fair_value';

    // Reset controls
    document.querySelectorAll('#oppsCapPills .filter-pill').forEach(p => {
      p.classList.toggle('active', p.dataset.oppcap === 'ALL');
    });

    const signalSelect = document.getElementById('oppsSignalSelect');
    if (signalSelect) signalSelect.value = 'ALL';

    const scoreSelect = document.getElementById('oppsScoreSelect');
    if (scoreSelect) scoreSelect.value = '80';

    const valSelect = document.getElementById('oppsValuationSelect');
    if (valSelect) valSelect.value = 'ALL';

    const riskSelect = document.getElementById('oppsRiskSelect');
    if (riskSelect) riskSelect.value = 'ALL';

    const sectorSelect = document.getElementById('oppsSectorSelect');
    if (sectorSelect) sectorSelect.value = 'ALL';

    const sortSelect = document.getElementById('oppsSortSelect');
    if (sortSelect) sortSelect.value = 'cheapest_fair_value';

    const searchInput = document.getElementById('oppsSearchInput');
    if (searchInput) searchInput.value = '';

    this.renderOpportunitiesTables();
    this.showToast('Filters reset to default view', 'info');
  },

  filterAndSortOpps(items, filters, sortOption) {
    let result = [...items];

    // Market Cap
    if (filters.marketCap && filters.marketCap !== 'ALL') {
      result = result.filter(i => i.marketCapCategory === filters.marketCap);
    }

    // Signal
    if (filters.signal && filters.signal !== 'ALL') {
      result = result.filter(i => i.classification === filters.signal);
    }

    // Min Score
    if (filters.minScore !== undefined && filters.minScore > 0) {
      result = result.filter(i => i.score >= filters.minScore);
    }

    // Valuation Status
    if (filters.valuationStatus && filters.valuationStatus !== 'ALL') {
      result = result.filter(i => i.valuationStatus === filters.valuationStatus);
    }

    // Risk Level
    if (filters.riskLevel && filters.riskLevel !== 'ALL') {
      result = result.filter(i => i.riskLevel === filters.riskLevel);
    }

    // Sector
    if (filters.sector && filters.sector !== 'ALL') {
      result = result.filter(i => (i.sector || '').toLowerCase().includes(filters.sector.toLowerCase()));
    }

    // Search Query
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter(i => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q));
    }

    // Sorting
    switch (sortOption) {
      case 'cheapest_fair_value':
      case 'highest_margin_of_safety':
        result.sort((a, b) => (b.marginOfSafety ?? -999) - (a.marginOfSafety ?? -999));
        break;
      case 'lowest_pe':
        result.sort((a, b) => (a.pe > 0 ? a.pe : 9999) - (b.pe > 0 ? b.pe : 9999));
        break;
      case 'lowest_pb':
        result.sort((a, b) => (a.pb > 0 ? a.pb : 9999) - (b.pb > 0 ? b.pb : 9999));
        break;
      case 'highest_score':
        result.sort((a, b) => b.score - a.score);
        break;
      case 'highest_earnings_growth':
        result.sort((a, b) => b.profitCagr5Y - a.profitCagr5Y);
        break;
      case 'highest_roce':
        result.sort((a, b) => b.roce - a.roce);
        break;
      case 'lowest_debt_equity':
        result.sort((a, b) => a.debtEquity - b.debtEquity);
        break;
      case 'lowest_price':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'lowest_risk': {
        const riskRank = { 'LOW': 1, 'MODERATE': 2, 'HIGH': 3 };
        result.sort((a, b) => {
          const diff = riskRank[a.riskLevel] - riskRank[b.riskLevel];
          return diff !== 0 ? diff : b.score - a.score;
        });
        break;
      }
      default:
        result.sort((a, b) => (b.marginOfSafety ?? -999) - (a.marginOfSafety ?? -999));
        break;
    }

    return result;
  },

  // --- TOAST NOTIFICATIONS ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    const icon = type === 'pass' ? '✅' : type === 'fail' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';

    toast.innerHTML = `
      <div style="font-size: 1.2rem;">${icon}</div>
      <div>
        <div style="font-size: 0.85rem; font-weight: 600; color: #fff;">${message}</div>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = '0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
};

window.addEventListener('DOMContentLoaded', () => {
  window.app = app;
  app.init();
});
