# ColetivoKanban

Aplicativo Kanban estilo Trello, construído com Next.js, Prisma e React Query.

## Começando

### Pré-requisitos

- Node.js 18+
- PostgreSQL
- (Opcional) Bucket S3 para armazenamento de arquivos

### Instalação

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Variáveis de Ambiente

### Banco de Dados

```env
DATABASE_URL="postgresql://user:password@localhost:5432/coletivo"
```

### Autenticação

```env
AUTH_SECRET="your-secret-key-for-jwt"
```

### E-mail (Nodemailer)

```env
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="user@example.com"
SMTP_PASS="your-password"
EMAIL_FROM="noreply@example.com"
```

---

## Configuração de Storage S3

O ColetivoKanban suporta armazenamento S3 para uploads (backgrounds, capas, anexos). Compatível com AWS S3, Cloudflare R2, Wasabi, MinIO, etc.

### Variáveis S3 (Obrigatórias)

```env
S3_REGION=us-east-2
S3_BUCKET=coletivokanban
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```

### Variáveis S3 (Opcionais)

```env
# Para serviços S3-compatíveis (R2, Wasabi, MinIO)
S3_ENDPOINT=https://s3.wasabisys.com

# MinIO geralmente requer true
S3_FORCE_PATH_STYLE=false

# Tempo de expiração das URLs assinadas (default: 900 = 15 min)
S3_SIGNED_URL_EXPIRES_SECONDS=900
```

### CORS do Bucket

Configure o CORS no seu bucket para permitir requests do seu domínio:

```json
[
  {
    "AllowedOrigins": ["https://seu-dominio.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type", "Content-Disposition"],
    "MaxAgeSeconds": 3000
  }
]
```

### Policy IAM Mínima

Crie um usuário IAM com as seguintes permissões:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ListBucket",
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": ["arn:aws:s3:::SEU_BUCKET"]
    },
    {
      "Sid": "ObjectRW",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::SEU_BUCKET/*"]
    }
  ]
}
```

### Fallback para Storage Local

Se as variáveis S3 não estiverem configuradas, o aplicativo usará armazenamento local automaticamente.

---

## Deploy no Coolify

### Variáveis de Ambiente

Adicione todas as variáveis listadas acima no painel do Coolify.

### Volumes Persistentes (se não usar S3)

Se não usar S3, monte um volume persistente para `/app/uploads`:

```
/app/uploads -> persistent-volume
```

---

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Iniciar produção |
| `npm run lint` | Verificar linting |
| `npm run typecheck` | Verificar TypeScript |

---

## Tecnologias

- Next.js 16 (App Router)
- React 19
- Prisma (PostgreSQL)
- React Query (TanStack Query)
- Tailwind CSS
- dnd-kit (Drag and Drop)
- AWS SDK v3 (S3)

---

## Licença

Projeto privado.
