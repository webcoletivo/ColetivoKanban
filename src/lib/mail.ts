export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  console.log('--- EMAIL SIMULATION ---')
  console.log(`To: ${to}`)
  console.log(`Subject: ${subject}`)
  console.log('--- HTML CONTENT ---')
  console.log(html)
  console.log('------------------------')
  
  // In a real app, this would use nodemailer or a service like Resend/SendGrid
  return true
}
