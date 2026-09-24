import assert from "node:assert/strict";
import fs from "node:fs";

const config = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const rules = config?.git?.deploymentEnabled;

assert.equal(typeof rules, "object");
for (const pattern of [
  "validation/*",
  "research/*",
  "verify/*",
  "diagnostic/*",
  "work/*",
]) {
  assert.equal(rules[pattern], false, `${pattern} must not trigger Vercel Git deployments`);
}

assert.equal(
  Object.prototype.hasOwnProperty.call(rules, "integration/*"),
  false,
  "integration/* must remain eligible for exact-head Preview deployment",
);
assert.equal(
  Object.prototype.hasOwnProperty.call(rules, "main"),
  false,
  "main must remain eligible for Production deployment",
);

console.log("PASS: Vercel deployment policy keeps non-integration branches out of auto deploys");
