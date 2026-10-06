montarMenu("itens");

const URL_RECEITAS = "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json";

const campo = document.getElementById("busca");
const aviso = document.getElementById("aviso");
const lista = document.getElementById("lista");
const caixaPrecos = document.getElementById("precos");
const caixaReceita = document.getElementById("receita");
const selServidor = iniciarSeletor("servidor", "servidor", "west");
const selCidade = iniciarSeletor("cidadeCompra", "cidadeCompra", "Caerleon");

let dados = { lista: [], mapa: {} };
let receitas = null;
let itemAberto = null;

function nomePorId(id) {
  const item = dados.mapa[id];
  return item ? nomeDoItem(item) : id;
}

function mostrar(texto) {
  const t = texto.toLowerCase();
  const achados = dados.lista
    .filter(i => (nomeDoItem(i) + " " + i.UniqueName).toLowerCase().includes(t))
    .slice(0, 50);

  lista.innerHTML = achados.map(i => `
    <div class="item" data-id="${i.UniqueName}">
      <img src="https://render.albiononline.com/v1/item/${i.UniqueName}.png?size=64" alt="">
      <div>
        <div>${nomeDoItem(i)}</div>
        <div class="id">${i.UniqueName}</div>
      </div>
    </div>`).join("");

  aviso.textContent = achados.length + " itens mostrados (máximo de 50). Clique em um item para ver preços e receita.";
}

// ---------- PREÇOS DO ITEM ----------
async function mostrarPrecos(id) {
  caixaPrecos.hidden = false;
  caixaPrecos.innerHTML = "Buscando preços...";
  caixaPrecos.scrollIntoView({ behavior: "smooth" });

  try {
    const resposta = await fetch(urlPrecos(selServidor.value, id));
    const precos = await resposta.json();
    const linhas = precos.filter(d => d.sell_price_min > 0 || d.buy_price_max > 0);

    if (linhas.length === 0) {
      caixaPrecos.innerHTML = `<h2>${nomePorId(id)}</h2><p>Sem preços registrados para este item neste servidor.</p>`;
      return;
    }

    const menorVenda = Math.min(...linhas.filter(d => d.sell_price_min > 0).map(d => d.sell_price_min));
    const maiorCompra = Math.max(...linhas.map(d => d.buy_price_max));
    linhas.sort((a, b) => a.city.localeCompare(b.city));

    caixaPrecos.innerHTML = `
      <h2>${nomePorId(id)} <span class="id">${id}</span></h2>
      <table>
        <tr><th>Cidade</th><th>Venda (menor)</th><th>Atualizado</th><th>Compra (maior)</th><th>Atualizado</th></tr>
        ${linhas.map(d => `
          <tr>
            <td>${d.city}</td>
            <td class="${d.sell_price_min === menorVenda ? "melhor" : ""}">${formatar(d.sell_price_min)}</td>
            <td>${haQuanto(d.sell_price_min_date)}</td>
            <td class="${d.buy_price_max === maiorCompra ? "melhor" : ""}">${formatar(d.buy_price_max)}</td>
            <td>${haQuanto(d.buy_price_max_date)}</td>
          </tr>`).join("")}
      </table>
      <p class="nota">Qualidade normal. Verde: onde comprar mais barato e onde vender mais caro. Preços enviados por jogadores: confira "Atualizado".</p>`;
  } catch (erro) {
    caixaPrecos.innerHTML = "Erro ao buscar os preços. Tente novamente.";
  }
}

