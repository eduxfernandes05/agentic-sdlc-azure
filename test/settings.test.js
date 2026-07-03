import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(__dirname, "../public/index.html"), "utf8");

test("settings gear button is present with correct id", () => {
  assert.ok(html.includes('id="settings-btn"'), 'Missing element id="settings-btn"');
});

test("settings gear button has aria-label for accessibility", () => {
  assert.ok(html.includes('aria-label="Settings"'), 'Missing aria-label="Settings" on settings button');
});

test("settings gear button uses gear icon", () => {
  assert.ok(html.includes("⚙️"), "Missing gear icon (⚙️) in settings button");
});

test("settings panel is present with correct id", () => {
  assert.ok(html.includes('id="settings-panel"'), 'Missing element id="settings-panel"');
});

test("settings panel has role=dialog for accessibility", () => {
  assert.ok(html.includes('role="dialog"'), 'Missing role="dialog" on settings panel');
});

test("settings button click toggles settings panel open class", () => {
  assert.ok(
    html.includes("settingsPanel.classList.toggle") || html.includes('settingsPanel.classList.toggle("open")'),
    "Missing JS to toggle settings panel open class on button click"
  );
});

test("settings panel is positioned fixed at bottom right", () => {
  assert.ok(
    html.includes("position: fixed") && html.includes("bottom:") && html.includes("right:"),
    "Settings button/panel should be fixed positioned at bottom right"
  );
});
