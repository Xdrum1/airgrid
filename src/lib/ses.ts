import { createHmac, createHash } from "crypto";

interface SendEmailParams {
  to: string;
  from: string;
  subject: string;
  html: string;
}

function sha256(data: string) {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function hmacSha256(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data, "utf8").digest();
}

export async function sendSesEmail({ to, from, subject, html }: SendEmailParams): Promise<void> {
  const region = process.env.SES_REGION || "us-east-1";
  const accessKeyId = process.env.SES_ACCESS_KEY_ID;
  const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.log(`[ses] AWS credentials not set — skipping email to ${to}`);
    return;
  }

  const payload = new URLSearchParams({
    Action: "SendEmail",
    Source: from,
    "Destination.ToAddresses.member.1": to,
    "Message.Subject.Data": subject,
    "Message.Subject.Charset": "UTF-8",
    "Message.Body.Html.Data": html,
    "Message.Body.Html.Charset": "UTF-8",
    Version: "2010-12-01",
  });

  const host = `email.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = amzDate.slice(0, 8);
  const body = payload.toString();

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

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(endpoint, {
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
