export const prerender = false;

interface ContactPayload {
    name: string;
    email: string;
    purpose: string;
    message: string;
    honeypot?: string;
}

const PURPOSE_LABELS: Record<string, string> = {
    general: "General Message",
    news: "News Tip / Story Lead",
    ads: "Advertising & Partnerships",
    careers: "Join the Writing Team",
    correction: "Report a Fact Error",
    tech: "Technical Support",
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
        if (!data.name || !data.email || !data.message) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: name, email, and message." }),
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
        const purposeLabel = PURPOSE_LABELS[data.purpose] || "General Message";
        const timestamp = new Date().toISOString();

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
                subject: `[${purposeLabel}] New Contact from ${data.name}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0;">
              <h2 style="color: #ffffff; margin: 0;">📨 New Contact Submission</h2>
            </div>
            <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; font-weight: bold; width: 140px;">Name:</td><td>${data.name}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td><a href="mailto:${data.email}">${data.email}</a></td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Purpose:</td><td>${purposeLabel}</td></tr>
                <tr><td style="padding: 8px 0; font-weight: bold;">Time:</td><td>${timestamp}</td></tr>
              </table>
              <hr style="margin: 16px 0; border: none; border-top: 1px solid #e5e7eb;" />
              <h3 style="margin-bottom: 8px;">Message:</h3>
              <div style="background: #f9fafb; padding: 16px; border-radius: 6px; white-space: pre-wrap;">${data.message}</div>
            </div>
          </div>
        `,
            }),
        });

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
