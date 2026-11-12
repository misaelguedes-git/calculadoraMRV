// =========================================================================
//   CONFIGURAÇÕES INICIAIS & SERVICE WORKER
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
//   1.1 CONTROLE DE PARÂMETROS REGIONAIS (SIDEBAR OPÇÃO B)
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
    const btnVal = parseFloat(btn.dataset.teto || btn.textContent);
    btn.classList.toggle('active', btnVal === num);
  });

  const tetoMrvFmt = AppState.tetoMrvPct.toFixed(1).replace('.', ',') + '%';
  const tetoTotFmt = AppState.tetoTotalPct.toFixed(1).replace('.', ',');
  const tetoAteFmt = (AppState.tetoTotalPct + 2).toFixed(1).replace('.', ',');
  document.getElementById('sidebarTetoMRV').textContent = tetoMrvFmt;
  document.getElementById('sidebarFaixaAtencao').textContent = `${tetoTotFmt}% a ${tetoAteFmt}%`;

  if (document.getElementById('resultado').classList.contains('show')) {
    calcular();
  }
  if (document.getElementById('resultadoProposta').classList.contains('show')) {
    calcularProposta();
  }
}

// =========================================================================
//   2. EVENTOS DE ARRASTAR E SOLTAR (DRAG AND DROP) E BINDING INICIAL
// =========================================================================
function setupDragAndDrop(cardId, inputId, readFunction) {
  const card = document.getElementById(cardId);
  const input = document.getElementById(inputId);
  if (!card || !input) return;

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
  // Fallback do logo sem onerror inline
  const logoImg = document.getElementById('logoImg');
  if (logoImg) {
    logoImg.addEventListener('error', () => {
      logoImg.style.display = 'none';
      const fb = document.getElementById('logoFallback');
      if (fb) fb.style.display = 'inline';
    });
  }

  // Sidebar Parâmetros Regionais
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => definirTetoTotal(btn.dataset.teto));
  });
  document.getElementById('sliderTetoTotal').addEventListener('input', (e) => atualizarTetoPorInput(e.target.value));
  document.getElementById('inputTetoTotal').addEventListener('input', (e) => atualizarTetoPorInput(e.target.value));

  // Navegação entre abas
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

  const avisoCaixa = document.getElementById('avisoSimulacaoCaixa');
  if (avisoCaixa) avisoCaixa.addEventListener('click', (e) => e.stopPropagation());

  // Inputs Aba Proposta
  const propDataEnt = document.getElementById('prop-dataEntrega');
  propDataEnt.addEventListener('input', (e) => mascaraData(e.target));
  propDataEnt.addEventListener('change', function() {
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
  document.getElementById('prop-fluxoHeader').addEventListener('click', toggleFluxo);

  // Inputs Aba Contrato
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

  // Formulários e Botões de Ação
  document.getElementById('formProposta').addEventListener('submit', calcularProposta);
  document.getElementById('btnLimparProp').addEventListener('click', limparProposta);
  document.getElementById('btnCopiarProp').addEventListener('click', copiarResultadoProposta);
  document.getElementById('btnImprimirProp').addEventListener('click', prepararImpressao);

  document.getElementById('formCalc').addEventListener('submit', calcular);
  document.getElementById('btnLimparContrato').addEventListener('click', limpar);
  document.getElementById('btnImprimirContrato').addEventListener('click', prepararImpressao);
  document.getElementById('btnCopiarContrato').addEventListener('click', copiarResultado);
});

// =========================================================================
//   3. LEITURA E PROCESSAMENTO BASE DE PDFs
// =========================================================================
async function extrairTextoPDF(file){
  const buf = await file.arrayBuffer();
  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({data: buf}).promise;
  } catch(e) {
    alert('❌ O arquivo PDF está corrompido ou protegido por senha. Por favor, salve-o novamente sem restrições.');
    return null;
  }
  let texto = '';
  for(let i = 1; i <= pdf.numPages; i++){
    try {
      const page = await pdf.getPage(i);
      const c = await page.getTextContent();
      texto += c.items.map(it => it.str).join(' ') + '\n';
    } catch(pe) {
      console.warn('Erro na leitura da página ' + i, pe);
    }
  }
  if(texto.trim().length < 50){
    alert('⚠️ O PDF parece estar vazio ou é uma imagem digitalizada (sem texto extraível).');
    return null;
  }
  return texto;
}

