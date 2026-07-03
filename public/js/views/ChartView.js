// Camada VIEW (MVC — frontend).
// Renderiza os dados na tela usando Chart.js. Recebe dados já prontos
// do Controller e cuida apenas da apresentação (gráficos e mensagens).
// Chart.js é carregado via CDN em index.html (variável global `Chart`).
class ChartView {
  // Paleta de cores dos gráficos.
  #paleta = [
    '#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed',
    '#0891b2', '#db2777', '#65a30d', '#ea580c', '#4f46e5',
  ];

  // Mantém referência dos gráficos por canvas para poder destruí-los ao atualizar.
  #instancias = new Map();

  #desenhar(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    if (this.#instancias.has(canvasId)) this.#instancias.get(canvasId).destroy();
    this.#instancias.set(canvasId, new Chart(canvas.getContext('2d'), config));
  }

  // Gráfico de linha: total por ano / linha do tempo
  linha(canvasId, labels, valores, rotulo) {
    this.#desenhar(canvasId, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: rotulo,
          data: valores,
          borderColor: this.#paleta[0],
          backgroundColor: 'rgba(37,99,235,0.12)',
          fill: true,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: this.#paleta[0],
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true } },
        scales: { y: { beginAtZero: true, ticks: { callback: (v) => v.toLocaleString('pt-BR') } } },
      },
    });
  }

  // Gráfico de barras horizontais: rankings
  barrasHorizontais(canvasId, labels, valores, rotulo) {
    this.#desenhar(canvasId, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: rotulo,
          data: valores,
          backgroundColor: labels.map((_, i) => this.#paleta[i % this.#paleta.length]),
          borderRadius: 4,
        }],
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { callback: (v) => v.toLocaleString('pt-BR') } } },
      },
    });
  }

  vazio(canvasId, mensagem = 'Sem dados para exibir') {
    if (this.#instancias.has(canvasId)) {
      this.#instancias.get(canvasId).destroy();
      this.#instancias.delete(canvasId);
    }
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mensagem, canvas.width / 2, canvas.height / 2);
  }
}

// Instância única (singleton) usada pelo Controller.
const instancia = new ChartView();
export { instancia as ChartView };
