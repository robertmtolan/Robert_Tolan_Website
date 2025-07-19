const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse multipart form data
        const formData = parseMultipartFormData(event.body, event.headers['content-type']);
        
        if (!formData.file || !formData.category || !formData.filename) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Missing required fields: file, category, filename' })
            };
        }

        // Validate file type
        if (!formData.filename.toLowerCase().endsWith('.pdf')) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Only PDF files are allowed' })
            };
        }

        // Sanitize folder name
        const sanitizedCategory = formData.category.toLowerCase().replace(/[^a-z0-9-_]/g, '-');
        if (!sanitizedCategory || sanitizedCategory === '-') {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Invalid folder name' })
            };
        }

        // Create docs directory structure
        const docsPath = path.join(process.cwd(), 'docs');
        const categoryPath = path.join(docsPath, sanitizedCategory);
        
        // Ensure directories exist
        if (!fs.existsSync(docsPath)) {
            fs.mkdirSync(docsPath, { recursive: true });
        }
        if (!fs.existsSync(categoryPath)) {
            fs.mkdirSync(categoryPath, { recursive: true });
        }

        // Save the file
        const filePath = path.join(categoryPath, formData.filename);
        fs.writeFileSync(filePath, formData.file);

        return {
            statusCode: 200,
            body: JSON.stringify({ 
                success: true, 
                message: `PDF uploaded successfully to docs/${sanitizedCategory}/${formData.filename}`,
                path: `docs/${sanitizedCategory}/${formData.filename}`
            })
        };

    } catch (error) {
        console.error('PDF upload error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal server error', details: error.message })
        };
    }
};

function parseMultipartFormData(body, contentType) {
    const boundary = contentType.split('boundary=')[1];
    const parts = body.split(`--${boundary}`);
    
    const formData = {};
    
    parts.forEach(part => {
        if (part.trim() && !part.includes('--')) {
            const lines = part.split('\r\n');
            let header = '';
            let content = '';
            let isContent = false;
            
            lines.forEach(line => {
                if (line.startsWith('Content-Disposition:')) {
                    header = line;
                } else if (line.trim() === '') {
                    isContent = true;
                } else if (isContent) {
                    content += line + '\r\n';
                }
            });
            
            // Extract field name and filename
            const nameMatch = header.match(/name="([^"]+)"/);
            const filenameMatch = header.match(/filename="([^"]+)"/);
            
            if (nameMatch) {
                const fieldName = nameMatch[1];
                if (filenameMatch) {
                    // This is a file
                    formData.file = Buffer.from(content, 'binary');
                    formData.filename = filenameMatch[1];
                } else {
                    // This is a regular field
                    formData[fieldName] = content.trim();
                }
            }
        }
    });
    
    return formData;
} 