let chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function renderFunnelChart(canvasId, stats) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Sent', 'Opened', 'Clicked', 'Replied', 'Interview'],
      datasets: [{
        data: [
          stats.totalSent,
          stats.totalOpened,
          stats.totalClicked,
          stats.totalReplied,
          stats.totalInterview,
        ],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(6, 182, 212, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
        borderColor: [
          'rgb(99, 102, 241)',
          'rgb(6, 182, 212)',
          'rgb(245, 158, 11)',
          'rgb(16, 185, 129)',
          'rgb(236, 72, 153)',
        ],
        borderWidth: 2,
        borderRadius: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.9)',
          titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
          padding: 12,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono' } },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { family: 'Inter' } },
        },
      },
    },
  });
}

function renderDailySendsChart(canvasId, dailySends) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Fill in missing dates
  const days = [];
  const counts = [];
  const today = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    days.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    const found = dailySends.find(s => s.day === key);
    counts.push(found ? found.count : 0);
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: days,
      datasets: [{
        label: 'Emails Sent',
        data: counts,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(99, 102, 241)',
        pointBorderColor: '#0a0e27',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(10, 14, 39, 0.9)',
          titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(99, 102, 241, 0.3)',
          borderWidth: 1,
          cornerRadius: 8,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(255,255,255,0.06)' },
          ticks: { color: '#94a3b8', stepSize: 1, font: { family: 'JetBrains Mono' } },
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', maxRotation: 45, font: { size: 10 } },
        },
      },
    },
  });
}

function renderDomainChart(canvasId, domainData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labelMap = { 'ai-ml': 'AI / ML', 'sde': 'SDE', 'both': 'Both' };

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: domainData.map(d => labelMap[d.domain] || d.domain),
      datasets: [{
        data: domainData.map(d => d.count),
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(6, 182, 212, 0.8)',
          'rgba(245, 158, 11, 0.8)',
        ],
        borderColor: '#0a0e27',
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#e2e8f0', padding: 16, font: { family: 'Inter' } },
        },
      },
    },
  });
}

function renderRegionChart(canvasId, regionData) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const labelMap = { 'us': '🇺🇸 US', 'india': '🇮🇳 India' };

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: regionData.map(d => labelMap[d.region] || d.region),
      datasets: [{
        data: regionData.map(d => d.count),
        backgroundColor: [
          'rgba(236, 72, 153, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
        borderColor: '#0a0e27',
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#e2e8f0', padding: 16, font: { family: 'Inter' } },
        },
      },
    },
  });
}

window.charts = {
  renderFunnelChart,
  renderDailySendsChart,
  renderDomainChart,
  renderRegionChart,
};
