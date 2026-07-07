# Architecture

This demo connects Azure AI Foundry, Azure API Management, Azure Container Apps, GitHub Copilot and Application Insights into a single governed, observable software-delivery loop.

A business request in natural language becomes a reviewed pull request and a deployed change, with the whole chain visible in one distributed trace.

---

## System Overview

```mermaid
flowchart TB
    User["Business user / Foundry Playground"]

    subgraph Foundry["Azure AI Foundry"]
        Agent["Hosted agent<br/>orchestrator-agent"]
        Tool["OpenAPI tool<br/>delegateToCopilot"]
    end

    subgraph Gateway["Governed Model Plane"]
        APIM["Azure API Management<br/>GenAI Gateway<br/>/inference/openai"]
        Model["Azure OpenAI / Foundry model<br/>gpt-4.1-mini"]
    end

    subgraph Runtime["Azure Container Apps"]
        API["copilot-sdk-service<br/>POST /agent"]
        Collector["OpenTelemetry Collector<br/>OTLP HTTP 4318<br/>transform/correlate"]
        Site["contoso-cart<br/>live demo site"]
    end

    subgraph GitHub["GitHub"]
        Issue["Issue"]
        Vars["Agents variables store"]
        Cloud["GitHub Copilot cloud agent"]
        PR["Pull Request"]
        Actions["GitHub Actions deploy"]
    end

    AI[("Application Insights")]

    User --> Agent
    Agent --> APIM --> Model
    Agent --> Tool --> API
    API --> Issue --> Cloud --> PR --> Actions --> Site
    API --> Vars --> Cloud

    APIM -- "native AI diagnostic" --> AI
    API -- "Azure Monitor OTel" --> AI
    Cloud -- "OTLP http/protobuf" --> Collector --> AI
```

Two responsibilities are kept separate on purpose:

- The Foundry agent owns the **intent**: what should change and why.
- The GitHub Copilot cloud agent owns the **implementation**: which files and functions to change.

---

## Runtime Sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User / Playground
    participant F as Foundry agent
    participant APIM as APIM GenAI Gateway
    participant M as gpt-4.1-mini
    participant Tool as OpenAPI tool
    participant API as copilot-sdk-service /agent
    participant GH as GitHub APIs
    participant Vars as Agents variables
    participant CA as Copilot cloud agent
    participant OTel as OTel Collector
    participant AI as Application Insights

    U->>F: Business prompt
    F->>APIM: chat/completions via ai-gateway
    APIM->>M: forward request
    M-->>APIM: model response
    APIM-->>F: governed response
    APIM-->>AI: request + dependency

    F->>Tool: call delegateToCopilot
    Tool->>API: POST /agent { title, body }
    API-->>AI: request POST /agent
    API->>API: start contoso.orchestrator (trace_id=T)
    API->>GH: create issue
    API->>API: start copilot.cloud_agent.task (span_id=S)
    API->>Vars: set OTEL_RESOURCE_ATTRIBUTES=corr.trace_id=T,corr.span_id=S
    API->>GH: assign copilot-swe-agent

    GH->>CA: assignment triggers run
    Vars-->>CA: inherit OTEL config + corr attrs
    CA->>CA: invoke_agent, chat, execute_tool, permission
    CA->>OTel: export OTLP spans
    OTel->>OTel: rewrite trace_id / parent_span_id
    OTel-->>AI: export via Azure Monitor
```

---

## Trace Correlation

The GitHub-hosted cloud agent does not join the API trace through native `TRACEPARENT`. Correlation is carried as resource attributes and applied in the collector.

```mermaid
flowchart TB
    RootSpan["span: contoso.orchestrator<br/>trace_id=T"]
    TaskSpan["span: copilot.cloud_agent.task<br/>trace_id=T, span_id=S"]
    Upsert["PATCH /repos/{owner}/{repo}/agents/variables/OTEL_RESOURCE_ATTRIBUTES"]
    Value["corr.trace_id=T,corr.span_id=S"]
    Cloud["Cloud agent run inherits attrs"]
    Export["Cloud agent exports OTLP with corr.* attrs"]
    Transform["Collector transform/correlate<br/>set(trace_id)=corr.trace_id<br/>set(parent_span_id)=corr.span_id"]
    AI["Application Insights<br/>operation_Id=T"]

    RootSpan --> TaskSpan --> Upsert --> Value --> Cloud --> Export --> Transform --> AI
```

API side (`copilot-sdk-service/src/api/routes/agent.ts`):

```ts
const { traceId, spanId } = taskSpan.spanContext();
await upsertAgentsVariable(
  token,
  owner,
  name,
  "OTEL_RESOURCE_ATTRIBUTES",
  `corr.trace_id=${traceId},corr.span_id=${spanId}`,
);
```

Collector side (`observability/otel-collector/config.yaml`):

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

`OTEL_RESOURCE_ATTRIBUTES` is a repo-level variable. This is safe for sequential runs; concurrent delegations need a per-run isolation strategy.

---

## Component Responsibilities

| Component | Role |
|---|---|
| Foundry hosted agent | Reasons about the request and decides what to delegate |
| APIM GenAI Gateway | Single governed entry point for model traffic (policy, quota, logging) |
| OpenAPI tool `delegateToCopilot` | Bridges the agent to the delivery API |
| `copilot-sdk-service` `/agent` | Creates a GitHub issue, assigns Copilot, emits trace spans |
| GitHub Copilot cloud agent | Reads the repo, edits code, opens a pull request |
| OpenTelemetry Collector | Receives cloud-agent OTLP, re-parents spans, exports to Application Insights |
| GitHub Actions | Deploys the app to Azure Container Apps after merge |

---

## What Each Span Represents

| Span / request | Source | Table | Meaning |
|---|---|---|---|
| `POST /inference/openai/.../chat/completions` | APIM | requests | Foundry called the model through APIM |
| `POST /openai/.../chat/completions` | APIM | dependencies | APIM forwarded to the model endpoint |
| `POST /agent` | Container App API | requests | The OpenAPI tool called the delivery API |
| `contoso.orchestrator` | `copilot-sdk-service` | dependencies | Logical orchestration span |
| `copilot.cloud_agent.task` | `copilot-sdk-service` | dependencies | The moment work is delegated to the cloud agent |
| `invoke_agent` | Copilot cloud agent | dependencies | Main cloud-agent execution |
| `chat <model>` | Copilot cloud agent | dependencies | Internal LLM calls with token attributes |
| `execute_tool view/edit/bash` | Copilot cloud agent | dependencies | Tools used against the repo |
| `permission` | Copilot cloud agent | dependencies | Authorization gates for tool calls |

For the observability proof, KQL queries and telemetry paths, see [observability.md](observability.md).
