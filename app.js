// =========================================================================
//   CONFIGURAÇÕES INICIAIS E SERVICE WORKER
// =========================================================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js');
}

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdf.worker.min.js';
}

// =========================================================================
//   1. ESTADO GLOBAL DA APLICAÇÃO (APP STATE)
// =========================================================================
const AppState = {
  tetoTotalPct: 35,
  tetoCaixaPct: 30,
  tetoMrvPct: 5,
  intermCriticasG1: [],
  propPicosCriticos: [],

  tipoContrato: '',
  psaQtd: 0, psaSaldo: 0, psbQtd: 0, psbSaldo: 0,
  parcelasPSB: [], parcelasTodas: [],
  dataEntregaISO: null, obraPronta: false,
  entrada: { total: 0, pct: '', parcelas: [] },
  intermediarias: [],
  propFluxo: [], propMensaisPSA: [], propMensaisPSB: [],
  propPsaQtd: 0, propPsaSaldo: 0, propPsbQtd: 0, propPsbSaldo: 0,
  propPsbPrimeira: 0, propPsbMedia: 0, propDataEntregaISO: null
};

// =========================================================================
//   1.1 CONTROLE DE PARÂMETROS REGIONAIS (SIDEBAR)
// =========================================================================
function definirTetoTotal(valor) {
  atualizarTetoPorInput(valor);
}

function atualizarTetoPorInput(val) {
  let num = parseFloat(val);
  if (isNaN(num) || num < 30.5) num = 30.5;
  if (num > 80) num = 80;

  AppState.tetoTotalPct = num;
  AppState.tetoMrvPct = Math.max(0.5, +(num - AppState.tetoCaixaPct).toFixed(2));

  const slider = document.getElementById('sliderTetoTotal');
  const input = document.getElementById('inputTetoTotal');
  if (slider && num <= 60) slider.value = num;
  if (input && document.activeElement !== input) input.value = num;

  document.querySelectorAll('.preset-btn').forEach(btn => {
    const btnVal = parseFloat(btn.dataset.teto);
    btn.classList.toggle('active', btnVal === num);
  });

  const tetoMrvFmt = AppState.tetoMrvPct.toFixed(1).replace('.', ',') + '%';
  const tetoTotFmt = AppState.tetoTotalPct.toFixed(1).replace('.', ',');
  const tetoAteFmt = (AppState.tetoTotalPct + 2).toFixed(1).replace('.', ',');
  document.getElementById('sidebarTetoMRV').textContent = tetoMrvFmt;
  document.getElementById('sidebarFaixaAtencao').textContent = `${tetoTotFmt}% a ${tetoAteFmt}%`;

  if (document.getElementById('resultado').classList.contains('show')) {
    calcular(new Event('submit'));
  }
  if (document.getElementById('resultadoProposta').classList.contains('show')) {
    calcularProposta(new Event('submit'));
  }
}

// =========================================================================
//   2. EVENTOS DE ARRASTAR E SOLTAR E VINCULAÇÃO DE LISTENERS (SEM INLINE)
// =========================================================================
function setupDragAndDrop(cardId, inputId, readFunction) {
  const card = document.getElementById(cardId);
  const input = document.getElementById(inputId);

  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    card.classList.add('drag-over');
  });
  card.addEventListener('dragleave', (e) => {
    e.preventDefault();
    card.classList.remove('drag-over');
  });
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    card.classList.remove('drag-over');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      input.files = e.dataTransfer.files;
      readFunction(input);
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // Fallback do Logo sem onerror inline
  const logoImg = document.getElementById('logoImg');
  if (logoImg) {
    logoImg.addEventListener('error', () => {
      logoImg.classList.add('hidden');
      document.getElementById('logoFallback').style.display = 'inline';
    });
  }

  // Parâmetros Regionais
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => definirTetoTotal(parseFloat(btn.dataset.teto)));
  });
  document.getElementById('sliderTetoTotal').addEventListener('input', (e) => atualizarTetoPorInput(e.target.value));
  document.getElementById('inputTetoTotal').addEventListener('input', (e) => atualizarTetoPorInput(e.target.value));

  // Navegação de Abas
  document.getElementById('tabBtnContrato').addEventListener('click', () => trocarAba('contrato'));
  document.getElementById('tabBtnProposta').addEventListener('click', () => trocarAba('proposta'));

  // Uploads e Drag & Drop
  setupDragAndDrop('uploadCardMRV', 'pdfInput', lerPDFContrato);
  setupDragAndDrop('uploadCardCaixa', 'pdfCaixaInput', lerPDFCaixa);
  setupDragAndDrop('uploadCardProp', 'pdfPropostaInput', lerPDFProposta);

  document.getElementById('uploadCardProp').addEventListener('click', () => document.getElementById('pdfPropostaInput').click());
  document.getElementById('btnUploadProp').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('pdfPropostaInput').click();
  });
  document.getElementById('pdfPropostaInput').addEventListener('change', (e) => lerPDFProposta(e.target));

  document.getElementById('uploadCardMRV').addEventListener('click', () => document.getElementById('pdfInput').click());
  document.getElementById('btnUploadMRV').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('pdfInput').click();
  });
  document.getElementById('pdfInput').addEventListener('change', (e) => lerPDFContrato(e.target));

  document.getElementById('uploadCardCaixa').addEventListener('click', () => document.getElementById('pdfCaixaInput').click());
  document.getElementById('btnUploadCaixa').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('pdfCaixaInput').click();
  });
  document.getElementById('pdfCaixaInput').addEventListener('change', (e) => lerPDFCaixa(e.target));
  document.getElementById('avisoCaixaCard').addEventListener('click', (e) => e.stopPropagation());

  // Formulário e Campos da Proposta
  document.getElementById('formProposta').addEventListener('submit', calcularProposta);
  document.getElementById('btnLimparProp').addEventListener('click', limparProposta);
  document.getElementById('prop-fluxoHeader').addEventListener('click', toggleFluxo);
  document.getElementById('btnCopiarProp').addEventListener('click', copiarResultadoProposta);
  document.getElementById('btnImprimirProp').addEventListener('click', prepararImpressao);

  const propDataEntrega = document.getElementById('prop-dataEntrega');
  propDataEntrega.addEventListener('input', (e) => mascaraData(e.target));
  propDataEntrega.addEventListener('change', function () {
    if (AppState.propFluxo.length > 0 && this.value && /^\d{2}\/\d{2}\/\d{4}$/.test(this.value)) {
      calcularPsaPsbProposta(this.value);
      renderizarFluxo();
    }
  });
  document.getElementById('prop-renda').addEventListener('input', (e) => {
    mascaraMoedaGen(e.target);
    renderizarFluxo();
  });
  document.getElementById('prop-parcelaCaixa').addEventListener('input', (e) => mascaraMoedaGen(e.target));

  // Formulário e Campos do Contrato
  document.getElementById('formCalc').addEventListener('submit', calcular);
  document.getElementById('btnLimparContrato').addEventListener('click', limpar);
  document.getElementById('btnImprimirContrato').addEventListener('click', prepararImpressao);
  document.getElementById('btnCopiarContrato').addEventListener('click', copiarResultado);

  document.getElementById('dataEntrega').addEventListener('input', (e) => mascaraData(e.target));
  document.getElementById('valorAvaliacao').addEventListener('input', (e) => mascaraMoedaGen(e.target));
  document.getElementById('parcelaCaixa').addEventListener('input', (e) => {
    mascaraMoedaGen(e.target);
    atualizarDestaquesPlano();
  });
  document.getElementById('renda').addEventListener('input', (e) => {
    mascaraMoedaGen(e.target);
    atualizarDestaquesPlano();
  });

  // Delegação de clique para acordeões dinâmicos do Plano de Pagamento
  document.getElementById('planoBody').addEventListener('click', (e) => {
    const titulo = e.target.closest('.plano-secao-titulo');
    if (titulo && titulo.dataset.secao) {
      toggleSecao(titulo.dataset.secao);
    }
  });
});

// =========================================================================
//   3. LEITURA E PROCESSAMENTO BASE DE PDFs
// =========================================================================
async function extrairTextoPDF(file) {
  const buf = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  } catch (e) {
    alert('❌ O arquivo PDF está corrompido ou protegido por senha. Por favor, salve-o novamente sem restrições.');
    return null;
  }
  let texto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const c = await page.getTextContent();
      texto += c.items.map(it => it.str).join(' ') + '\n';
    } catch (pe) {
      console.warn('Erro na leitura da página ' + i, pe);
    }
  }
  if (texto.trim().length < 50) {
    alert('⚠️ O PDF parece estar vazio ou é uma imagem digitalizada (sem texto extraível).');
    return null;
  }
  return texto;
}

// =========================================================================
//   4. FUNÇÕES DE UPLOAD ESPECÍFICAS
// =========================================================================
async function lerPDFContrato(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) {
    alert('⚠️ Arquivo muito grande. O limite máximo permitido é 20 MB.');
    input.value = '';
    return;
  }
  mostrarStatus('⏳ Lendo contrato...', 'loading');
  try {
    const texto = await extrairTextoPDF(file);
    if (!texto) { mostrarStatus('❌ Falha na leitura do contrato.', 'error'); return; }
    extrairDadosContrato(texto);
    document.getElementById('uploadCardMRV').className = 'upload-card mrv lido-mrv';
    document.getElementById('badgeMRV').className = 'upload-status-badge ok-mrv';
    mostrarStatus('✅ Contrato lido! Carregue a Simulação Caixa.', 'success');
  } catch (e) {
    mostrarStatus('❌ Erro ao ler contrato: ' + e.message, 'error');
  }
}

async function lerPDFCaixa(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) {
    alert('⚠ Arquivo muito grande. O limite máximo permitido é 20 MB.');
    input.value = '';
    return;
  }
  mostrarStatus('⏳ Lendo Simulação Caixa...', 'loading');
  try {
    const texto = await extrairTextoPDF(file);
    if (!texto) { mostrarStatus('❌ Falha na leitura da simulação.', 'error'); return; }
    extrairDadosCaixa(texto);
    document.getElementById('uploadCardCaixa').className = 'upload-card caixa lido-caixa';
    document.getElementById('badgeCaixa').className = 'upload-status-badge ok-caixa';
    mostrarStatus('✅ Simulação Caixa lida! Preencha o gerente e calcule.', 'success');
  } catch (e) {
    mostrarStatus('❌ Erro ao ler simulação: ' + e.message, 'error');
  }
}

async function lerPDFProposta(input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) {
    alert('⚠️ Arquivo muito grande. O limite máximo permitido é 20 MB.');
    input.value = '';
    return;
  }
  mostrarStatusProp('⏳ Lendo Simulação de Proposta...', 'loading');
  try {
    const texto = await extrairTextoPDF(file);
    if (!texto) { mostrarStatusProp('❌ Falha na leitura da proposta.', 'error'); return; }
    extrairDadosProposta(texto);
    document.getElementById('uploadCardProp').className = 'upload-card proposta lido-proposta';
    document.getElementById('badgeProp').className = 'upload-status-badge ok-proposta';
    mostrarStatusProp('✅ Proposta lida! Informe a data de entrega e a renda para calcular.', 'success');
  } catch (e) {
    mostrarStatusProp('❌ Erro ao ler proposta: ' + e.message, 'error');
  }
}

