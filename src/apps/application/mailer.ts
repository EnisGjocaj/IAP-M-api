import nodemailer from 'nodemailer';

// TypeScript interface for mail options
interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
}

// Create a transporter for sending emails using Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

// Function to send an application email
export const sendApplicationEmail = async (toEmail: string, name: string, type: string): Promise<void> => {
  const mailOptions: MailOptions = {
    from: process.env.GMAIL_USER!,
    to: toEmail,
    subject: 'Application Received',
    text: `Dear ${name},\n\nThank you for applying to our ${type} program. We have received your application and will get back to you shortly.\n\nBest regards,\nThe Team`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};
