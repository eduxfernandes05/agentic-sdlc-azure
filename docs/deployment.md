# Deployment

This guide covers the Azure and GitHub resources needed to run the full loop, and how to configure each part.

You provide your own resources. The names below are examples — replace them with your own.

---

## Resources

| Resource | Example name | Purpose |
|---|---|---|
| Resource group | `rg-agentic-sdlc` | Holds the demo resources |
| Application Insights | `<your-app-insights>` | Single telemetry target for the whole chain |
| Foundry account | `<your-foundry-account>` | Hosts the agent and model access |
| Foundry project | `<your-foundry-project>` | Project with App Insights + APIM connections |
| Foundry agent | `orchestrator-agent` | The orchestrator agent |
| API Management | `<your-apim>` | GenAI gateway in the model path |
| API Container App | `<your-api-app>` | Runs `copilot-sdk-service` (`/agent`) |
| Collector Container App | `<your-collector-app>` | OpenTelemetry Collector |
| Site Container App | `<your-site-app>` | The live demo site |
| GitHub repo | `<owner>/contoso-cart` | Target repo and this app |

---

## Prerequisites

- Azure subscription with permission to create the resources above.
- Azure AI Foundry project with a deployed model (for example `gpt-4.1-mini`).
- APIM instance fronting the model as a GenAI gateway.
- Application Insights resource.
- GitHub repository with the GitHub Copilot coding agent enabled and `copilot-swe-agent` assignable.
- [Azure Developer CLI (`azd`)](https://aka.ms/azd-install), [Node.js](https://nodejs.org/) 20+, and [Docker](https://docs.docker.com/get-docker/).

---

## 1. Deploy the delivery API (`copilot-sdk-service`)

The API exposes `POST /agent`, which creates a GitHub issue, assigns the Copilot cloud agent, and emits trace spans. It ships with Bicep infrastructure under [`copilot-sdk-service/infra`](../copilot-sdk-service/infra).

```bash
cd copilot-sdk-service
azd auth login
azd env set GITHUB_REPO <owner>/contoso-cart
azd env set OBSERVABILITY_INSIGHTS_NAME <your-app-insights>
azd up
```

Required environment on the API Container App:

| Variable | Purpose |
|---|---|
| `GITHUB_TOKEN` | Token used to call GitHub APIs (store in Key Vault) |
| `GITHUB_REPO` | Target repo in `owner/name` format |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Telemetry target |
| `OTEL_SERVICE_NAME` | `copilot-sdk-service` |

Telemetry bootstrap lives in [`copilot-sdk-service/src/api/telemetry.ts`](../copilot-sdk-service/src/api/telemetry.ts) and must be imported first at startup.

---

## 2. Deploy the OpenTelemetry Collector

The collector receives OTLP from the GitHub Copilot cloud agent, re-parents its spans into the API trace, and exports to Application Insights. Configuration is in [`observability/otel-collector/config.yaml`](../observability/otel-collector/config.yaml).

Required environment on the collector Container App:

| Variable | Purpose |
|---|---|
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Export target (Azure Monitor exporter) |
| `OTEL_INGEST_TOKEN` | Bearer token validated on OTLP ingestion |

The collector must accept OTLP HTTP on `4318` and be reachable by the cloud agent (allow its FQDN in the agent firewall).

---

## 3. Register the OpenAPI tool in Foundry

The Foundry agent calls the API through an OpenAPI tool. The contract is in [`copilot-sdk-service/foundry/agent-tool.openapi.json`](../copilot-sdk-service/foundry/agent-tool.openapi.json).

1. In Foundry, open the agent and add a tool from the OpenAPI spec.
2. Set the tool server URL to the deployed `/agent` endpoint.
3. Keep the tool description focused on intent: pass acceptance criteria, not file paths.
4. Connect the model through APIM (`ai-gateway`) and connect the project to Application Insights.

---

## 4. Configure the GitHub Copilot cloud agent

These are **GitHub Copilot Agents variables**, not GitHub Actions environment variables.

| Variable | Value |
|---|---|
| `COPILOT_OTEL_ENABLED` | `true` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://<your-collector-app>.<domain>` |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` |
| `OTEL_SERVICE_NAME` | `github.copilot.coding_agent` |
| `COPILOT_OTEL_CAPTURE_CONTENT` | `true` |
| `OTEL_EXPORTER_OTLP_HEADERS` | `Authorization=Bearer <token>` |
| `OTEL_RESOURCE_ATTRIBUTES` | Written dynamically by `/agent` per task |

Also allowlist the collector FQDN in the cloud-agent firewall so it can export telemetry.

---

## 5. Deploy the demo site

The `contoso-cart` app deploys to Azure Container Apps through [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) on every push to `main`. The workflow uses OIDC (no stored passwords) to build the image and update the Container App.

Required GitHub configuration for the workflow:

| Type | Name | Purpose |
|---|---|---|
| Secret | `AZURE_CLIENT_ID` | Federated identity for OIDC login |
| Secret | `AZURE_TENANT_ID` | Azure tenant |
| Secret | `AZURE_SUBSCRIPTION_ID` | Target subscription |
| Variable | `AZURE_CONTAINER_REGISTRY` | ACR that builds and stores the image |
| Variable | `AZURE_RESOURCE_GROUP` | Resource group of the site Container App |
| Variable | `AZURE_CONTAINER_APP` | Site Container App name |

Set variables under **Settings → Secrets and variables → Actions → Variables**, and secrets under **Secrets**.

---

## `/agent` Contract

Request:

```http
POST /agent
Content-Type: application/json

{
  "title": "Add voucher support at checkout",
  "body": "Acceptance criteria and business behavior. Do not force file paths."
}
```

Response:

```json
{
  "status": "delegated",
  "repository": "owner/repo",
  "issueNumber": 41,
  "issueUrl": "https://github.com/owner/repo/issues/41",
  "assignedTo": "Copilot"
}
```

---

## Production Hardening

| Area | Demo state | Production direction |
|---|---|---|
| `/agent` ingress | Public Container App endpoint | Put behind APIM, auth or private networking |
| GitHub credential | Token in Key Vault | Prefer a GitHub App with least privilege |
| Collector auth | Static bearer token | Move to a managed secret |
| Correlation variable | Repo-level `OTEL_RESOURCE_ATTRIBUTES` | Isolate per run to avoid concurrency races |
| Collector infra | Provisioned partly by hand | Add to Bicep/azd for repeatable deployment |
| Data capture | `COPILOT_OTEL_CAPTURE_CONTENT=true` | Review privacy, retention and redaction |
