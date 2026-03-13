import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { htmlToMarkdown } from "./markdown.js";

describe("htmlToMarkdown", () => {
  test("converts headings to atx style", () => {
    assert.equal(htmlToMarkdown("<h1>Title</h1>"), "# Title");
    assert.equal(htmlToMarkdown("<h2>Section</h2>"), "## Section");
    assert.equal(htmlToMarkdown("<h3>Sub</h3>"), "### Sub");
  });

  test("converts unordered lists with dash marker", () => {
    const html = "<ul><li>One</li><li>Two</li></ul>";
    const md = htmlToMarkdown(html)!;
    assert.ok(md.includes("-   One"));
    assert.ok(md.includes("-   Two"));
  });

  test("converts bold and italic", () => {
    assert.equal(htmlToMarkdown("<b>bold</b>"), "**bold**");
    assert.equal(htmlToMarkdown("<strong>bold</strong>"), "**bold**");
    assert.equal(htmlToMarkdown("<i>italic</i>"), "_italic_");
    assert.equal(htmlToMarkdown("<em>italic</em>"), "_italic_");
  });

  test("converts links", () => {
    const html = '<a href="https://example.com">Click</a>';
    assert.equal(htmlToMarkdown(html), "[Click](https://example.com)");
  });

  test("returns undefined for null, undefined, and empty string", () => {
    assert.equal(htmlToMarkdown(null), undefined);
    assert.equal(htmlToMarkdown(undefined), undefined);
    assert.equal(htmlToMarkdown(""), undefined);
  });

  test("passes plain text through unchanged", () => {
    assert.equal(htmlToMarkdown("Hello world"), "Hello world");
  });

  test("converts a realistic nested job description", () => {
    const html = `
      <div>
        <h2>About the Role</h2>
        <p>We are looking for a <strong>Software Engineer</strong> to join our team.</p>
        <h3>Requirements</h3>
        <ul>
          <li>3+ years experience with <em>TypeScript</em></li>
          <li>Knowledge of React</li>
          <li>Strong communication skills</li>
        </ul>
        <h3>Benefits</h3>
        <ul>
          <li>Remote work</li>
          <li>Competitive salary</li>
        </ul>
      </div>
    `;
    const md = htmlToMarkdown(html)!;
    assert.ok(md.includes("## About the Role"));
    assert.ok(md.includes("**Software Engineer**"));
    assert.ok(md.includes("### Requirements"));
    assert.ok(md.includes("-   3+ years experience with _TypeScript_"));
    assert.ok(md.includes("-   Knowledge of React"));
    assert.ok(md.includes("### Benefits"));
    assert.ok(md.includes("-   Remote work"));
    // Should not contain HTML tags
    assert.ok(!/<[^>]+>/.test(md), "Should not contain HTML tags");
  });
});
