# 📧 Email Templates

Túto zložku môžeš použiť na ukladanie HTML email šablón.

## Použitie HTML Templates

### 1. Základná HTML šablóna

```html
<!DOCTYPE html>
<html lang="sk">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Global Mailer</h1>
    </div>
    <div class="content">
        <h2>Ahoj {{name}}! 👋</h2>
        <p>Máme pre teba skvelú ponuku, ktorú nechceš zmeškať.</p>
        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        <a href="https://example.com" class="button">Zisti viac</a>
        <p>S pozdravom,<br>Tvoj tím</p>
    </div>
    <div class="footer">
        <p>Ak nechceš dostávať ďalšie emaily, <a href="#">odhlásiť sa</a></p>
        <p>&copy; 2024 Global Mailer. Všetky práva vyhradené.</p>
    </div>
</body>
</html>
```

### 2. Implementácia v Cloud Functions

Aktualizuj `functions/src/index.ts`:

```typescript
import * as fs from 'fs';
import * as path from 'path';

// Načítaj HTML template
const getEmailTemplate = (name: string): string => {
  const templatePath = path.join(__dirname, '../templates/email.html');
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace premenné
  template = template.replace(/{{name}}/g, name);
  
  return template;
};

// V smartScheduler funkcii:
const htmlContent = getEmailTemplate(contactData.name);

await transporter.sendMail({
  from: smtpSettings.from,
  to: contactData.email,
  subject: subject,
  html: htmlContent
});
```

### 3. Viacero templates

Struktura:
```
functions/
└── templates/
    ├── welcome.html
    ├── promotion.html
    ├── newsletter.html
    └── followup.html
```

Použitie:
```typescript
const getEmailTemplate = (templateName: string, variables: any): string => {
  const templatePath = path.join(__dirname, `../templates/${templateName}.html`);
  let template = fs.readFileSync(templatePath, 'utf-8');
  
  // Replace všetky premenné
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    template = template.replace(regex, variables[key]);
  });
  
  return template;
};

// Použitie
const html = getEmailTemplate('promotion', {
  name: 'Ján Novák',
  discount: '20%',
  code: 'PROMO20'
});
```

## Best Practices

### 1. Responsive Design
```html
<style>
  @media only screen and (max-width: 600px) {
    .content {
      padding: 15px !important;
    }
    .button {
      display: block !important;
      width: 100% !important;
    }
  }
</style>
```

### 2. Plain Text Fallback
```typescript
await transporter.sendMail({
  from: smtpSettings.from,
  to: contactData.email,
  subject: subject,
  text: 'Plain text version',  // Pre non-HTML email clients
  html: htmlContent
});
```

### 3. Testing
- [Litmus](https://litmus.com/) - Email testing
- [Email on Acid](https://www.emailonacid.com/)
- Gmail preview (test lokálne)

### 4. Compliance
- Vždy zahrnúť unsubscribe link
- Fyzická adresa odosielateľa
- CAN-SPAM / GDPR compliance

## Premenné

Podporované premenné (môžeš pridať vlastné):
- `{{name}}` - Meno kontaktu
- `{{email}}` - Email adresa
- `{{date}}` - Dnešný dátum
- `{{discount}}` - Discount kód
- `{{link}}` - Custom link
- `{{company}}` - Názov firmy

## Užitočné zdroje

- [Really Good Emails](https://reallygoodemails.com/) - Inšpirácia
- [MJML](https://mjml.io/) - Framework pre responsive emails
- [Foundation for Emails](https://get.foundation/emails.html)
- [Litmus Community](https://litmus.com/community)
