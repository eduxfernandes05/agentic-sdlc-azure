// Contoso Cart — web server.
// Serves the checkout page and a small API that prices the cart
// using the core logic in src/cart.js. As the coding agent evolves
// cart.js (and this UI), the live site changes after each merge.

import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cartTotal } from "./src/cart.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Sample cart used by the demo storefront.
const items = [
  { name: "Coffee", price: 3, quantity: 2 },
  { name: "Mug", price: 10, quantity: 1 },
];

app.use(express.static(join(__dirname, "public")));

app.get("/api/cart", (_req, res) => {
  res.json({ items, subtotal: cartTotal(items) });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Contoso Cart running on port ${port}`));
