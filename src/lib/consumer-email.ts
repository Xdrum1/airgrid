import MailChecker from "mailchecker";

export function isConsumerEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  const consumerDomains = new Set([
    "gmail.com",
    "yahoo.com",
    "hotmail.com",
    "outlook.com",
    "aol.com",
    "icloud.com",
    "protonmail.com",
    "proton.me",
    "mail.com",
    "zoho.com",
    "yandex.com",
    "gmx.com",
    "live.com",
    "msn.com",
    "me.com",
  ]);
  // mailchecker returns true for valid (non-disposable) emails
  // We flag consumer domains AND disposable domains
  return consumerDomains.has(domain) || !MailChecker.isValid(email);
}