// =========================================================================
//   5. SANITIZAÇÃO E INJEÇÃO SEGURA DE DADOS
// =========================================================================
function sanitizarTexto(texto) {
  if (!texto) return '';
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

function setAuto(id, val) {
  const el = document.getElementById(id);
  if (el) {
    el.value = sanitizarTexto(val);
    el.classList.remove('auto-filled-caixa');
    el.classList.add('auto-filled');
  }
}

function setAutoCaixa(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  const valSanitizado = sanitizarTexto(val);
  if (id === 'parcelaCaixa' || id === 'renda' || id === 'valorAvaliacao' || id === 'tetoFaixa') {
    const num = parseMoeda(valSanitizado);
    el.value = num > 0 ? formatMoeda(num) : '';
  } else {
    el.value = valSanitizado;
  }
  el.classList.remove('auto-filled');
  el.classList.add('auto-filled-caixa');
}

function setAutoProp(id, val) {
  const el = document.getElementById(id);
  if (el) {
    el.value = sanitizarTexto(val);
    el.classList.add('auto-filled-prop');
  }
}

function setAutoData(id, val) {
  const el = document.getElementById(id);
  if (el) { el.value = sanitizarTexto(val); el.classList.add('auto-filled'); }
}

// =========================================================================
//   6. EXTRAÇÃO E TRATAMENTO DE DADOS (CONTRATO E CAIXA)
// =========================================================================
function detectarTipoContrato(texto) {
  if (/EMCASH/i.test(texto) && /FUTURO\s*EMITENTE/i.test(texto)) return 'EMCASH';
  if (/VCRM\s*\d|QUADRO-RESUMO/i.test(texto)) return 'BPM';
  if (/CONT-[A-Z0-9]{5,}-[A-Z0-9]{3,}/i.test(texto)) return 'BPM';
  if (/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(texto)) return 'OIC';
  if (/COMPRADOR\(A\)/i.test(texto)) return 'OIC';
  return 'DESCONHECIDO';
}

function extrairDadosContrato(texto) {
  const tipo = detectarTipoContrato(texto);
  AppState.tipoContrato = tipo;

  try {
    const nomeM = texto.match(/1[oº°]\s*Cliente[:\s]+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇa-záéíóúãõâêîôûç\s]+?)(?=\s*Nacionalidade|\s*CPF|\s*Estado\s*Civil|\n)/i)
      || texto.match(/COMPRADOR\(A\)[:\s]+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇa-záéíóúãõâêîôûç\s]+?)(?=\s*Nacionalidade|\s*CPF)/i)
      || texto.match(/Nome\/Nome\s*Empresarial[:\s]+([^\n\|]+?)(?=\s*CPF|\s*RG|\s*\||\n)/i);
    if (nomeM) setAuto('nomeCliente', nomeM[1].trim());

    const cpfM = texto.match(/CPF\/CNPJ[:\s]*([\d]{3}[\.\s]?[\d]{3}[\.\s]?[\d]{3}[\-\s]?[\d]{2})/)
      || texto.match(/CPF[:\s]*([\d]{3}[\.\s]?[\d]{3}[\.\s]?[\d]{3}[\-\s]?[\d]{2})/);
    if (cpfM) setAuto('cpf', cpfM[1].replace(/\s/g, ''));

    const contM = texto.match(/N[oº°]\s*do\s*Contrato\s*Emcash[:\s]*(\d+)/i)
      || texto.match(/(CONT-[A-Z0-9]{4,}-[A-Z0-9]{3,})/i)
      || texto.match(/CONT[:\s]*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if (contM) setAuto('numContrato', contM[1]);

    if (tipo === 'EMCASH') {
      let nomeEmp = ''; let nomeBloco = '';
      const descM = texto.match(/Descri[çc][aã]o\s*do\s*im[oó]vel[^:]*:\s*\n?\s*([^\n]+)/i);
      if (descM) {
        const desc = descM[1].trim();
        const nomeMatch = desc.match(/^([^,]+?)(?:\s*,\s*(?:Travessa|Rua|Av(?:enida)?|Estrada|Alameda|Al\.|R\.)|\s*,\s*\d)/i);
        nomeEmp = nomeMatch ? nomeMatch[1].trim() : desc.split(',')[0].trim();
        const aptoM = desc.match(/Apto[:\s]*(\d+[A-Z]*)/i);
        const blocoM = desc.match(/Bloco[:\s]*(\d+[A-Z]*)/i);
        if (aptoM && blocoM) nomeBloco = 'Apto ' + aptoM[1] + ' — Bloco ' + blocoM[2];
        else if (aptoM) nomeBloco = 'Apto ' + aptoM[1];
      }
      if (!nomeEmp) {
        const empFallM = texto.match(/(?:empreendimento|residencial|condomínio)[:\s"]*([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-záéíóúãõ\s]+?)(?=,|\n|"|\.|Travessa|Rua)/i);
        if (empFallM) nomeEmp = empFallM[1].trim();
      }
      if (nomeEmp) setAuto('empreendimento', nomeEmp);
      if (nomeBloco) setAuto('modulo', nomeBloco);
      if (!nomeBloco) {
        const aptoGeral = texto.match(/Apto[:\s]*(\d+[A-Z]*)[,\s]*Bloco[:\s]*(\d+[A-Z]*)/i);
        if (aptoGeral) setAuto('modulo', 'Apto ' + aptoGeral[1] + ' — Bloco ' + aptoGeral[2]);
      }
    } else {
      const prodM = texto.match(/Produto[:\s]+([\s\S]+?)(?=CONT[-:\s]|$)/i);
      if (prodM) {
        let prod = prodM[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        prod = prod.replace(/CONT[-\s][A-Z0-9\-]+.*/i, '').trim();
        let indiceHifen = prod.indexOf(' - ');
        if (indiceHifen === -1) indiceHifen = prod.indexOf(' – ');
        if (indiceHifen !== -1) {
          const emp = prod.substring(0, indiceHifen).trim();
          let modulo = prod.substring(indiceHifen + 3).trim();
          modulo = modulo.replace(/\s*[-–]\s*(?:Rio de Janeiro|Maca[eé]|Campos dos Goytacazes|Belo Horizonte|São Paulo).*$/i, '').trim();
          setAuto('empreendimento', emp);
          setAuto('modulo', modulo);
        } else {
          setAuto('empreendimento', prod);
          setAuto('modulo', '—');
        }
      }
    }

    const valImovelM = texto.match(/3\.2[^R\n]*R\$\s*([\d.,]+)/i)
      || texto.match(/PRE[ÇC]O\s*DO\s*IM[OÓ]VEL[^R\n]*R\$\s*([\d.,]+)/i)
      || texto.match(/V[oº°]\.\s*Im[oó]vel\s*nesta\s*data[^R\n]*R\$\s*([\d.,]+)/i)
      || texto.match(/Valor\s*Total[:\s]*R\$\s*([\d.,]+)/i);
    if (valImovelM) setAuto('valorImovel', 'R$ ' + valImovelM[1].trim());

    const finM = texto.match(/Valor\s*L[ií]quido\s*do\s*Principal[:\s]*R\$\s*([\d.,]+)/i)
      || texto.match(/4\.1\.4[^R\n]*R\$\s*([\d.,]+)/is)
      || texto.match(/Financiamento\s*Habitacional[^R\n]*R\$\s*([\d.,]+)/i)
      || texto.match(/valor\s*financiado[^R\n]*R\$\s*([\d.,]+)/i);
    if (finM) { setAuto('valorFinanciado', 'R$ ' + finM[1].trim()); calcularPctFinanciado(); }

    const saldoM = texto.match(/4\.1\.2[^R\n]*R\$\s*([\d.,]+)/is);
    if (saldoM) setAuto('saldoCarteira', 'R$ ' + saldoM[1].trim());

    const qtdEmcashM = texto.match(/Quantidade\s*de\s*Parcelas[:\s]*(\d+)/i);
    if (qtdEmcashM) setAuto('qtdParcelas', qtdEmcashM[1]);

    AppState.obraPronta = /por se tratar de obra conclu[ií]da/i.test(texto);
    const entM = texto.match(/5\.1[^:]*:\s*(\d{2}\/\d{2}\/\d{4})/i)
      || texto.match(/Previs[aã]o\s*para\s*(?:a\s*)?entrega\s*das\s*chaves[:\s]*(\d{2}\/\d{2}\/\d{4})/i);

    const parcelas = extrairParcelas(texto, tipo);
    AppState.parcelasTodas = parcelas;

    if (!qtdEmcashM && parcelas.length) {
      const max = Math.max(...parcelas.map(p => p.num));
      setAuto('qtdParcelas', max.toString());
    }

    if (AppState.obraPronta) {
      setAutoData('dataEntrega', 'Obra já entregue');
      AppState.dataEntregaISO = null;
      calcularPsaPsb(parcelas, null, true);
      buscarPrimeiraParcela(parcelas);
    } else if (entM) {
      setAutoData('dataEntrega', entM[1]);
      const [d, m, a] = entM[1].split('/').map(Number);
      AppState.dataEntregaISO = new Date(a, m - 1, d);
      calcularPsaPsb(parcelas, AppState.dataEntregaISO, false);
      buscarParcelaPosEntrega(parcelas, entM[1]);
    } else if (tipo === 'EMCASH') {
      setAutoData('dataEntrega', 'Verificar manualmente');
      const primM = texto.match(/Valor\s*da\s*Primeira\s*Parcela[:\s]*R\$\s*([\d.,]+)/i);
      if (primM) setAuto('parcelaMRV', 'R$ ' + primM[1].trim() + ' (1ª parcela Emcash)');
      else if (parcelas.length) buscarPrimeiraParcela(parcelas);
      AppState.psbQtd = parcelas.length;
      AppState.psbSaldo = parcelas.reduce((s, p) => s + p.valorNum, 0);
      AppState.parcelasPSB = parcelas;
      document.getElementById('psaQtd').textContent = '—';
      document.getElementById('psaSaldo').textContent = '—';
      document.getElementById('psbQtd').textContent = AppState.psbQtd + ' parcelas';
      document.getElementById('psbSaldo').textContent = AppState.psbSaldo > 0 ? formatMoeda(AppState.psbSaldo) : '—';
      document.getElementById('psaPsbWrap').classList.remove('hidden');
    }

    if (tipo !== 'EMCASH') {
      extrairEntrada(texto);
      extrairIntermediarias(texto);
      renderizarPlano();
    }
  } catch (e) {
    console.error('Erro na extração:', e);
    mostrarStatus('⚠️ Leitura parcial do contrato. Verifique os dados.', 'error');
  }
}

function extrairParcelas(texto, tipo) {
  const map = new Map();
  if (tipo === 'EMCASH') {
    const regexEmcash = /(\d{1,3})\s+(\d{2}\/\d{2}\/\d{4})\s+R\$([\d.,]+)\s+R\$([\d.,]+)\s+R\$([\d.,]+)/g;
    let m;
    while ((m = regexEmcash.exec(texto)) !== null) {
      const num = parseInt(m[1]); const vencStr = m[2]; const valorNum = parseMoeda(m[6] || m[5]);
      const [vd, vm, va] = vencStr.split('/').map(Number);
      const venc = new Date(va, vm - 1, vd);
      const key = num + '_' + vencStr;
      if (!map.has(key)) map.set(key, { num, valor: m[5], valorNum, vencStr, venc });
    }
  } else if (tipo === 'BPM') {
    const regexBPM = /\b(\d{1,2})\s+([\d]{1,3}[.,][\d]{2})\s+(\d{2}\/\d{2}\/\d{4})/g;
    const regexBPMcomRS = /\b(\d{1,3})\s+R\$\s+([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4})/g;
    let m;
    while ((m = regexBPM.exec(texto)) !== null) {
      const num = parseInt(m[1]); const valStr = m[2]; const vencStr = m[3];
      const valorNum = parseMoeda(valStr);
      if (valorNum < 10) continue;
      const [vd, vm, va] = vencStr.split('/').map(Number);
      const venc = new Date(va, vm - 1, vd);
      const key = num + '_' + vencStr;
      if (!map.has(key)) map.set(key, { num, valor: valStr, valorNum, vencStr, venc });
    }
    while ((m = regexBPMcomRS.exec(texto)) !== null) {
      const num = parseInt(m[1]); const valStr = m[2]; const vencStr = m[3];
      const valorNum = parseMoeda(valStr);
      const [vd, vm, va] = vencStr.split('/').map(Number);
      const venc = new Date(va, vm - 1, vd);
      const key = num + '_' + vencStr;
      if (!map.has(key)) map.set(key, { num, valor: valStr, valorNum, vencStr, venc });
    }
  } else {
    const regexOIC = /\b(\d{1,3})\s+R\$\s+([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4})/g;
    let m;
    while ((m = regexOIC.exec(texto)) !== null) {
      const num = parseInt(m[1]); const valStr = m[2]; const vencStr = m[3];
      const valorNum = parseMoeda(valStr);
      const [vd, vm, va] = vencStr.split('/').map(Number);
      const venc = new Date(va, vm - 1, vd);
      const key = vencStr;
      if (!map.has(key) || num < map.get(key).num) map.set(key, { num, valor: valStr, valorNum, vencStr, venc });
    }
  }
  return [...map.values()].sort((a, b) => a.venc - b.venc || a.num - b.num);
}

function extrairDadosCaixa(texto) {
  try {
    const avalM = texto.match(/Valor\s*de\s*Avalia[çc][aã]o[:\s]*R\$\s*([\d.,]+)/i) || texto.match(/Valor\s*do\s*Im[oó]vel[:\s]*R\$\s*([\d.,]+)/i);
    if (avalM) setAutoCaixa('valorAvaliacao', 'R$ ' + avalM[1].trim());

    const rendaM = texto.match(/Renda\s*Familiar[:\s]*R\$\s*([\d.,]+)/i)
      || texto.match(/Renda\s*Bruta[:\s]*R\$\s*([\d.,]+)/i)
      || texto.match(/Renda\s*Individual[:\s]*R\$\s*([\d.,]+)/i)
      || texto.match(/Renda\s*Familiar[:\s]*([\d.,]+)/i)
      || texto.match(/Renda[:\s]*R\$\s*([\d.,]+)/i);
    if (rendaM) {
      const rendaVal = parseMoeda(rendaM[1]);
      setAutoCaixa('renda', 'R$ ' + rendaM[1].trim());
      calcularTetoFaixa(rendaVal);
    }

    let parcelaVal = 0;
    const padroesParcela = [
      /1[aª]\s*Presta[çc][aã]o[:\s]*R?\$?\s*([\d.,]+)/i,
      /Presta[çc][aã]o\s*mensal[:\s]*R?\$?\s*([\d.,]+)/i,
      /Valor\s*da\s*Presta[çc][aã]o[:\s]*R?\$?\s*([\d.,]+)/i,
      /Primeira\s*Presta[çc][aã]o\s*R\$\s*([\d.,]+)/i,
      /Primeira\s*Presta[çc][aã]o[\s\S]{0,120}?R\$\s*([\d.,]+)/i,
      /Presta[çc][aã]o\s*M[aá]xima[^R]*R\$\s*([\d.,]+)/i,
      /Presta[çc][aã]o\s*M[aá]xima[^:]*:[:\s]*R?\$?\s*([\d.,]+)/i,
      /Componentes\s*da\s*presta[çc][aã]o[\s\S]{0,400}?TOTAL[:\s]*R\$\s*([\d.,]+)/i,
    ];
    for (const regex of padroesParcela) {
      const m = texto.match(regex);
      if (m) { const val = parseMoeda(m[1]); if (val > 50) { parcelaVal = val; break; } }
    }
    if (!parcelaVal) {
      const blocoM = texto.match(/Presta[çc][aã]o[\s\S]{0,300}/i);
      if (blocoM) {
        const valM = blocoM[0].match(/R\$\s*([\d.,]+)/);
        if (valM) { const val = parseMoeda(valM[1]); if (val > 50) parcelaVal = val; }
      }
    }
    if (parcelaVal > 0) setAutoCaixa('parcelaCaixa', formatMoeda(parcelaVal));
    renderizarPlano();
  } catch (e) { console.error('Erro ao ler simulação Caixa:', e); }
}

