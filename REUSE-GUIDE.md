# Reuse Guide — Turning This Demo Into Reusable IP

This guide explains how another MALT team can reuse the pattern for a different customer, product repo or engagement.

The goal is not to copy resource names. The goal is to copy the operating model: governed agent orchestration, coding-agent delegation, human-in-the-loop delivery and traceable execution.

---

## 1. Decide the Engagement Shape

| Question | Decision to make |
|---|---|
| What is the business workflow? | Feature request, bug fix, documentation update, migration task, test generation, etc. |
| What repo is the target? | GitHub repo with Copilot coding agent enabled |
| Who owns the final approval? | Human reviewer, code owner, platform team, product owner |
| What governance do we need? | APIM token limits, quotas, content safety, chargeback, audit logs |
| What telemetry must be shown? | App Insights E2E transaction, Agents preview, APIM metrics, KQL dashboard |

Recommended starting point: one target repo, one Foundry hosted agent, one OpenAPI tool, one App Insights resource and one end-to-end trace story.

---

## 2. Components to Reuse

| Component | Copy/adapt | Notes |
|---|---|---|
| `copilot-sdk-service/src/api/routes/agent.ts` | Copy/adapt | Core delegation endpoint: create work item and assign coding agent |
| `copilot-sdk-service/src/api/telemetry.ts` | Copy | Azure Monitor bootstrap and GenAI span helper |
| `copilot-sdk-service/foundry/agent-tool.openapi.json` | Copy/adapt | Foundry tool contract |
| `observability/otel-collector/config.yaml` | Copy/adapt | OTLP receiver, auth, trace re-parenting and App Insights export |
| `DIAGRAMA-OBSERVABILIDADE-E2E.md` | Copy/adapt | Architecture appendix and trace explainer |
| `APRESENTACAO-LINKEDIN.md` | Copy/adapt | Storytelling and recording template |

Avoid copying customer/resource names directly. Treat names in this workspace as a validated reference implementation.

---

## 3. Rename Matrix

| Reference value | Replace with |
|---|---|
| `contoso-orchestrator-agent` | New agent name |
| `eduxfernandes05/contoso-cart` | Target GitHub repo |
| `ca-api-edudemo-csdk-4bq4xx` | New delegation API Container App |
| `ca-otel-collector` | New collector Container App |
| `ca-contoso-cart` | Target app/service |
| `insights-zj44ehcf4zlxq` | Engagement App Insights |
| `apim-zj44ehcf4zlxq` | Engagement APIM instance |
| `gpt-4.1-mini` | Selected model deployment |

---

## 4. Bootstrap Checklist

### Azure

1. Create or select a resource group.
2. Create/select Azure AI Foundry project and model deployment.
3. Create/select APIM GenAI Gateway.
4. Connect Foundry model access through APIM.
5. Create/select Application Insights.
6. Deploy `copilot-sdk-service` to Azure Container Apps.
7. Deploy OTel Collector to Azure Container Apps.
8. Set `APPLICATIONINSIGHTS_CONNECTION_STRING` on API and collector.

### GitHub

1. Enable GitHub Copilot coding agent for the target repo/org.
2. Ensure `copilot-swe-agent` is assignable on the repo.
3. Configure the API credential with permission to create issues and assign actors.
4. Configure GitHub Agents variables for cloud-agent OTEL.
5. Allowlist the collector FQDN in the Copilot cloud-agent firewall.

### Foundry

1. Register the OpenAPI tool from `foundry/agent-tool.openapi.json`.
2. Point the tool server URL to the deployed `/agent` endpoint.
3. In the tool description, keep the separation of intent from implementation details.
4. Prompt the agent to delegate acceptance criteria, not file paths.

---

## 5. Required Environment Contract

### `copilot-sdk-service`

| Variable | Example | Required |
|---|---|---|
| `PORT` | `3000` | Yes |
| `GITHUB_TOKEN` | Key Vault secret | Yes |
| `GITHUB_REPO` | `owner/repo` | Yes |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights connection string | Yes for tracing |
| `OTEL_SERVICE_NAME` | `copilot-sdk-service` | Yes for clean App Insights role name |

### GitHub Agents variables store

