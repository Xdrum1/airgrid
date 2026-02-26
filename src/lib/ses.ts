import { createHmac, createHash } from "crypto";

interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

function sha256(data: string) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hmacSha256(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

function buildRawMessage(
  { to, from, subject, html, headers }: SendEmailParams
): string {
  const boundary = `----=_Part_${Date.now()}`;
  const lines = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
  ];

  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      lines.push(`${key}: ${value}`);
    }
  }

  lines.push(
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    "",
    `--${boundary}--`,
  );

  return lines.join("\r\n");
}

function signRequest(body: string, region: string, accessKeyId: string, secretAccessKey: string) {
  const host = `email.${region}.amazonaws.com`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);

  const credentialScope = `${dateStamp}/${region}/ses/aws4_request`;
  const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const payloadHash = sha256(body);

  const canonicalRequest = [
    "POST", "/", "", canonicalHeaders, signedHeaders, payloadHash,
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256", amzDate, credentialScope, sha256(canonicalRequest),
  ].join("\n");

  const signingKey = hmacSha256(
    hmacSha256(
      hmacSha256(
        hmacSha256(`AWS4${secretAccessKey}`, dateStamp),
        region
      ),
      "ses"
    ),
    "aws4_request"
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign, "utf8")
    .digest("hex");

  return {
    host,
    amzDate,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

export async function sendSesEmail(params: SendEmailParams): Promise<void> {
  const region = process.env.SES_REGION || "us-east-1";
  const accessKeyId = process.env.SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.log(`[ses] AWS credentials not set — skipping email to ${params.to}`);
    return;
  }

  // Use SendRawEmail when custom headers are needed (e.g., List-Unsubscribe)
  // Otherwise use the simpler SendEmail API
  const useRaw = !!params.headers && Object.keys(params.headers).length > 0;

  let payload: URLSearchParams;

  if (useRaw) {
    const rawMessage = buildRawMessage(params);
    const encodedMessage = Buffer.from(rawMessage).toString("base64");
    payload = new URLSearchParams({
      Action: "SendRawEmail",
      "RawMessage.Data": encodedMessage,
      Version: "2010-12-01",
    });
  } else {
    payload = new URLSearchParams({
      Action: "SendEmail",
      Source: params.from,
      "Destination.ToAddresses.member.1": params.to,
      "Message.Subject.Data": params.subject,
      "Message.Subject.Charset": "UTF-8",
      "Message.Body.Html.Data": params.html,
      "Message.Body.Html.Charset": "UTF-8",
      Version: "2010-12-01",
    });
  }

  const body = payload.toString();
  const { host, amzDate, authorization } = signRequest(body, region, accessKeyId, secretAccessKey);

  const res = await fetch(`https://${host}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Amz-Date": amzDate,
      Authorization: authorization,
      Host: host,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SES error ${res.status}: ${text}`);
  }
}