// =========================================================================
//   7. LÓGICA DE NEGÓCIO, INTERMEDIÁRIAS E CÁLCULOS FINANCEIROS (CONTRATO)
// =========================================================================
function calcularPsaPsb(parcelas, dataEntrega, obraPronta) {
  AppState.psaQtd = 0; AppState.psaSaldo = 0; AppState.psbQtd = 0; AppState.psbSaldo = 0; AppState.parcelasPSB = [];
  if (obraPronta) {
    for (const p of parcelas) { AppState.psbQtd++; AppState.psbSaldo += p.valorNum; AppState.parcelasPSB.push(p); }
  } else {
    const m = dataEntrega.getMonth(), a = dataEntrega.getFullYear();
    const inicioPSB = new Date(m === 11 ? a + 1 : a, (m + 1) % 12, 1);
    for (const p of parcelas) {
      if (p.venc < inicioPSB) { AppState.psaQtd++; AppState.psaSaldo += p.valorNum; }
      else { AppState.psbQtd++; AppState.psbSaldo += p.valorNum; AppState.parcelasPSB.push(p); }
    }
  }
  document.getElementById('psaQtd').textContent = AppState.psaQtd > 0 ? AppState.psaQtd + ' parcelas' : '—';
  document.getElementById('psaSaldo').textContent = AppState.psaSaldo > 0 ? formatMoeda(AppState.psaSaldo) : '—';
  document.getElementById('psbQtd').textContent = AppState.psbQtd > 0 ? AppState.psbQtd + ' parcelas' : '—';
  document.getElementById('psbSaldo').textContent = AppState.psbSaldo > 0 ? formatMoeda(AppState.psbSaldo) : '—';
  document.getElementById('psaPsbWrap').classList.remove('hidden');
}

function buscarParcelaPosEntrega(parcelas, dataStr) {
  const [d, m, a] = dataStr.split('/').map(Number);
  let mesBusca = m + 1, anoBusca = a;
  if (mesBusca > 12) { mesBusca = 1; anoBusca++; }
  const inicioBusca = new Date(anoBusca, mesBusca - 1, 1);
  const encontrada = parcelas.find(p => p.venc >= inicioBusca);
  if (encontrada) {
    setAuto('parcelaMRV', 'R$ ' + encontrada.valor + ' (Mensal ' + encontrada.num + ' — venc. ' + encontrada.vencStr + ')');
  } else {
    setAuto('parcelaMRV', 'R$ 0,00 (Sem mensais após entrega)');
    alert('ℹ️ AVISO: Nenhuma parcela MRV mensal encontrada após a data de entrega informada.\n\nO campo foi preenchido com R$ 0,00. Verifique se o cliente quitou o saldo, se comprou à vista, ou se há erro na data de entrega.');
  }
}

function buscarPrimeiraParcela(parcelas) {
  if (!parcelas.length) {
    setAuto('parcelaMRV', 'R$ 0,00 (Sem parcelas)');
    alert('ℹ️ AVISO: Nenhuma parcela encontrada no contrato.\n\nO campo foi preenchido com R$ 0,00. Verifique se o cliente quitou o saldo ou se a compra foi à vista.');
    return;
  }
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const futura = parcelas.find(p => p.venc >= hoje);
  const p = futura || parcelas[0];
  setAuto('parcelaMRV', 'R$ ' + p.valor + ' (Mensal ' + p.num + ' — venc. ' + p.vencStr + ')');
}

function calcularPctFinanciado() {
  const fin = parseMoeda(document.getElementById('valorFinanciado').value);
  const imo = parseMoeda(document.getElementById('valorImovel').value);
  if (!fin || !imo) return;
  const pct = (fin / imo) * 100;
  const wrap = document.getElementById('financiadoWrap');
  const badge = document.getElementById('financiadoBadge');
  document.getElementById('pctFinanciadoDisplay').textContent = pct.toFixed(2).replace('.', ',') + ' %';
  wrap.style.display = 'flex';
  if (pct < 75) { wrap.className = 'financiado-wrap fin-verde'; badge.className = 'financiado-badge ok'; badge.textContent = '✔ Desconto disponível'; }
  else if (pct < 80) { wrap.className = 'financiado-wrap fin-amarelo'; badge.className = 'financiado-badge aviso'; badge.textContent = '⚠ Margem reduzida para desconto'; }
  else { wrap.className = 'financiado-wrap fin-vermelho'; badge.className = 'financiado-badge nok'; badge.textContent = '✘ Limite atingido — sem desconto'; }
}

function calcularTetoFaixa(renda) {
  const faixaBox = document.getElementById('faixaInfoBox');
  const faixaDetalhe = document.getElementById('faixaDetalhe');
  faixaBox.style.display = 'block';
  if (renda <= 5000) {
    setAutoCaixa('tetoFaixa', 'R$ 275.000,00');
    faixaDetalhe.innerHTML = '<strong>Faixa 1 / 2</strong> — Renda até R$ 5.000,00 → Teto: <strong>R$ 275.000,00</strong>';
  } else {
    setAutoCaixa('tetoFaixa', 'R$ 400.000,00');
    faixaDetalhe.innerHTML = '<strong>Faixa 3</strong> — Renda acima de R$ 5.000,00 → Teto: <strong>R$ 400.000,00</strong>';
  }
}

function extrairEntrada(texto) {
  AppState.entrada = { total: 0, pct: '', parcelas: [] };
  const blocoM = texto.match(/4\.1\.1[\s\S]*?(?=4\.1\.2)/i);
  if (!blocoM) return;
  const bloco = blocoM[0];

  const totalM = bloco.match(/R\$\s*([\d.,]+)/);
  if (totalM) AppState.entrada.total = parseMoeda(totalM[1]);

  const pctM = bloco.match(/(\d{1,3}[,.]?\d{0,4})\s*%/);
  if (pctM) AppState.entrada.pct = pctM[1].replace('.', ',') + ' %';

  const partesForma = bloco.split(/seguinte\s*forma\s*:/i);
  const textoParcelas = partesForma.length > 1 ? partesForma.slice(1).join(' ') : bloco.replace(/4\.1\.1[^R]*R\$\s*[\d.,]+\s*(?:\([^)]*\))?/i, '');
  AppState.entrada.parcelas = extrairParcelasBloco(textoParcelas);
}

function extrairIntermediarias(texto) {
  AppState.intermediarias = [];
  const blocoM = texto.match(/4\.1\.3[\s\S]*?(?=4\.1\.4|5\s*[-–.)]\s*DA\s*ENTREGA|$)/i);
  if (!blocoM) return;
  const bloco = blocoM[0];

  const subgrupos = [...bloco.matchAll(/4\.1\.3\.(\d+)([\s\S]*?)(?=4\.1\.3\.\d|$)/gi)];
  if (subgrupos.length > 0) {
    for (const sg of subgrupos) {
      const textoSub = sg[2];
      const totalM = textoSub.match(/R\$\s*([\d.,]+)/);
      const total = totalM ? parseMoeda(totalM[1]) : 0;
      const partesForma = textoSub.split(/seguinte\s*forma\s*:/i);
      const textoParcelas = partesForma.length > 1 ? partesForma.slice(1).join(' ') : textoSub.replace(/^[^R]*R\$\s*[\d.,]+\s*(?:\([^)]*\))?/i, '');
      AppState.intermediarias.push({
        grupo: parseInt(sg[1]),
        total,
        parcelas: extrairParcelasBloco(textoParcelas)
      });
    }
  } else {
    const totalM = bloco.match(/R\$\s*([\d.,]+)/);
    const total = totalM ? parseMoeda(totalM[1]) : 0;
    const partesForma = bloco.split(/seguinte\s*forma\s*:/i);
    const textoParcelas = partesForma.length > 1 ? partesForma.slice(1).join(' ') : bloco.replace(/4\.1\.3[^R]*R\$\s*[\d.,]+\s*(?:\([^)]*\))?/i, '');
    const parcelas = extrairParcelasBloco(textoParcelas);
    if (total > 0 || parcelas.length > 0) AppState.intermediarias.push({ grupo: 1, total, parcelas });
  }
}

function formatarPeriodicidadeLabel(perRaw, qtd) {
  if (!perRaw) return qtd > 1 ? 'Periódica' : 'Única';
  const p = perRaw.toLowerCase();
  if (p.startsWith('anual')) return 'Anual';
  if (p.startsWith('semestral')) return 'Semestral';
  if (p.startsWith('trimestral')) return 'Trimestral';
  if (p.startsWith('bimestral')) return 'Bimestral';
  if (p.startsWith('mensal')) return 'Mensal';
  return 'Única';
}

function extrairParcelasBloco(textoBloco) {
  const parcelas = [];
  if (!textoBloco) return parcelas;
  const limpo = textoBloco.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');

  const regexAto = /(?:^|\s|e\s+)R\$\s*([\d.,]+)\s*(?:\([^)]*\))?\s*pag[oa]s?\s*neste\s*ato(?:\s*atrav[eé]s\s*do\s*documento\s*de\s*cr[eé]dito\s*denominado\s*(CARTA\s*DE\s*CR[EÉ]DITO))?/gi;
  let mAto;
  while ((mAto = regexAto.exec(limpo)) !== null) {
    const valor = parseMoeda(mAto[1]);
    const isCC = !!mAto[2] || /carta\s*de\s*cr[eé]dito/i.test(mAto[0]);
    if (valor > 0) {
      parcelas.push({
        qtd: 1, valor,
        venc: isCC ? 'No ato (Carta de Crédito)' : 'Pago no ato',
        vencData: null, periodicidade: 'Ato',
        resumoVenc: isCC ? 'No ato (Carta de Crédito)' : 'Pago no ato'
      });
    }
  }

  const regexPadrao = /(\d+)\s*(?:\([^)]*\))?\s*parcela(?:\(s\)|s)?\s*(?:mensais\s*|anuais\s*|semestrais\s*)?(?:no\s*valor\s*de|de)\s*R\$\s*([\d.,]+)\s*(?:\([^)]*\))?[\s,]*venc[ií]ve(?:l|is)\s*(?:(anualmente|semestralmente|trimestralmente|bimestralmente|mensalmente)\s*)?(?:a\s*partir\s*de|em|dia)?\s*(\d{2}\/\d{2}\/\d{4})/gi;
  let m;
  while ((m = regexPadrao.exec(limpo)) !== null) {
    const qtd = parseInt(m[1]) || 1;
    const valor = parseMoeda(m[2]);
    const perRaw = m[3] || '';
    const dataStr = m[4];
    const periodicidade = formatarPeriodicidadeLabel(perRaw, qtd);
    const resumoVenc = qtd > 1 ? `${periodicidade} (a partir de ${dataStr})` : dataStr;

    if (valor > 0) {
      parcelas.push({ qtd, valor, venc: dataStr, vencData: dataStr, periodicidade, resumoVenc });
    }
  }

  if (parcelas.length === 0) {
    const regexSimples = /R\$\s*([\d.,]+)\s*(?:\([^)]*\))?\s*(?:venc[ií]ve(?:l|is)[^0-9\/]*)?(\d{2}\/\d{2}\/\d{4})/gi;
    while ((m = regexSimples.exec(limpo)) !== null) {
      const valor = parseMoeda(m[1]);
      const dataStr = m[2];
      if (valor > 0) {
        parcelas.push({ qtd: 1, valor, venc: dataStr, vencData: dataStr, periodicidade: 'Única', resumoVenc: dataStr });
      }
    }
  }
  return parcelas;
}

function obterParcelaMrvNoMes(vencStr, mrvFallback) {
  if (!vencStr || !/\d{2}\/\d{2}\/\d{4}/.test(vencStr)) return { valor: mrvFallback, origem: 'Parcela PSB base' };
  const [, mes, ano] = vencStr.split('/').map(Number);
  const encontrada = AppState.parcelasTodas.find(p => {
    return (p.venc.getMonth() + 1) === mes && p.venc.getFullYear() === ano;
  });
  if (encontrada) return { valor: encontrada.valorNum, origem: `Mensal #${encontrada.num} (${encontrada.vencStr})` };
  return { valor: mrvFallback, origem: 'Parcela MRV base' };
}

function analisarIntermediariasGrupo1(renda, caixa, mrvFallback) {
  AppState.intermCriticasG1 = [];
  if (!renda || renda <= 0) return [];

  const grupo1 = AppState.intermediarias.find(g => g.grupo === 1);
  if (!grupo1 || !grupo1.parcelas || !grupo1.parcelas.length) return [];

  for (const p of grupo1.parcelas) {
    const pctIntermRenda = (p.valor / renda) * 100;
    if (pctIntermRenda >= 50) {
      const dataRef = p.vencData || p.venc;
      const mrvMesObj = obterParcelaMrvNoMes(dataRef, mrvFallback);
      const totalMesPico = p.valor + caixa + mrvMesObj.valor;
      const pctTotalMesPico = (totalMesPico / renda) * 100;

      const qtd = p.qtd || 1;
      const tipoLabel = qtd > 1 ? `1. Interm. G1 (${qtd}x ${p.periodicidade})` : `1. Interm. Grupo 1`;
      const vencExibicao = qtd > 1 ? `${p.resumoVenc} — ${qtd}x de ${formatMoeda(p.valor)}` : (p.resumoVenc || p.venc);

      AppState.intermCriticasG1.push({
        qtd, venc: vencExibicao, tipoLabel,
        valorInterm: p.valor, pctIntermRenda,
        valorCaixa: caixa, labelCaixa: '2. Parcela Caixa',
        valorMrvMes: mrvMesObj.valor, origemMrvMes: mrvMesObj.origem,
        totalMesPico, pctTotalMesPico
      });
    }
  }
  return AppState.intermCriticasG1;
}

function atualizarDestaquesPlano() {
  if (AppState.intermediarias.length > 0 || AppState.entrada.total > 0) renderizarPlano();
}

