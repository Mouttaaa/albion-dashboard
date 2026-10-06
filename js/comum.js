// ===== SEÇÕES E FERRAMENTAS =====
// Para criar uma aba nova: acrescente uma linha em "modulos" da seção que fizer sentido
// e crie o arquivo .html dela. Quando ela estiver funcionando, troque pronto para true.
const SECOES = [
  { id: "banco", nome: "Banco de dados", descricao: "Consulte itens, receitas e informações do jogo.", modulos: [
    { id: "itens", nome: "Itens e receitas", icone: "📖", descricao: "Busque itens, veja preços por cidade e receitas de craft.", arquivo: "itens.html", pronto: true },
    { id: "mobs", nome: "Mobs e loot", icone: "👹", descricao: "Quais criaturas dropam cada item.", arquivo: "mobs.html", pronto: false }
  ]},
  { id: "mercado", nome: "Mercado", descricao: "Compare cidades e encontre oportunidades.", modulos: [
    { id: "flip", nome: "Flip e Mercado Negro", icone: "🔄", descricao: "Melhor rota de compra e venda entre cidades e Mercado Negro.", arquivo: "flip.html", pronto: false }
  ]},
  { id: "craft", nome: "Craft", descricao: "Planeje produção com cálculo realista de lucro.", modulos: [
    { id: "craft", nome: "Calculadora de craft", icone: "⚒️", descricao: "Lucro com retorno de recursos, foco, taxas e nutrição.", arquivo: "craft.html", pronto: false },
    { id: "refino", nome: "Refino", icone: "🔥", descricao: "Custo e lucro de refinar recursos, com efeito cascata.", arquivo: "refino.html", pronto: false }
  ]},
  { id: "mundo", nome: "Mundo", descricao: "Explore o mapa e as zonas.", modulos: [
    { id: "mapa", nome: "Mapa e zonas", icone: "🗺️", descricao: "Onde encontrar recursos e drops, com zonas destacadas.", arquivo: "mapa.html", pronto: false }
  ]},
  { id: "sistema", nome: "Sistema", descricao: "Ajustes que valem para todas as páginas.", modulos: [
    { id: "config", nome: "Configurações", icone: "⚙️", descricao: "Servidor, Premium e taxas usados nos cálculos.", arquivo: "config.html", pronto: false }
  ]}
];

// ===== BARRA SUPERIOR =====
// "atual" é o id da ferramenta aberta (ou "index" na página principal)
function montarMenu(atual) {
  const nav = document.getElementById("menu");
  if (!nav) return;
  const links = SECOES.map(s => {
    const ativo = s.modulos.some(m => m.id === atual) ? "ativo" : "";
    return `<a class="${ativo}" href="index.html#${s.id}">${s.nome}</a>`;
  }).join("");
  nav.innerHTML = `<a class="marca" href="index.html">⚔️ Albion Dashboard</a><div class="links">${links}</div>`;
}

// ===== SEÇÕES COM CARDS (página principal) =====
function montarSecoes() {
  const area = document.getElementById("secoes");
  if (!area) return;
  area.innerHTML = SECOES.map(s => `
    <section class="secao" id="${s.id}">
      <h2>${s.nome}</h2>
      <p class="sub">${s.descricao}</p>
      <div class="cards">
        ${s.modulos.map(m => m.pronto
          ? `<a class="card" href="${m.arquivo}"><span class="icone">${m.icone}</span><h3>${m.nome}</h3><p>${m.descricao}</p><span class="etiqueta ok">Disponível</span></a>`
          : `<div class="card em-breve"><span class="icone">${m.icone}</span><h3>${m.nome}</h3><p>${m.descricao}</p><span class="etiqueta">Em breve</span></div>`
        ).join("")}
      </div>
    </section>`).join("");
}

// ===== BUSCA DA PÁGINA PRINCIPAL =====
function iniciarBuscaHome() {
  const form = document.getElementById("formBusca");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const texto = document.getElementById("buscaHome").value.trim();
    location.href = "itens.html" + (texto ? "?q=" + encodeURIComponent(texto) : "");
  });
}

// ===== CONFIGURAÇÕES SALVAS NO NAVEGADOR (valem para todas as páginas) =====
const Config = {
  ler(chave, padrao) {
    try {
      const v = localStorage.getItem("ao_" + chave);
      return v === null ? padrao : v;
    } catch (e) { return padrao; }
  },
  salvar(chave, valor) {
    try { localStorage.setItem("ao_" + chave, valor); } catch (e) {}
  }
};

// Liga um <select> a uma configuração salva
function iniciarSeletor(idElemento, chave, padrao) {
  const el = document.getElementById(idElemento);
  const salvo = Config.ler(chave, padrao);
  if ([...el.options].some(o => o.value === salvo)) el.value = salvo;
  el.addEventListener("change", () => Config.salvar(chave, el.value));
  return el;
}

// ===== DADOS DO JOGO =====
const URL_ITENS = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json";
let _promessaItens = null;

// Baixa a lista de itens uma vez só e devolve { lista, mapa }
function carregarItens() {
  if (!_promessaItens) {
    _promessaItens = fetch(URL_ITENS)
      .then(r => r.json())
      .then(dados => {
        const lista = dados.filter(i => i.LocalizedNames);
        const mapa = {};
        lista.forEach(i => { mapa[i.UniqueName] = i; });
        return { lista, mapa };
      })
      .catch(erro => { _promessaItens = null; throw erro; });
  }
  return _promessaItens;
}

function nomeDoItem(item) {
  const nomes = item.LocalizedNames;
  if (!nomes) return item.UniqueName;
  return nomes["PT-BR"] || nomes["EN-US"] || item.UniqueName;
}

// ===== PREÇOS (API do Albion Data Project) =====
function urlPrecos(servidor, ids) {
  const lista = Array.isArray(ids) ? ids.join(",") : ids;
  return `https://${servidor}.albion-online-data.com/api/v2/stats/prices/${lista}.json?qualities=1`;
}

// ===== FORMATAÇÃO =====
function formatar(n) {
  return n > 0 ? n.toLocaleString("pt-BR") : "—";
}

function haQuanto(data) {
  if (!data || data.startsWith("0001")) return "—";
  const dt = new Date(data.endsWith("Z") ? data : data + "Z");
  const min = Math.round((Date.now() - dt) / 60000);
  if (min < 60) return min + " min";
  if (min < 1440) return Math.round(min / 60) + " h";
  return Math.round(min / 1440) + " d";
}