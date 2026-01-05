import emailjs from '@emailjs/browser';

// These should be in your .env file
const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

/**
 * Sends an email notification using EmailJS.
 * 
 * @param {string} toEmail - The recipient's email address.
 * @param {string} subject - The subject of the email (notification title).
 * @param {string} message - The body of the email.
 * @param {string} link - Optional link to the dispute/action.
 */
export const sendEmailNotification = async (toEmail, subject, message, link) => {
    // Debug Logging
    const missingKeys = [];
    if (!SERVICE_ID) missingKeys.push('VITE_EMAILJS_SERVICE_ID');
    if (!TEMPLATE_ID) missingKeys.push('VITE_EMAILJS_TEMPLATE_ID');
    if (!PUBLIC_KEY) missingKeys.push('VITE_EMAILJS_PUBLIC_KEY');

    if (missingKeys.length > 0) {
        console.error(`[Email Service] FAILED: Missing Environment Variables in .env file: ${missingKeys.join(', ')}`);
        alert(`[Developer Notice] Email sending failed because API keys are missing. Please check the console.`);
        return;
    }

    console.log(`[Email Service] Attempting to send email to: ${toEmail}`);

    const templateParams = {
        to_email: toEmail,
        subject: subject,
        message: message,
        link: link || '',
        // Common defaults in case template uses different names
        to_name: toEmail.split('@')[0],
        from_name: "AI Dispute Resolver",
    };

    try {
        const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY);
        console.log('[Email Service] SUCCESS:', response.status, response.text);
        return response;
    } catch (error) {
        console.error('[Email Service] FAILED:', error);
        alert(`Email failed to send. Error: ${error.text || error.message}. Check console for details.`);
    }
};