function renderizarPlano() {
  const wrap = document.getElementById('planoWrap'); const body = document.getElementById('planoBody');
  const temEntrada = AppState.entrada.total > 0 || AppState.entrada.parcelas.length > 0;
  const temInter = AppState.intermediarias.length > 0;
  if (!temEntrada && !temInter) { wrap.style.display = 'none'; return; }

  wrap.style.display = 'block';
  const valorImovel = parseMoeda(document.getElementById('valorImovel').value);
  const rendaAtual = parseMoeda(document.getElementById('renda').value);
  let html = '';

  if (temEntrada) {
    const totalStr = AppState.entrada.total > 0 ? formatMoeda(AppState.entrada.total) : '—';
    let pctStr = '';
    if (AppState.entrada.pct) pctStr = `<span class="plano-badge-pct">${sanitizarTexto(AppState.entrada.pct)}</span>`;
    else if (valorImovel > 0 && AppState.entrada.total > 0) {
      const pctCalc = ((AppState.entrada.total / valorImovel) * 100).toFixed(2).replace('.', ',');
      pctStr = `<span class="plano-badge-pct">${pctCalc} %</span>`;
    }
    html += `<div class="plano-secao open" id="secaoEntrada"><div class="plano-secao-titulo" data-secao="secaoEntrada"><span class="ps-esq">💰 Entrada</span><span class="ps-dir"><span class="plano-badge-total">${totalStr}</span>${pctStr}<span class="plano-chevron">▼</span></span></div><div class="plano-conteudo"><ul class="entrada-lista">`;
    if (AppState.entrada.parcelas.length > 0) {
      AppState.entrada.parcelas.forEach((p, i) => {
        const u = i === AppState.entrada.parcelas.length - 1;
        const qtd = p.qtd || 1;
        const valLabel = qtd > 1 ? `${qtd}x de ${formatMoeda(p.valor)}` : formatMoeda(p.valor);
        const vencLabel = p.resumoVenc || p.venc;
        html += `<li><span class="el-num">${u ? '└' : '├'}</span><span class="el-val">${valLabel}</span><span class="el-venc">📅 ${sanitizarTexto(vencLabel)}</span></li>`;
      });
    } else {
      html += `<li class="hint-text">Parcelas da entrada não identificadas individualmente.</li>`;
    }
    html += `</ul></div></div>`;
  }

  const totalInter = AppState.intermediarias.reduce((s, g) => s + g.total, 0);
  let pctInterStr = '';
  if (valorImovel > 0 && totalInter > 0) {
    const pctCalc = ((totalInter / valorImovel) * 100).toFixed(2).replace('.', ',');
    pctInterStr = `<span class="plano-badge-pct roxo">${pctCalc} %</span>`;
  }
  html += `<div class="plano-secao open" id="secaoInter"><div class="plano-secao-titulo" data-secao="secaoInter"><span class="ps-esq">🔀 Intermediárias</span><span class="ps-dir"><span class="plano-badge-total">${totalInter > 0 ? formatMoeda(totalInter) : '—'}</span>${pctInterStr}<span class="plano-chevron">▼</span></span></div><div class="plano-conteudo">`;
  if (!temInter) {
    html += `<p class="sem-intermediarias">ℹ️ Não há intermediárias neste contrato.</p>`;
  } else {
    AppState.intermediarias.forEach(g => {
      let pctGrupoStr = '';
      if (valorImovel > 0 && g.total > 0) {
        const pctG = ((g.total / valorImovel) * 100).toFixed(2).replace('.', ',');
        pctGrupoStr = `<span class="plano-badge-pct roxo">${pctG} %</span>`;
      }
      html += `<div class="grupo-wrap"><div class="grupo-titulo"><span>📦 Grupo ${g.grupo}</span><span class="gt-total">${pctGrupoStr}${g.total > 0 ? formatMoeda(g.total) : '—'}</span></div>`;
      if (g.parcelas.length > 0) {
        g.parcelas.forEach((p, i) => {
          const u = i === g.parcelas.length - 1;
          const qtd = p.qtd || 1;
          const valLabel = qtd > 1 ? `${qtd}x de ${formatMoeda(p.valor)}` : formatMoeda(p.valor);
          const vencLabel = p.resumoVenc || p.venc;

          const pctRenda = rendaAtual > 0 ? (p.valor / rendaAtual) * 100 : 0;
          const isCriticaG1 = (g.grupo === 1 && pctRenda >= 50);
          const rowClass = isCriticaG1 ? 'grupo-row critica' : 'grupo-row';
          const badgeCritica = isCriticaG1 ? `<span class="tag-interm-critica">🚨 ${pctRenda.toFixed(1).replace('.', ',')}% da Renda${qtd > 1 ? ' (cada)' : ''}</span>` : '';

          html += `<div class="${rowClass}"><span class="el-num">${u ? '└' : '├'}</span><span class="gr-val">${valLabel}</span>${badgeCritica}<span class="gr-venc">📅 ${sanitizarTexto(vencLabel)}</span></div>`;
        });
      } else {
        html += `<div class="hint-text">Parcelas não identificadas individualmente.</div>`;
      }
      html += `</div>`;
    });
  }
  html += `</div></div>`;
  body.innerHTML = html;
}

function toggleSecao(id) { const el = document.getElementById(id); if (el) el.classList.toggle('open'); }

function aplicarStatusUnificado(num, pct, temIntermCriticaG1) {
  const unif = document.getElementById('compUnif' + num);
  const icon = document.getElementById('compIcon' + num);
  const text = document.getElementById('compText' + num);
  const sub = document.getElementById('compSub' + num);
  const bar = document.getElementById(num === 1 ? 'progressBar' : 'progressBarMedia');
  const msgBox = document.getElementById('msgAvaliacao' + num);

  const tetoMax = AppState.tetoTotalPct;
  const tetoAtencao = tetoMax + 2;
  const escalaFim = tetoMax * 2;

  const lblMeio = document.getElementById('labelMeioBarra' + num);
  const lblFim = document.getElementById('labelFimBarra' + num);
  if (lblMeio) lblMeio.textContent = `${tetoMax.toString().replace('.', ',')}% ✔`;
  if (lblFim) lblFim.textContent = `${escalaFim.toString().replace('.', ',')}%+`;

  let classe, iconeTxt, textoTxt, barClasse, subTxt = '';

  if (pct <= tetoMax) {
    if (temIntermCriticaG1) {
      classe = 'atencao'; iconeTxt = '⚠️'; textoTxt = 'ATENÇÃO'; barClasse = 'amarelo';
      subTxt = 'Alerta Intermediária G1';
      if (msgBox) msgBox.classList.remove('hidden');
    } else {
      classe = 'aprovado'; iconeTxt = '✔'; textoTxt = 'APROVADO'; barClasse = 'verde';
      if (msgBox) msgBox.classList.add('hidden');
    }
  } else if (pct <= tetoAtencao) {
    classe = 'atencao'; iconeTxt = '⚠'; textoTxt = 'ATENÇÃO'; barClasse = 'amarelo';
    if (temIntermCriticaG1) subTxt = 'Teto + Intermediária G1';
    if (msgBox) msgBox.classList.remove('hidden');
  } else {
    classe = 'reprovado'; iconeTxt = '✘'; textoTxt = 'REPROVADO'; barClasse = 'vermelho';
    if (temIntermCriticaG1) subTxt = '+ Alerta Interm. G1';
    if (msgBox) msgBox.classList.add('hidden');
  }

  if (num === 2) {
    unif.className = 'comprom-unified secundario';
    const side = document.getElementById('compStatus' + num);
    side.style.background = classe === 'aprovado' ? 'var(--verde-claro)' : classe === 'atencao' ? 'var(--amarelo-claro)' : 'var(--vermelho-claro)';
    side.style.borderColor = classe === 'aprovado' ? 'var(--verde)' : classe === 'atencao' ? 'var(--amarelo)' : 'var(--vermelho)';
    side.style.color = classe === 'aprovado' ? 'var(--verde)' : classe === 'atencao' ? 'var(--amarelo-medio)' : 'var(--vermelho)';
  } else {
    unif.className = 'comprom-unified ' + classe;
  }
  icon.textContent = iconeTxt;
  text.textContent = textoTxt;
  if (sub) {
    if (subTxt) { sub.textContent = subTxt; sub.classList.remove('hidden'); }
    else { sub.classList.add('hidden'); }
  }
  if (bar) {
    bar.className = 'progress-bar ' + barClasse;
    bar.style.width = Math.min((pct / escalaFim) * 100, 100) + '%';
  }
  return textoTxt;
}

function renderizarBannerPicoMensal(bannerId, countId, listId, criticas) {
  const banner = document.getElementById(bannerId);
  const countEl = document.getElementById(countId);
  const listEl = document.getElementById(listId);

  if (!criticas || criticas.length === 0) {
    banner.style.display = 'none';
    listEl.innerHTML = '';
    return;
  }

  banner.style.display = 'block';
  const totalParcelasCriticas = criticas.reduce((acc, c) => acc + (c.qtd || 1), 0);
  countEl.textContent = `${totalParcelasCriticas} parcela(s) crítica(s)`;

  listEl.innerHTML = criticas.map(c => `
    <div class="interm-pico-card">
      <div class="interm-pico-top">
        <div class="interm-pico-date">
          <span>📅 ${sanitizarTexto(c.venc)}</span>
          <span class="interm-pico-ref">(MRV ref.: ${sanitizarTexto(c.origemMrvMes)})</span>
        </div>
        <div class="interm-pico-badges">
          <span class="badge-critico">Parcela: ${c.pctIntermRenda.toFixed(1).replace('.', ',')}% da Renda</span>
          <span class="badge-soma-mes">Soma Mês: ${c.pctTotalMesPico.toFixed(1).replace('.', ',')}% da Renda</span>
        </div>
      </div>
      <div class="interm-pico-grid">
        <div class="interm-pico-col">
          <span>${sanitizarTexto(c.tipoLabel)}</span>
          <strong class="critico">${formatMoeda(c.valorInterm)}</strong>
        </div>
        <div class="interm-pico-col">
          <span>${sanitizarTexto(c.labelCaixa)}</span>
          <strong>${formatMoeda(c.valorCaixa)}</strong>
        </div>
        <div class="interm-pico-col">
          <span>3. Parcela MRV Mês</span>
          <strong>${formatMoeda(c.valorMrvMes)}</strong>
        </div>
        <div class="interm-pico-col total-mes">
          <span>Soma do Mês vs Renda</span>
          <strong>${formatMoeda(c.totalMesPico)} (${c.pctTotalMesPico.toFixed(1).replace('.', ',')}%)</strong>
        </div>
      </div>
    </div>
  `).join('');
}

