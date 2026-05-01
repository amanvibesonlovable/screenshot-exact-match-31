// WhatsApp helpers — open a pre-filled wa.me link for a trainee.
// Manual flow: opens the admin's WhatsApp (web/app) with the trainee's number
// and a friendly check-in message. Admin taps Send.

export type WhatsAppEmployee = {
  name: string;
  phone: string;
  token: string;
};

/**
 * Strip everything except digits, then drop a leading 91 (country code) or 0
 * (trunk prefix) so we end up with the bare 10-digit Indian mobile number.
 * Returns null if we can't recover a 10-digit number.
 */
export function cleanIndianMobile(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D+/g, "");
  if (digits.startsWith("91") && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith("0") && digits.length === 11) digits = digits.slice(1);
  if (digits.length !== 10) return null;
  return digits;
}

export function buildSurveyUrl(token: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "https://candor.ind.in");
  return `${base}/s/${token}`;
}

export function buildWhatsAppMessage(name: string, surveyUrl: string): string {
  const firstName = (name ?? "there").split(" ")[0];
  return `Hi ${firstName}! 👋

This is from the HR team. It's time for your quick training check-in.

It takes less than 2 minutes — just tap the link below and answer a few questions. Your responses are completely confidential.

${surveyUrl}

Thanks! 🙌`;
}

/**
 * Build a wa.me deep-link URL with the message URL-encoded.
 * Returns null if the trainee's phone number isn't recoverable.
 */
export function buildWhatsAppUrl(emp: WhatsAppEmployee, origin?: string): string | null {
  const phone = cleanIndianMobile(emp.phone);
  if (!phone) return null;
  const surveyUrl = buildSurveyUrl(emp.token, origin);
  const text = encodeURIComponent(buildWhatsAppMessage(emp.name, surveyUrl));
  return `https://wa.me/91${phone}?text=${text}`;
}
