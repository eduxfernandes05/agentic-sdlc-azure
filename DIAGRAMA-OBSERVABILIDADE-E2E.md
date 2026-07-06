# Diagrama Completo — Observabilidade End-to-End Foundry + APIM + Copilot Cloud Agent

> Estado validado em 2026-07-06.  
> Trace real validado no Application Insights: `operation_Id=5d210e1ff1014856861d30ae9ad05c77`.

Este documento explica como a demo faz tracing end-to-end desde o agente hosted no Azure AI Foundry, passando pelo APIM GenAI Gateway, pela tool OpenAPI `/agent`, pelo serviço `copilot-sdk-service`, pelo GitHub Copilot cloud agent e finalmente pelo Application Insights.

O ponto mais importante: hoje a correlação principal funciona. O mesmo `operation_Id` contém APIM, `POST /agent`, os spans `contoso.orchestrator` / `copilot.cloud_agent.task` e a árvore profunda do GitHub Copilot cloud agent (`invoke_agent`, `chat claude-sonnet-4.6`, `execute_tool`, `permission`, etc.).

Camada complementar: para clientes GitHub Enterprise Cloud com Enterprise Managed Users, Copilot Usage Records pode fornecer visibilidade de prompts, respostas e tool calls em todos os clientes Copilot. Isto complementa o OTel/App Insights com auditabilidade enterprise-wide. Ver [COPILOT-USAGE-RECORDS.md](COPILOT-USAGE-RECORDS.md).

Ainda há uma nuance: não aparece um span raiz explícito do runtime hosted Foundry como `azure.ai.agent` nas tabelas consultadas do App Insights. O trace entra no App Insights já com APIM e a tool call correlacionados.

---

## 1. Visão Macro

```mermaid
flowchart TB
    User["Utilizador / Playground Foundry<br/>Prompt: adiciona voucher 10% no checkout"]

    subgraph Foundry["Azure AI Foundry"]
        Agent["contoso-orchestrator-agent<br/>Hosted agent"]
        Tool["OpenAPI tool<br/>delegateToCopilot"]
        ConnAI["Connection: AppInsights<br/>insights-zj44ehcf4zlxq"]
        ConnAPIM["Connection: ApiManagement<br/>ai-gateway"]
    end

    subgraph Governance["Governance / Modelo"]
        APIM["APIM<br/>apim-zj44ehcf4zlxq<br/>/inference/openai"]
        Model["Azure OpenAI / Foundry model endpoint<br/>gpt-4.1-mini"]
    end

    subgraph ACA["Azure Container Apps"]
        API["ca-api-edudemo-csdk-4bq4xx<br/>copilot-sdk-service<br/>POST /agent"]
        Collector["ca-otel-collector<br/>OTLP HTTP 4318<br/>Bearer auth"]
        Cart["ca-contoso-cart<br/>site demo"]
    end

    subgraph GitHub["GitHub: eduxfernandes05/contoso-cart"]
        Issue["GitHub Issue<br/>#41 na run validada"]
        AgentStore["Copilot Agents variables store<br/>/repos/{owner}/{repo}/agents/variables"]
        CloudAgent["GitHub Copilot cloud agent<br/>github.copilot.coding_agent"]
        UsageRecords["Copilot Usage Records<br/>streaming/API"]
        PR["Pull Request"]
        Actions["GitHub Actions CI/CD<br/>deploy.yml"]
    end

    subgraph Audit["Enterprise audit / compliance"]
        SIEM["SIEM / event collector"]
        Purview["Microsoft Purview<br/>public preview"]
    end

    AI[("Application Insights<br/>insights-zj44ehcf4zlxq")]

    User --> Agent
    Agent --> ConnAPIM
    ConnAPIM --> APIM
    APIM --> Model
    Agent --> Tool
    Tool --> API

    API --> Issue
    API --> AgentStore
    Issue --> CloudAgent
    AgentStore --> CloudAgent
    CloudAgent --> UsageRecords
    UsageRecords --> SIEM
    UsageRecords --> Purview
    CloudAgent --> PR
    PR --> Actions
    Actions --> Cart

    APIM -- "native App Insights diagnostic" --> AI
    API -- "@azure/monitor-opentelemetry" --> AI
    CloudAgent -- "OTLP http/protobuf" --> Collector
    Collector -- "azuremonitor exporter" --> AI
    ConnAI -. "Foundry project ligado ao mesmo AI" .-> AI
```

