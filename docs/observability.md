# Observability

Every step of the loop lands in a single Application Insights transaction, so you can open one `operation_Id` and see the model gateway call, the delivery API, and the deep GitHub Copilot cloud-agent execution tree.

---

## Validated Trace

```text
operation_Id = 5d210e1ff1014856861d30ae9ad05c77
```

Prompt used:

```text
Adiciona um voucher de 10% no checkout do contoso-cart.
```

The transaction contains:

- `apim-zj44ehcf4zlxq Sweden Central`
- `copilot-sdk-service`
- `github.copilot.coding_agent`
- `contoso.orchestrator`
- `copilot.cloud_agent.task`
- `invoke_agent`
- `chat claude-sonnet-4.6`
- `execute_tool view/edit/bash`
- `permission`

---

## Telemetry Paths

Three sources land in the same Application Insights resource.

| Source | Transport | Notes |
|---|---|---|
| APIM | Native App Insights diagnostic | Model gateway requests/dependencies |
| `copilot-sdk-service` | `@azure/monitor-opentelemetry` | API request and logical GenAI spans |
| Copilot cloud agent | OTLP HTTP/protobuf via collector | `invoke_agent`, `chat`, `execute_tool`, `permission` |

The collector applies `transform/correlate` before exporting, which re-parents the cloud-agent spans into the API trace. See [architecture.md](architecture.md#trace-correlation).

---

## Open the Transaction

1. Azure Portal → Application Insights.
2. Open `Transaction search`.
3. Search for the `operation_Id`.
4. Open an item and choose `End-to-end transaction details`.
5. Confirm the roles `apim...`, `copilot-sdk-service`, and `github.copilot.coding_agent`.

---

## Useful KQL

Requests in the trace:

```kusto
requests
| where operation_Id == "5d210e1ff1014856861d30ae9ad05c77"
| project timestamp, cloud_RoleName, name, url, operation_ParentId, id, success, resultCode
| order by timestamp asc
```

Dependencies with GenAI attributes:

```kusto
dependencies
| where operation_Id == "5d210e1ff1014856861d30ae9ad05c77"
| project timestamp, cloud_RoleName, name, target, type, operation_ParentId, id, success, resultCode,
          genai=tostring(customDimensions["gen_ai.system"]),
          agent=tostring(customDimensions["gen_ai.agent.name"]),
          model=tostring(customDimensions["gen_ai.request.model"])
| order by timestamp asc
```

Summary by role and name:

```kusto
dependencies
| where operation_Id == "5d210e1ff1014856861d30ae9ad05c77"
| summarize count(), min(timestamp), max(timestamp) by cloud_RoleName, name
| order by min_timestamp asc
```

Additional queries and a token-governance workbook are in [`observability/`](../observability).

---

## Known Nuance

The Foundry hosted runtime is connected to the same Application Insights resource, but the validated queries did not show a distinct root span named `azure.ai.agent`. The operational chain APIM → tool → API → cloud agent is correlated and demonstrable in one `operation_Id`.
