# OTel Collector (contrib) com config baked-in.
# azuremonitor exporter + bearertokenauth. Config lê secrets via ${env:...}.
FROM otel/opentelemetry-collector-contrib:latest
COPY config.yaml /etc/otelcol-contrib/config.yaml
EXPOSE 4317 4318
