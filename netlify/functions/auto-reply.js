const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        const { email, name } = JSON.parse(event.body);

        // Initialize Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase credentials not configured');
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Send welcome email
        const result = await sendWelcomeEmail(email, name);

        // Update subscriber record with welcome email sent
        await supabase
            .from('newsletter_subscribers')
            .update({
                welcome_email_sent: true,
                welcome_email_sent_at: new Date().toISOString()
            })
            .eq('email', email);

        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                success: true,
                message: 'Welcome email sent successfully'
            })
        };

    } catch (error) {
        console.error('Error sending welcome email:', error);
        return {
            statusCode: 500,
            headers: {
                ...headers,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};

// Send welcome email using Resend
async function sendWelcomeEmail(email, name) {
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    
    if (!RESEND_API_KEY) {
        throw new Error('Resend API key not configured');
    }

    const welcomeTemplate = createWelcomeEmailTemplate(name || 'there');

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: 'Robert Tolan <newsletter@roberttolan.com>',
            to: email,
            subject: 'Welcome to my newsletter! 📬',
            html: welcomeTemplate.htmlBody,
            text: welcomeTemplate.textBody
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send welcome email: ${errorText}`);
    }

    return await response.json();
}

// Create welcome email template
function createWelcomeEmailTemplate(name) {
    const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to my newsletter!</title>
            <style>
                body { 
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                    line-height: 1.6; 
                    color: #333; 
                    max-width: 600px; 
                    margin: 0 auto; 
                    padding: 20px; 
                    background-color: #f8f9fa;
                }
                .container {
                    background: white;
                    border-radius: 8px;
                    padding: 40px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                .header { 
                    text-align: center; 
                    margin-bottom: 30px; 
                }
                .welcome-title {
                    font-size: 28px;
                    color: black;
                    margin-bottom: 10px;
                }
                .content { 
                    margin-bottom: 30px; 
                }
                .footer { 
                    text-align: center; 
                    font-size: 12px; 
                    color: #666; 
                    border-top: 1px solid #eee; 
                    padding-top: 20px; 
                }
                .highlight {
                    background: linear-gradient(120deg, black, #333333);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 6px;
                    margin: 20px 0;
                }
                .cta-button {
                    display: inline-block;
                    background: black;
                    color: white;
                    padding: 12px 24px;
                    text-decoration: none;
                    border-radius: 6px;
                    font-weight: 600;
                    margin: 20px 0;
                }
                .social-links {
                    margin: 20px 0;
                }
                .social-links a {
                    color: black;
                    text-decoration: none;
                    margin: 0 10px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 class="welcome-title">Welcome, ${name}! 🎉</h1>
                    <p style="margin: 5px 0; color: #666;">You're now part of my newsletter community</p>
                </div>
                
                <div class="content">
                    <p>Thanks for subscribing to my newsletter! I'm excited to share my thoughts, insights, and discoveries with you.</p>
                    
                    <div class="highlight">
                        <strong>What to expect:</strong><br>
                        • Weekly insights on technology and innovation<br>
                        • Personal reflections and experiences<br>
                        • Curated resources and recommendations<br>
                        • Behind-the-scenes updates
                    </div>
                    
                    <p>I believe in sharing knowledge and experiences that can help others grow. Each newsletter will be packed with valuable content that I hope you'll find useful.</p>
                    
                    <p>Feel free to reply to any of my emails - I love hearing from readers and engaging in meaningful conversations!</p>
                    
                    <div style="text-align: center;">
                        <a href="https://roberttolan.com" class="cta-button">Visit My Website</a> 
                    </div>
                </div>
                
                <div class="footer">
                    <p>You're receiving this because you subscribed to my newsletter.</p>
                    <p>If you didn't sign up, you can <a href="{{UNSUBSCRIBE_URL}}" style="color: black;">unsubscribe here</a>.</p>
                    <div class="social-links">
                        <a href="https://x.com/Rob_Tolan">Twitter</a> |
                        <a href="mailto:robertmtolan1@gmail.com">Email</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const textBody = `
Welcome, ${name}! 🎉

Thanks for subscribing!

Feel free to reply to any of my emails - I love hearing from people!

---
You're receiving this because you subscribed to my newsletter.
If you didn't sign up, you can unsubscribe by replying with "unsubscribe".

Connect with me:
Twitter: https://x.com/Rob_Tolan
Email: robertmtolan1@gmail.com
    `;

    return { htmlBody, textBody };
} 