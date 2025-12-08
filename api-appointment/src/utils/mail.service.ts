// mail.service.ts
import formData from "form-data";
import Mailgun from "mailgun.js";
import * as dotenv from "dotenv";

dotenv.config();

const mg = new Mailgun(formData);
const client = mg.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY || "5c53c2abe18ef83e5e3fe84d7a84fce8-ba8a60cd-cb3721a5",
  
});

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<any> {
  const domain = process.env.MAILGUN_DOMAIN!;
  const from = options.from || process.env.MAILGUN_FROM_EMAIL!;
  try {
    const response = await client.messages.create(domain, {
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      template: "", // Add template property as required by MailgunMessageData
    });
    return response;
  } catch (err) {
    console.error("Mailgun sendEmail error:", err);
    throw err;
  }
}



// mail.service.ts
// import formData from "form-data";
// import Mailgun from "mailgun.js";
// import * as dotenv from "dotenv";

// dotenv.config();

// const mg = new Mailgun(formData);
// const client = mg.client({
//   username: "api",
//   key: process.env.MAILGUN_API_KEY || "5c53c2abe18ef83e5e3fe84d7a84fce8-ba8a60cd-cb3721a5",
// });

// // Updated interface to support templates
// export interface SendEmailOptions {
//   to: string | string[];
//   subject: string;
//   text?: string;
//   html?: string;
//   from?: string;
//   template?: string;  // Optional: Mailgun template name
//   templateVariables?: Record<string, any>;  // Optional: Dynamic variables for the template
// }

// export async function sendEmail(options: SendEmailOptions): Promise<any> {
//   const domain = process.env.MAILGUN_DOMAIN!;
//   const from = options.from || process.env.MAILGUN_FROM_EMAIL!;
  
//   // Prepare the email data
//   const emailData: any = {
//     from,
//     to: options.to,
//     subject: options.subject,
//   };

//   // If using a template, add template and variables; otherwise, use text/html
//   if (options.template) {
//     emailData.template = options.template;
//     if (options.templateVariables) {
//       emailData['v:'] = options.templateVariables;  // Mailgun uses 'v:' prefix for variables
//     }
//   } else {
//     emailData.text = options.text;
//     emailData.html = options.html;
//   }

//   try {
//     const response = await client.messages.create(domain, emailData);
//     return response;
//   } catch (err) {
//     console.error("Mailgun sendEmail error:", err);
//     throw err;
//   }
// }