---

## 2. Sequência Runtime Completa

```mermaid
sequenceDiagram
    autonumber
    participant U as Utilizador / Playground
    participant F as Foundry hosted agent<br/>contoso-orchestrator-agent
    participant APIM as APIM GenAI Gateway
    participant AOAI as gpt-4.1-mini
    participant Tool as OpenAPI tool<br/>delegateToCopilot
    participant API as ca-api /agent<br/>copilot-sdk-service
    participant GQL as GitHub GraphQL API
    participant Vars as GitHub Agents variables
    participant CA as GitHub Copilot cloud agent
    participant OTel as ca-otel-collector
    participant AI as App Insights<br/>insights-zj44ehcf4zlxq

    U->>F: Prompt de negócio
    F->>APIM: chat/completions via ai-gateway
    APIM->>AOAI: POST /openai/deployments/gpt-4.1-mini/chat/completions
    AOAI-->>APIM: Resposta do modelo
    APIM-->>F: Resposta governada
    APIM-->>AI: request + dependency com operation_Id da run

    F->>Tool: Decide chamar delegateToCopilot
    Tool->>API: POST /agent { title, body }
    API-->>AI: request POST /agent

    API->>API: start span contoso.orchestrator
    API->>GQL: query repo id + suggestedActors(copilot-swe-agent)
    GQL-->>API: repo id + actor id
    API->>GQL: mutation createIssue
    GQL-->>API: issue #41 + URL

    API->>API: start span copilot.cloud_agent.task
    API->>Vars: PATCH/POST OTEL_RESOURCE_ATTRIBUTES<br/>corr.trace_id=T,corr.span_id=S
    API->>GQL: mutation replaceActorsForAssignable(issue, copilot-swe-agent)
    GQL-->>API: issue assigned
    API-->>AI: dependency span contoso.orchestrator
    API-->>AI: dependency span copilot.cloud_agent.task

    GQL->>CA: Assignment dispara cloud agent run
    Vars-->>CA: Cloud agent herda OTEL env vars
    CA->>CA: invoke_agent
    CA->>CA: chat claude-sonnet-4.6
    CA->>CA: execute_tool view/edit/bash/search_code_subagent
    CA->>CA: permission spans
    CA->>OTel: OTLP traces com resource attrs corr.trace_id/corr.span_id
    OTel->>OTel: transform/correlate reescreve trace_id e parent_span_id
    OTel-->>AI: azuremonitor exporter envia spans já re-parentados
```

---

## 3. Árvore Real da Transação Validada

Trace validado depois do prompt: `Adiciona um voucher de 10% no checkout do contoso-cart.`

`operation_Id = 5d210e1ff1014856861d30ae9ad05c77`

```mermaid
flowchart TB
    Op["operation_Id<br/>5d210e1ff1014856861d30ae9ad05c77"]

    subgraph Requests["requests table"]
        R1["APIM request<br/>POST /inference/openai/deployments/gpt-4.1-mini/chat/completions<br/>09:05:15Z<br/>200"]
        R2["copilot-sdk-service request<br/>POST /agent<br/>09:05:20Z<br/>200"]
        R3["APIM request<br/>POST /inference/openai/deployments/gpt-4.1-mini/chat/completions<br/>09:05:23Z<br/>200"]
    end

    subgraph Dependencies["dependencies table"]
        D1["APIM dependency<br/>POST /openai/deployments/gpt-4.1-mini/chat/completions<br/>target: models-foundry-zj44ehcf4zlxq.cognitiveservices.azure.com"]
        D2["contoso.orchestrator<br/>cloud_RoleName=copilot-sdk-service<br/>gen_ai.agent.name=contoso-orchestrator-agent"]
        D3["copilot.cloud_agent.task<br/>cloud_RoleName=copilot-sdk-service<br/>github.issue.number=41<br/>github.issue.url=https://github.com/eduxfernandes05/contoso-cart/issues/41"]
        D4["invoke_agent<br/>cloud_RoleName=github.copilot.coding_agent<br/>model=claude-sonnet-4.6"]
        D5["15x chat claude-sonnet-4.6<br/>token usage attrs disponíveis nos spans"]
        D6["6x execute_tool view"]
        D7["6x execute_tool edit"]
        D8["2x execute_tool bash"]
        D9["16x permission"]
        D10["search_code_subagent<br/>parallel_validation<br/>engine-tools-report_progress"]
    end

    Op --> R1
    Op --> R2
    Op --> R3
    R1 --> D1
    R2 --> D2
    D2 --> D3
    D3 --> D4
    D4 --> D5
    D4 --> D6
    D4 --> D7
    D4 --> D8
    D4 --> D9
    D4 --> D10
```

