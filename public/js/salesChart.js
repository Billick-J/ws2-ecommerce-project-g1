// salesChart.js
document.addEventListener("DOMContentLoaded", () => {
  const salesChartEl = document.getElementById("salesChartCanvas"); // updated
  if (!salesChartEl) return;

  const labels = JSON.parse(salesChartEl.dataset.labels || "[]");
  const data = JSON.parse(salesChartEl.dataset.sales || "[]");

  if (labels.length === 0) return;

  new Chart(salesChartEl.getContext("2d"), {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Total Sales per Day",
        data: data,
        backgroundColor: "rgba(26, 115, 232, 0.7)"
      }]
    },
    options: {
      responsive: true,
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
});