function calcular(e) {
  if (e && e.preventDefault) e.preventDefault();

  const caixa = parseMoeda(document.getElementById('parcelaCaixa').value);
  const mrvStr = document.getElementById('parcelaMRV').value || '';
  const mrvMatch = mrvStr.match(/R\$\s*([\d.]+,\d{2})/);
  const mrv = mrvMatch ? parseMoeda(mrvMatch[1]) : parseMoeda(mrvStr);
  const renda = parseMoeda(document.getElementById('renda').value);

  const erros = [];
  if (!renda) erros.push('• Renda do Cliente (carregue a Simulação Caixa)');
  if (mrvStr.trim() === '') erros.push('• Parcela MRV/Emcash (carregue o Contrato ou digite 0)');
  if (!caixa && document.getElementById('parcelaCaixa').value.trim() === '') erros.push('• Parcela Caixa (carregue a Simulação Caixa)');

  if (erros.length) {
    alert('⚠️ Os seguintes campos estão vazios:\n\n' + erros.join('\n') + '\n\nSe os campos estiverem preenchidos, tente digitar os valores manualmente.');
    return;
  }

  renderizarPlano();

  const criticasG1 = analisarIntermediariasGrupo1(renda, caixa, mrv);
  const temIntermCriticaG1 = criticasG1.length > 0;
  renderizarBannerPicoMensal('intermAlertBanner', 'intermAlertCount', 'intermAlertList', criticasG1);

  const total = caixa + mrv;
  const pct = (total / renda) * 100;

  const tetoTotal = AppState.tetoTotalPct;
  const tetoCaixa = AppState.tetoCaixaPct;
  const tetoMRV = AppState.tetoMrvPct;

  document.getElementById('headerTetoContrato1').textContent = `Teto Regional: ${tetoTotal.toString().replace('.', ',')}% (Caixa 30% + MRV ${tetoMRV.toString().replace('.', ',')}%)`;

  document.getElementById('res-caixa').textContent = formatMoeda(caixa);
  document.getElementById('res-mrv').textContent = formatMoeda(mrv);
  document.getElementById('res-total').textContent = formatMoeda(total);
  document.getElementById('res-renda').textContent = formatMoeda(renda);
  document.getElementById('res-pct').textContent = pct.toFixed(2).replace('.', ',') + ' %';

  if (AppState.psbQtd > 0 || AppState.psaQtd > 0) {
    document.getElementById('res-psa-saldo').textContent = AppState.psaSaldo > 0 ? formatMoeda(AppState.psaSaldo) : '—';
    document.getElementById('res-psa-qtd').textContent = AppState.psaQtd > 0 ? AppState.psaQtd + ' parcelas' : '—';
    document.getElementById('res-psb-saldo').textContent = AppState.psbSaldo > 0 ? formatMoeda(AppState.psbSaldo) : '—';
    document.getElementById('res-psb-qtd').textContent = AppState.psbQtd > 0 ? AppState.psbQtd + ' parcelas' : '—';
    document.getElementById('resPsaPsb').classList.remove('hidden');
  }

  aplicarStatusUnificado(1, pct, temIntermCriticaG1);
  let pctMedia = null;
  const mrvMedia = (AppState.psbQtd > 0 && AppState.psbSaldo > 0) ? (AppState.psbSaldo / AppState.psbQtd) : 0;

  if (mrvMedia > 0) {
    const totalMedia = caixa + mrvMedia;
    pctMedia = (totalMedia / renda) * 100;
    document.getElementById('res-pct-media').textContent = pctMedia.toFixed(2).replace('.', ',') + ' %';
    aplicarStatusUnificado(2, pctMedia, temIntermCriticaG1);
    document.getElementById('compUnif2').classList.remove('hidden');
    document.getElementById('progressWrapMedia').classList.remove('hidden');
    document.getElementById('progressLabelsMedia').classList.remove('hidden');
    document.getElementById('separadorMedia').classList.remove('hidden');
  } else {
    document.getElementById('compUnif2').classList.add('hidden');
    document.getElementById('progressWrapMedia').classList.add('hidden');
    document.getElementById('progressLabelsMedia').classList.add('hidden');
    document.getElementById('separadorMedia').classList.add('hidden');
  }

  const fin = parseMoeda(document.getElementById('valorFinanciado').value);
  const imo = parseMoeda(document.getElementById('valorImovel').value);
  const pctFin = (fin && imo) ? (fin / imo) * 100 : null;

  const ds = document.getElementById('descontoSection');
  const dt = document.getElementById('descontoTitulo');
  const dc = document.getElementById('descontoConteudo');
  ds.classList.remove('hidden');

  const limiteAbsolutoMRV = renda * (tetoMRV / 100);
  const limiteAbsolutoCaixa = renda * (tetoCaixa / 100);

  const pctMRV = (mrv / renda) * 100;
  const pctCaixa = (caixa / renda) * 100;

  const mrvIdeal = Math.max(0, limiteAbsolutoMRV);
  const reducaoNecessaria = Math.max(0, mrv - mrvIdeal);
  let descontoDisponivel = null;
  if (pctFin !== null && imo) descontoDisponivel = Math.max(0, ((80 - pctFin) / 100) * imo);

  let descontoEstimadoPSB = 0;
  if (reducaoNecessaria > 0 && AppState.parcelasPSB.length > 0 && mrv > 0) {
    const pctRed = reducaoNecessaria / mrv;
    for (const p of AppState.parcelasPSB) descontoEstimadoPSB += p.valorNum * pctRed;
  }

  let qtdParcelasIdeal = null;
  let qtdParcelasAtual = AppState.psbQtd || 0;
  if (mrvIdeal > 0 && AppState.psbSaldo > 0) qtdParcelasIdeal = Math.ceil(AppState.psbSaldo / mrvIdeal);

  const tetoTotalStr = tetoTotal.toString().replace('.', ',');
  const tetoMrvStr = tetoMRV.toString().replace('.', ',');

  if (pctFin !== null && pctFin >= 80) {
    ds.className = 'desconto-section bloqueado';
    dt.innerHTML = '🔒 Desconto bloqueado — limite de financiamento atingido (80%)';
    dc.innerHTML = `
      <div class="desconto-row"><span class="dr-label">% Financiado atual</span><span class="dr-val val-vermelho">${pctFin.toFixed(2).replace('.', ',')} %</span></div>
      <div class="desconto-row"><span class="dr-label">Limite máximo</span><span class="dr-val val-cinza">80,00 %</span></div>
      <div class="desconto-row"><span class="dr-label">Desconto disponível</span><span class="dr-val val-vermelho">R$ 0,00</span></div>
      <div class="projecao-aviso">🔒 O cliente atingiu o limite máximo de financiamento (80%). Para viabilizar desconto, o cliente precisaria aumentar o valor de entrada.</div>`;
  } else if (pct <= tetoTotal && pctMRV <= tetoMRV) {
    ds.className = 'desconto-section ok';
    dt.innerHTML = '✔ Cliente enquadrado nas parcelas mensais — dentro dos limites parametrizados';
    const margemMRV = limiteAbsolutoMRV - mrv;
    const margemCaixa = limiteAbsolutoCaixa - caixa;
    dc.innerHTML = `
      <div class="desconto-row"><span class="dr-label">Comprometimento total</span><span class="dr-val val-verde">${pct.toFixed(2).replace('.', ',')} % <small class="hint-text">(limite: ${tetoTotalStr}%)</small></span></div>
      <div class="desconto-row"><span class="dr-label">Comprometimento Caixa</span><span class="dr-val val-verde">${pctCaixa.toFixed(2).replace('.', ',')} % <small class="hint-text">(limite: 30%)</small></span></div>
      <div class="desconto-row"><span class="dr-label">Comprometimento MRV/Carteira</span><span class="dr-val val-verde">${pctMRV.toFixed(2).replace('.', ',')} % <small class="hint-text">(limite: ${tetoMrvStr}%)</small></span></div>
      <div class="desconto-row"><span class="dr-label">Margem disponível MRV</span><span class="dr-val val-verde">${formatMoeda(margemMRV)}</span></div>
      <div class="desconto-row"><span class="dr-label">Margem disponível Caixa</span><span class="dr-val val-verde">${formatMoeda(margemCaixa)}</span></div>
      ${descontoDisponivel > 0 ? `<div class="desconto-row"><span class="dr-label">Desconto máximo disponível (até 80%)</span><span class="dr-val val-verde">${formatMoeda(descontoDisponivel)}</span></div>` : ''}
      <div class="projecao-aviso">✅ Cliente dentro dos limites mensais: MRV ≤ ${tetoMrvStr}% e Caixa ≤ 30% da renda.${descontoDisponivel > 0 ? ' Há margem de desconto disponível caso necessário.' : ''}</div>`;
  } else {
    ds.className = 'desconto-section nok';
    const mrvEstourado = pctMRV > tetoMRV;
    const caixaEstourada = pctCaixa > 30;
    let tituloProblema = [];
    if (mrvEstourado) tituloProblema.push(`MRV/Carteira acima de ${tetoMrvStr}%`);
    if (caixaEstourada) tituloProblema.push('Caixa acima de 30%');
    dt.innerHTML = '⚠️ Desconto necessário — ' + tituloProblema.join(' · ');

    const clsPct = (val, lim) => val > lim ? 'val-vermelho' : 'val-verde';
    const iconePct = (val, lim) => val > lim ? '✘' : '✔';

    let html = `
      <div class="desconto-row"><span class="dr-label">Comprometimento total atual</span><span class="dr-val ${clsPct(pct, tetoTotal)}">${pct.toFixed(2).replace('.', ',')} % <small class="hint-text">(limite: ${tetoTotalStr}%)</small></span></div>
      <div class="desconto-row"><span class="dr-label">${iconePct(pctCaixa, 30)} Comprometimento Caixa</span><span class="dr-val ${clsPct(pctCaixa, 30)}">${pctCaixa.toFixed(2).replace('.', ',')} % <small class="hint-text">(limite: 30%)</small></span></div>
      <div class="desconto-row"><span class="dr-label">${iconePct(pctMRV, tetoMRV)} Comprometimento MRV/Carteira</span><span class="dr-val ${clsPct(pctMRV, tetoMRV)}">${pctMRV.toFixed(2).replace('.', ',')} % <small class="hint-text">(limite: ${tetoMrvStr}%)</small></span></div>`;

    if (mrvEstourado) {
      html += `
      <div class="desconto-divider"></div>
      <div class="desconto-row"><span class="dr-label">Parcela MRV/Emcash atual</span><span class="dr-val val-vermelho">${formatMoeda(mrv)}</span></div>
      <div class="desconto-row"><span class="dr-label">Parcela MRV ideal (≤ ${tetoMrvStr}% da renda)</span><span class="dr-val val-verde">${formatMoeda(mrvIdeal)}</span></div>
      <div class="desconto-row"><span class="dr-label">Redução necessária por parcela</span><span class="dr-val val-laranja">${formatMoeda(reducaoNecessaria)}</span></div>`;
      if (AppState.parcelasPSB.length > 0) {
        html += `<div class="desconto-row"><span class="dr-label">Parcelas PSB atuais</span><span class="dr-val val-roxo">${qtdParcelasAtual} parcelas</span></div>`;
        if (qtdParcelasIdeal !== null) {
          const diff = qtdParcelasIdeal - qtdParcelasAtual;
          const diffTxt = diff > 0 ? `<span class="val-laranja"> (+${diff} parcelas a mais)</span>` : diff < 0 ? `<span class="val-verde"> (${diff} parcelas a menos)</span>` : `<span class="val-verde"> (mesmo número)</span>`;
          html += `<div class="desconto-row"><span class="dr-label">💡 Parcelas que o contrato deveria ter</span><span class="dr-val val-azul">${qtdParcelasIdeal} parcelas ${diffTxt}</span></div>`;
        }
        html += `<div class="desconto-row"><span class="dr-label">💡 Desconto estimado no PSB</span><span class="dr-val val-laranja">${formatMoeda(descontoEstimadoPSB)}</span></div>`;
        if (descontoDisponivel !== null) {
          const coberto = descontoEstimadoPSB <= descontoDisponivel;
          html += `<div class="desconto-row"><span class="dr-label">Desconto máximo disponível (até 80%)</span><span class="dr-val ${coberto ? 'val-verde' : 'val-vermelho'}">${formatMoeda(descontoDisponivel)}</span></div>
                   <div class="desconto-row"><span class="dr-label">Desconto cobre o necessário?</span><span class="dr-val ${coberto ? 'val-verde' : 'val-vermelho'}">${coberto ? '✔ Sim' : '✘ Não'}</span></div>`;
        }
      }
    }
    if (caixaEstourada && !mrvEstourado) {
      html += `<div class="projecao-aviso borda-vermelha">⚠️ <strong>Parcela Caixa acima de 30% da renda.</strong> Este limite é controlado pela Caixa Econômica Federal — não é possível ajustar via desconto MRV.</div>`;
    } else {
      html += `<div class="projecao-aviso">📌 <strong>Projeção estimada.</strong> A redução por parcela é calculada proporcionalmente com base na parcela atual e no teto MRV de ${tetoMrvStr}%.</div>`;
    }
    dc.innerHTML = html;
  }

  const jaVisivel = document.getElementById('resultado').classList.contains('show');
  document.getElementById('resultado').className = 'resultado show';
  if (!jaVisivel) document.getElementById('resultado').scrollIntoView({ behavior: 'smooth' });
}

// =========================================================================
//   8. LÓGICA DE NEGÓCIO (SIMULAÇÃO DE PROPOSTA — CAPA/QUADRO-RESUMO E CRM)
// =========================================================================
function extrairDadosProposta(texto) {
  try {
    const isQuadroResumo = /QUADRO-RESUMO|4\.1\.1\s*[-–]?\s*Entrada|4\.1\.2\s*[-–]?\s*Mensais/i.test(texto);
    if (isQuadroResumo) extrairPropostaQuadroResumo(texto);
    else extrairPropostaCRM(texto);
  } catch (e) {
    console.error(e);
    mostrarStatusProp('⚠️ Leitura parcial da proposta.', 'error');
  }
}

