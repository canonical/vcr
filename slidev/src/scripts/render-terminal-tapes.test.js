import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const renderScript = path.join(projectRoot, "scripts", "render-terminal-tapes.js");

test("re-rendering a nested cached terminal block leaves one rendered image", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sli-terminal-"));
  const markdownPath = path.join(tmpDir, "slides.md");

  await fs.writeFile(markdownPath, `# A terminal session

<!-- sli-terminal:start hash=old1 format=gif -->
![Terminal recording](./terminal-cache/basic-terminal-old1.gif)
<!-- sli-terminal:source -->
<!-- sli-terminal:start hash=old2 format=gif -->
![Terminal recording](./terminal-cache/basic-terminal-old2.gif)
<!-- sli-terminal:source -->
\`\`\`txt terminal name=basic-terminal
Type "echo hello"
\`\`\`
<!-- sli-terminal:end -->
`);

  const result = spawnSync(process.execPath, [renderScript, "--file", markdownPath, "--skip-render"], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const rendered = await fs.readFile(markdownPath, "utf8");
  assert.equal(rendered.match(/<!-- sli-terminal:start/g)?.length, 1);
  assert.equal(rendered.match(/!\[Terminal recording]/g)?.length, 1);
  assert.equal(rendered.match(/```txt terminal name=basic-terminal/g)?.length, 1);
});