Resumo por role/name nessa operação:

| Tabela | cloud_RoleName | Nome | Contagem |
|---|---|---:|---:|
| requests | `apim-zj44ehcf4zlxq Sweden Central` | `POST /inference/openai/deployments/gpt-4.1-mini/chat/completions` | 2 |
| requests | `copilot-sdk-service` | `POST /agent` | 1 |
| dependencies | `apim-zj44ehcf4zlxq Sweden Central` | `POST /openai/deployments/gpt-4.1-mini/chat/completions` | 2 |
| dependencies | `copilot-sdk-service` | `contoso.orchestrator` | 1 |
| dependencies | `copilot-sdk-service` | `copilot.cloud_agent.task` | 1 |
| dependencies | `github.copilot.coding_agent` | `invoke_agent` | 1 |
| dependencies | `github.copilot.coding_agent` | `chat claude-sonnet-4.6` | 15 |
| dependencies | `github.copilot.coding_agent` | `execute_tool view` | 6 |
| dependencies | `github.copilot.coding_agent` | `execute_tool edit` | 6 |
| dependencies | `github.copilot.coding_agent` | `execute_tool bash` | 2 |
| dependencies | `github.copilot.coding_agent` | `permission` | 16 |

---

## 4. Data Plane de Telemetria

Há três caminhos de telemetria diferentes a aterrar no mesmo Application Insights.

```mermaid
flowchart LR
    subgraph Runtime["Runtime / execução"]
        F["Foundry hosted agent"]
        A["APIM diagnostic"]
        S["copilot-sdk-service<br/>Node + Express"]
        C["GitHub Copilot cloud agent"]
    end

    subgraph Export["Export / ingestão"]
        AIConn["Foundry AppInsights connection<br/>project connection"]
        APIMDiag["APIM Application Insights logger<br/>diagnostic applicationinsights"]
        AzMon["@azure/monitor-opentelemetry<br/>useAzureMonitor()"]
        OTLP["OTLP HTTP/protobuf<br/>Authorization=Bearer &lt;token&gt;"]
        Collector["OpenTelemetry Collector<br/>bearertokenauth<br/>transform/correlate<br/>batch<br/>azuremonitor exporter"]
    end

    AI[("Application Insights<br/>insights-zj44ehcf4zlxq")]

    F -. "project ligado ao AI<br/>span raiz azure.ai.agent ainda não visível" .-> AIConn
    AIConn -.-> AI

    A --> APIMDiag --> AI
    S --> AzMon --> AI
    C --> OTLP --> Collector --> AI
```

Detalhe dos caminhos:

| Fonte | Como exporta | Onde configura | Resultado |
|---|---|---|---|
| Foundry hosted agent | Connection do projeto para App Insights | Foundry project connection `agents-foundry-zj44ehcf4zlxq-appInsights-connection` | Projeto está ligado, mas span explícito `azure.ai.agent` ainda não apareceu nas queries |
| APIM | Diagnostic Application Insights | APIM `apim-zj44ehcf4zlxq` | Requests/dependencies APIM no mesmo `operation_Id` |
| `copilot-sdk-service` | Azure Monitor OpenTelemetry distro | `src/api/telemetry.ts` + env `APPLICATIONINSIGHTS_CONNECTION_STRING` | `POST /agent`, `contoso.orchestrator`, `copilot.cloud_agent.task` |
| Copilot cloud agent | OTLP HTTP/protobuf | GitHub Agents variables + firewall allowlist | Árvore profunda `github.copilot.coding_agent` |
| OTel Collector | Azure Monitor exporter | `observability/otel-collector/config.yaml` | Re-parent dos spans do cloud agent para a transação da API |
| Copilot Usage Records | Audit log streaming ou REST API enterprise | GitHub Enterprise AI Controls + audit log streaming destination | Prompts, responses e tool calls enterprise-wide para SIEM/Purview/auditoria |

