// OpenTelemetry bootstrap — must be imported BEFORE express/copilot-sdk.
// Sends traces/metrics/logs to Application Insights when the connection string is set.
import { useAzureMonitor } from "@azure/monitor-opentelemetry";
import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";

const conn = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;
if (conn) {
  useAzureMonitor({
    azureMonitorExporterOptions: { connectionString: conn },
    samplingRatio: 1,
  });
  console.log("✓ OpenTelemetry → Application Insights enabled");
} else {
  console.warn("⚠ APPLICATIONINSIGHTS_CONNECTION_STRING not set — tracing disabled");
}

const tracer = trace.getTracer("copilot-sdk-service");

/** GenAI semantic-convention system name used by the agent conversation view. */
const SYSTEM = "github.copilot";

/**
 * Wrap async work in a gen_ai span so it shows up in the App Insights
 * "Agent conversation" experience as an invoke_agent step.
 */
export async function withAgentSpan<T>(
  name: string,
  attrs: Record<string, string | number>,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span: Span) => {
    span.setAttribute("gen_ai.system", SYSTEM);
    span.setAttribute("gen_ai.operation.name", "invoke_agent");
    for (const [k, v] of Object.entries(attrs)) span.setAttribute(k, v);
    try {
      const out = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return out;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: err instanceof Error ? err.message : String(err) });
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      throw err;
    } finally {
      span.end();
    }
  });
}
