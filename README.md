<div align="center">

# Calculadora de Comprometimento de Renda MRV / Emcash

Ferramenta web para automatizar e padronizar a pré-análise de proposta e a análise de comprometimento de renda em contratos de financiamento imobiliário.

[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-00843D?logo=github)](https://misaelguedes-git.github.io/calculadoraMRV/)
[![Versão](https://img.shields.io/badge/vers%C3%A3o-2.0-F58220)](#changelog)
[![PWA](https://img.shields.io/badge/PWA-instal%C3%A1vel-5A0FC8?logo=pwa&logoColor=white)](#instalação-como-app-pwa)
[![Privacidade](https://img.shields.io/badge/LGPD-processamento%20local-00843D)](#privacidade-e-segurança)
[![Stack](https://img.shields.io/badge/stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-555555)](#tecnologias)

[**Acessar a ferramenta**](https://misaelguedes-git.github.io/calculadoraMRV/) · [Documentação completa (PDF)](./Documentacao_Calculadora_Comprometimento_Renda_v2.pdf) · [Reportar problema](../../issues)

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

A **Calculadora de Comprometimento de Renda** é uma ferramenta de uso interno da equipe comercial. Ela lê documentos em PDF (proposta MRV, contrato MRV/Emcash e simulação da Caixa Econômica Federal), extrai os dados relevantes e calcula, em segundos, o percentual de renda comprometida, indicando se o caso está enquadrado ou se precisa de desconto no Pró-Soluto.

Todo o processamento dos documentos acontece no navegador do usuário. Não há backend, banco de dados nem envio de arquivos.

A ferramenta tem duas abas:

| Aba | Entrada | Objetivo |
| --- | --- | --- |
| **Simulação de Proposta** (pré-análise MRV) | PDF da Simulação de Proposta MRV | Verificar se a parcela MRV cabe no teto de 5% da renda antes da contratação. |
| **Comprometimento de Renda** (contrato + Caixa) | PDF do contrato (OIC, BPM ou Emcash) e PDF da Simulação Caixa | Calcular o comprometimento total (Caixa + MRV) e analisar desconto. |

## Funcionalidades

- **Leitura automática de PDFs**, com arrastar e soltar ou seleção de arquivo.
- **Detecção do tipo de contrato** (OIC, BPM ou Emcash) e extração ajustada a cada layout.
- **Cruzamento com a Simulação da Caixa**: valor de avaliação, renda, parcela e teto de faixa.
- **Cálculo em duas versões**: pela **1ª parcela do PSB** (principal) e pela **média das parcelas do PSB** (secundária).
- **Matriz de enquadramento** com status e indicador visual (verde, amarelo e vermelho).
- **Análise de desconto no Pró-Soluto**: parcela MRV ideal, redução por parcela, projeção do nº de parcelas ideal e desconto total estimado no fluxo do PSB.
- **Indicador do percentual financiado**, com alerta de margem para desconto.
- **Plano de pagamento** (entrada e intermediárias) extraído de contratos OIC e BPM.
- **Fluxo mês a mês** da proposta, com classificação em PSA e PSB.
- **Resumo copiável** para colar no sistema da empresa e **impressão em A4** com layout próprio.

## Privacidade e segurança

A versão 2.0 foi construída sob os princípios de *Privacy by Design* (LGPD):

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

### Aba "Simulação de Proposta"

1. Selecione ou arraste o **PDF da Simulação de Proposta MRV**.
2. Confira os campos `AUTO` (empreendimento, unidade, valor do imóvel, valor da proposta) e o resumo financeiro.
3. Preencha os campos `MANUAL`: **Data Prevista de Entrega** e **Renda do Cliente**.
4. Clique em **Calcular Comprometimento MRV**.
5. Use **Copiar Resultado** ou **Imprimir**.

### Aba "Comprometimento de Renda"

1. Arraste o **Contrato** (MRV ou Emcash) para a área tracejada verde.
2. Arraste a **Simulação Caixa** para a área tracejada azul.
3. Confira os campos `AUTO` e `CAIXA`, preenchidos automaticamente.
4. Preencha os campos `MANUAL` (Correspondente/Gerente e, se necessário, data de entrega e renda).
5. Clique em **Calcular Comprometimento**.
6. Analise o resultado e use **Copiar** para levar o resumo ao sistema da empresa, ou **Imprimir**.

> [!NOTE]
> Sempre utilize as informações atualizadas da proposta do cliente.

## Regras de cálculo

### Siglas

- **PSA (Pró-Soluto A, pré-entrega):** parcelas MRV com vencimento antes do mês seguinte ao da entrega das chaves.
- **PSB (Pró-Soluto B, pós-entrega):** parcelas MRV com vencimento a partir do 1º dia do mês seguinte ao da entrega. São elas que compõem o risco de comprometimento.

### Comprometimento de renda (contrato + Caixa)

```
Comprometimento Total = (Parcela Caixa + Parcela MRV) / Renda
```

> [!NOTE]
> A calculadora usa a **primeira parcela do PSB**. Como o plano de amortização é decrescente, ela é a mais alta, o que representa o cenário de maior comprometimento e torna a análise conservadora. A **média das parcelas do PSB** é exibida como versão secundária.

| Comprometimento Total | Status | Indicador | Ação recomendada |
| --- | --- | --- | --- |
| Até 35% | Aprovado | Verde | Fluxo normal. |
| 35,01% a 37% | Atenção | Amarelo / Laranja | Avaliar individualmente: manter o contrato ou refazer a venda. |
| Acima de 37% | Reprovado | Vermelho | Necessário readequar o fluxo. |

### Pré-análise da proposta

Na aba de proposta, apenas a parcela MRV (mensais do PSB) é comparada com o **teto de 5% da renda**:

| Parcela MRV / Renda | Status |
| --- | --- |
| Até 3,5% | Dentro do teto |
| 3,51% a 5% | Atenção |
| Acima de 5% | Acima do teto |

Quando excede o teto, a ferramenta calcula a redução necessária por parcela e o excedente total no PSB. O resultado é sempre uma **projeção estimada**, sujeita à aprovação do financeiro MRV e da Caixa.

### Compra à vista, quitação prévia e obra entregue

- Se não houver parcelas após a entrega das chaves, a ferramenta avisa e assume **Parcela MRV = R$ 0,00**. O cálculo segue apenas com a parcela da Caixa.
- Se o contrato indicar obra já concluída, a data de entrega aparece como "Obra já entregue" e todas as parcelas contam como PSB.

### Análise de desconto

Três limites são avaliados ao mesmo tempo:

| Limite | Máximo |
| --- | --- |
| MRV / Carteira | 5% da renda |
| Caixa | 30% da renda |
| Total | 35% da renda |

Em caso de reprovação por causa da parcela da construtora, a ferramenta exibe:

- a **parcela MRV ideal** (5% da renda);
- a **redução necessária por parcela**;
- a **projeção de quantas parcelas** o contrato deveria ter para se enquadrar;
- o **desconto total estimado** no fluxo do PSB (redução proporcional aplicada a cada parcela);
- o **desconto máximo disponível**, calculado como `(80% − % financiado) × valor do imóvel`, e se ele cobre o necessário.

Se a parcela da Caixa passar de 30% da renda, o ajuste não é possível por desconto MRV, pois esse limite é controlado pela Caixa.

### Percentual financiado

| % do imóvel financiado | Indicador |
| --- | --- |
| Abaixo de 75% | Desconto disponível |
| 75% a menos de 80% | Margem reduzida para desconto |
| 80% ou mais | Desconto bloqueado por limite de margem bancária |

## Extração automática de dados

O tipo de contrato é detectado automaticamente e a extração se ajusta a ele.

| Campo | Tipo | Origem |
| --- | --- | --- |
| Nome do Cliente | `AUTO` | OIC: "COMPRADOR(A)". BPM: "1º Cliente". Emcash: "Nome/Nome Empresarial". |
| CPF | `AUTO` | Formato padrão (000.000.000-00). Emcash: campo "CPF/CNPJ". |
| Número do Contrato | `AUTO` | OIC: UUID. BPM: `CONT-XXXXXX-XXXXXX`. Emcash: número do contrato. |
| Empreendimento / Bloco / Unidade | `AUTO` | OIC/BPM: campo "Produto". Emcash: descrição do imóvel (endereço). |
| Valor do Imóvel | `AUTO` | OIC: "Preço do Imóvel". BPM: item 3.2. Emcash: "Valor Total". |
| Data de Entrega Prevista | `AUTO` / `MANUAL` | OIC/BPM: item 5.1 do contrato. Emcash: preenchimento manual. |
| Valor de Avaliação | `CAIXA` | Lido do PDF da Caixa. |
| Teto Faixa do Cliente | `CALCULADO` | Renda até R$ 5.000: teto R$ 275 mil. Acima: teto R$ 400 mil. |
| Valor Financiado | `AUTO` | OIC/BPM: item 4.1.4. Emcash: "Valor Líquido do Principal". |
| Saldo Carteira MRV | `AUTO` | OIC/BPM: item 4.1.2 (Pró-Soluto). Não se aplica ao Emcash. |
| Parcela MRV / Emcash | `AUTO` | OIC/BPM: 1ª parcela a partir do mês seguinte à entrega (PSB). Emcash: "Valor da Primeira Parcela". |
| Quantidade de Parcelas | `AUTO` | OIC/BPM: maior número de parcela encontrado. Emcash: "Quantidade de Parcelas". |
| Parcela Caixa / Renda | `CAIXA` | Lidos da folha de simulação bancária (1ª prestação, renda bruta ou individual). |
| Correspondente / Gerente | `MANUAL` | Digitado pelo usuário. |

## Instalação como app (PWA)

| Plataforma | Como instalar |
| --- | --- |
| **Computador (Chrome/Edge)** | Clique no ícone "Instalar" na barra de endereços. |
| **Android (Chrome)** | Toque no banner "Adicionar à tela inicial". |
| **iPhone (Safari)** | Compartilhar, depois "Adicionar à Tela de Início". |

> [!WARNING]
> A biblioteca de leitura de PDF (`pdf.js`) é carregada de uma CDN e não faz parte do cache do Service Worker. O uso sem internet depende do cache do navegador e não é garantido. Para uso offline confiável, a biblioteca precisa ser hospedada no repositório e incluída no cache.

## Tecnologias

- **HTML5, CSS3 e JavaScript puro (Vanilla JS)**, sem framework nem etapa de build, em um único arquivo por ambiente.
- **[pdf.js](https://mozilla.github.io/pdf.js/) v3.11.174**, via CDN (`cdnjs.cloudflare.com`), para leitura dos PDFs.
- **Service Worker (`sw.js`)** com estratégia *network-first* e **Web App Manifest (`manifest.json`)** para instalação como PWA.
- **GitHub Pages** para hospedagem estática.

Arquitetura *client-side*: sem banco de dados, sem armazenamento local de histórico e sem chamadas a backend.

## Estrutura do repositório

```
calculadoraMRV/
├── assets/                 # Logo e imagens
├── index.html              # Versão OFICIAL (divulgada para gerentes, correspondentes e analistas)
├── teste.html              # Ambiente de testes (implementação de mudanças)
├── simulador.html          # Redirecionamento do link antigo para a versão oficial
├── manifest.json           # Manifesto do PWA
├── sw.js                   # Service Worker
├── Documentacao_Calculadora_Comprometimento_Renda_v2.pdf
├── Documentacao_Calculadora_MRV.pdf   # Documentação anterior
└── README.md
```

## Ambientes e fluxo de trabalho

| Ambiente | Endereço | Uso |
| --- | --- | --- |
| **Oficial** | `https://misaelguedes-git.github.io/calculadoraMRV/` | Versão divulgada ao público interno. |
| **Testes** | `https://misaelguedes-git.github.io/calculadoraMRV/teste.html` | Validação de mudanças antes de publicar. |
| **Legado** | `https://misaelguedes-git.github.io/calculadoraMRV/simulador.html` | Redireciona automaticamente para o oficial. Mantido para não quebrar links já divulgados. |

### Como publicar uma mudança

1. Implemente e valide no `teste.html`, usando apenas arquivos fictícios.
2. Copie o conteúdo de `teste.html` para `index.html` (no site: abra `teste.html`, clique em **Raw**, copie tudo e cole no editor do `index.html`; ou, via terminal, `cp teste.html index.html`).
3. Faça o commit na branch `main`. O GitHub Pages publica automaticamente.
4. Confira o resultado em janela anônima.

```bash
git add index.html
git commit -m "feat: descrição da alteração"
git push origin main
```

> [!TIP]
> Como o Service Worker usa *network-first*, quem está online recebe a versão nova. Ao mexer na lista de arquivos do cache (`ASSETS` em `sw.js`), incremente a constante `CACHE` para descartar o cache antigo.

> [!NOTE]
> Após um push, o GitHub Pages executa o fluxo "pages build and deployment". Dois commits em sequência rápida podem fazer o primeiro deploy aparecer com um ✗ vermelho (cancelado pelo seguinte). O que vale é o resultado do commit mais recente.

## Executando localmente

Não há dependências para instalar. Como o Service Worker exige `http://` ou `https://`, sirva a pasta com um servidor local em vez de abrir o arquivo direto:

```bash
git clone https://github.com/misaelguedes-git/calculadoraMRV.git
cd calculadoraMRV

# Python
python -m http.server 8000

# ou Node.js
npx serve .
```

Acesse `http://localhost:8000` (oficial) ou `http://localhost:8000/teste.html` (testes).

## Limitações conhecidas

- A extração depende do **texto do PDF**. PDFs digitalizados (imagem), protegidos por senha ou com layout muito diferente do esperado não são lidos corretamente.
- A leitura de PDF requer carregar o `pdf.js` da CDN (ver [Instalação como app](#instalação-como-app-pwa)).
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

---