### 4.1 Como Usage Records encaixa

```mermaid
flowchart LR
    subgraph Clients["Copilot clients"]
        GHCloud["Cloud agents<br/>github.com / ghe.com"]
        CLI["GitHub Copilot CLI"]
        VSCode["VS Code"]
        VS["Visual Studio"]
        IDE["Partner IDEs<br/>JetBrains / Eclipse"]
    end

    Records["Copilot Usage Records<br/>prompts + responses + tool calls"]
    Stream["Streaming endpoint<br/>continuous enterprise feed"]
    API["REST API<br/>last 48 hours"]
    SIEM["SIEM / event collector"]
    Purview["Microsoft Purview"]
    Audit["Audit automation / investigations"]

    GHCloud --> Records
    CLI --> Records
    VSCode --> Records
    VS --> Records
    IDE --> Records
    Records --> Stream --> SIEM
    Stream --> Purview
    Records --> API --> Audit
```

Usage Records responde a uma pergunta diferente do OTel:

| Pergunta | Melhor fonte |
|---|---|
| Esta execução específica passou por APIM, `/agent`, `copilot.cloud_agent.task` e tool calls? | App Insights + OTel |
| Que sessões Copilot aconteceram no enterprise, em que cliente, com que prompts/respostas/tool calls? | Copilot Usage Records |
| Como mando isto para SIEM/Purview sem instrumentar cada app? | Audit log streaming + Copilot Usage Records |

---

## 5. Como o `copilot.cloud_agent.task` Vira Pai do Cloud Agent

O GitHub Copilot cloud agent não aceitou `TRACEPARENT` como mecanismo de parenting. A solução usada é: passar correlação como resource attributes e reescrever o trace no Collector.

```mermaid
flowchart TB
    Start["POST /agent recebe chamada da tool Foundry"]
    RootSpan["span: contoso.orchestrator<br/>trace_id=T"]
    TaskSpan["span: copilot.cloud_agent.task<br/>trace_id=T<br/>span_id=S"]
    Upsert["GitHub REST<br/>PATCH/POST /repos/{owner}/{repo}/agents/variables/OTEL_RESOURCE_ATTRIBUTES"]
    Value["Valor gravado:<br/>corr.trace_id=T,corr.span_id=S"]
    Assign["GitHub GraphQL<br/>replaceActorsForAssignable(issue, copilot-swe-agent)"]
    Cloud["Cloud agent run<br/>herda OTEL_RESOURCE_ATTRIBUTES"]
    Export["Cloud agent exporta OTLP<br/>resource.attributes corr.trace_id/corr.span_id"]
    Transform["Collector transform/correlate<br/>set(trace_id.string, corr.trace_id)<br/>set(parent_span_id.string, corr.span_id)"]
    AI["Application Insights<br/>operation_Id=T<br/>parent=copilot.cloud_agent.task"]

    Start --> RootSpan --> TaskSpan --> Upsert --> Value --> Assign --> Cloud --> Export --> Transform --> AI
```

Código responsável no `/agent`:

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

Transform no Collector:

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

Importante: `OTEL_RESOURCE_ATTRIBUTES` é uma variável global do store de Agents do repo. Para demo sequencial está OK. Para concorrência real, há risco de race condition se duas delegações forem disparadas quase ao mesmo tempo.

---

## 6. Configuração por Componente

