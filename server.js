// Contoso Cart — web server.
// Serves the checkout page and a small API that prices the cart
// using the core logic in src/cart.js. As the coding agent evolves
// cart.js (and this UI), the live site changes after each merge.

import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cartTotal, applyVoucher } from "./src/cart.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Sample cart used by the demo storefront.
const items = [
  { name: "Coffee", price: 3, quantity: 2 },
  { name: "Mug", price: 10, quantity: 1 },
];

app.use(express.static(join(__dirname, "public")));
app.use(express.json());

app.get("/api/cart", (_req, res) => {
  res.json({ items, subtotal: cartTotal(items) });
});

app.post("/api/voucher", (req, res) => {
  const { code } = req.body || {};
  const subtotal = cartTotal(items);
  const result = applyVoucher(subtotal, code);
  res.json({ ...result, subtotal });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Contoso Cart Simulator running on port ${port}`));
