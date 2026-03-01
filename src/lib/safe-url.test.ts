import { describe, it, expect } from "vitest";
import { safeHref } from "./safe-url";

describe("safeHref", () => {
  // Allowed protocols
  it("allows http:// URLs", () => {
    expect(safeHref("http://example.com")).toBe("http://example.com");
  });

  it("allows https:// URLs", () => {
    expect(safeHref("https://example.com")).toBe("https://example.com");
  });

  it("allows case-insensitive HTTP/HTTPS", () => {
    expect(safeHref("HTTP://EXAMPLE.COM")).toBe("HTTP://EXAMPLE.COM");
    expect(safeHref("HTTPS://EXAMPLE.COM")).toBe("HTTPS://EXAMPLE.COM");
    expect(safeHref("Https://Example.com")).toBe("Https://Example.com");
  });

  it("allows URLs with query strings", () => {
    expect(safeHref("https://example.com?q=test&page=1")).toBe(
      "https://example.com?q=test&page=1"
    );
  });

  it("allows URLs with ports", () => {
    expect(safeHref("http://localhost:3000")).toBe("http://localhost:3000");
  });

  // Blocked inputs
  it("returns undefined for null", () => {
    expect(safeHref(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(safeHref(undefined)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(safeHref("")).toBeUndefined();
  });

  it("blocks javascript: URLs", () => {
    expect(safeHref("javascript:alert(1)")).toBeUndefined();
  });

  it("blocks data: URLs", () => {
    expect(safeHref("data:text/html,<h1>XSS</h1>")).toBeUndefined();
  });

  it("blocks ftp:// URLs", () => {
    expect(safeHref("ftp://example.com")).toBeUndefined();
  });

  it("blocks relative paths", () => {
    expect(safeHref("/path/to/page")).toBeUndefined();
    expect(safeHref("path/to/page")).toBeUndefined();
  });

  it("blocks protocol-relative URLs (//)", () => {
    expect(safeHref("//example.com")).toBeUndefined();
  });
});
