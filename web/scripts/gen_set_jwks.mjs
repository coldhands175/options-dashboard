#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { importPKCS8, exportJWK } from "jose";

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} failed: ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim();
}

async function main() {
  const pem = run("npx", ["convex", "env", "get", "JWT_PRIVATE_KEY"]);
  // Alg used by @convex-dev/auth
  const alg = "RS256";
  const key = await importPKCS8(pem, alg, { extractable: true });
  const jwk = await exportJWK(key);
  // Convert private JWK to public JWK for JWKS by removing private params
  const { kty, n, e } = jwk;
  if (!kty || !n || !e) {
    throw new Error("Failed to derive public JWK from private key");
  }
  const publicJwk = { kty, n, e, alg, use: "sig", kid: "dev-key-1" };
  const jwks = { keys: [publicJwk] };
  const jwksStr = JSON.stringify(jwks);
  // Set in Convex env
  run("npx", ["convex", "env", "set", "JWKS", jwksStr]);
  console.log("Set JWKS in Convex dev environment");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

