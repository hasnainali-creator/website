export const prerender = false;

interface ContactPayload {
    name: string;
    email: string;
    purpose: string;
    subject: string;
    message: string;
    honeypot?: string;
}

const PURPOSE_LABELS: Record<string, string> = {
    editorial: "Factual Correction / Editorial Feedback",
    tip: "Confidential News Tip / Story Lead",
    copyright: "Copyright / DMCA Claim",
    accessibility: "Accessibility Issue / Barrier Report",
    privacy: "Data Privacy Request (GDPR/CCPA)",
    ads: "Advertising & Partnerships",
    careers: "Join the Editorial Team",
    tech: "Technical Site Issue",
    other: "General / Other Inquiry",
};

export async function POST({ request }: { request: Request }) {
    try {
        const data: ContactPayload = await request.json();

        // --- Anti-spam: Honeypot check ---
        if (data.honeypot) {
            // Silently drop bot submissions (return 200 to not alert bots)
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        // --- Validation ---
        if (!data.name || !data.email || !data.message || !data.subject) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: name, email, subject, and message." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return new Response(
                JSON.stringify({ error: "Invalid email format." }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // --- Build the email ---
        const purposeLabel = PURPOSE_LABELS[data.purpose] || "General Inquiry";
        const emailSubject = `[${purposeLabel}] ${data.subject}`;
        const timestamp = new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC';

        // --- Send via Resend API ---
        const RESEND_API_KEY = (import.meta as any).env?.RESEND_API_KEY || process.env.RESEND_API_KEY;
        const CONTACT_EMAIL = (import.meta as any).env?.CONTACT_EMAIL || process.env.CONTACT_EMAIL || "omnysports@gmail.com";

        if (!RESEND_API_KEY) {
            console.error("[Contact API] RESEND_API_KEY is not configured.");
            return new Response(
                JSON.stringify({ error: "Email service is not configured. Please try again later." }),
                { status: 503, headers: { "Content-Type": "application/json" } }
            );
        }

        const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from: "OmnySports Contact <onboarding@resend.dev>",
                to: [CONTACT_EMAIL],
                subject: emailSubject,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1f2937;">
            <div style="background: #111827; padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h2 style="color: #ffffff; margin: 0; font-size: 24px;">New Professional Inquiry</h2>
              <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 14px;">Source: OmnySports Contact Portal</p>
            </div>
            
            <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #ffffff;">
              <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; font-size: 16px; margin-bottom: 15px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Reader Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr><td style="padding: 6px 0; font-weight: bold; width: 120px; color: #6b7280;">Name:</td><td style="color: #111827;">${data.name}</td></tr>
                  <tr><td style="padding: 6px 0; font-weight: bold; color: #6b7280;">Email:</td><td><a href="mailto:${data.email}" style="color: #2563eb; text-decoration: none;">${data.email}</a></td></tr>
                  <tr><td style="padding: 6px 0; font-weight: bold; color: #6b7280;">Category:</td><td style="color: #111827;">${purposeLabel}</td></tr>
                  <tr><td style="padding: 6px 0; font-weight: bold; color: #6b7280;">Time:</td><td style="color: #111827; font-size: 13px;">${timestamp}</td></tr>
                </table>
              </div>

              <div style="margin-bottom: 25px;">
                <h3 style="color: #374151; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Subject / Topic</h3>
                <div style="font-weight: bold; color: #111827; font-size: 18px;">${data.subject}</div>
              </div>

              <div>
                <h3 style="color: #374151; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #f3f4f6; padding-bottom: 8px;">Message Content</h3>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; white-space: pre-wrap; color: #374151; line-height: 1.6; border: 1px solid #f3f4f6;">${data.message}</div>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb; text-align: center; color: #9ca3af; font-size: 12px;">
                This message was sent securely via the OmnySports professional contact system.
              </div>
            </div>
          </div>
        `,
            }),
        });
;

        if (!resendResponse.ok) {
            const errBody = await resendResponse.text();
            console.error("[Contact API] Resend error:", errBody);
            return new Response(
                JSON.stringify({ error: "Failed to send email. Please try again later." }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({ success: true, message: "Email sent successfully." }),
            { status: 200, headers: { "Content-Type": "application/json" } }
        );
    } catch (err) {
        console.error("[Contact API] Unexpected error:", err);
        return new Response(
            JSON.stringify({ error: "An unexpected error occurred." }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
}
