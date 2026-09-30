<div align="center">

# Calculadora de Comprometimento de Renda MRV / Emcash

Ferramenta web para automatizar e padronizar a análise de comprometimento de renda em contratos de financiamento imobiliário.

[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-00843D?logo=github)](https://misaelguedes-git.github.io/calculadoraMRV/)
[![Versão](https://img.shields.io/badge/vers%C3%A3o-2.0-F58220)](#changelog)
[![PWA](https://img.shields.io/badge/PWA-offline-5A0FC8?logo=pwa&logoColor=white)](#instalação-como-app-pwa)
[![Privacidade](https://img.shields.io/badge/LGPD-100%25%20local-00843D)](#privacidade-e-segurança)
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
- [Executando localmente](#executando-localmente)
- [Deploy](#deploy)
- [Solução de problemas](#solução-de-problemas)
- [Changelog](#changelog)
- [Autor](#autor)

## Sobre

A **Calculadora de Comprometimento de Renda** é uma ferramenta de uso interno da equipe comercial. Ela lê o contrato do cliente (MRV ou Emcash) e a simulação da Caixa Econômica Federal, extrai os dados relevantes e calcula, em segundos, o percentual de renda comprometida, indicando se o caso está enquadrado ou se precisa de desconto no Pró-Soluto.

Todo o processamento acontece no navegador do usuário. Não há backend, banco de dados nem envio de arquivos.

## Funcionalidades

- **Leitura automática de contratos** dos tipos OIC, BPM e Emcash, com detecção do tipo de documento.
- **Cruzamento com a Simulação da Caixa**: valor de avaliação, parcela e renda extraídos direto do PDF.
- **Cálculo instantâneo** do comprometimento Total, Caixa e MRV.
- **Matriz de enquadramento** com status e indicador visual (verde, amarelo/laranja e vermelho).
- **Análise de desconto no Pró-Soluto**: parcela MRV ideal, redução por parcela, projeção de nº de parcelas e desconto total estimado no fluxo do PSB.
- **Resumo copiável** para colar no sistema da empresa.
- **Funciona offline** e pode ser instalado como aplicativo (PWA).

## Privacidade e segurança

A versão 2.0 foi construída sob os princípios de *Privacy by Design* (LGPD):

| Medida | Descrição |
| --- | --- |
| **Processamento 100% local** | O PDF é lido no próprio dispositivo. Nenhum arquivo ou dado de cliente é enviado a servidores ou salvo em nuvem. |
| **Sem histórico** | Nada é armazenado no navegador. Ao recarregar a página, todos os dados são apagados. |
| **Limite de arquivo** | PDFs acima de 20 MB são bloqueados, evitando travamentos. |
| **Sanitização (Anti-XSS)** | Conteúdo extraído de PDFs corrompidos é sanitizado antes de ser exibido, bloqueando a execução de código oculto. |

> [!IMPORTANT]
> Este repositório não deve conter contratos, simulações ou qualquer dado real de clientes. Use apenas arquivos fictícios em testes e capturas de tela.

## Como usar

1. Acesse a [URL da ferramenta](https://misaelguedes-git.github.io/calculadoraMRV/).
2. Arraste o **Contrato** para a área tracejada correspondente (ou clique para selecionar).
3. Arraste a **Simulação Caixa** para a área tracejada azul.
4. Confira os campos com a etiqueta `AUTO`, preenchidos automaticamente.
5. Preencha os campos `MANUAL` (Gerente e, se necessário, a Renda).
6. Clique em **Calcular Comprometimento** ou pressione `Enter`.
7. Analise o resultado e use o botão **Copiar** para levar o resumo ao sistema da empresa.

## Regras de cálculo

O comprometimento é a soma da prestação da Caixa com a parcela MRV, dividida pela renda comprovada:

```
Comprometimento Total = (Parcela Caixa + Parcela MRV) / Renda
```

> [!NOTE]
> A calculadora usa a **primeira parcela do PSB**. Como o plano de amortização é decrescente, ela é a mais alta, o que representa o cenário de maior comprometimento e torna a análise conservadora contra reprovações futuras.

### Matriz de enquadramento

| Comprometimento Total | Status | Indicador | Ação recomendada |
| --- | --- | --- | --- |
| Até 35% | Aprovado | Verde | Fluxo normal. |
| 35,01% a 37% | Atenção | Amarelo / Laranja | Avaliar individualmente: manter o contrato ou refazer a venda. |
| Acima de 37% | Reprovado | Vermelho | Necessário readequar o fluxo. |

### Fases de obra

- **PSA (pré-entrega):** parcelas MRV com vencimento antes das chaves.
- **PSB (pós-entrega):** parcelas MRV com vencimento após as chaves. Compõem o risco de comprometimento.

### Compra à vista ou quitação prévia

Se não houver parcelas após a entrega das chaves, a ferramenta exibe um aviso e assume **Parcela MRV = R$ 0,00**. O cálculo segue apenas com a parcela da Caixa, sem erro.

### Análise de desconto

Três limites são avaliados ao mesmo tempo:

| Limite | Máximo |
| --- | --- |
| MRV | 5% |
| Caixa | 30% |
| Total | 35% |

Em caso de reprovação por causa da parcela da construtora, a ferramenta exibe a parcela MRV ideal, a redução necessária por parcela, a projeção de quantas parcelas o contrato deveria ter e o desconto total estimado no fluxo do PSB.

Se o percentual financiado for **maior ou igual a 80%** do valor do imóvel, o desconto é bloqueado por limite de margem bancária e o sistema alerta o usuário.

## Extração automática de dados

O tipo de contrato (OIC, BPM ou Emcash) é detectado automaticamente e a extração se ajusta a ele.

| Campo | Tipo | Origem |
| --- | --- | --- |
| Nome do Cliente | `AUTO` | OIC/BPM: "Comprador(a)" / "1º Cliente". Emcash: "Nome". |
| CPF | `AUTO` | Formato padrão (000.000.000-00). |
| Empreendimento / Unidade | `AUTO` | Campo "Produto" (MRV) ou descrição do endereço (Emcash). |
| Data de Entrega Prevista | `AUTO` / `MANUAL` | OIC/BPM: item 5.1 do contrato. Emcash: manual. |
| Valor de Avaliação | `CAIXA` | Lido do PDF da Caixa. |
| Teto Faixa do Cliente | `CALCULADO` | Renda até R$ 5.000: teto R$ 275 mil. Acima: teto R$ 400 mil. |
| Valor Financiado | `AUTO` | OIC/BPM: item 4.1.4. Emcash: "Valor Líquido do Principal". |
| Saldo Carteira MRV | `AUTO` | OIC/BPM: item 4.1.2 (Pró-Soluto). Não se aplica ao Emcash. |
| Parcela MRV / Emcash | `AUTO` | 1ª parcela com vencimento posterior à data de entrega (PSB). |
| Parcela / Renda Caixa | `CAIXA` | Extraídos da folha de simulação bancária. |

## Instalação como app (PWA)

| Plataforma | Como instalar |
| --- | --- |
| **Computador (Chrome/Edge)** | Clique no ícone "Instalar" na barra de endereços. |
| **Android (Chrome)** | Toque no banner "Adicionar à tela inicial". |
| **iPhone (Safari)** | Compartilhar, depois "Adicionar à Tela de Início". |

## Tecnologias

- **HTML5, CSS3 e JavaScript puro (Vanilla JS)**, sem framework nem etapa de build.
- **[pdf.js](https://mozilla.github.io/pdf.js/) v3.11.174**, carregado via CDN, para leitura dos PDFs.
- **Service Worker (`sw.js`) e Web App Manifest (`manifest.json`)** para uso offline e instalação como PWA.
- **GitHub Pages** para hospedagem estática.

Arquitetura 100% *client-side*: sem banco de dados, sem armazenamento local de histórico e sem chamadas a backend.

## Estrutura do repositório

```
calculadoraMRV/
├── assets/                 # Ícones e imagens
├── index.html              # Página publicada no GitHub Pages
├── calculadora.html        # Versão anterior da calculadora
├── calculadorav2.html      # Calculadora v2.0 (Segurança e Privacidade)
├── simulador.html          # Simulador
├── manifest.json           # Manifesto do PWA
├── sw.js                   # Service Worker (cache offline)
├── Documentacao_Calculadora_Comprometimento_Renda_v2.pdf
├── Documentacao_Calculadora_MRV.pdf
└── README.md
```

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

Acesse `http://localhost:8000`.

## Deploy

O deploy é feito pelo **GitHub Pages** a cada push na branch `main`. Para publicar uma alteração:

```bash
git add .
git commit -m "feat: descrição da alteração"
git push origin main
```

> [!TIP]
> Ao alterar arquivos em cache, incremente a versão do cache em `sw.js` para que os usuários recebam a atualização.

## Solução de problemas

| Ocorrência | Causa / Solução |
| --- | --- |
| **PDF protegido por senha** | A leitura é abortada. Salve o PDF novamente sem senha de abertura. |
| **"Nenhuma parcela mensal encontrada"** | O contrato termina antes das chaves. Confirme a data de entrega e prossiga (o sistema usa R$ 0,00). |
| **Campos `AUTO` em branco** | Padrão de contrato muito diferente do esperado. Preencha manualmente e calcule. |
| **Layout quebrado ou desatualizado** | Limpe o cache com `Ctrl + Shift + R` (Windows). |

## Changelog

### 2.0 (setembro de 2026) — Edição de Segurança e Privacidade

- Processamento 100% local e ausência de histórico no navegador.
- Bloqueio de PDFs acima de 20 MB e sanitização contra XSS.
- Faixa de "Atenção" ajustada para 35,01% a 37%, com coluna de ação recomendada.
- Cálculo pela 1ª parcela do PSB documentado como metodologia conservadora.
- Projeção do número de parcelas ideal na análise de desconto.
- Atalho `Enter` para calcular.

## Autor

**Misael Guedes Bispo**
[@misaelguedes-git](https://github.com/misaelguedes-git)

---

<div align="center">
<sub>Ferramenta de uso interno da equipe comercial MRV&CO.</sub>
</div>
