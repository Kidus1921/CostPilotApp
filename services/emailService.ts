// Brevo (formerly Sendinblue) API integration for email notifications.
// IMPORTANT: This service requires the BREVO_API_KEY environment variable to be set in your deployment environment.
// It should contain your Brevo v3 API key.

interface EmailPayload {
    to: string;
    subject: string;
    body: string; // Can be HTML
}

/**
 * Sends an email notification using the Brevo API.
 * @param {EmailPayload} payload - The email details.
 */
export const sendEmailNotification = async (payload: EmailPayload): Promise<void> => {
    // IMPORTANT: The Brevo API key MUST be provided via environment variables for security.
    // Do not hardcode the API key in the source code.
    const apiKey = process.env.BREVO_API_KEY;

    if (!apiKey) {
        console.error("Brevo API key is not configured in environment variables (BREVO_API_KEY). Email not sent.");
        // In a production environment, you might want to log this to an error tracking service.
        return;
    }

    const brevoApiUrl = 'https://api.brevo.com/v3/smtp/email';

    const emailData = {
        to: [{ email: payload.to }],
        // This sender must be authenticated in your Brevo account.
        sender: { name: 'CostPilot', email: 'noreply@costpilot.com' },
        subject: payload.subject,
        htmlContent: payload.body,
    };

    try {
        const response = await fetch(brevoApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey,
            },
            body: JSON.stringify(emailData),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`Brevo API responded with status ${response.status}: ${errorBody.message || 'Unknown error'}`);
        }
        
        const responseData = await response.json();
        console.log("Email sent successfully via Brevo. Message ID:", responseData.messageId);

    } catch (error) {
        console.error("Failed to send email via Brevo:", error);
    }
};
