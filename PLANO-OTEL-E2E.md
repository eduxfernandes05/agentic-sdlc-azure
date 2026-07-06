# Plano OTEL End-to-End — Estado Ready to Present

Data: 2026-07-06

O objetivo original era chegar a uma transacao unica no Application Insights, com APIM, `copilot-sdk-service`, `copilot.cloud_agent.task` e a arvore profunda do GitHub Copilot cloud agent. Esse objetivo esta validado.

Trace canonico:

```text
operation_Id=5d210e1ff1014856861d30ae9ad05c77
```

---

## Fases

| Fase | Objetivo | Estado | Evidencia |
|---|---|---|---|
| F0 | Consolidar App Insights alvo | Feito | `insights-zj44ehcf4zlxq` e o AI principal |
| F1 | Deploy OTel Collector | Feito | `ca-otel-collector` recebe OTLP e exporta via `azuremonitor` |
| F2 | Ligar GitHub Copilot cloud agent ao Collector | Feito | role `github.copilot.coding_agent` com spans profundos |
| F3 | Criar span `copilot.cloud_agent.task` e unir API -> cloud agent | Feito | Collector reescreve trace com `corr.trace_id/corr.span_id` |
| F4 | Correlacionar Foundry/APIM -> `/agent` | Feito | APIM requests + `POST /agent` no mesmo `operation_Id` |
| F5 | Preparar material de demo | Feito | README, diagrama completo e runbook LinkedIn |
| F6 | Hardening/IaC de producao | Pendente | Ver backlog abaixo |

---

## Mecanismo de Correlacao

1. `copilot-sdk-service` recebe `POST /agent` vindo da tool Foundry.
2. A Azure Monitor distro em Node aceita o trace context de entrada e emite para App Insights.
3. Dentro do span `copilot.cloud_agent.task`, a API obtem `traceId` e `spanId`.
4. A API grava no GitHub Agents variables store:

```text
OTEL_RESOURCE_ATTRIBUTES=corr.trace_id=<traceId>,corr.span_id=<spanId>
```

5. O Copilot cloud agent herda essas env vars e exporta OTLP para o Collector.
6. O Collector aplica `transform/correlate`:

```yaml
set(trace_id.string, resource.attributes["corr.trace_id"])
set(parent_span_id.string, resource.attributes["corr.span_id"])
```

7. Application Insights recebe os spans do cloud agent dentro do mesmo `operation_Id`.

---

## Validacao

Queries principais:

```kusto
requests
| where operation_Id == "5d210e1ff1014856861d30ae9ad05c77"
| project timestamp, cloud_RoleName, name, url, operation_ParentId, id, success, resultCode
| order by timestamp asc
```

```kusto
dependencies
| where operation_Id == "5d210e1ff1014856861d30ae9ad05c77"
| summarize count(), min(timestamp), max(timestamp) by cloud_RoleName, name
| order by min_timestamp asc
```

Resultado esperado:

- APIM model calls.
- `POST /agent`.
- `contoso.orchestrator`.
- `copilot.cloud_agent.task`.
- `github.copilot.coding_agent` deep spans.

---

## Backlog Pos-demo

| Prioridade | Item | Nota |
|---|---|---|
| Alta | Colocar `ca-otel-collector` em Bicep/azd | Hoje foi provisionado manualmente para acelerar a demo |
| Alta | Mover `OTEL_EXPORTER_OTLP_HEADERS` para secret dedicado | Na demo pode estar como variable para simplicidade operacional |
| Media | Evitar race em `OTEL_RESOURCE_ATTRIBUTES` global | Necessario se houver delegacoes concorrentes |
| Media | Proteger `/agent` via APIM ou auth propria | Atualmente a OpenAPI tool chama endpoint publico |
| Media | GitHub App em vez de PAT | Melhor modelo de permissao para producao |
| Baixa | Investigar span raiz `azure.ai.agent` hosted Foundry | A correlacao operacional ja esta demonstrada |