// ---------- RECEITAS ----------
async function carregarReceitas() {
  if (receitas) return receitas;
  const resposta = await fetch(URL_RECEITAS);
  const arquivo = await resposta.json();
  const raiz = arquivo.items || arquivo;
  const resultado = {};

  function guardar(id, requisitos) {
    if (!requisitos) return;
    const primeira = Array.isArray(requisitos) ? requisitos[0] : requisitos;
    let mats = primeira.craftresource;
    if (!mats) return;
    if (!Array.isArray(mats)) mats = [mats];
    resultado[id] = mats.map(m => {
      const nivel = Number(m["@enchantmentlevel"] || 0);
      const matId = nivel > 0 ? `${m["@uniquename"]}_LEVEL${nivel}@${nivel}` : m["@uniquename"];
      return { id: matId, qtd: Number(m["@count"] || 1) };
    });
  }

  for (const categoria in raiz) {
    const bloco = raiz[categoria];
    const grupo = Array.isArray(bloco) ? bloco : [bloco];
    for (const it of grupo) {
      if (!it || typeof it !== "object" || !it["@uniquename"]) continue;
      guardar(it["@uniquename"], it.craftingrequirements);
      const enc = it.enchantments && it.enchantments.enchantment;
      if (enc) {
        for (const e of (Array.isArray(enc) ? enc : [enc])) {
          guardar(it["@uniquename"] + "@" + e["@enchantmentlevel"], e.craftingrequirements);
        }
      }
    }
  }
  receitas = resultado;
  return receitas;
}

async function mostrarReceita(id) {
  caixaReceita.hidden = false;
  caixaReceita.innerHTML = "Carregando receita... (na primeira vez pode demorar, o arquivo é grande)";

  try {
    const todas = await carregarReceitas();
    const materiais = todas[id];

    if (!materiais) {
      caixaReceita.innerHTML = "<h2>Receita</h2><p>Este item não tem receita de craft nos dados (itens de drop ou especiais não têm).</p>";
      return;
    }

    const cidade = selCidade.value;
    const resposta = await fetch(urlPrecos(selServidor.value, materiais.map(m => m.id)));
    const precos = await resposta.json();

    let total = 0;
    let faltando = false;

    const linhas = materiais.map(m => {
      const linha = precos.find(d => d.item_id === m.id && d.city === cidade && d.sell_price_min > 0);
      const preco = linha ? linha.sell_price_min : 0;
      if (preco === 0) faltando = true;
      total += preco * m.qtd;
      return `
        <tr>
          <td><img src="https://render.albiononline.com/v1/item/${m.id}.png?size=64" alt="">${nomePorId(m.id)}</td>
          <td>${m.qtd}</td>
          <td>${formatar(preco)}</td>
          <td>${formatar(preco * m.qtd)}</td>
        </tr>`;
    }).join("");

    caixaReceita.innerHTML = `
      <h2>Receita: ${nomePorId(id)}</h2>
      <table>
        <tr><th>Material</th><th>Qtd</th><th>Preço (${cidade})</th><th>Subtotal</th></tr>
        ${linhas}
      </table>
      <p><b>Custo dos materiais (1 craft, sem retorno): ${formatar(total)}</b></p>
      ${faltando ? '<p class="nota">Faltam preços de alguns materiais nesta cidade, então o total está incompleto. Tente outra cidade.</p>' : ""}
      <p class="nota">Usa o menor preço de venda de cada material na cidade escolhida. Taxas, retorno de recursos e foco entram na calculadora de craft.</p>`;
  } catch (erro) {
    caixaReceita.innerHTML = "Erro ao carregar a receita ou os preços dos materiais. Tente novamente.";
  }
}

// ---------- INÍCIO ----------
carregarItens()
  .then(resultado => {
    dados = resultado;
    campo.disabled = false;
    const busca = new URLSearchParams(location.search).get("q") || "";
    campo.value = busca;
    mostrar(busca);
  })
  .catch(() => { aviso.textContent = "Erro ao carregar os itens."; });

campo.addEventListener("input", () => mostrar(campo.value));

lista.addEventListener("click", (e) => {
  const alvo = e.target.closest(".item");
  if (!alvo) return;
  itemAberto = alvo.dataset.id;
  mostrarPrecos(itemAberto);
  mostrarReceita(itemAberto);
});

selCidade.addEventListener("change", () => { if (itemAberto) mostrarReceita(itemAberto); });
selServidor.addEventListener("change", () => {
  if (itemAberto) { mostrarPrecos(itemAberto); mostrarReceita(itemAberto); }
});