function extrairPropostaQuadroResumo(texto) {
  const prodM = texto.match(/Produto[:\s]+([\s\S]+?)(?=CONT[-:\s]|1\.\s*PARTES|$)/i);
  if (prodM) {
    let prod = prodM[1].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    prod = prod.replace(/CONT[-\s][A-Z0-9\-]+.*/i, '').trim();
    let idxHifen = prod.indexOf(' - ');
    if (idxHifen === -1) idxHifen = prod.indexOf(' – ');
    if (idxHifen !== -1) {
      setAutoProp('prop-empreendimento', prod.substring(0, idxHifen).trim());
      let unid = prod.substring(idxHifen + 3).trim();
      unid = unid.replace(/\s*[-–]\s*(?:Rio de Janeiro|Maca[eé]|Campos dos Goytacazes|Belo Horizonte|São Paulo).*$/i, '').trim();
      setAutoProp('prop-unidade', unid);
    } else {
      setAutoProp('prop-empreendimento', prod);
      setAutoProp('prop-unidade', '—');
    }
  }

  const valImovelM = texto.match(/3\.2\s*[-–]?\s*PRE[ÇC]O\s*DO\s*IM[OÓ]VEL[^R\n]*R\$\s*([\d.,]+)/i)
    || texto.match(/3\s*[-–]?\s*VALOR\s*TOTAL\s*DA\s*OPERA[ÇC][AÃ]O[^R\n]*R\$\s*([\d.,]+)/i);
  if (valImovelM) {
    setAutoProp('prop-valorImovel', 'R$ ' + valImovelM[1].trim());
    setAutoProp('prop-valorProposta', 'R$ ' + valImovelM[1].trim());
  }

  const entM = texto.match(/4\.1\.1[^R\n]*R\$\s*([\d.,]+)/is);
  const entVal = entM ? parseMoeda(entM[1]) : 0;
  document.getElementById('rp-sinal').textContent = entVal > 0 ? formatMoeda(entVal) : 'R$ 0,00';

  const mensaisTotM = texto.match(/4\.1\.2[^R\n]*R\$\s*([\d.,]+)/is);
  const mensaisTotVal = mensaisTotM ? parseMoeda(mensaisTotM[1]) : 0;

  const finM = texto.match(/4\.1\.4[^R\n]*R\$\s*([\d.,]+)/is);
  document.getElementById('rp-financiado').textContent = finM ? 'R$ ' + finM[1].trim() : '—';

  const fgtsM = texto.match(/4\.1\.5\s*[-–]?\s*FGTS[:\s]*R\$\s*([\d.,]+)/i);
  document.getElementById('rp-fgts').textContent = fgtsM ? 'R$ ' + fgtsM[1].trim() : 'R$ 0,00';

  document.getElementById('rp-cupom').textContent = '—';
  document.getElementById('rp-subsidio').textContent = '—';

  const tipoCont = detectarTipoContrato(texto) === 'DESCONHECIDO' ? 'OIC' : detectarTipoContrato(texto);
  const mensaisLista = extrairParcelas(texto, tipoCont);

  let entradaParcelas = [];
  const blocoEntM = texto.match(/4\.1\.1[\s\S]*?(?=4\.1\.2)/i);
  if (blocoEntM) {
    const partesForma = blocoEntM[0].split(/seguinte\s*forma\s*:/i);
    const txtEnt = partesForma.length > 1 ? partesForma.slice(1).join(' ') : blocoEntM[0].replace(/4\.1\.1[^R]*R\$\s*[\d.,]+\s*(?:\([^)]*\))?/i, '');
    entradaParcelas = extrairParcelasBloco(txtEnt);
  }

  let intermGrupos = [];
  const blocoIntM = texto.match(/4\.1\.3[\s\S]*?(?=4\.1\.4|5\s*[-–.)]\s*DA\s*ENTREGA|$)/i);
  if (blocoIntM) {
    const subgrupos = [...blocoIntM[0].matchAll(/4\.1\.3\.(\d+)([\s\S]*?)(?=4\.1\.3\.\d|$)/gi)];
    if (subgrupos.length > 0) {
      for (const sg of subgrupos) {
        const totalM = sg[2].match(/R\$\s*([\d.,]+)/);
        const totalG = totalM ? parseMoeda(totalM[1]) : 0;
        const partesForma = sg[2].split(/seguinte\s*forma\s*:/i);
        const txtSub = partesForma.length > 1 ? partesForma.slice(1).join(' ') : sg[2].replace(/^[^R]*R\$\s*[\d.,]+\s*(?:\([^)]*\))?/i, '');
        intermGrupos.push({ grupo: parseInt(sg[1]), total: totalG, parcelas: extrairParcelasBloco(txtSub) });
      }
    } else {
      const totalM = blocoIntM[0].match(/R\$\s*([\d.,]+)/);
      const totalG = totalM ? parseMoeda(totalM[1]) : 0;
      const partesForma = blocoIntM[0].split(/seguinte\s*forma\s*:/i);
      const txtSub = partesForma.length > 1 ? partesForma.slice(1).join(' ') : blocoIntM[0].replace(/4\.1\.3[^R]*R\$\s*[\d.,]+\s*(?:\([^)]*\))?/i, '');
      intermGrupos.push({ grupo: 1, total: totalG, parcelas: extrairParcelasBloco(txtSub) });
    }
  }

  const g1 = intermGrupos.find(g => g.grupo === 1);
  const g2 = intermGrupos.find(g => g.grupo === 2);
  const totalG1 = g1 ? g1.total : 0;
  const totalG2 = g2 ? g2.total : 0;

  const carteiraTotal = mensaisTotVal + totalG1;
  document.getElementById('rp-carteira').textContent = carteiraTotal > 0 ? formatMoeda(carteiraTotal) : '—';
  document.getElementById('rp-bompag').textContent = totalG2 > 0 ? formatMoeda(totalG2) : 'R$ 0,00';
  document.getElementById('rp-qtdCarteira').textContent = mensaisLista.length > 0 ? mensaisLista.length + 'x' : '—';
  document.getElementById('resumoPropostaGrid').classList.remove('hidden');

  const entDataM = texto.match(/5\.1[^:]*:\s*(\d{2}\/\d{2}\/\d{4})/i)
    || texto.match(/Previs[aã]o\s*para\s*(?:a\s*)?entrega\s*das\s*chaves[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
  if (entDataM) {
    const campoEntrega = document.getElementById('prop-dataEntrega');
    campoEntrega.value = entDataM[1];
    campoEntrega.classList.add('auto-filled-prop');
  }

  const fluxo = [];
  entradaParcelas.forEach((p, idx) => {
    const dataStr = p.vencData || '01/01/2026';
    const [vd, vm, va] = dataStr.split('/').map(Number);
    fluxo.push({
      num: idx + 1,
      vencStr: p.resumoVenc || p.venc,
      vencData: p.vencData,
      tipo: p.vencData ? 'Sinal' : 'Sinal Ato',
      valorNum: p.valor,
      qtd: p.qtd || 1,
      periodicidade: p.periodicidade || 'Única',
      venc: new Date(va, vm - 1, vd)
    });
  });

  mensaisLista.forEach(m => {
    fluxo.push({
      num: m.num,
      vencStr: m.vencStr,
      vencData: m.vencStr,
      tipo: 'Mensal',
      valorNum: m.valorNum,
      qtd: 1,
      periodicidade: 'Mensal',
      venc: m.venc
    });
  });

  intermGrupos.forEach(g => {
    g.parcelas.forEach((p, idx) => {
      const dataStr = p.vencData || '01/01/2026';
      const [vd, vm, va] = dataStr.split('/').map(Number);
      const isGrupo2 = (g.grupo === 2);
      fluxo.push({
        num: idx + 1,
        vencStr: p.resumoVenc || p.venc,
        vencData: p.vencData,
        tipo: isGrupo2 ? 'Bom pagador' : (p.qtd > 1 ? `Intermediária (${p.qtd}x)` : 'Intermediária G1'),
        valorNum: p.valor,
        qtd: p.qtd || 1,
        periodicidade: p.periodicidade || 'Única',
        venc: new Date(va, vm - 1, vd)
      });
    });
  });

  AppState.propFluxo = fluxo.sort((a, b) => a.venc - b.venc || a.num - b.num);
  if (entDataM) calcularPsaPsbProposta(entDataM[1]);
  else renderizarFluxo();
}

function extrairPropostaCRM(texto) {
  const empM = texto.match(/Empreendimento[:\s]+(.*?)(?=\s*Unidade[:\s]|\n|$)/i);
  if (empM) setAutoProp('prop-empreendimento', empM[1].trim());
  const unidM = texto.match(/Unidade[:\s]+(.*?)(?=\s*Cliente[:\s]|\n|$)/i);
  if (unidM) setAutoProp('prop-unidade', unidM[1].trim());
  const vimM = texto.match(/Valor\s*Im[oó]vel[:\s]*R\$\s*([\d.,]+)/i);
  if (vimM) setAutoProp('prop-valorImovel', 'R$ ' + vimM[1].trim());
  const vpropM = texto.match(/Valor\s*da\s*Proposta\s*R\$\s*([\d.,]+)/i);
  if (vpropM) setAutoProp('prop-valorProposta', 'R$ ' + vpropM[1].trim());

  const finM = texto.match(/Valor\s*Financiado\s*R\$\s*([\d.,]+)/i);
  if (finM) document.getElementById('rp-financiado').textContent = 'R$ ' + finM[1].trim();
  const sinalM = texto.match(/Valor\s*do\s*Sinal\s*R\$\s*([\d.,]+)/i);
  if (sinalM) document.getElementById('rp-sinal').textContent = 'R$ ' + sinalM[1].trim();
  const cartM = texto.match(/Carteira\s*MRV\s*R\$\s*([\d.,]+)\s*\((\d+)x\)/i);
  if (cartM) {
    document.getElementById('rp-carteira').textContent = 'R$ ' + cartM[1].trim();
    document.getElementById('rp-qtdCarteira').textContent = cartM[2] + 'x';
  } else {
    const cartM2 = texto.match(/Carteira\s*MRV\s*R\$\s*([\d.,]+)/i);
    if (cartM2) document.getElementById('rp-carteira').textContent = 'R$ ' + cartM2[1].trim();
  }
  const cupomM = texto.match(/Cupom\s*R\$\s*([\d.,]+)/i);
  if (cupomM) document.getElementById('rp-cupom').textContent = 'R$ ' + cupomM[1].trim();
  const fgtsM = texto.match(/FGTS\s*R\$\s*([\d.,]+)/i);
  if (fgtsM) document.getElementById('rp-fgts').textContent = 'R$ ' + fgtsM[1].trim();
  const subM = texto.match(/Subs[ií]dio\s*R\$\s*([\d.,]+)/i);
  if (subM) document.getElementById('rp-subsidio').textContent = 'R$ ' + subM[1].trim();
  const bomM = texto.match(/Bom\s*pagador\s*R\$\s*([\d.,]+)/i);
  if (bomM) document.getElementById('rp-bompag').textContent = 'R$ ' + bomM[1].trim();

  document.getElementById('resumoPropostaGrid').classList.remove('hidden');
  AppState.propFluxo = extrairFluxoProposta(texto);
  renderizarFluxo();
}

function extrairFluxoProposta(texto) {
  const itens = [];
  const regex = /(\d{1,3})\s+(\d{2}\/\d{2}\/\d{4})\s+(Sinal\s+Ato|Sinal(?:\s+\d+)?|Intermedi[aá]ria(?:\s+\d+)?|Anual(?:\s+\d+)?|Semestral(?:\s+\d+)?|Bal[aã]o(?:\s+\d+)?|Bom\s+pagador|Mensal)\s+R\$\s+([\d.,]+)/gi;
  let m;
  while ((m = regex.exec(texto)) !== null) {
    const num = parseInt(m[1]); const vencStr = m[2]; const tipo = m[3].trim(); const valorNum = parseMoeda(m[4]);
    const [vd, vm, va] = vencStr.split('/').map(Number);
    const venc = new Date(va, vm - 1, vd);
    itens.push({ num, vencStr, vencData: vencStr, tipo, valorNum, qtd: 1, periodicidade: 'Única', venc });
  }
  const map = new Map();
  for (const it of itens) {
    const key = it.num + '_' + it.vencStr + '_' + it.tipo;
    if (!map.has(key)) map.set(key, it);
  }
  return [...map.values()].sort((a, b) => a.num - b.num || a.venc - b.venc);
}

function analisarPicosProposta(renda) {
  AppState.propPicosCriticos = [];
  if (!renda || renda <= 0 || !AppState.propFluxo.length) return [];

  const caixaDigitada = parseMoeda(document.getElementById('prop-parcelaCaixa').value);
  const valorCaixa = caixaDigitada > 0 ? caixaDigitada : 0;
  const labelCaixa = caixaDigitada > 0 ? '2. Parcela Caixa' : '2. Caixa (Não inf.)';

  const gruposMap = new Map();

  for (const it of AppState.propFluxo) {
    const tipoLower = it.tipo.toLowerCase();
    if (tipoLower.includes('bom')) continue;

    const pctRenda = (it.valorNum / renda) * 100;
    if (pctRenda >= 50) {
      const mes = it.venc.getMonth() + 1;
      const ano = it.venc.getFullYear();

      let valorMrvMes = 0;
      let origemMrvMes = 'Sem mensal adicional no mês';

      if (tipoLower !== 'mensal') {
        const mensalMes = AppState.propFluxo.find(m =>
          m.tipo.toLowerCase() === 'mensal' &&
          (m.venc.getMonth() + 1) === mes &&
          m.venc.getFullYear() === ano
        );
        if (mensalMes) {
          valorMrvMes = mensalMes.valorNum;
          origemMrvMes = `Mensal #${mensalMes.num} (${mensalMes.vencStr})`;
        } else if (AppState.propPsbPrimeira > 0) {
          valorMrvMes = AppState.propPsbPrimeira;
          origemMrvMes = '1ª Parcela PSB ref.';
        }
      }

      const totalMesPico = it.valorNum + valorCaixa + valorMrvMes;
      const pctTotalMesPico = (totalMesPico / renda) * 100;
      const qtdItem = it.qtd || 1;

      const chaveGrupo = `${it.tipo}_${it.valorNum.toFixed(2)}`;
      if (!gruposMap.has(chaveGrupo)) {
        gruposMap.set(chaveGrupo, {
          qtd: qtdItem,
          primeiroVenc: it.vencStr,
          ultimoVenc: it.vencStr,
          tipoBase: it.tipo,
          numPrimeiro: it.num,
          valorInterm: it.valorNum,
          pctIntermRenda: pctRenda,
          valorCaixa,
          labelCaixa,
          valorMrvMes,
          origemMrvMes,
          totalMesPico,
          pctTotalMesPico
        });
      } else {
        const g = gruposMap.get(chaveGrupo);
        g.qtd += qtdItem;
        g.ultimoVenc = it.vencStr;
        if (totalMesPico > g.totalMesPico) {
          g.valorMrvMes = valorMrvMes;
          g.origemMrvMes = origemMrvMes;
          g.totalMesPico = totalMesPico;
          g.pctTotalMesPico = pctTotalMesPico;
        }
      }
    }
  }

  for (const g of gruposMap.values()) {
    const vencTexto = g.qtd > 1
      ? (g.primeiroVenc === g.ultimoVenc ? `${g.primeiroVenc} — ${g.qtd}x de ${formatMoeda(g.valorInterm)}` : `${g.qtd}x de ${formatMoeda(g.valorInterm)} (de ${g.primeiroVenc} a ${g.ultimoVenc})`)
      : `Vencimento: ${g.primeiroVenc}`;
    const tipoLabel = g.qtd > 1
      ? `1. ${g.tipoBase.replace(/\(\d+x\)/i, '').trim()} (${g.qtd}x)`
      : `1. ${g.tipoBase} (#${g.numPrimeiro})`;

    AppState.propPicosCriticos.push({
      qtd: g.qtd,
      venc: vencTexto,
      tipoLabel,
      valorInterm: g.valorInterm,
      pctIntermRenda: g.pctIntermRenda,
      valorCaixa: g.valorCaixa,
      labelCaixa: g.labelCaixa,
      valorMrvMes: g.valorMrvMes,
      origemMrvMes: g.origemMrvMes,
      totalMesPico: g.totalMesPico,
      pctTotalMesPico: g.pctTotalMesPico
    });
  }

  return AppState.propPicosCriticos;
}

function renderizarFluxo() {
  const tbody = document.getElementById('prop-fluxoTbody');
  const wrap = document.getElementById('prop-fluxoWrap');
  if (!AppState.propFluxo.length) { wrap.style.display = 'none'; return; }

  wrap.style.display = 'block';
  document.getElementById('prop-fluxoCount').textContent = AppState.propFluxo.length + ' lançamentos';

  const dataEntStr = document.getElementById('prop-dataEntrega').value;
  const rendaProp = parseMoeda(document.getElementById('prop-renda').value);
  let inicioPSB = null;
  if (dataEntStr && /\d{2}\/\d{2}\/\d{4}/.test(dataEntStr)) {
    const [d, m, a] = dataEntStr.split('/').map(Number);
    AppState.propDataEntregaISO = new Date(a, m - 1, d);
    const mesNext = AppState.propDataEntregaISO.getMonth() === 11 ? 0 : AppState.propDataEntregaISO.getMonth() + 1;
    const anoNext = AppState.propDataEntregaISO.getMonth() === 11 ? AppState.propDataEntregaISO.getFullYear() + 1 : AppState.propDataEntregaISO.getFullYear();
    inicioPSB = new Date(anoNext, mesNext, 1);
  }

  tbody.innerHTML = AppState.propFluxo.map(it => {
    const tipoLower = it.tipo.toLowerCase();
    const pctRenda = (rendaProp > 0 && !tipoLower.includes('bom')) ? (it.valorNum / rendaProp) * 100 : 0;
    const isCritica = pctRenda >= 50;
    const qtd = it.qtd || 1;
    const valExibicao = qtd > 1 ? `${qtd}x de ${formatMoeda(it.valorNum)}` : formatMoeda(it.valorNum);

    let trClass = '', badgeClass = '', badgeLabel = '', faseLabel = '—';
    if (tipoLower.includes('sinal')) { trClass = 'tipo-sinal'; badgeClass = 'sinal'; badgeLabel = it.tipo; faseLabel = 'Sinal'; }
    else if (tipoLower.includes('interm') || tipoLower.includes('anual') || tipoLower.includes('semestral') || tipoLower.includes('bal')) {
      trClass = 'tipo-sinal'; badgeClass = 'interm'; badgeLabel = it.tipo; faseLabel = 'Intermediária';
    }
    else if (tipoLower.includes('bom')) { trClass = 'tipo-bom'; badgeClass = 'bom'; badgeLabel = '🏆 Bom Pagador'; faseLabel = 'Bônus'; }
    else if (tipoLower === 'mensal') {
      if (inicioPSB && it.venc >= inicioPSB) { trClass = 'tipo-psb'; badgeClass = 'mensal-psb'; badgeLabel = 'Mensal'; faseLabel = 'PSB'; }
      else { trClass = 'tipo-psa'; badgeClass = 'mensal-psa'; badgeLabel = 'Mensal'; faseLabel = 'PSA'; }
    }

    if (isCritica) {
      trClass += ' tipo-critica';
      faseLabel += ` <span class="tag-interm-critica">🚨 ${pctRenda.toFixed(1).replace('.', ',')}% Renda</span>`;
    }

    return `<tr class="${trClass}"><td>${it.num}</td><td>${sanitizarTexto(it.vencStr)}</td><td><span class="tipo-badge ${badgeClass}">${sanitizarTexto(badgeLabel)}</span></td><td><strong>${valExibicao}</strong></td><td>${faseLabel}</td></tr>`;
  }).join('');
}

function calcularPsaPsbProposta(dataEntregaStr) {
  AppState.propMensaisPSA = []; AppState.propMensaisPSB = [];
  AppState.propPsaQtd = 0; AppState.propPsaSaldo = 0;
  AppState.propPsbQtd = 0; AppState.propPsbSaldo = 0;
  AppState.propPsbPrimeira = 0; AppState.propPsbMedia = 0;
  if (!AppState.propFluxo.length) return;

  const [d, m, a] = dataEntregaStr.split('/').map(Number);
  AppState.propDataEntregaISO = new Date(a, m - 1, d);
  const mesNext = AppState.propDataEntregaISO.getMonth() === 11 ? 0 : AppState.propDataEntregaISO.getMonth() + 1;
  const anoNext = AppState.propDataEntregaISO.getMonth() === 11 ? AppState.propDataEntregaISO.getFullYear() + 1 : AppState.propDataEntregaISO.getFullYear();
  const inicioPSB = new Date(anoNext, mesNext, 1);

  for (const it of AppState.propFluxo) {
    if (it.tipo.toLowerCase() !== 'mensal') continue;
    if (it.venc >= inicioPSB) { AppState.propMensaisPSB.push(it); AppState.propPsbQtd++; AppState.propPsbSaldo += it.valorNum; }
    else { AppState.propMensaisPSA.push(it); AppState.propPsaQtd++; AppState.propPsaSaldo += it.valorNum; }
  }

  if (AppState.propMensaisPSB.length > 0) {
    AppState.propPsbPrimeira = AppState.propMensaisPSB[0].valorNum;
    AppState.propPsbMedia = AppState.propPsbSaldo / AppState.propPsbQtd;
  }

  document.getElementById('prop-psaQtd').textContent = AppState.propPsaQtd > 0 ? AppState.propPsaQtd + ' parcelas' : '—';
  document.getElementById('prop-psaSaldo').textContent = AppState.propPsaSaldo > 0 ? formatMoeda(AppState.propPsaSaldo) : '—';
  document.getElementById('prop-psbQtd').textContent = AppState.propPsbQtd > 0 ? AppState.propPsbQtd + ' parcelas' : '—';
  document.getElementById('prop-psbSaldo').textContent = AppState.propPsbSaldo > 0 ? formatMoeda(AppState.propPsbSaldo) : '—';
  document.getElementById('prop-psbPrimeira').textContent = AppState.propPsbPrimeira > 0 ? formatMoeda(AppState.propPsbPrimeira) : '—';
  document.getElementById('prop-psbMedia').textContent = AppState.propPsbMedia > 0 ? formatMoeda(AppState.propPsbMedia) : '—';
  document.getElementById('prop-psaPsbWrap').classList.remove('hidden');
  renderizarFluxo();
}

function aplicarStatusProposta(num, pct, temPicoCritico) {
  const unif = document.getElementById('prop-compUnif' + num);
  const icon = document.getElementById('prop-compIcon' + num);
  const text = document.getElementById('prop-compText' + num);
  const sub = document.getElementById('prop-compSub' + num);
  const bar = document.getElementById('prop-progressBar' + num);
  const tetoMRV = AppState.tetoMrvPct;
  const limVerde = +(tetoMRV * 0.7).toFixed(1);
  const escalaMax = tetoMRV * 2;

  const labelsEl = document.getElementById('prop-progressLabels' + num);
  if (labelsEl) {
    labelsEl.innerHTML = `<span>0%</span><span>${limVerde.toString().replace('.', ',')}% ✔</span><span>${tetoMRV.toString().replace('.', ',')}% ⚠</span><span>${escalaMax.toString().replace('.', ',')}%+</span>`;
  }

  let classe, iconeTxt, textoTxt, barClasse, subTxt = '';

  if (pct <= limVerde) {
    if (temPicoCritico) {
      classe = 'atencao'; iconeTxt = '⚠️'; textoTxt = 'ATENÇÃO'; barClasse = 'amarelo';
      subTxt = 'Alerta Pico ≥ 50% Renda';
    } else {
      classe = 'aprovado'; iconeTxt = '✔'; textoTxt = 'DENTRO DO TETO'; barClasse = 'verde';
    }
  } else if (pct <= tetoMRV) {
    classe = 'atencao'; iconeTxt = '⚠'; textoTxt = 'ATENÇÃO'; barClasse = 'amarelo';
    if (temPicoCritico) subTxt = '+ Alerta Pico ≥ 50%';
  } else {
    classe = 'reprovado'; iconeTxt = '✘'; textoTxt = 'ACIMA DO TETO'; barClasse = 'vermelho';
    if (temPicoCritico) subTxt = '+ Alerta Pico ≥ 50%';
  }

  if (num === 2) {
    const side = document.getElementById('prop-compStatus' + num);
    side.style.background = classe === 'aprovado' ? 'var(--verde-claro)' : classe === 'atencao' ? 'var(--amarelo-claro)' : 'var(--vermelho-claro)';
    side.style.borderColor = classe === 'aprovado' ? 'var(--verde)' : classe === 'atencao' ? 'var(--amarelo)' : 'var(--vermelho)';
    side.style.color = classe === 'aprovado' ? 'var(--verde)' : classe === 'atencao' ? 'var(--amarelo-medio)' : 'var(--vermelho)';
  } else { unif.className = 'comprom-unified ' + classe; }

  icon.textContent = iconeTxt;
  text.textContent = textoTxt;
  if (sub) {
    if (subTxt) { sub.textContent = subTxt; sub.classList.remove('hidden'); }
    else { sub.classList.add('hidden'); }
  }
  if (bar) { bar.className = 'progress-bar ' + barClasse; bar.style.width = Math.min((pct / escalaMax) * 100, 100) + '%'; }
  return textoTxt;
}

function renderizarExcedenteProposta(num, pct, parcelaBase, renda, label) {
  const box = document.getElementById('prop-excedenteBox' + num);
  const titulo = document.getElementById('prop-excedenteTitulo' + num);
  const conteudo = document.getElementById('prop-excedenteConteudo' + num);
  box.classList.remove('hidden');

  const tetoMRV = AppState.tetoMrvPct;
  const tetoMrvStr = tetoMRV.toString().replace('.', ',');
  const teto = renda * (tetoMRV / 100);
  const reducaoPorParcela = Math.max(0, parcelaBase - teto);
  const excedenteTotalPSB = reducaoPorParcela * AppState.propPsbQtd;

  if (pct <= tetoMRV) {
    box.className = 'excedente-box ok';
    titulo.innerHTML = `✔ ${sanitizarTexto(label)} dentro do teto MRV (${tetoMrvStr}%)`;
    conteudo.innerHTML = `
      <div class="excedente-row"><span class="er-label">${sanitizarTexto(label)}</span><span class="er-val val-verde">${formatMoeda(parcelaBase)}</span></div>
      <div class="excedente-row"><span class="er-label">Teto MRV (${tetoMrvStr}% da renda)</span><span class="er-val val-verde">${formatMoeda(teto)}</span></div>
      <div class="excedente-row"><span class="er-label">Comprometimento</span><span class="er-val val-verde">${pct.toFixed(2).replace('.', ',')} %</span></div>
      <div class="excedente-row"><span class="er-label">Margem disponível</span><span class="er-val val-verde">${formatMoeda(teto - parcelaBase)}</span></div>`;
  } else {
    box.className = 'excedente-box nok';
    titulo.innerHTML = `⚠️ ${sanitizarTexto(label)} acima do teto MRV (${tetoMrvStr}%) — redução necessária`;
    conteudo.innerHTML = `
      <div class="excedente-row"><span class="er-label">${sanitizarTexto(label)}</span><span class="er-val val-vermelho">${formatMoeda(parcelaBase)}</span></div>
      <div class="excedente-row"><span class="er-label">Teto MRV (${tetoMrvStr}% da renda)</span><span class="er-val val-verde">${formatMoeda(teto)}</span></div>
      <div class="excedente-row"><span class="er-label">Comprometimento</span><span class="er-val val-vermelho">${pct.toFixed(2).replace('.', ',')} %</span></div>
      <div class="excedente-row"><span class="er-label">Redução necessária por parcela</span><span class="er-val val-laranja">${formatMoeda(reducaoPorParcela)}</span></div>
      <div class="excedente-row"><span class="er-label">Qtd. parcelas PSB</span><span class="er-val val-roxo">${AppState.propPsbQtd} parcelas</span></div>
      <div class="excedente-row"><span class="er-label">💡 Excedente total no PSB</span><span class="er-val val-laranja">${formatMoeda(excedenteTotalPSB)}</span></div>`;
  }
}

function calcularProposta(e) {
  if (e && e.preventDefault) e.preventDefault();
  const dataEntStr = document.getElementById('prop-dataEntrega').value.trim();
  const renda = parseMoeda(document.getElementById('prop-renda').value);
  if (!AppState.propFluxo.length) { alert('⚠️ Carregue o PDF da Simulação de Proposta antes de calcular.'); return; }
  if (!dataEntStr || !/^\d{2}\/\d{2}\/\d{4}$/.test(dataEntStr)) { alert('⚠️ Informe a Data Prevista de Entrega no formato DD/MM/AAAA.'); return; }
  if (!renda || renda <= 0) { alert('⚠️ Informe a Renda do Cliente.'); return; }

  calcularPsaPsbProposta(dataEntStr);

  if (AppState.propPsbQtd === 0 && e.isTrusted) {
    alert('ℹ️ AVISO: Nenhuma parcela Mensal encontrada após a data de entrega.\n\nO cálculo prosseguirá considerando a parcela MRV (PSB) como R$ 0,00. Confirme se a data está correta ou se a compra é à vista/quitada.');
  }

  const picosProp = analisarPicosProposta(renda);
  const temPicoProp = picosProp.length > 0;
  renderizarBannerPicoMensal('prop-intermAlertBanner', 'prop-intermAlertCount', 'prop-intermAlertList', picosProp);

  const tetoMRV = AppState.tetoMrvPct;
  const tetoMrvStr = tetoMRV.toString().replace('.', ',');
  const teto = renda * (tetoMRV / 100);
  const pct1 = (AppState.propPsbPrimeira / renda) * 100;
  const pct2 = (AppState.propPsbMedia / renda) * 100;

  document.getElementById('prop-label-teto').textContent = `Teto MRV (${tetoMrvStr}% da Renda)`;
  document.getElementById('prop-header-teto1').textContent = `Teto: ${tetoMrvStr}%`;
  document.getElementById('prop-header-teto2').textContent = `versão secundária · Teto: ${tetoMrvStr}%`;

  document.getElementById('prop-res-primeira').textContent = formatMoeda(AppState.propPsbPrimeira);
  document.getElementById('prop-res-media').textContent = formatMoeda(AppState.propPsbMedia);
  document.getElementById('prop-res-renda').textContent = formatMoeda(renda);
  document.getElementById('prop-res-teto').textContent = formatMoeda(teto);
  document.getElementById('prop-res-psa-saldo').textContent = AppState.propPsaSaldo > 0 ? formatMoeda(AppState.propPsaSaldo) : '—';
  document.getElementById('prop-res-psa-qtd').textContent = AppState.propPsaQtd > 0 ? AppState.propPsaQtd + ' parcelas' : '—';
  document.getElementById('prop-res-psb-saldo').textContent = formatMoeda(AppState.propPsbSaldo);
  document.getElementById('prop-res-psb-qtd').textContent = AppState.propPsbQtd + ' parcelas';
  document.getElementById('prop-res-pct1').textContent = pct1.toFixed(2).replace('.', ',') + ' %';
  document.getElementById('prop-res-pct2').textContent = pct2.toFixed(2).replace('.', ',') + ' %';

  aplicarStatusProposta(1, pct1, temPicoProp);
  aplicarStatusProposta(2, pct2, temPicoProp);
  renderizarExcedenteProposta(1, pct1, AppState.propPsbPrimeira, renda, '1ª Parcela PSB');
  renderizarExcedenteProposta(2, pct2, AppState.propPsbMedia, renda, 'Média PSB');

  const jaVisivel = document.getElementById('resultadoProposta').classList.contains('show');
  document.getElementById('resultadoProposta').className = 'resultado show';
  if (!jaVisivel) document.getElementById('resultadoProposta').scrollIntoView({ behavior: 'smooth' });
}

function limparProposta() {
  document.getElementById('formProposta').reset();
  document.getElementById('resultadoProposta').className = 'resultado';
  document.getElementById('uploadCardProp').className = 'upload-card proposta';
  document.getElementById('badgeProp').className = 'upload-status-badge';
  document.getElementById('statusBarProp').className = 'status-bar';
  document.getElementById('prop-psaPsbWrap').classList.add('hidden');
  document.getElementById('prop-fluxoWrap').style.display = 'none';
  document.getElementById('prop-fluxoTbody').innerHTML = '';
  document.getElementById('prop-fluxoBody').classList.remove('open');
  document.getElementById('resumoPropostaGrid').classList.add('hidden');
  document.getElementById('prop-excedenteBox1').classList.add('hidden');
  document.getElementById('prop-excedenteBox2').classList.add('hidden');
  document.getElementById('prop-intermAlertBanner').style.display = 'none';
  document.getElementById('prop-intermAlertList').innerHTML = '';
  document.getElementById('prop-compSub1').classList.add('hidden');
  document.getElementById('prop-compSub2').classList.add('hidden');
  document.getElementById('pdfPropostaInput').value = '';
  ['rp-financiado', 'rp-sinal', 'rp-carteira', 'rp-cupom', 'rp-fgts', 'rp-subsidio', 'rp-bompag', 'rp-qtdCarteira'].forEach(id => {
    document.getElementById(id).textContent = '—';
  });

  Object.assign(AppState, {
    propFluxo: [], propMensaisPSA: [], propMensaisPSB: [], propPicosCriticos: [],
    propPsaQtd: 0, propPsaSaldo: 0, propPsbQtd: 0, propPsbSaldo: 0,
    propPsbPrimeira: 0, propPsbMedia: 0, propDataEntregaISO: null
  });
}

// =========================================================================
//   9. EXPORTAÇÃO
// =========================================================================
function copiarResultadoProposta() {
  const tetoMrvStr = AppState.tetoMrvPct.toString().replace('.', ',');
  let blocoPicoProp = '';
  if (AppState.propPicosCriticos.length > 0) {
    blocoPicoProp = '\n🚨 ALERTA DE PICO MENSAL MRV NA PROPOSTA (≥ 50% DA RENDA):\n' +
      AppState.propPicosCriticos.map(c =>
        `• ${c.venc} (${c.tipoLabel}): ${formatMoeda(c.valorInterm)} (${c.pctIntermRenda.toFixed(1).replace('.', ',')}% da renda) | Soma Mês (MRV + Caixa): ${formatMoeda(c.totalMesPico)} (${c.pctTotalMesPico.toFixed(1).replace('.', ',')}% da renda)`
      ).join('\n') + '\n─────────────────────────────';
  }

  const txt = `SIMULAÇÃO DE PROPOSTA MRV — ${new Date().toLocaleString('pt-BR')}
Empreendimento: ${document.getElementById('prop-empreendimento').value}
Unidade: ${document.getElementById('prop-unidade').value}
Valor do Imóvel: ${document.getElementById('prop-valorImovel').value}
Valor da Proposta: ${document.getElementById('prop-valorProposta').value}
─────────────────────────────
Renda do Cliente: ${document.getElementById('prop-res-renda').textContent}
Teto MRV (${tetoMrvStr}%): ${document.getElementById('prop-res-teto').textContent}
─────────────────────────────
PSA (pré-entrega): ${document.getElementById('prop-res-psa-saldo').textContent} (${document.getElementById('prop-res-psa-qtd').textContent})
PSB (pós-entrega): ${document.getElementById('prop-res-psb-saldo').textContent} (${document.getElementById('prop-res-psb-qtd').textContent})
─────────────────────────────
1ª Parcela PSB: ${document.getElementById('prop-res-primeira').textContent}
Comprometimento (1ª PSB): ${document.getElementById('prop-res-pct1').textContent} → ${document.getElementById('prop-compText1').textContent}${blocoPicoProp}
─────────────────────────────
Média PSB: ${document.getElementById('prop-res-media').textContent}
Comprometimento (Média PSB): ${document.getElementById('prop-res-pct2').textContent} → ${document.getElementById('prop-compText2').textContent}
─────────────────────────────
⚠ Projeção estimada. Valores sujeitos à aprovação.`;
  navigator.clipboard.writeText(txt).then(() => alert('✅ Copiado!'));
}

function copiarResultado() {
  const pctMediaTxt = document.getElementById('res-pct-media').textContent;
  const pctVal = parseFloat(document.getElementById('res-pct').textContent.replace('%', '').replace(',', '.'));
  const tetoMax = AppState.tetoTotalPct;

  let avisoEspecial = '';
  if ((pctVal > tetoMax && pctVal <= tetoMax + 2) || AppState.intermCriticasG1.length > 0) {
    avisoEspecial = '\n⚠️ ATENÇÃO: O caso deve ser avaliado individualmente para a decisão de manter o contrato ou refazer a venda.\n─────────────────────────────';
  }

  let blocoIntermTxt = '';
  if (AppState.intermCriticasG1.length > 0) {
    blocoIntermTxt = '\n🚨 ALERTA DE INTERMEDIÁRIA GRUPO 1 (≥ 50% DA RENDA):\n' +
      AppState.intermCriticasG1.map(c =>
        `• ${c.venc}: Interm. ${formatMoeda(c.valorInterm)} (${c.pctIntermRenda.toFixed(1).replace('.', ',')}% da renda) | Soma Mês (Interm + Caixa + MRV): ${formatMoeda(c.totalMesPico)} (${c.pctTotalMesPico.toFixed(1).replace('.', ',')}% da renda)`
      ).join('\n') + '\n─────────────────────────────';
  }

  const txt = `ANÁLISE MRV/EMCASH — ${new Date().toLocaleString('pt-BR')}
Teto Parametrizado: ${tetoMax.toString().replace('.', ',')}% (Caixa 30% + MRV ${AppState.tetoMrvPct.toString().replace('.', ',')}%)
Tipo de Contrato: ${AppState.tipoContrato || '—'}
Cliente: ${document.getElementById('nomeCliente').value}
CPF: ${document.getElementById('cpf').value}
Empreendimento: ${document.getElementById('empreendimento').value}
Gerente: ${document.getElementById('gerente').value}
─────────────────────────────
Parcela Caixa: ${document.getElementById('res-caixa').textContent}
Parcela MRV/Emcash pós-entrega: ${document.getElementById('res-mrv').textContent}
Total: ${document.getElementById('res-total').textContent}
Renda: ${document.getElementById('res-renda').textContent}
─────────────────────────────
PSA: ${document.getElementById('res-psa-saldo').textContent} (${document.getElementById('res-psa-qtd').textContent})
PSB: ${document.getElementById('res-psb-saldo').textContent} (${document.getElementById('res-psb-qtd').textContent})
─────────────────────────────
Comprometimento (1ª Parcela PSB): ${document.getElementById('res-pct').textContent}
Status: ${document.getElementById('compText1').textContent}${avisoEspecial}${blocoIntermTxt}
Comprometimento (Média PSB): ${pctMediaTxt}
Status Média: ${document.getElementById('compText2').textContent}
- Projeções são estimativas. Solicite simulação ao financeiro MRV.`;
  navigator.clipboard.writeText(txt).then(() => alert('✅ Copiado!'));
}

function prepararImpressao() {
  const nome = (document.getElementById('nomeCliente').value || document.getElementById('prop-empreendimento').value || 'Análise').trim();
  document.title = nome + ' - Comprometimento de Renda';
  window.print();
}
window.addEventListener('afterprint', () => { document.title = 'Calculadora MRV/Emcash — Comprometimento de Renda'; });

// =========================================================================
//   10. UTILITÁRIOS DA INTERFACE (UI)
// =========================================================================
function trocarAba(aba) {
  document.getElementById('abaProposta').classList.toggle('hidden', aba !== 'proposta');
  document.getElementById('abaContrato').classList.toggle('hidden', aba !== 'contrato');
  document.getElementById('tabBtnProposta').className = 'tab-btn' + (aba === 'proposta' ? ' active-proposta' : '');
  document.getElementById('tabBtnContrato').className = 'tab-btn' + (aba === 'contrato' ? ' active-contrato' : '');
}

function toggleFluxo() { document.getElementById('prop-fluxoBody').classList.toggle('open'); }

function mascaraData(el) {
  let v = el.value.replace(/\D/g, '');
  if (v.length > 8) v = v.substring(0, 8);
  if (v.length >= 5) el.value = v.substring(0, 2) + '/' + v.substring(2, 4) + '/' + v.substring(4, 8);
  else if (v.length >= 3) el.value = v.substring(0, 2) + '/' + v.substring(2, 4);
  else el.value = v;
  if (el.value.length === 10) el.dispatchEvent(new Event('change'));
}

function mascaraMoedaGen(el) {
  let v = el.value.replace(/\D/g, '');
  if (!v) { el.value = ''; return; }
  v = (parseInt(v) / 100).toFixed(2);
  el.value = 'R$ ' + v.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseMoeda(str) {
  if (!str) return 0;
  let s = String(str).trim().replace(/R\$\s*/g, '').trim();
  if (!s) return 0;
  if (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$/.test(s)) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
  if (/^\d+(,\d{1,2})?$/.test(s)) return parseFloat(s.replace(',', '.')) || 0;
  if (/^\d{1,3}(,\d{3})*(\.\d{1,2})?$/.test(s)) return parseFloat(s.replace(/,/g, '')) || 0;
  if (/^\d+\.\d{1,2}$/.test(s)) return parseFloat(s) || 0;
  if (s.includes(',')) {
    const partes = s.split(',');
    const inteiro = partes[0].replace(/\D/g, '');
    const decimal = partes[partes.length - 1].replace(/\D/g, '');
    return parseFloat(inteiro + '.' + decimal) || 0;
  }
  if (s.includes('.')) {
    const partes = s.split('.');
    const inteiro = partes[0].replace(/\D/g, '');
    const decimal = partes[partes.length - 1].replace(/\D/g, '');
    return parseFloat(inteiro + '.' + decimal) || 0;
  }
  const soDigitos = s.replace(/\D/g, '');
  return soDigitos ? parseInt(soDigitos) / 100 : 0;
}

function formatMoeda(v) {
  if (isNaN(v) || v === null || v === undefined) return 'R$ 0,00';
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function mostrarStatus(msg, tipo) {
  const bar = document.getElementById('statusBar');
  bar.className = 'status-bar show' + (tipo === 'success' ? ' success' : tipo === 'error' ? ' error' : tipo === 'info' ? ' info' : '');
  document.getElementById('statusMsg').textContent = msg;
  document.getElementById('spinner').style.display = tipo === 'loading' ? 'block' : 'none';
}

function mostrarStatusProp(msg, tipo) {
  const bar = document.getElementById('statusBarProp');
  bar.className = 'status-bar show' + (tipo === 'success' ? ' success' : tipo === 'error' ? ' error' : tipo === 'info' ? ' info' : '');
  document.getElementById('statusMsgProp').textContent = msg;
  document.getElementById('spinnerProp').style.display = tipo === 'loading' ? 'block' : 'none';
}

function limpar() {
  document.getElementById('formCalc').reset();
  document.querySelectorAll('#abaContrato input').forEach(el => {
    el.classList.remove('auto-filled'); el.classList.remove('auto-filled-caixa');
  });
  document.getElementById('resultado').className = 'resultado';
  document.getElementById('statusBar').className = 'status-bar';
  document.getElementById('pdfInput').value = '';
  document.getElementById('pdfCaixaInput').value = '';
  document.getElementById('uploadCardMRV').className = 'upload-card mrv';
  document.getElementById('uploadCardCaixa').className = 'upload-card caixa';
  document.getElementById('badgeMRV').className = 'upload-status-badge';
  document.getElementById('badgeCaixa').className = 'upload-status-badge';
  document.getElementById('financiadoWrap').style.display = 'none';
  document.getElementById('faixaInfoBox').style.display = 'none';
  document.getElementById('psaPsbWrap').classList.add('hidden');
  document.getElementById('resPsaPsb').classList.add('hidden');
  document.getElementById('descontoSection').classList.add('hidden');
  document.getElementById('planoWrap').style.display = 'none';
  document.getElementById('planoBody').innerHTML = '';
  document.getElementById('intermAlertBanner').style.display = 'none';
  document.getElementById('intermAlertList').innerHTML = '';
  document.getElementById('compUnif2').classList.add('hidden');
  document.getElementById('progressWrapMedia').classList.add('hidden');
  document.getElementById('progressLabelsMedia').classList.add('hidden');
  document.getElementById('separadorMedia').classList.add('hidden');
  document.getElementById('res-pct').textContent = '—';
  document.getElementById('res-pct-media').textContent = '—';
  document.getElementById('compIcon1').textContent = '—';
  document.getElementById('compText1').textContent = '—';
  document.getElementById('compSub1').classList.add('hidden');
  document.getElementById('compIcon2').textContent = '—';
  document.getElementById('compText2').textContent = '—';
  document.getElementById('compSub2').classList.add('hidden');
  document.getElementById('msgAvaliacao1').classList.add('hidden');
  document.getElementById('msgAvaliacao2').classList.add('hidden');
  document.getElementById('compUnif1').className = 'comprom-unified';
  document.getElementById('compUnif2').className = 'comprom-unified secundario';

  Object.assign(AppState, {
    tipoContrato: '', psaQtd: 0, psaSaldo: 0, psbQtd: 0, psbSaldo: 0,
    parcelasPSB: [], parcelasTodas: [], dataEntregaISO: null, obraPronta: false,
    entrada: { total: 0, pct: '', parcelas: [] }, intermediarias: [], intermCriticasG1: []
  });
}
