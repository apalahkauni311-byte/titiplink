import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, safeText, randomToken } from "../src/lib/index.js";
test("PBKDF2 password hashes are salted and verifiable", async()=>{const a=await hashPassword("correct horse battery staple");const b=await hashPassword("correct horse battery staple");assert.notEqual(a.salt,b.salt);assert.notEqual(a.hash,b.hash);assert.equal(await verifyPassword("correct horse battery staple",a.salt,a.hash),true);assert.equal(await verifyPassword("wrong",a.salt,a.hash),false)});
test("safeText strips control characters and caps length",()=>{assert.equal(safeText("ab\ncd",3),"abc")});
test("random tokens are unpredictable-looking hex",()=>{assert.match(randomToken(16),/^[a-f0-9]{32}$/)});