// =========================================================================
//   4. FUNÇÕES DE UPLOAD ESPECÍFICAS
// =========================================================================
async function lerPDFContrato(input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 20 * 1024 * 1024){
    alert('⚠️ Arquivo muito grande. O limite máximo permitido é 20 MB.');
    input.value = '';
    return;
  }
  mostrarStatus('⏳ Lendo contrato...', 'loading');
  try {
    const texto = await extrairTextoPDF(file);
    if(!texto) { mostrarStatus('❌ Falha na leitura do contrato.', 'error'); return; }
    extrairDadosContrato(texto);
    document.getElementById('uploadCardMRV').className = 'upload-card mrv lido-mrv';
    document.getElementById('badgeMRV').className = 'upload-status-badge ok-mrv';
    mostrarStatus('✅ Contrato lido! Carregue a Simulação Caixa.', 'success');
  } catch(e) {
    mostrarStatus('❌ Erro ao ler contrato: ' + e.message, 'error');
  }
}

async function lerPDFCaixa(input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 20 * 1024 * 1024){
    alert('⚠ Arquivo muito grande. O limite máximo permitido é 20 MB.');
    input.value = '';
    return;
  }
  mostrarStatus('⏳ Lendo Simulação Caixa...', 'loading');
  try {
    const texto = await extrairTextoPDF(file);
    if(!texto) { mostrarStatus('❌ Falha na leitura da simulação.', 'error'); return; }
    extrairDadosCaixa(texto);
    document.getElementById('uploadCardCaixa').className = 'upload-card caixa lido-caixa';
    document.getElementById('badgeCaixa').className = 'upload-status-badge ok-caixa';
    mostrarStatus('✅ Simulação Caixa lida! Preencha o gerente e calcule.', 'success');
  } catch(e) {
    mostrarStatus('❌ Erro ao ler simulação: ' + e.message, 'error');
  }
}

