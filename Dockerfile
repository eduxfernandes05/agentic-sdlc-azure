FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
# EDOT (Elastic Distribution of OpenTelemetry) zero-code instrumentation.
# Emits OTLP to Elastic Cloud when OTEL_EXPORTER_OTLP_* env vars are set;
# a no-op otherwise.
CMD ["node", "--import", "@elastic/opentelemetry-node", "server.js"]