```mermaid
flowchart LR
    subgraph FoundryCfg["Foundry"]
        FoundryAgent["contoso-orchestrator-agent"]
        OpenAPISpec["foundry/agent-tool.openapi.json<br/>operationId=delegateToCopilot<br/>server=ca-api...azurecontainerapps.io"]
        FoundryConnections["Connections:<br/>AppInsights -> insights-zj44ehcf4zlxq<br/>ApiManagement -> apim-zj44ehcf4zlxq/inference/openai"]
    end

    subgraph APICfg["copilot-sdk-service"]
        Telemetry["src/api/telemetry.ts<br/>useAzureMonitor({ samplingRatio: 1 })"]
        AgentRoute["src/api/routes/agent.ts<br/>createIssue + assign Copilot<br/>withAgentSpan()"]
        Bicep["infra/resources.bicep<br/>APPLICATIONINSIGHTS_CONNECTION_STRING<br/>OTEL_SERVICE_NAME=copilot-sdk-service"]
    end

    subgraph GitHubCfg["GitHub repo Agents config"]
        Vars["Agents variables:<br/>COPILOT_OTEL_ENABLED=true<br/>OTEL_EXPORTER_OTLP_ENDPOINT=https://ca-otel-collector...<br/>OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf<br/>OTEL_SERVICE_NAME=github.copilot.coding_agent<br/>COPILOT_OTEL_CAPTURE_CONTENT=true<br/>OTEL_RESOURCE_ATTRIBUTES=dynamic per task"]
        Headers["OTEL_EXPORTER_OTLP_HEADERS<br/>Authorization=Bearer <token>"]
        Firewall["Cloud agent firewall allowlist<br/>ca-otel-collector...azurecontainerapps.io"]
    end

    subgraph CollectorCfg["OTel Collector"]
        Receiver["receivers.otlp<br/>http 0.0.0.0:4318<br/>grpc 0.0.0.0:4317<br/>bearertokenauth"]
        Processor["processors:<br/>transform/correlate<br/>batch"]
        Exporter["exporters.azuremonitor<br/>APPLICATIONINSIGHTS_CONNECTION_STRING"]
    end

    FoundryAgent --> OpenAPISpec --> AgentRoute
    FoundryConnections --> Bicep
    Telemetry --> Bicep
    AgentRoute --> Vars
    Vars --> Receiver
    Headers --> Receiver
    Firewall --> Receiver
    Receiver --> Processor --> Exporter
```

---

## 7. O Que Cada Span Representa

| Span / request | Origem | Tabela App Insights | Significado |
|---|---|---|---|
| `POST /inference/openai/deployments/gpt-4.1-mini/chat/completions` | APIM | `requests` | Foundry chamou o modelo via APIM |
| `POST /openai/deployments/gpt-4.1-mini/chat/completions` | APIM | `dependencies` | APIM encaminhou para o endpoint Cognitiveservices/Foundry model |
| `POST /agent` | Container App API | `requests` | Tool OpenAPI `delegateToCopilot` chamou a API |
| `contoso.orchestrator` | `copilot-sdk-service` | `dependencies` | Span lógico da orquestração governada |
| `copilot.cloud_agent.task` | `copilot-sdk-service` | `dependencies` | Momento em que a task é delegada ao GitHub Copilot cloud agent |
| `invoke_agent` | Copilot cloud agent | `dependencies` | Execução principal do cloud agent |
| `chat claude-sonnet-4.6` | Copilot cloud agent | `dependencies` | Chamadas LLM internas do agent, com atributos de tokens |
| `execute_tool view/edit/bash` | Copilot cloud agent | `dependencies` | Ferramentas usadas pelo agent no repo |
| `permission` | Copilot cloud agent | `dependencies` | Gates/autorização das tool calls |

---

## 8. Como Abrir a Transação no Portal

1. Azure Portal → Application Insights `insights-zj44ehcf4zlxq`.
2. Abrir `Transaction search`.
3. Pesquisar por:

```text
5d210e1ff1014856861d30ae9ad05c77
```

4. Abrir um item da transação e escolher `End-to-end transaction details`.
5. Confirmar roles:
   - `apim-zj44ehcf4zlxq Sweden Central`
   - `copilot-sdk-service`
   - `github.copilot.coding_agent`

---

## 9. Queries KQL Úteis

### 9.1 Ver requests do trace validado

```kusto
requests
| where operation_Id == "5d210e1ff1014856861d30ae9ad05c77"
| project timestamp, cloud_RoleName, name, url, operation_ParentId, id, success, resultCode
| order by timestamp asc
```

### 9.2 Ver dependencies do trace validado

```kusto
dependencies
| where operation_Id == "5d210e1ff1014856861d30ae9ad05c77"
| project timestamp, cloud_RoleName, name, target, type, operation_ParentId, id, success, resultCode,
          genai=tostring(customDimensions["gen_ai.system"]),
          agent=tostring(customDimensions["gen_ai.agent.name"]),
          model=tostring(customDimensions["gen_ai.request.model"])
| order by timestamp asc
```

### 9.3 Resumo por role/name

```kusto
dependencies
| where operation_Id == "5d210e1ff1014856861d30ae9ad05c77"
| summarize count(), min(timestamp), max(timestamp) by cloud_RoleName, name
| order by min_timestamp asc
```

