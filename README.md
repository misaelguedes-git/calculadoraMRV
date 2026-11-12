<div align="center">

# Calculadora de Comprometimento de Renda MRV / Emcash

Ferramenta web nacional para automatizar e padronizar a análise de comprometimento de renda em contratos de financiamento imobiliário e a pré-análise de propostas comerciais.

[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-00843D?logo=github)](https://misaelguedes-git.github.io/calculadoraMRV/)
[![Versão](https://img.shields.io/badge/vers%C3%A3o-3.0-F58220)](#changelog)
[![PWA](https://img.shields.io/badge/PWA-instal%C3%A1vel-5A0FC8?logo=pwa&logoColor=white)](#instalação-como-app-pwa)
[![Privacidade](https://img.shields.io/badge/LGPD-processamento%20local-00843D)](#privacidade-e-segurança)
[![Stack](https://img.shields.io/badge/stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-555555)](#tecnologias)

[**Acessar a ferramenta**](https://misaelguedes-git.github.io/calculadoraMRV/) · [Documentação completa (PDF)](./Documentacao_Calculadora_Comprometimento_Renda_v3.pdf) · [Reportar problema](../../issues)

</div>

---

## Sumário

- [Sobre](#sobre)
- [Funcionalidades](#funcionalidades)
- [Privacidade e segurança](#privacidade-e-segurança)
- [Como usar](#como-usar)
- [Regras de cálculo](#regras-de-cálculo)
- [Extração automática de dados](#extração-automática-de-dados)
- [Instalação como app (PWA)](#instalação-como-app-pwa)
- [Tecnologias](#tecnologias)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Ambientes e fluxo de trabalho](#ambientes-e-fluxo-de-trabalho)
- [Executando localmente](#executando-localmente)
- [Limitações conhecidas](#limitações-conhecidas)
- [Solução de problemas](#solução-de-problemas)
- [Changelog](#changelog)
- [Autor](#autor)

## Sobre

A **Calculadora de Comprometimento de Renda** é uma ferramenta de uso interno das equipes comerciais e de crédito imobiliário da MRV em todo o Brasil. Ela lê documentos em PDF (contrato MRV/Emcash, simulação da Caixa Econômica Federal e simulação de proposta CRM/Salesforce ou CAPA), extrai os dados relevantes e calcula, em segundos, o percentual de renda comprometida, indicando o enquadramento regional, o impacto de parcelas intermediárias críticas e a necessidade de desconto no Pró-Soluto.

Todo o processamento dos documentos acontece localmente no navegador do usuário. Não há backend, banco de dados nem envio de arquivos.

A ferramenta possui duas abas (com **Comprometimento de Renda** definida como tela padrão à esquerda):

| Aba | Entrada | Objetivo |
| --- | --- | --- |
| **Comprometimento de Renda** *(Padrão)* | PDF do contrato (OIC, BPM ou Emcash) e PDF da Simulação Caixa | Calcular o comprometimento total (Caixa + MRV) conforme o teto da regional, avaliar picos de intermediárias e analisar desconto. |
| **Simulação de Proposta** *(Pré-análise MRV)* | PDF da Simulação de Proposta (Salesforce/CRM ou CAPA) | Verificar se as parcelas MRV cabem no teto regional antes da contratação e alertar sobre parcelas críticas (≥ 50% da renda). |

## Funcionalidades

- **Painel Lateral de Parametrização Regional**: permite ajustar o teto máximo de comprometimento total (ex: `35%`, `38%`, `40%`, `45%` ou valor personalizado), mantendo o teto da Caixa fixo em `30%` e recalculando automaticamente o teto MRV e os resultados abertos na tela.
- **Alerta de Pico Mensal e Intermediárias Críticas (≥ 50% da Renda)**: identifica automaticamente parcelas do Grupo 1 (no Contrato) ou parcelas de fluxo (na Proposta) que comprometam metade ou mais da renda mensal, exibindo um banner detalhado com a soma real do mês (`Intermediária + Parcela Caixa + Parcela MRV do mês`) e alterando o status para **Atenção**.
- **Leitura automática de PDFs**, com arrastar e soltar (*drag & drop*) ou seleção de arquivo.
- **Detecção inteligente de layouts**: suporta contratos **OIC**, **BPM** (incluindo Carta de Crédito no ato e parcelas periódicas/anuais agrupadas) e **Emcash**, além de propostas **Salesforce/CRM** e **CAPA / Quadro-Resumo**.
- **Cruzamento com a Simulação da Caixa**: valor de avaliação, renda, prestação mensal e enquadramento de teto de faixa.
- **Cálculo em duas versões**: pela **1ª parcela do PSB** (principal/conservadora) e pela **média das parcelas do PSB** (secundária).
- **Análise de desconto no Pró-Soluto**: parcela MRV ideal, redução por parcela, projeção do nº de parcelas ideal e desconto total estimado no fluxo do PSB.
- **Indicador do percentual financiado**, com alerta de margem para desconto (até o limite de 80%).
- **Resumo copiável** (incluindo os alertas de pico mensal) para colar no sistema da empresa e **impressão em A4** com layout dedicado.

## Privacidade e segurança

A ferramenta segue rigorosamente os princípios de *Privacy by Design* (LGPD):

| Medida | Descrição |
| --- | --- |
| **Processamento local** | O PDF é lido no próprio dispositivo. Nenhum arquivo ou dado de cliente é enviado a servidores ou salvo em nuvem. |
| **Sem histórico** | Nada é gravado no navegador. Ao recarregar a página, todos os dados são apagados. |
| **Limite de arquivo** | PDFs acima de 20 MB são bloqueados, evitando travamentos. |
| **Sanitização (Anti-XSS)** | Textos extraídos dos PDFs são sanitizados antes de serem inseridos na página. |
| **CSP** | Política de segurança de conteúdo limita a origem de scripts e recursos (`self` e `cdnjs.cloudflare.com`). |

> [!IMPORTANT]
> Este repositório é público e não deve conter contratos, propostas, simulações ou qualquer dado real de clientes. Use apenas arquivos fictícios em testes e capturas de tela.

## Como usar

### 1. Parametrização Regional (Barra Lateral)

Antes ou depois de realizar um cálculo, utilize o painel **Parâmetros da Regional** (à esquerda no computador ou no topo no celular) para selecionar o percentual máximo de comprometimento total permitido na sua praça (`35% Padrão`, `38%`, `40%`, `45%` ou um valor personalizado). O sistema recalcula os resultados instantaneamente.

### 2. Aba "Comprometimento de Renda" (Tela Inicial)

1. Arraste o **Contrato** (OIC, BPM ou Emcash) para a área tracejada verde.
2. Arraste a **Simulação Caixa** para a área tracejada azul.
3. Confira os campos `AUTO` e `CAIXA`, preenchidos automaticamente, e o detalhamento de Entrada e Intermediárias no **Plano de Pagamento**.
4. Preencha o campo `MANUAL` (**Correspondente / Gerente / Corretor Responsável**).
5. Clique em **Calcular Comprometimento**.
6. Analise o resultado, eventuais alertas de **Pico Mensal (Intermediária Grupo 1)** e utilize **Copiar** ou **Imprimir**.

### 3. Aba "Simulação de Proposta"

1. Selecione ou arraste o **PDF da Simulação de Proposta MRV** (gerado no Salesforce/CRM ou CAPA).
2. Confira os campos `AUTO` e o **Resumo Financeiro da Proposta**.
3. Preencha os campos `MANUAL`: **Data Prevista de Entrega** e **Renda do Cliente** (e, opcionalmente, a **Parcela Caixa** caso deseje somá-la no pico mensal).
4. Clique em **Calcular Comprometimento MRV**.
5. Use **Copiar Resultado** ou **Imprimir**.

> [!NOTE]
> Sempre utilize as informações atualizadas da proposta do cliente.

## Regras de cálculo

### Siglas

- **PSA (Pró-Soluto A, pré-entrega):** parcelas MRV com vencimento antes do mês seguinte ao da entrega das chaves.
- **PSB (Pró-Soluto B, pós-entrega):** parcelas MRV com vencimento a partir do 1º dia do mês seguinte ao da entrega. São elas que compõem o risco de comprometimento contínuo.

### Comprometimento de renda (Contrato + Caixa)

```text
Comprometimento Total = (Parcela Caixa + Parcela MRV) / Renda
```

O **Teto Caixa** permanece fixo em **30%**, enquanto o **Teto MRV** é calculado dinamicamente pela diferença (`Teto Total Parametrizado − 30%`). Para o padrão de **35%**:

| Comprometimento Total | Status | Indicador | Ação recomendada |
| --- | --- | --- | --- |
| Até o Teto (`35%` padrão) | Aprovado *(ou Atenção se houver Interm. G1 ≥ 50%)* | Verde / Amarelo | Fluxo normal (ou avaliação individual se houver pico de intermediária). |
| De `Teto + 0,01%` até `Teto + 2%` (`35,01%` a `37%` padrão) | Atenção | Amarelo / Laranja | Avaliar individualmente: manter o contrato ou refazer a venda. |
| Acima de `Teto + 2%` (`37%` padrão) | Reprovado | Vermelho | Necessário readequar o fluxo ou aplicar desconto. |

> [!NOTE]
> A calculadora utiliza a **primeira parcela do PSB** como cálculo principal por ser a mais alta do plano decrescente (análise conservadora), exibindo a **média das parcelas do PSB** como referência secundária.

### Alerta de Pico Mensal e Intermediárias (≥ 50% da Renda)

- **Na aba Comprometimento de Renda:** Sempre que uma parcela de intermediária do **Grupo 1** (`item 4.1.3.1`) representar **50% ou mais** da renda mensal do cliente, ela é destacada em vermelho no *Plano de Pagamento*, o status geral muda automaticamente para **ATENÇÃO** e um banner exibe a soma total do mês (`Intermediária Grupo 1 + Parcela Caixa + Parcela Mensal MRV do mesmo mês`). Parcelas periódicas (ex: anuais) são exibidas de forma agrupada.
- **Na aba Simulação de Proposta:** Qualquer parcela do fluxo (exceto o bônus *Bom Pagador*) que atinja **50% ou mais** da renda dispara o alerta de pico mensal somando `Parcela da Proposta + Mensal MRV do mês` (e a `Parcela Caixa`, caso tenha sido informada manualmente).

### Pré-análise da proposta

Na aba de proposta, apenas a parcela MRV (mensais do PSB) é comparada com o **Teto MRV parametrizado** (`5%` no padrão de `35%`):

| Parcela MRV / Renda | Status |
| --- | --- |
| Até 70% do Teto MRV (`3,5%` no padrão) | Dentro do teto *(ou Atenção se houver pico ≥ 50%)* |
| De 70,01% até 100% do Teto MRV (`3,51%` a `5%` no padrão) | Atenção |
| Acima do Teto MRV (`5%` no padrão) | Acima do teto |

### Compra à vista, quitação prévia e obra entregue

- Se não houver parcelas após a entrega das chaves, a ferramenta avisa e assume **Parcela MRV = R$ 0,00**. O cálculo segue apenas com a parcela da Caixa.
- Se o contrato indicar obra já concluída, a data de entrega aparece como `"Obra já entregue"` e todas as parcelas contam como PSB.

### Análise de desconto e percentual financiado

Três limites são avaliados simultaneamente: **Teto Caixa (30%)**, **Teto MRV (`Teto Total − 30%`)** e **Teto Total Parametrizado**. Em caso de reprovação por parcela MRV acima do teto, a ferramenta calcula a parcela ideal, a redução necessária, a quantidade de parcelas ideal, o desconto total estimado no PSB e verifica se a margem até **80% de financiamento** (`(80% − % financiado) × valor do imóvel`) cobre a redução.

| % do imóvel financiado | Indicador |
| --- | --- |
| Abaixo de 75% | Desconto disponível |
| 75% a menos de 80% | Margem reduzida para desconto |
| 80% ou mais | Desconto bloqueado por limite de margem bancária |

## Extração automática de dados

| Campo | Tipo | Origem |
| --- | --- | --- |
| Nome do Cliente | `AUTO` | OIC: `COMPRADOR(A)`. BPM: `1º Cliente`. Emcash: `Nome/Nome Empresarial`. |
| CPF | `AUTO` | Formato padrão (`000.000.000-00`). Emcash: campo `CPF/CNPJ`. |
| Número do Contrato | `AUTO` | OIC: UUID. BPM: `CONT-XXXXXX-XXXXXX`. Emcash: número do contrato. |
| Empreendimento / Bloco / Unidade | `AUTO` | OIC/BPM: campo `Produto`. Emcash: descrição do imóvel (endereço). |
| Valor do Imóvel | `AUTO` | OIC: `PREÇO DO IMÓVEL`. BPM: item `3.2`. Emcash: `Valor Total`. |
| Data de Entrega Prevista | `AUTO` / `MANUAL` | OIC/BPM: item `5.1` do contrato. Emcash: preenchimento manual. |
| Valor de Avaliação | `CAIXA` | Lido do PDF da Caixa. |
| Teto Faixa do Cliente | `CALCULADO` | Renda até R$ 5.000: teto R$ 275 mil. Acima: teto R$ 400 mil. |
| Valor Financiado | `AUTO` | OIC/BPM: item `4.1.4`. Emcash: `Valor Líquido do Principal`. |
| Saldo Carteira MRV | `AUTO` | OIC/BPM: item `4.1.2` (Pró-Soluto). Não se aplica ao Emcash. |
| Entrada e Intermediárias | `AUTO` | OIC/BPM: itens `4.1.1` (incluindo Carta de Crédito no ato) e `4.1.3` (Grupos 1 e 2). |
| Parcela MRV / Emcash | `AUTO` | OIC/BPM: 1ª parcela a partir do mês seguinte à entrega (PSB). Emcash: `Valor da Primeira Parcela`. |
| Quantidade de Parcelas | `AUTO` | OIC/BPM: maior número de parcela encontrado. Emcash: `Quantidade de Parcelas`. |
| Parcela Caixa / Renda | `CAIXA` | Lidos da folha de simulação bancária (1ª prestação, renda bruta ou individual). |
| Correspondente / Gerente | `MANUAL` | Digitado pelo usuário. |

## Instalação como app (PWA)

| Plataforma | Como instalar |
| --- | --- |
| **Computador (Chrome/Edge)** | Clique no ícone "Instalar" na barra de endereços. |
| **Android (Chrome)** | Toque no banner "Adicionar à tela inicial". |
| **iPhone (Safari)** | Compartilhar, depois "Adicionar à Tela de Início". |

> [!WARNING]
> A biblioteca de leitura de PDF (`pdf.js`) é carregada de uma CDN e não faz parte do cache do Service Worker. O uso sem internet depende do cache do navegador e não é garantido.

## Tecnologias

- **HTML5, CSS3 e JavaScript puro (Vanilla JS)**, sem framework nem etapa de build, em um único arquivo por ambiente.
- **[pdf.js](https://mozilla.github.io/pdf.js/) v3.11.174**, via CDN (`cdnjs.cloudflare.com`), para leitura dos PDFs.
- **Service Worker (`sw.js`)** com estratégia *network-first* e **Web App Manifest (`manifest.json`)** para instalação como PWA.
- **GitHub Pages** para hospedagem estática.

## Estrutura do repositório

```text
calculadoraMRV/
├── assets/                  # Logo e ícones do PWA
├── index.html               # Versão OFICIAL (divulgada para gerentes, correspondentes e analistas)
├── teste.html               # Ambiente de testes (implementação de mudanças)
├── simulador.html           # Redirecionamento do link antigo para a versão oficial
├── manifest.json            # Manifesto do PWA
├── sw.js                    # Service Worker (cache mrv-calc-v8.0)
├── Documentacao_Calculadora_Comprometimento_Renda_v3.pdf
├── Documentacao_Calculadora_Comprometimento_Renda_v2.pdf
├── Documentacao_Calculadora_MRV.pdf
└── README.md
```

## Ambientes e fluxo de trabalho

| Ambiente | Endereço | Uso |
| --- | --- | --- |
| **Oficial** | `https://misaelguedes-git.github.io/calculadoraMRV/` | Versão divulgada ao público interno. |
| **Testes** | `https://misaelguedes-git.github.io/calculadoraMRV/teste.html` | Validação de mudanças antes de publicar. |
| **Legado** | `https://misaelguedes-git.github.io/calculadoraMRV/simulador.html` | Redireciona automaticamente para o oficial. |

### Como publicar uma mudança

1. Implemente e valide no `teste.html`, usando apenas arquivos fictícios.
2. Copie o conteúdo de `teste.html` para `index.html`.
3. Incremente a constante `CACHE` em `sw.js` caso altere arquivos estáticos.
4. Faça o commit na branch `main` e valide em janela anônima.

## Executando localmente

```bash
git clone [https://github.com/misaelguedes-git/calculadoraMRV.git](https://github.com/misaelguedes-git/calculadoraMRV.git)
cd calculadoraMRV

# Python
python -m http.server 8000

# ou Node.js
npx serve .
```

Acesse `http://localhost:8000` (oficial) ou `http://localhost:8000/teste.html` (testes).

## Limitações conhecidas

- A extração depende do **texto do PDF**. PDFs digitalizados (imagem), protegidos por senha ou com layout muito diferente do esperado não são lidos corretamente.
- Os resultados são **projeções estimadas** e não substituem a análise formal do financeiro MRV e da Caixa.
- Em contratos Emcash, a data de entrega deve ser informada manualmente.

## Solução de problemas

| Ocorrência | Causa / Solução |
| --- | --- |
| **PDF protegido por senha ou corrompido** | A leitura é abortada. Salve o PDF novamente sem senha de abertura. |
| **PDF sem texto (digitalizado)** | A ferramenta avisa que não há texto extraível. Use o PDF original gerado pelo sistema. |
| **Arquivo acima de 20 MB** | O arquivo é bloqueado. Gere uma versão menor. |
| **"Nenhuma parcela mensal encontrada"** | O contrato termina antes das chaves. Confirme a data de entrega e prossiga (o sistema usa R$ 0,00). |
| **Campos `AUTO` em branco** | Padrão de contrato muito diferente do esperado. Preencha manualmente e calcule. |
| **Layout quebrado ou desatualizado** | Limpe o cache com `Ctrl + Shift + R` (Windows). |

## Changelog

### 3.0 (novembro de 2026): Edição Nacional e Análise de Pico Mensal

- **Painel Lateral de Parametrização Regional**: seletor rápido (`35%`, `38%`, `40%`, `45%`) e controle deslizante/numérico para adaptar o teto máximo de comprometimento total às regras de qualquer regional do Brasil, mantendo o teto Caixa fixo em 30%.
- **Alerta de Pico Mensal e Intermediárias Críticas (≥ 50% da Renda)**: detecção automática de parcelas do Grupo 1 (Contrato) e parcelas altas (Proposta) que atinjam 50% ou mais da renda, exibindo banner com a soma completa do mês (`Intermediária + Caixa + Mensal MRV do mês`) e alterando o status para **Atenção**.
- **Aprimoramento do Leitor de Contrato (OIC e BPM)**: reconhecimento de Carta de Crédito paga no ato, vencimentos com redação `"vencível dia"`, parênteses por extenso e agrupamento resumido de parcelas periódicas (anuais, semestrais, etc.).
- **Simulador de Proposta Híbrido**: suporte ao PDF padrão do Simulador Salesforce/CRM e ao formato CAPA/Quadro-Resumo, com opção de somar apenas parcelas MRV ou incluir parcela Caixa manual.
- **Nova Navegação Padrão**: aba **Comprometimento de Renda (Contrato + Caixa)** posicionada à esquerda como tela inicial padrão.

### 2.0 (setembro de 2026): Edição de Segurança e Privacidade

- Processamento local dos PDFs e ausência de histórico no navegador.
- Bloqueio de PDFs acima de 20 MB e sanitização contra XSS.
- Faixa de "Atenção" ajustada para 35,01% a 37%, com ação recomendada.
- Cálculo pela 1ª parcela do PSB documentado como metodologia conservadora.
- Projeção do número de parcelas ideal na análise de desconto.
- Atalho `Enter` para calcular.
- Reorganização do repositório em ambientes oficial (`index.html`) e de testes (`teste.html`), com redirecionamento do link antigo.

## Autor

**Misael Guedes Bispo**  
[@misaelguedes-git](https://github.com/misaelguedes-git)
