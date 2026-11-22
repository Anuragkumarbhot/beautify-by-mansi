const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Academy page presents online and offline makeup and nail technician classes", () => {
  const page = read("apps/web/src/app/academy/page.tsx");
  assert.match(page, /Online training/);
  assert.match(page, /Offline training/);
  assert.match(page, /Makeup Artist Training/);
  assert.match(page, /Nail Technician Training/);
  assert.match(page, /https:\/\/wa\.me\/919877339755/);
});

test("Academy route is linked from the homepage and store navigation", () => {
  assert.match(read("apps/web/src/app/page.tsx"), /href="\/academy"/);
  assert.match(read("apps/web/src/components/store-header.tsx"), /href="\/academy"/);
});

test("Academy page does not publish unapproved fees or course duration", () => {
  const page = read("apps/web/src/app/academy/page.tsx");
  assert.ok(page.includes("fees,"));
  assert.ok(page.includes("syllabus, training format"));
  assert.ok(page.includes("Course duration, fees, batch size, kit inclusions and certificate"));
  assert.doesNotMatch(page, /₹\s?\d/);
});
