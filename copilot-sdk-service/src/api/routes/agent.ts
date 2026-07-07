import { Router } from "express";
import { withAgentSpan } from "../telemetry.js";

const router = Router();

/** Upsert a Copilot "Agents" variable (read by the cloud agent as an env var) via REST. Best-effort. */
async function upsertAgentsVariable(
  token: string,
  owner: string,
  name: string,
  varName: string,
  value: string,
): Promise<void> {
  const base = `https://api.github.com/repos/${owner}/${name}/agents/variables`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2026-03-10",
    "Content-Type": "application/json",
    "User-Agent": "copilot-sdk-service",
  };
  try {
    let r = await fetch(`${base}/${varName}`, { method: "PATCH", headers, body: JSON.stringify({ name: varName, value }) });
    if (r.status === 404) {
      r = await fetch(base, { method: "POST", headers, body: JSON.stringify({ name: varName, value }) });
    }
    if (!r.ok && r.status !== 204) console.warn(`⚠ Could not set Agents variable ${varName}: HTTP ${r.status}`);
  } catch (e) {
    console.warn(`⚠ Agents variable ${varName} upsert failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

/** Resolve the target repository from GITHUB_REPO ("owner/name"). */
function repoFromEnv(): { owner: string; name: string } {
  const full = process.env.GITHUB_REPO;
  if (!full || !full.includes("/")) {
    throw new Error("GITHUB_REPO must be configured as 'owner/name'");
  }
  const [owner, name] = full.split("/");
  return { owner, name };
}

/** Minimal GitHub GraphQL client using the service's GitHub token. */
async function gql<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const r = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "copilot-sdk-service",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await r.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
  if (!json.data) throw new Error(`GitHub GraphQL returned no data (HTTP ${r.status})`);
  return json.data;
}

/**
 * POST /agent
 *
 * The governed orchestrator: takes a feature request, opens a GitHub issue and
 * delegates it to the GitHub Copilot coding agent (cloud), which autonomously
 * implements the change and opens a Pull Request.
 *
 * Body: { title: string, body?: string }  (alias: { task: string })
 */
router.post("/agent", async (req, res) => {
  const { title, body, task } = req.body as { title?: string; body?: string; task?: string };
  const issueTitle = (title ?? task ?? "").trim();
  const issueBody = (body ?? "").trim();

  if (!issueTitle) {
    res.status(400).json({ error: "'title' (or 'task') must be a non-empty string" });
    return;
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    res.status(500).json({ error: "GITHUB_TOKEN is not configured on the server" });
    return;
  }

  try {
    const { owner, name } = repoFromEnv();
    const result = await withAgentSpan(
      "contoso.orchestrator",
      { "gen_ai.agent.name": process.env.AGENT_NAME ?? "orchestrator-agent", "gen_ai.request.model": process.env.MODEL_NAME ?? "default" },
      async (span) => {
        span.setAttribute("gen_ai.input.messages", issueTitle);
    // 1. Resolve the repository node id and the Copilot coding agent actor id.
    const meta = await gql<{
      repository: { id: string; suggestedActors: { nodes: Array<{ login: string; id?: string }> } };
    }>(
      token,
      `query($owner:String!,$name:String!){
        repository(owner:$owner,name:$name){
          id
          suggestedActors(capabilities:[CAN_BE_ASSIGNED], first:100){
            nodes{ login ... on Bot { id } }
          }
        }
      }`,
      { owner, name },
    );

    const repoId = meta.repository.id;
    const copilot = meta.repository.suggestedActors.nodes.find((n) => n.login === "copilot-swe-agent");
    if (!copilot?.id) {
      throw new Error(
        "The GitHub Copilot coding agent is not assignable on this repository. Enable Copilot coding agent in the repo/org settings.",
      );
    }

    // 2. Create the GitHub issue.
    const created = await gql<{ createIssue: { issue: { id: string; number: number; url: string } } }>(
      token,
      `mutation($repo:ID!,$title:String!,$body:String){
        createIssue(input:{repositoryId:$repo, title:$title, body:$body}){
          issue{ id number url }
        }
      }`,
      { repo: repoId, title: issueTitle, body: issueBody || null },
    );
    const issue = created.createIssue.issue;

    // 3. Assign the Copilot coding agent -> triggers the autonomous cloud run.
    await withAgentSpan(
      "copilot.cloud_agent.task",
      {
        "gen_ai.agent.name": "github.copilot.coding_agent",
        "github.issue.number": issue.number,
        "github.issue.url": issue.url,
      },
      async (taskSpan) => {
        // Inject correlation so the collector re-parents the cloud agent's OTEL spans
        // into this same trace (unified end-to-end transaction).
        const { traceId, spanId } = taskSpan.spanContext();
        await upsertAgentsVariable(
          token,
          owner,
          name,
          "OTEL_RESOURCE_ATTRIBUTES",
          `corr.trace_id=${traceId},corr.span_id=${spanId}`,
        );
        return gql(
          token,
          `mutation($assignable:ID!,$actor:ID!){
            replaceActorsForAssignable(input:{assignableId:$assignable, actorIds:[$actor]}){
              assignable{ ... on Issue { number } }
            }
          }`,
          { assignable: issue.id, actor: copilot.id },
        );
      },
    );
        span.setAttribute("gen_ai.output.messages", `issue#${issue.number}`);
        return issue;
      },
    );

    res.json({
      status: "delegated",
      message:
        "Issue created and delegated to the GitHub Copilot coding agent. It will open a Pull Request shortly.",
      repository: `${owner}/${name}`,
      issueNumber: result.number,
      issueUrl: result.url,
      assignedTo: "Copilot",
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
