/**
 * PDF generation pipeline. Renders any AirIndex route to a PDF using
 * headless Chromium. Works in dev (local Chrome) and on AWS Amplify Lambda
 * (@sparticuz/chromium).
 *
 * Used by /api/admin/render-pdf to convert HTML briefings into delivered
 * client artifacts.
 */

import type { Browser, Page, PDFOptions } from "puppeteer-core";

interface RenderPdfOptions {
  /** Absolute URL or path (resolved against APP_URL) */
  url: string;
  /** Forwarded cookies — used to authenticate session-gated routes */
  cookies?: string;
  /** Override page format. Defaults to Letter. */
  format?: PDFOptions["format"];
  /** Margin overrides (default: 0.4in all sides) */
  margin?: PDFOptions["margin"];
  /** Wait for network idle before printing. Default true. */
  waitForNetworkIdle?: boolean;
  /** Print background graphics (gradients, accent strips). Default true. */
  printBackground?: boolean;
  /** Page-load timeout in ms. Default 60_000. */
  timeoutMs?: number;
}

async function getBrowser(): Promise<Browser> {
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.AWS_EXECUTION_ENV;

  if (isLambda) {
    // Serverless: use @sparticuz/chromium-bundled binary
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = await import("puppeteer-core");
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 1800 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // Local dev: use system Chrome / Chromium
  const puppeteer = await import("puppeteer-core");
  const localPaths = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ];
  const fs = await import("fs");
  const executablePath = localPaths.find((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (!executablePath) {
    throw new Error(
      "No local Chrome/Chromium found. Install Google Chrome or set CHROME_EXECUTABLE_PATH.",
    );
  }

  return puppeteer.launch({
    executablePath: process.env.CHROME_EXECUTABLE_PATH || executablePath,
    headless: true,
    defaultViewport: { width: 1280, height: 1800 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}

export async function renderPdf(options: RenderPdfOptions): Promise<Uint8Array> {
  const {
    url,
    cookies,
    format = "Letter",
    margin = { top: "0.4in", right: "0.4in", bottom: "0.4in", left: "0.4in" },
    waitForNetworkIdle = true,
    printBackground = true,
    timeoutMs = 60_000,
  } = options;

  const appUrl = process.env.APP_URL || "https://www.airindex.io";
  const fullUrl = url.startsWith("http") ? url : `${appUrl}${url.startsWith("/") ? url : `/${url}`}`;

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    browser = await getBrowser();
    page = await browser.newPage();

    // Forward cookies for session-gated routes
    if (cookies) {
      const parsed = new URL(fullUrl);
      const cookieEntries = cookies
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const eq = c.indexOf("=");
          return {
            name: c.slice(0, eq),
            value: c.slice(eq + 1),
            domain: parsed.hostname,
            path: "/",
          };
        });
      if (cookieEntries.length > 0) {
        await page.setCookie(...cookieEntries);
      }
    }

    await page.goto(fullUrl, {
      waitUntil: waitForNetworkIdle ? "networkidle0" : "load",
      timeout: timeoutMs,
    });

    // Inject print-only adjustments — hide site nav/footer chrome from the PDF
    await page.addStyleTag({
      content: `
        @media print {
          nav, footer, [data-pdf-hide] { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `,
    });

    const pdf = await page.pdf({
      format,
      margin,
      printBackground,
      preferCSSPageSize: false,
    });

    return pdf;
  } finally {
    if (page) await page.close().catch(() => undefined);
    if (browser) await browser.close().catch(() => undefined);
  }
}
