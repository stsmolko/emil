#!/bin/bash

# Test SMTP Connection Script
# Tento skript otestuje SMTP konfiguráciu

echo "📧 SMTP Connection Test"
echo "======================="
echo ""

read -p "SMTP Host (e.g., smtp.gmail.com): " SMTP_HOST
read -p "SMTP Port (e.g., 587): " SMTP_PORT
read -p "SMTP User (email): " SMTP_USER
read -s -p "SMTP Password: " SMTP_PASS
echo ""
read -p "Test recipient email: " TEST_EMAIL

echo ""
echo "Testing connection..."

# Create temporary Node.js test script
cat > /tmp/test-smtp.js << 'EOF'
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

transporter.verify(function(error, success) {
    if (error) {
        console.log('❌ Connection failed:');
        console.log(error);
        process.exit(1);
    } else {
        console.log('✅ Server is ready to take our messages');
        
        // Send test email
        transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.TEST_EMAIL,
            subject: 'Global Mailer - Test Email',
            text: 'This is a test email from Global Mailer.\n\nIf you received this, your SMTP configuration is working correctly!',
            html: '<h2>Global Mailer Test</h2><p>This is a test email from Global Mailer.</p><p>If you received this, your SMTP configuration is <strong>working correctly</strong>!</p>'
        }).then(info => {
            console.log('✅ Test email sent successfully!');
            console.log('Message ID:', info.messageId);
            process.exit(0);
        }).catch(err => {
            console.log('❌ Failed to send test email:');
            console.log(err);
            process.exit(1);
        });
    }
});
EOF

# Run test
cd functions
SMTP_HOST="$SMTP_HOST" SMTP_PORT="$SMTP_PORT" SMTP_USER="$SMTP_USER" SMTP_PASS="$SMTP_PASS" TEST_EMAIL="$TEST_EMAIL" node /tmp/test-smtp.js

# Cleanup
rm /tmp/test-smtp.js

echo ""
echo "Test completed."
