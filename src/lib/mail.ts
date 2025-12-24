import nodemailer from 'nodemailer'

export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

// Check for required environment variables
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_SECURE === 'true' || true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
}

const transporter = nodemailer.createTransport({
  ...smtpConfig,
})

/**
 * Sends an email using Nodemailer with Hostinger SMTP configuration.
 * Includes basic retry logic and detailed logging.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams, retries = 2) {
  // If SMTP credentials are missing, log and simulate success in dev, or error in prod
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('[Email] Warning: SMTP credentials not found in environment variables.')
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP credentials not configured')
    }
    console.log('--- EMAIL SIMULATION (No credentials) ---')
    console.log(`To: ${to}`)
    console.log(`Subject: ${subject}`)
    console.log('-----------------------------------------')
    return true
  }

  let lastError: any = null
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_FROM || `"ColetivoKanban" <no-reply@grupocoletivo.com.br>`,
        to,
        subject,
        html,
      })
      
      console.log(`[Email] Sent successfully to ${to}. MessageId: ${info.messageId}`)
      return true
    } catch (error) {
      lastError = error
      console.error(`[Email] Attempt ${attempt} failed to send email to ${to}:`, {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any).code,
        command: (error as any).command,
      })
      
      if (attempt < retries) {
        // Simple delay before retry
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
      }
    }
  }
  
  // Log the final failure but don't expose password
  console.error(`[Email] Final failure after ${retries} attempts sending to ${to}:`, {
    message: lastError instanceof Error ? lastError.message : 'Unknown error',
    to,
    subject
  })
  
  throw lastError || new Error('Failed to send email after all attempts')
}

/**
 * Template for when an existing user is added to a board.
 */
export function getAddedToBoardTemplate({
  boardName,
  addedByName,
  addedByEmail,
  boardUrl
}: {
  boardName: string
  addedByName: string
  addedByEmail: string
  boardUrl: string
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #172b4d; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; border: 1px solid #ebecf0; border-radius: 8px; overflow: hidden; }
        .header { background-color: #0052cc; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: white; }
        .card { background-color: #f4f5f7; border-radius: 6px; padding: 20px; margin: 20px 0; border: 1px solid #dfe1e6; }
        .button-container { text-align: center; margin: 30px 0; }
        .button { background-color: #0052cc; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 3px; font-weight: 600; display: inline-block; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b778c; background-color: #f4f5f7; }
        .link-text { word-break: break-all; color: #0052cc; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">ColetivoKanban</h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: #172b4d;">Você foi adicionado a um quadro</h2>
          <p>Olá,</p>
          <p><strong>${addedByName}</strong> (${addedByEmail}) adicionou você ao quadro:</p>
          
          <div class="card">
            <h3 style="margin: 0; color: #0052cc;">${boardName}</h3>
          </div>
          
          <div class="button-container">
            <a href="${boardUrl}" class="button">Abrir quadro</a>
          </div>
          
          <p>Seja bem-vindo de volta! Comece a colaborar com sua equipe agora mesmo.</p>
          
          <hr style="border: none; border-top: 1px solid #ebecf0; margin: 30px 0;">
          <p style="font-size: 12px; color: #6b778c;">Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p class="link-text">${boardUrl}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ColetivoKanban. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

/**
 * Template for when a new user (no account) is invited to a board.
 */
export function getInvitedToBoardTemplate({
  boardName,
  invitedByName,
  invitedByEmail,
  inviteUrl
}: {
  boardName: string
  invitedByName: string
  invitedByEmail: string
  inviteUrl: string
}) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #172b4d; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; border: 1px solid #ebecf0; border-radius: 8px; overflow: hidden; }
        .header { background-color: #0052cc; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px; background-color: white; }
        .card { background-color: #f4f5f7; border-radius: 6px; padding: 20px; margin: 20px 0; border: 1px solid #dfe1e6; }
        .button-container { text-align: center; margin: 30px 0; }
        .button { background-color: #0052cc; color: white !important; padding: 12px 24px; text-decoration: none; border-radius: 3px; font-weight: 600; display: inline-block; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #6b778c; background-color: #f4f5f7; }
        .link-text { word-break: break-all; color: #0052cc; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 24px;">ColetivoKanban</h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: #172b4d;">Você recebeu um convite</h2>
          <p>Olá,</p>
          <p><strong>${invitedByName}</strong> (${invitedByEmail}) convidou você para colaborar no quadro:</p>
          
          <div class="card">
            <h3 style="margin: 0; color: #0052cc;">${boardName}</h3>
          </div>
          
          <p>Para aceitar o convite e começar a usar o ColetivoKanban, você precisa criar uma conta. É rápido e fácil!</p>
          
          <div class="button-container">
            <a href="${inviteUrl}" class="button">Criar conta e entrar no quadro</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #ebecf0; margin: 30px 0;">
          <p style="font-size: 12px; color: #6b778c;">Se o botão não funcionar, copie e cole este link no seu navegador:</p>
          <p class="link-text">${inviteUrl}</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ColetivoKanban. Todos os direitos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
