# Runbook — Demo Ready Para LinkedIn

Objetivo: gravar uma demo curta, clara e publicavel mostrando uma cadeia agentic real com governance e observabilidade end-to-end.

---

## Narrativa de 30 Segundos

> Nesta demo, um pedido em linguagem natural entra num agente hosted no Azure AI Foundry. O raciocinio passa por APIM, onde tenho governance de modelo. Quando o agente decide que precisa de codigo, chama uma tool OpenAPI que delega a implementacao ao GitHub Copilot cloud agent. O Copilot abre issue, edita o repo, usa ferramentas, cria PR, e eu consigo ver tudo no Application Insights: APIM, a API `/agent`, `copilot.cloud_agent.task` e a arvore profunda do cloud agent com chamadas LLM, tool calls e permissions.

---

## Cenas Para Gravar

### Cena 1 — Problema de negocio

Mostrar o site `contoso-cart` e dizer:

> Quero alterar o checkout sem escrever codigo manualmente: adicionar um voucher de 10%.

### Cena 2 — Prompt no Foundry

No agente `contoso-orchestrator-agent`, enviar:

```text
Adiciona um voucher de 10% no checkout do contoso-cart.
```

Mostrar que o agente chama a tool `delegateToCopilot`.

### Cena 3 — Delegacao para GitHub

Abrir o repo `eduxfernandes05/contoso-cart` e mostrar a issue criada. Na run validada, foi:

```text
https://github.com/eduxfernandes05/contoso-cart/issues/41
```

Explicar:

> O agente Foundry decide o que precisa de ser feito. O Copilot cloud agent decide como implementar no repo.

### Cena 4 — Observabilidade end-to-end

Abrir Application Insights `insights-zj44ehcf4zlxq` -> `Transaction search` e pesquisar:

```text
5d210e1ff1014856861d30ae9ad05c77
```

Mostrar `End-to-end transaction details` com:

- `apim-zj44ehcf4zlxq Sweden Central`
- `copilot-sdk-service`
- `github.copilot.coding_agent`
- `contoso.orchestrator`
- `copilot.cloud_agent.task`
- `invoke_agent`
- `chat claude-sonnet-4.6`
- `execute_tool view/edit/bash`
- `permission`

Frase para usar:

> Isto e o ponto principal: nao estou so a ver logs soltos. Estou a ver a transacao inteira, incluindo governance no APIM e a execucao profunda do coding agent.

### Cena 5 — Fecho

Mostrar PR ou site live e fechar com:

> Agentic SDLC com governance, human-in-the-loop e observabilidade real. Nao e so chamar um modelo; e operar o fluxo todo.

---

## Checklist Antes de Carregar Record

| Check | Estado esperado |
|---|---|
| Foundry agent aberto | `contoso-orchestrator-agent` |
| App Insights aberto | `insights-zj44ehcf4zlxq` |
| Transaction Search pronto | Pode pesquisar por `operation_Id` |
| GitHub repo aberto | `eduxfernandes05/contoso-cart` |
| Site live aberto | `ca-contoso-cart` |
| Collector ativo | `ca-otel-collector` |
| Cloud agent OTEL ativo | `github.copilot.coding_agent` aparece no App Insights |

---

## Como Vender Internamente Como IP MALT

Posicionamento:

> Isto e um reusable pattern para Agentic SDLC governado: Foundry decide o que fazer, APIM governa o modelo,
> GitHub Copilot implementa no repo, e App Insights mostra a cadeia operacional completa.

Formatos de engagement:

| Formato | Duracao | Entregavel |
|---|---:|---|
| Show-and-tell | 15 min | Demo da cadeia e transaction details |
| Technical deep dive | 60 min | Arquitetura, APIM, OTel Collector e KQL |
| Reuse workshop | Meio dia | Adaptar para outro repo e obter primeiro trace |
| Accelerator | 1-2 semanas | Hardened deployment, IaC, dashboards e auth de producao |

O material para outros MALT pegarem esta em [REUSE-GUIDE.md](REUSE-GUIDE.md). O diagrama técnico completo
esta em [DIAGRAMA-OBSERVABILIDADE-E2E.md](DIAGRAMA-OBSERVABILIDADE-E2E.md).

---

## Copy LinkedIn — Versao Curta

Hoje fechei uma demo end-to-end de Agentic SDLC com governance e observabilidade real.

Fluxo:

1. Prompt em linguagem natural no Azure AI Foundry.
2. Modelo governado por Azure API Management.
3. Tool OpenAPI delega a implementacao ao GitHub Copilot cloud agent.
4. Copilot cria issue, edita o repo e abre PR.
5. Application Insights mostra a transacao completa: APIM, API, `copilot.cloud_agent.task`, chamadas LLM, tool calls e permissions.

O detalhe que mais gosto: nao e apenas automacao. E uma cadeia operavel, com governance, human-in-the-loop e tracing end-to-end.

#AzureAI #GitHubCopilot #AzureAIFoundry #APIM #OpenTelemetry #ApplicationInsights #AgenticAI

---

## Copy LinkedIn — Versao Mais Tecnica

Demo end-to-end de um fluxo Agentic SDLC:

- Azure AI Foundry como agente orquestrador hosted.
- Azure API Management como GenAI Gateway para governar chamadas ao modelo.
- Tool OpenAPI `delegateToCopilot` para delegar trabalho de engenharia.
- GitHub Copilot cloud agent a ler o repo, editar codigo, usar ferramentas e abrir PR.
- OpenTelemetry + Application Insights para uma transacao correlacionada ponta-a-ponta.

O trace validado inclui APIM, `POST /agent`, `contoso.orchestrator`, `copilot.cloud_agent.task` e a arvore profunda do Copilot cloud agent: `invoke_agent`, `chat claude-sonnet-4.6`, `execute_tool`, `permission`.

Para mim, este e o salto importante: agentes nao so a executar tarefas, mas a operar dentro de uma arquitetura governada, auditavel e observavel.

#AzureAI #GitHubCopilot #OpenTelemetry #APIM #ApplicationInsights #AgenticAI #DevOps

---

## Nuance Tecnica Para Q&A

Se perguntarem sobre tracing do Foundry:

> O trace end-to-end esta correlacionado desde APIM/tool/API ate ao Copilot cloud agent. O hosted Foundry runtime esta ligado ao mesmo Application Insights, mas nesta validacao nao apareceu como span raiz explicito `azure.ai.agent` nas tabelas consultadas. A cadeia operacional APIM -> `/agent` -> `copilot.cloud_agent.task` -> cloud agent deep tree esta validada num unico `operation_Id`.
