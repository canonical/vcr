# Playwright training actions example

A product-neutral example of the `demo` action helper. It renders offline from a
`data:` URL, so it needs no external service or credentials.

Render it with:

```bash
cd slidev/src
node scripts/render-playwright-videos.js --file playwright-actions-example.md
```

```playwright name=training-actions-example width=1280 height=720
export default async function ({ page, demo }) {
  const html = [
    "<!doctype html><html><head><meta charset='utf-8'><title>Training actions</title>",
    "<style>body{font-family:sans-serif;margin:48px}button,input{font-size:18px;padding:8px 12px}</style>",
    "</head><body>",
    "<h1 id='title'>Training actions demo</h1>",
    "<p><button id='go'>Run action</button></p>",
    "<p><input id='query' placeholder='Search here' /></p>",
    "<p id='status'>Status: idle</p>",
    "<script>document.getElementById('go').addEventListener('click', function () {",
    "document.getElementById('status').textContent = 'Status: clicked'; });</script>",
    "</body></html>",
  ].join("");

  await page.goto("data:text/html;charset=utf-8," + encodeURIComponent(html));

  await demo.highlight(page.getByRole("heading", { name: "Training actions demo" }), 1200);
  await demo.click(page.getByRole("button", { name: "Run action" }));
  await demo.type(page.getByPlaceholder("Search here"), "microcloud", { clear: true });
  await demo.wait(600);
  await demo.highlight(page.getByText("Status: clicked"), 1200);
}
```