async function lerPDFProposta(input){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 20 * 1024 * 1024){
    alert('⚠️ Arquivo muito grande. O limite máximo permitido é 20 MB.');
    input.value = '';
    return;
  }
  mostrarStatusProp('⏳ Lendo Simulação de Proposta...', 'loading');
  try {
    const texto = await extrairTextoPDF(file);
    if(!texto) { mostrarStatusProp('❌ Falha na leitura da proposta.', 'error'); return; }
    extrairDadosProposta(texto);
    document.getElementById('uploadCardProp').className = 'upload-card proposta lido-proposta';
    document.getElementById('badgeProp').className = 'upload-status-badge ok-proposta';
    mostrarStatusProp('✅ Proposta lida! Informe a data de entrega e a renda para calcular.', 'success');
  } catch(e) {
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

function setAuto(id, val){
  const el = document.getElementById(id);
  if(el){
    el.value = sanitizarTexto(val);
    el.classList.remove('auto-filled-caixa');
    el.classList.add('auto-filled');
  }
}

function setAutoCaixa(id, val){
  const el = document.getElementById(id);
  if(!el) return;
  const valSanitizado = sanitizarTexto(val);
  if(id === 'parcelaCaixa' || id === 'renda' || id === 'valorAvaliacao' || id === 'tetoFaixa'){
    const num = parseMoeda(valSanitizado);
    el.value = num > 0 ? formatMoeda(num) : valSanitizado;
  } else {
    el.value = valSanitizado;
  }
  el.classList.remove('auto-filled');
  el.classList.add('auto-filled-caixa');
}

function setAutoProp(id, val){
  const el = document.getElementById(id);
  if(el){
    el.value = sanitizarTexto(val);
    el.classList.add('auto-filled-prop');
  }
}

function setAutoData(id, val) {
  const el = document.getElementById(id);
  if(el){ el.value = sanitizarTexto(val); el.classList.add('auto-filled'); }
}

// =========================================================================
//   6. EXTRAÇÃO E TRATAMENTO DE DADOS (CONTRATO E CAIXA)
// =========================================================================
function detectarTipoContrato(texto){
  if(/EMCASH/i.test(texto) && /FUTURO\s*EMITENTE/i.test(texto)) return 'EMCASH';
  if(/VCRM\s*\d|QUADRO-RESUMO/i.test(texto)) return 'BPM';
  if(/CONT-[A-Z0-9]{5,}-[A-Z0-9]{3,}/i.test(texto)) return 'BPM';
  if(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i.test(texto)) return 'OIC';
  if(/COMPRADOR\(A\)/i.test(texto)) return 'OIC';
  return 'DESCONHECIDO';
}

function extrairDadosContrato(texto){
  const tipo = detectarTipoContrato(texto);
  AppState.tipoContrato = tipo;

  try{
    const nomeM = texto.match(/1[oº°]\s*Cliente[:\s]+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇa-záéíóúãõâêîôûç\s]+?)(?=\s*Nacionalidade|\s*CPF|\s*Estado\s*Civil|\n)/i)
      || texto.match(/COMPRADOR\(A\)[:\s]+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ][A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇa-záéíóúãõâêîôûç\s]+?)(?=\s*Nacionalidade|\s*CPF)/i)
      || texto.match(/Nome\/Nome\s*Empresarial[:\s]+([^\n\|]+?)(?=\s*CPF|\s*RG|\s*\||\n)/i);
    if(nomeM) setAuto('nomeCliente', nomeM[1].trim());

    const cpfM = texto.match(/CPF\/CNPJ[:\s]*([\d]{3}[\.\s]?[\d]{3}[\.\s]?[\d]{3}[\-\s]?[\d]{2})/)
      || texto.match(/CPF[:\s]*([\d]{3}[\.\s]?[\d]{3}[\.\s]?[\d]{3}[\-\s]?[\d]{2})/);
    if(cpfM) setAuto('cpf', cpfM[1].replace(/\s/g,''));

    const contM = texto.match(/N[oº°]\s*do\s*Contrato\s*Emcash[:\s]*(\d+)/i)
      || texto.match(/(CONT-[A-Z0-9]{4,}-[A-Z0-9]{3,})/i)
      || texto.match(/CONT[:\s]*([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
    if(contM) setAuto('numContrato', contM[1]);

    if(tipo === 'EMCASH'){
      let nomeEmp = ''; let nomeBloco = '';
      const descM = texto.match(/Descri[çc][aã]o\s*do\s*im[oó]vel[^:]*:\s*\n?\s*([^\n]+)/i);
      if(descM){
        const desc = descM[1].trim();
        const nomeMatch = desc.match(/^([^,]+?)(?:\s*,\s*(?:Travessa|Rua|Av(?:enida)?|Estrada|Alameda|Al\.|R\.)|\s*,\s*\d)/i);
        nomeEmp = nomeMatch ? nomeMatch[1].trim() : desc.split(',')[0].trim();
        const aptoM = desc.match(/Apto[:\s]*(\d+[A-Z]*)/i);
        const blocoM = desc.match(/Bloco[:\s]*(\d+[A-Z]*)/i);
        if(aptoM && blocoM) nomeBloco = 'Apto ' + aptoM[1] + ' — Bloco ' + blocoM[2];
        else if(aptoM) nomeBloco = 'Apto ' + aptoM[1];
      }
      if(!nomeEmp){
        const empFallM = texto.match(/(?:empreendimento|residencial|condomínio)[:\s"]*([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚa-záéíóúãõ\s]+?)(?=,|\n|"|\.|Travessa|Rua)/i);
        if(empFallM) nomeEmp = empFallM[1].trim();
      }
      if(nomeEmp) setAuto('empreendimento', nomeEmp);
      if(nomeBloco) setAuto('modulo', nomeBloco);
      if(!nomeBloco){
        const aptoGeral = texto.match(/Apto[:\s]*(\d+[A-Z]*)[,\s]*Bloco[:\s]*(\d+[A-Z]*)/i);
        if(aptoGeral) setAuto('modulo', 'Apto ' + aptoGeral[1] + ' — Bloco ' + aptoGeral[2]);
      }
    } else {
      const prodM = texto.match(/Produto[:\s]+([\s\S]+?)(?=CONT[-:\s]|$)/i);
      if(prodM){
        let prod = prodM[1].replace(/\n/g,' ').replace(/\s+/g,' ').trim();
        prod = prod.replace(/CONT[-\s][A-Z0-9\-]+.*/i,'').trim();
        let indiceHifen = prod.indexOf(' - ');
        if(indiceHifen === -1) indiceHifen = prod.indexOf(' – ');
        if(indiceHifen !== -1){
          const emp = prod.substring(0, indiceHifen).trim();
          let modulo = prod.substring(indiceHifen+3).trim();
          modulo = modulo.replace(/\s*[-–]\s*(?:Rio de Janeiro|Maca[eé]|Campos dos Goytacazes|Belo Horizonte|São Paulo).*$/i,'').trim();
          setAuto('empreendimento', emp);
          setAuto('modulo', modulo);
        } else {
          setAuto('empreendimento', prod);
          setAuto('modulo','—');
        }
      }
    }

    const valImovelM = texto.match(/3\.2[^R\n]*R\$\s*([\d.,]+)/i)
      || texto.match(/PRE[ÇC]O\s*DO\s*IM[OÓ]VEL[^R\n]*R\$\s*([\d.,]+)/i)
      || texto.match(/V[oº°]\.\s*Im[oó]vel\s*nesta\s*data[^R\n]*R\$\s*([\d.,]+)/i)
      || texto.match(/Valor\s*Total[:\s]*R\$\s*([\d.,]+)/i);
    if(valImovelM) setAuto('valorImovel','R$ '+valImovelM[1].trim());

    const finM = texto.match(/Valor\s*L[ií]quido\s*do\s*Principal[:\s]*R\$\s*([\d.,]+)/i)
      || texto.match(/4\.1\.4[^R\n]*R\$\s*([\d.,]+)/is)
      || texto.match(/Financiamento\s*Habitacional[^R\n]*R\$\s*([\d.,]+)/i)
      || texto.match(/valor\s*financiado[^R\n]*R\$\s*([\d.,]+)/i);
    if(finM){ setAuto('valorFinanciado','R$ '+finM[1].trim()); calcularPctFinanciado(); }

    const saldoM = texto.match(/4\.1\.2[^R\n]*R\$\s*([\d.,]+)/is);
    if(saldoM) setAuto('saldoCarteira','R$ '+saldoM[1].trim());

    const qtdEmcashM = texto.match(/Quantidade\s*de\s*Parcelas[:\s]*(\d+)/i);
    if(qtdEmcashM) setAuto('qtdParcelas', qtdEmcashM[1]);

    AppState.obraPronta = /por se tratar de obra conclu[ií]da/i.test(texto);
    const entM = texto.match(/5\.1[^:]*:\s*(\d{2}\/\d{2}\/\d{4})/i)
      || texto.match(/Previs[aã]o\s*para\s*(?:a\s*)?entrega\s*das\s*chaves[:\s]*(\d{2}\/\d{2}\/\d{4})/i);

    const parcelas = extrairParcelas(texto, tipo);
    AppState.parcelasTodas = parcelas;

    if(!qtdEmcashM && parcelas.length){
      const max = Math.max(...parcelas.map(p=>p.num));
      setAuto('qtdParcelas', max.toString());
    }

    if(AppState.obraPronta){
      setAutoData('dataEntrega','Obra já entregue');
      AppState.dataEntregaISO = null;
      calcularPsaPsb(parcelas, null, true);
      buscarPrimeiraParcela(parcelas);
    } else if(entM){
      setAutoData('dataEntrega', entM[1]);
      const[d,m,a] = entM[1].split('/').map(Number);
      AppState.dataEntregaISO = new Date(a,m-1,d);
      calcularPsaPsb(parcelas, AppState.dataEntregaISO, false);
      buscarParcelaPosEntrega(parcelas, entM[1]);
    } else if(tipo === 'EMCASH'){
      setAutoData('dataEntrega','Verificar manualmente');
      const primM = texto.match(/Valor\s*da\s*Primeira\s*Parcela[:\s]*R\$\s*([\d.,]+)/i);
      if(primM) setAuto('parcelaMRV','R$ '+primM[1].trim()+' (1ª parcela Emcash)');
      else if(parcelas.length) buscarPrimeiraParcela(parcelas);
      AppState.psbQtd = parcelas.length;
      AppState.psbSaldo = parcelas.reduce((s,p)=>s+p.valorNum,0);
      AppState.parcelasPSB = parcelas;
      document.getElementById('psaQtd').textContent = '—';
      document.getElementById('psaSaldo').textContent = '—';
      document.getElementById('psbQtd').textContent = AppState.psbQtd+' parcelas';
      document.getElementById('psbSaldo').textContent = AppState.psbSaldo>0?formatMoeda(AppState.psbSaldo):'—';
      document.getElementById('psaPsbWrap').style.display = 'grid';
    }

    if(tipo !== 'EMCASH'){
      extrairEntrada(texto);
      extrairIntermediarias(texto);
      renderizarPlano();
    }
  }catch(e){
    console.error('Erro na extração:',e);
    mostrarStatus('⚠️ Leitura parcial do contrato. Verifique os dados.', 'error');
  }
}

function extrairParcelas(texto, tipo){
  const map = new Map();
  if(tipo === 'EMCASH'){
    const regexEmcash = /(\d{1,3})\s+(\d{2}\/\d{2}\/\d{4})\s+R\$([\d.,]+)\s+R\$([\d.,]+)\s+R\$([\d.,]+)/g;
    let m;
    while((m=regexEmcash.exec(texto))!==null){
      const num = parseInt(m[1]); const vencStr = m[2]; const valorNum = parseMoeda(m[6] || m[5]); 
      const[vd,vm,va]= vencStr.split('/').map(Number);
      const venc = new Date(va,vm-1,vd);
      const key = num+'_'+vencStr;
      if(!map.has(key)) map.set(key,{num,valor:m[5],valorNum,vencStr,venc});
    }
  } else if(tipo === 'BPM'){
    const regexBPM = /\b(\d{1,2})\s+([\d]{1,3}[.,][\d]{2})\s+(\d{2}\/\d{2}\/\d{4})/g;
    const regexBPMcomRS = /\b(\d{1,3})\s+R\$\s+([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4})/g;
    let m;
    while((m=regexBPM.exec(texto))!==null){
      const num = parseInt(m[1]); const valStr = m[2]; const vencStr = m[3];
      const valorNum= parseMoeda(valStr);
      if(valorNum < 10) continue;
      const[vd,vm,va]= vencStr.split('/').map(Number);
      const venc = new Date(va,vm-1,vd);
      const key = num+'_'+vencStr;
      if(!map.has(key)) map.set(key,{num,valor:valStr,valorNum,vencStr,venc});
    }
    while((m=regexBPMcomRS.exec(texto))!==null){
      const num = parseInt(m[1]); const valStr = m[2]; const vencStr = m[3];
      const valorNum= parseMoeda(valStr);
      const[vd,vm,va]= vencStr.split('/').map(Number);
      const venc = new Date(va,vm-1,vd);
      const key = num+'_'+vencStr;
      if(!map.has(key)) map.set(key,{num,valor:valStr,valorNum,vencStr,venc});
    }
  } else {
    const regexOIC = /\b(\d{1,3})\s+R\$\s+([\d.,]+)\s+(\d{2}\/\d{2}\/\d{4})/g;
    let m;
    while((m=regexOIC.exec(texto))!==null){
      const num = parseInt(m[1]); const valStr = m[2]; const vencStr = m[3];
      const valorNum= parseMoeda(valStr);
      const[vd,vm,va]= vencStr.split('/').map(Number);
      const venc = new Date(va,vm-1,vd);
      const key = vencStr;
      if(!map.has(key)||num<map.get(key).num) map.set(key,{num,valor:valStr,valorNum,vencStr,venc});
    }
  }
  return [...map.values()].sort((a,b)=>a.venc-b.venc||a.num-b.num);
}

function extrairDadosCaixa(texto){
  try{
    const avalM = texto.match(/Valor\s*de\s*Avalia[çc][aã]o[:\s]*R\$\s*([\d.,]+)/i) || texto.match(/Valor\s*do\s*Im[oó]vel[:\s]*R\$\s*([\d.,]+)/i);
    if(avalM) setAutoCaixa('valorAvaliacao','R$ '+avalM[1].trim());

    const rendaM = texto.match(/Renda\s*Familiar[:\s]*R\$\s*([\d.,]+)/i)
      || texto.match(/Renda\s*Bruta[:\s]*R\$\s*([\d.,]+)/i)
      || texto.match(/Renda\s*Individual[:\s]*R\$\s*([\d.,]+)/i)
      || texto.match(/Renda\s*Familiar[:\s]*([\d.,]+)/i)
      || texto.match(/Renda[:\s]*R\$\s*([\d.,]+)/i);
    if(rendaM){
      const rendaVal = parseMoeda(rendaM[1]);
      setAutoCaixa('renda','R$ '+rendaM[1].trim());
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
    for(const regex of padroesParcela){
      const m = texto.match(regex);
      if(m){ const val = parseMoeda(m[1]); if(val > 50){ parcelaVal = val; break; } }
    }
    if(!parcelaVal){
      const blocoM = texto.match(/Presta[çc][aã]o[\s\S]{0,300}/i);
      if(blocoM){
        const valM = blocoM[0].match(/R\$\s*([\d.,]+)/);
        if(valM){ const val = parseMoeda(valM[1]); if(val > 50) parcelaVal = val; }
      }
    }
    if(parcelaVal > 0) setAutoCaixa('parcelaCaixa', formatMoeda(parcelaVal));
    renderizarPlano();
  }catch(e){console.error('Erro ao ler simulação Caixa:',e);}
}

// =========================================================================
//   7. LÓGICA DE NEGÓCIO, INTERMEDIÁRIAS E CÁLCULOS FINANCEIROS (CONTRATO)
// =========================================================================
function calcularPsaPsb(parcelas, dataEntrega, obraPronta){
  AppState.psaQtd = 0; AppState.psaSaldo = 0; AppState.psbQtd = 0; AppState.psbSaldo = 0; AppState.parcelasPSB = [];
  if(obraPronta){
    for(const p of parcelas){ AppState.psbQtd++; AppState.psbSaldo+=p.valorNum; AppState.parcelasPSB.push(p); }
  }else{
    const m = dataEntrega.getMonth(), a = dataEntrega.getFullYear();
    const inicioPSB = new Date(m===11?a+1:a,(m+1)%12,1);
    for(const p of parcelas){
      if(p.venc<inicioPSB){ AppState.psaQtd++; AppState.psaSaldo+=p.valorNum; }
      else { AppState.psbQtd++; AppState.psbSaldo+=p.valorNum; AppState.parcelasPSB.push(p); }
    }
  }
  document.getElementById('psaQtd').textContent = AppState.psaQtd>0 ? AppState.psaQtd+' parcelas' : '—';
  document.getElementById('psaSaldo').textContent = AppState.psaSaldo>0 ? formatMoeda(AppState.psaSaldo) : '—';
  document.getElementById('psbQtd').textContent = AppState.psbQtd>0 ? AppState.psbQtd+' parcelas' : '—';
  document.getElementById('psbSaldo').textContent = AppState.psbSaldo>0 ? formatMoeda(AppState.psbSaldo) : '—';
  document.getElementById('psaPsbWrap').style.display='grid';
}

function buscarParcelaPosEntrega(parcelas, dataStr){
  const[d,m,a] = dataStr.split('/').map(Number);
  let mesBusca = m+1, anoBusca = a;
  if(mesBusca > 12){ mesBusca = 1; anoBusca++; }
  const inicioBusca = new Date(anoBusca,mesBusca-1,1);
  const encontrada = parcelas.find(p=>p.venc>=inicioBusca);
  if(encontrada) {
    setAuto('parcelaMRV', 'R$ '+encontrada.valor+' (Mensal '+encontrada.num+' — venc. '+encontrada.vencStr+')');
  } else {
    setAuto('parcelaMRV', 'R$ 0,00 (Sem mensais após entrega)');
    alert('ℹ️ AVISO: Nenhuma parcela MRV mensal encontrada após a data de entrega informada.\n\nO campo foi preenchido com R$ 0,00. Verifique se o cliente quitou o saldo, se comprou à vista, ou se há erro na data de entrega.');
  }
}

function buscarPrimeiraParcela(parcelas){
  if(!parcelas.length) {
    setAuto('parcelaMRV', 'R$ 0,00 (Sem parcelas)');
    alert('ℹ️ AVISO: Nenhuma parcela encontrada no contrato.\n\nO campo foi preenchido com R$ 0,00. Verifique se o cliente quitou o saldo ou se a compra foi à vista.');
    return;
  }
  const hoje = new Date(); hoje.setHours(0,0,0,0);
  const futura = parcelas.find(p=>p.venc>=hoje);
  const p = futura || parcelas[0];
  setAuto('parcelaMRV', 'R$ '+p.valor+' (Mensal '+p.num+' — venc. '+p.vencStr+')');
}

function calcularPctFinanciado(){
  const fin = parseMoeda(document.getElementById('valorFinanciado').value);
  const imo = parseMoeda(document.getElementById('valorImovel').value);
  if(!fin || !imo) return;
  const pct = (fin/imo)*100;
  const wrap = document.getElementById('financiadoWrap');
  const badge = document.getElementById('financiadoBadge');
  document.getElementById('pctFinanciadoDisplay').textContent = pct.toFixed(2).replace('.',',')+' %';
  wrap.style.display = 'flex';
  if(pct<75){wrap.className='financiado-wrap fin-verde';badge.className='financiado-badge ok';badge.textContent='✔ Desconto disponível';}
  else if(pct<80){wrap.className='financiado-wrap fin-amarelo';badge.className='financiado-badge aviso';badge.textContent='⚠ Margem reduzida para desconto';}
  else{wrap.className='financiado-wrap fin-vermelho';badge.className='financiado-badge nok';badge.textContent='✘ Limite atingido — sem desconto';}
}

function calcularTetoFaixa(renda){
  const faixaBox = document.getElementById('faixaInfoBox');
  const faixaDetalhe = document.getElementById('faixaDetalhe');
  faixaBox.style.display = 'block';
  if(renda <= 5000){
    setAutoCaixa('tetoFaixa','R$ 275.000,00');
    faixaDetalhe.innerHTML = '<strong>Faixa 1 / 2</strong> — Renda até R$ 5.000,00 → Teto: <strong>R$ 275.000,00</strong>';
  } else {
    setAutoCaixa('tetoFaixa','R$ 400.000,00');
    faixaDetalhe.innerHTML = '<strong>Faixa 3</strong> — Renda acima de R$ 5.000,00 → Teto: <strong>R$ 400.000,00</strong>';
  }
}

function extrairEntrada(texto){
  AppState.entrada = {total:0, pct:'', parcelas:[]};
  const blocoM = texto.match(/4\.1\.1[\s\S]*?(?=4\.1\.2)/i);
  if(!blocoM) return;
  const bloco = blocoM[0];

  const totalM = bloco.match(/R\$\s*([\d.,]+)/);
  if(totalM) AppState.entrada.total = parseMoeda(totalM[1]);

  const pctM = bloco.match(/(\d{1,3}[,.]?\d{0,4})\s*%/);
  if(pctM) AppState.entrada.pct = pctM[1].replace('.',',')+' %';

  const partesForma = bloco.split(/seguinte\s*forma\s*:/i);
  const textoParcelas = partesForma.length > 1 ? partesForma.slice(1).join(' ') : bloco.replace(/4\.1\.1[^R]*R\$\s*[\d.,]+\s*(?:\([^)]*\))?/i, '');
  AppState.entrada.parcelas = extrairParcelasBloco(textoParcelas);
}

function extrairIntermediarias(texto){
  AppState.intermediarias = [];
  const blocoM = texto.match(/4\.1\.3[\s\S]*?(?=4\.1\.4|5\s*[-–.)]\s*DA\s*ENTREGA|$)/i);
  if(!blocoM) return;
  const bloco = blocoM[0];

  const subgrupos = [...bloco.matchAll(/4\.1\.3\.(\d+)([\s\S]*?)(?=4\.1\.3\.\d|$)/gi)];
  if(subgrupos.length > 0){
    for(const sg of subgrupos){
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
    if(total > 0 || parcelas.length > 0) AppState.intermediarias.push({grupo:1, total, parcelas});
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

function extrairParcelasBloco(textoBloco){
  const parcelas = [];
  if (!textoBloco) return parcelas;
  const limpo = textoBloco.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');

  // 1. Valores pagos no ato / Carta de Crédito
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

  // 2. Padrão OIC e BPM ("vencível em", "vencível dia", "vencíveis anualmente a partir de")
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

  // 3. Fallback simplificado
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

function renderizarPlano(){
  const wrap = document.getElementById('planoWrap'); const body = document.getElementById('planoBody');
  const temEntrada = AppState.entrada.total > 0 || AppState.entrada.parcelas.length > 0; 
  const temInter = AppState.intermediarias.length > 0;
  if(!temEntrada && !temInter){ wrap.style.display = 'none'; return; }
  
  wrap.style.display = 'block';
  const valorImovel = parseMoeda(document.getElementById('valorImovel').value);
  const rendaAtual = parseMoeda(document.getElementById('renda').value);
  let html = '';

  if(temEntrada){
    const totalStr = AppState.entrada.total > 0 ? formatMoeda(AppState.entrada.total) : '—';
    let pctStr = '';
    if(AppState.entrada.pct) pctStr = `<span class="plano-badge-pct">${sanitizarTexto(AppState.entrada.pct)}</span>`;
    else if(valorImovel > 0 && AppState.entrada.total > 0){
      const pctCalc = ((AppState.entrada.total / valorImovel) * 100).toFixed(2).replace('.',',');
      pctStr = `<span class="plano-badge-pct">${pctCalc} %</span>`;
    }
    html += `<div class="plano-secao open" id="secaoEntrada"><div class="plano-secao-titulo" data-secao="secaoEntrada"><span class="ps-esq">💰 Entrada</span><span class="ps-dir"><span class="plano-badge-total">${totalStr}</span>${pctStr}<span class="plano-chevron">▼</span></span></div><div class="plano-conteudo"><ul class="entrada-lista">`;
    if(AppState.entrada.parcelas.length > 0){
      AppState.entrada.parcelas.forEach((p,i)=>{
        const u = i === AppState.entrada.parcelas.length - 1;
        const qtd = p.qtd || 1;
        const valLabel = qtd > 1 ? `${qtd}x de ${formatMoeda(p.valor)}` : formatMoeda(p.valor);
        const vencLabel = p.resumoVenc || p.venc;
        html += `<li><span class="el-num">${u?'└':'├'}</span><span class="el-val">${valLabel}</span><span class="el-venc">📅 ${sanitizarTexto(vencLabel)}</span></li>`;
      });
    } else {
      html += `<li style="color:#999;font-style:italic;justify-content:center;">Parcelas da entrada não identificadas individualmente.</li>`;
    }
    html += `</ul></div></div>`;
  }

  const totalInter = AppState.intermediarias.reduce((s,g) => s + g.total, 0);
  let pctInterStr = '';
  if(valorImovel > 0 && totalInter > 0){
    const pctCalc = ((totalInter / valorImovel) * 100).toFixed(2).replace('.',',');
    pctInterStr = `<span class="plano-badge-pct roxo">${pctCalc} %</span>`;
  }
  html += `<div class="plano-secao open" id="secaoInter"><div class="plano-secao-titulo" data-secao="secaoInter"><span class="ps-esq">🔀 Intermediárias</span><span class="ps-dir"><span class="plano-badge-total">${totalInter>0?formatMoeda(totalInter):'—'}</span>${pctInterStr}<span class="plano-chevron">▼</span></span></div><div class="plano-conteudo">`;
  if(!temInter){
    html
