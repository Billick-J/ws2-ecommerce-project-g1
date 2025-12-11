document.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("salesChartCanvas");
  if (!canvas) return;

  const labels = JSON.parse(canvas.dataset.labels || "[]");
  const data = JSON.parse(canvas.dataset.sales || "[]");
  if (!labels.length) return;

  const chart = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Total Sales per Day",
        data,
        backgroundColor: "rgba(26, 115, 232, 0.7)"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,  // important for bar charts
      scales: { y: { beginAtZero: true } },
      plugins: { legend: { display: true, position: "top" } }
    }
  });

  const printBtn = document.getElementById("printBtn");
  if (printBtn) printBtn.addEventListener("click", () => window.print());

  const adjustChartForPrint = (printing) => {
    if (printing) {
      canvas.style.height = "250px"; // print height
    } else {
      canvas.style.height = "300px"; // normal height
    }
    chart.resize();
  };

  if (window.matchMedia) {
    window.matchMedia("print").addEventListener("change", e => adjustChartForPrint(e.matches));
  }

  window.onbeforeprint = () => adjustChartForPrint(true);
  window.onafterprint = () => adjustChartForPrint(false);
});

