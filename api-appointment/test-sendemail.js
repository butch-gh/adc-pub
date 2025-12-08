import FormData from "form-data"; // form-data v4.0.1
import Mailgun from "mailgun.js"; // mailgun.js v11.1.0

async function sendSimpleMessage() {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: "5c53c2abe18ef83e5e3fe84d7a84fce8-ba8a60cd-cb3721a5",
    // When you have an EU-domain, you must specify the endpoint:
    // url: "https://api.eu.mailgun.net"
  });
  try {
    const data = await mg.messages.create("mg.adrianodentalclinic.online", {
      from: "Adriano Dental Clinic <noreply@mg.adrianodentalclinic.online>",
      to: ["hctubguitarist@gmail.com"], // Add your email to authorized recipients in Mailgun dashboard
      subject: "Hello Botchki Pielago",
      text: "Congratulations Botchki Pielago, you just sent an email with Mailgun! You are truly awesome!",
    });

    console.log(data); // logs response data
  } catch (error) {
    console.log(error); //logs any error
  }
}

// Call the function to execute it
sendSimpleMessage();