### 9.4 Procurar spans Foundry explícitos

```kusto
dependencies
| where timestamp > ago(6h)
| where cloud_RoleName has "foundry"
   or name has "foundry"
   or name has "delegate"
   or tostring(customDimensions) has "azure.ai.agent"
   or tostring(customDimensions) has "contoso-orchestrator-agent"
| project timestamp, cloud_RoleName, name, operation_Id, operation_ParentId, id, customDimensions
| order by timestamp desc
```

---

## 10. Estado Atual vs Falta

```mermaid
flowchart TB
    Done1["DONE<br/>APIM no mesmo operation_Id"]
    Done2["DONE<br/>POST /agent no mesmo operation_Id"]
    Done3["DONE<br/>contoso.orchestrator + copilot.cloud_agent.task"]
    Done4["DONE<br/>Copilot cloud agent deep spans com LLM/tool/permission"]
    Done5["DONE<br/>Collector re-parenta spans para o trace da API"]

    Pending1["PENDING / nuance<br/>span raiz hosted Foundry azure.ai.agent ainda não visível no App Insights"]
    Pending2["PENDING hardening<br/>IaC do ca-otel-collector no Bicep"]
    Pending3["PENDING hardening<br/>evitar race em OTEL_RESOURCE_ATTRIBUTES global"]
    Pending4["PENDING security<br/>mover header/token para secret se o store suportar bem"]

    Done1 --> Done2 --> Done3 --> Done4 --> Done5
    Done5 --> Pending1
    Done5 --> Pending2
    Done5 --> Pending3
    Done5 --> Pending4
```

---

## 11. Interpretação Correta Para Demo

Frase curta e tecnicamente honesta:

> A demo já tem trace end-to-end correlacionado em Application Insights: Foundry usa APIM para o modelo, chama a tool `/agent`, o serviço cria `contoso.orchestrator` e `copilot.cloud_agent.task`, e o GitHub Copilot cloud agent exporta a árvore profunda via OTLP para um Collector que re-parenta os spans para o mesmo `operation_Id`. O que ainda não aparece é um span raiz explícito do runtime hosted Foundry com `gen_ai.system=azure.ai.agent`; APIM e tool calls já aparecem correlacionados.

---

## 12. Limitações Técnicas Conhecidas

| Limitação | Impacto | Mitigação atual |
|---|---|---|
| Cloud agent ignora `TRACEPARENT` como env var | Não dá para parentar diretamente por trace context nativo | Usamos `OTEL_RESOURCE_ATTRIBUTES` + Collector transform |
| `OTEL_RESOURCE_ATTRIBUTES` é global no repo | Corridas concorrentes podem trocar `corr.trace_id` | OK para demo sequencial; para produção precisaria de isolamento por task/run ou outro canal de correlação |
| Hosted Foundry não mostra `azure.ai.agent` nas queries atuais | A raiz visual pode começar em APIM/tool, não no agent hosted | Foundry project está conectado ao AI; continuar a validar portal Foundry Traces vs App Insights |
| Collector exposto publicamente | Superfície de ingestão pública | Bearer token + firewall allowlist do cloud agent |
| Collector ainda não está em Bicep | Pode perder-se em reprovisionamento | Fase futura: IaC do `ca-otel-collector` |

---

## 13. Nomes Reais Para Referência

| Item | Valor |
|---|---|
| Resource group | `rg-agent-demo` |
| App Insights principal | `insights-zj44ehcf4zlxq` |
| Foundry account | `agents-foundry-zj44ehcf4zlxq` |
| Foundry project | `foundry-project-agents-foundry` |
| Foundry agent | `contoso-orchestrator-agent` |
| APIM | `apim-zj44ehcf4zlxq` |
| API Container App | `ca-api-edudemo-csdk-4bq4xx` |
| Collector Container App | `ca-otel-collector` |
| Collector endpoint | `https://ca-otel-collector.gentlepond-a81d8e3c.swedencentral.azurecontainerapps.io` |
| GitHub repo | `eduxfernandes05/contoso-cart` |
| Copilot cloud agent role | `github.copilot.coding_agent` |
| Validated issue | `https://github.com/eduxfernandes05/contoso-cart/issues/41` |
| Validated operation_Id | `5d210e1ff1014856861d30ae9ad05c77` |