| Variable | Example |
|---|---|
| `COPILOT_OTEL_ENABLED` | `true` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://ca-otel-collector.<domain>` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` |
| `OTEL_SERVICE_NAME` | `github.copilot.coding_agent` |
| `COPILOT_OTEL_CAPTURE_CONTENT` | `true` |
| `OTEL_EXPORTER_OTLP_HEADERS` | `Authorization=Bearer <token>` |
| `OTEL_RESOURCE_ATTRIBUTES` | Written dynamically by `/agent` per task |

Important: these are GitHub Copilot Agents variables, not GitHub Actions environment variables.

---

## 6. Trace Stitching Design

Native `TRACEPARENT` did not make the hosted GitHub Copilot cloud agent join the API trace. The working path is resource-attribute correlation plus collector rewrite.

Runtime behavior:

1. API creates `copilot.cloud_agent.task`.
2. API reads `traceId` and `spanId` from that span.
3. API writes `OTEL_RESOURCE_ATTRIBUTES=corr.trace_id=<traceId>,corr.span_id=<spanId>` to the target repo Agents variables store.
4. Cloud agent inherits the attributes.
5. Collector rewrites cloud-agent spans to the API trace.

Collector transform:

```yaml
processors:
  transform/correlate:
    error_mode: ignore
    trace_statements:
      - context: span
        statements:
          - set(trace_id.string, resource.attributes["corr.trace_id"]) where resource.attributes["corr.trace_id"] != nil
          - set(parent_span_id.string, resource.attributes["corr.span_id"]) where resource.attributes["corr.span_id"] != nil and parent_span_id.string == ""
```

Production note: the current variable is repo-global. For concurrent tasks, design a per-run channel or isolate runner/task configuration.

---

## 7. Validation Checklist

### API smoke test

```powershell
Invoke-RestMethod -Method Post `
  -Uri "https://<ca-api>/agent" `
  -ContentType "application/json" `
  -Body '{"title":"Add a simple footer link","body":"Add the feature and keep tests passing."}'
```

Expected response contains `status=delegated` and `issueUrl`.

### App Insights KQL

```kusto
requests
| where timestamp > ago(2h)
| where cloud_RoleName == "copilot-sdk-service" or cloud_RoleName has "apim"
| project timestamp, cloud_RoleName, name, operation_Id, operation_ParentId, id, success
| order by timestamp desc
```

```kusto
dependencies
| where operation_Id == "<operation_Id>"
| summarize count(), min(timestamp), max(timestamp) by cloud_RoleName, name
| order by min_timestamp asc
```

Expected roles:

- APIM role for model gateway calls.
- `copilot-sdk-service`.
- `github.copilot.coding_agent`.

Expected span names:

- `contoso.orchestrator` or engagement-specific equivalent.
- `copilot.cloud_agent.task`.
- `invoke_agent`.
- `chat <model>`.
- `execute_tool ...`.
- `permission`.

---

## 8. Demo Script Template

1. Show the target app or repo.
2. Send one natural-language request to the Foundry agent.
3. Show the generated issue in GitHub.
4. Show the Copilot cloud-agent PR.
5. Show App Insights `End-to-end transaction details`.
6. Explain the governance points: APIM, human review, auditability, traceability.
7. Close with the reusable pattern and where it can apply next.

Keep the prompt specific and visible. Good prompts are small enough to finish quickly but visual enough to demo.

---

## 9. Production Hardening Backlog

| Priority | Item | Why |
|---|---|---|
| High | Move collector to IaC | Repeatable deployment and no manual drift |
| High | Protect `/agent` behind APIM or auth | Prevent anonymous task creation |
| High | Use GitHub App instead of broad token | Least privilege and operational ownership |
| High | Store OTLP auth as secret | Avoid plaintext token exposure |
| Medium | Resolve correlation race | Repo-global `OTEL_RESOURCE_ATTRIBUTES` is demo-friendly but not concurrency-safe |
| Medium | Add dashboards/workbook | Make token, latency, failure and cost views reusable |
| Medium | Add customer-facing setup scripts | Lower friction for MALT reuse |
| Low | Investigate explicit hosted Foundry root span | Nice-to-have for visual completeness |

---

## 10. Packaging Checklist Before Sharing

- Replace customer/resource-specific names where needed.
- Remove or rotate tokens and connection strings.
- Move root docs into a real git repo if this workspace remains non-git.
- Decide whether to ship `contoso-cart` as a sample target or replace it with a neutral template repo.
- Include a tested sample `operation_Id` only if the target audience has access to that App Insights resource.
- Document what is demo-grade versus production-grade.