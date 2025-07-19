const fs = require('fs').promises;
const path = require('path');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const body = JSON.parse(event.body);
    const { title, content, options } = body;

    // Validate required fields
    if (!title || !content || !options.urlSlug) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
        body: JSON.stringify({ 
          error: 'Missing required fields: title, content, or urlSlug' 
        })
      };
    }

    // Convert markdown to HTML (simple conversion for now)
    const htmlContent = convertMarkdownToHtml(content);
    
    // Format date
    const postDate = new Date(options.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Generate tags HTML
    const tagsHtml = (options.tags || []).map(tag => 
      `<span class="post-tag">${tag}</span>`
    ).join('');
    
    // Generate keywords string
    const keywordsString = (options.seoKeywords || []).join(', ');
    
    // Read template
    const templatePath = path.join(process.cwd(), 'post-template.html');
    let template = await fs.readFile(templatePath, 'utf8');
    
    // Replace placeholders
    template = template
      .replace(/{{POST_TITLE}}/g, title)
      .replace(/{{POST_CONTENT}}/g, htmlContent)
      .replace(/{{POST_DATE}}/g, postDate)
      .replace(/{{POST_CATEGORY}}/g, options.category || 'general')
      .replace(/{{POST_TAGS}}/g, tagsHtml)
      .replace(/{{META_DESCRIPTION}}/g, options.metaDescription || title)
      .replace(/{{KEYWORDS}}/g, keywordsString)
      .replace(/{{URL_SLUG}}/g, options.urlSlug);
    
    // Create posts directory if it doesn't exist
    const postsDir = path.join(process.cwd(), 'posts');
    try {
      await fs.access(postsDir);
    } catch {
      await fs.mkdir(postsDir, { recursive: true });
    }
    
    // Create post file
    const postFileName = `${options.urlSlug}.html`;
    const postFilePath = path.join(postsDir, postFileName);
    
    await fs.writeFile(postFilePath, template, 'utf8');
    
    // Update posts listing (optional - could be done separately)
    await updatePostsListing(title, options.urlSlug, postDate, options.category);
    
    // Generate sitemap after creating new post
    await generateSitemap();
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Post generated successfully',
        postUrl: `/posts/${postFileName}`,
        fileName: postFileName
      })
    };

  } catch (error) {
    console.error('Error generating post:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: 'Failed to generate post',
        details: error.message 
      })
    };
  }
};

// Simple markdown to HTML conversion
function convertMarkdownToHtml(markdown) {
  return markdown
    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    
    // Blockquotes
    .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
    
    // Lists
    .replace(/^\* (.*$)/gim, '<li>$1</li>')
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, '<p>$1</p>')
    
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[1-6]>.*<\/h[1-6]>)<\/p>/g, '$1')
    .replace(/<p>(<blockquote>.*<\/blockquote>)<\/p>/g, '$1')
    .replace(/<p>(<pre>.*<\/pre>)<\/p>/g, '$1');
}

// Update posts listing
async function updatePostsListing(title, urlSlug, date, category) {
  try {
    const postsListingPath = path.join(process.cwd(), 'posts-listing.json');
    
    let postsListing = [];
    try {
      const existingData = await fs.readFile(postsListingPath, 'utf8');
      postsListing = JSON.parse(existingData);
    } catch {
      // File doesn't exist, start with empty array
    }
    
    // Add new post to listing
    const newPost = {
      title: title,
      urlSlug: urlSlug,
      date: date,
      category: category,
      url: `/posts/${urlSlug}.html`
    };
    
    // Add to beginning of array (newest first)
    postsListing.unshift(newPost);
    
    // Save updated listing
    await fs.writeFile(postsListingPath, JSON.stringify(postsListing, null, 2), 'utf8');
    
     } catch (error) {
     console.error('Error updating posts listing:', error);
   }
 }
 
 // Generate sitemap
 async function generateSitemap() {
   try {
     const baseUrl = process.env.URL || 'https://roberttolan.com';
     
     // Read posts listing
     const postsListingPath = path.join(process.cwd(), 'posts-listing.json');
     let posts = [];
     
     try {
       const postsData = await fs.readFile(postsListingPath, 'utf8');
       posts = JSON.parse(postsData);
     } catch (error) {
       // If posts-listing.json doesn't exist, scan the posts directory
       const postsDir = path.join(process.cwd(), 'posts');
       try {
         const files = await fs.readdir(postsDir);
         posts = files
           .filter(file => file.endsWith('.html'))
           .map(file => ({
             urlSlug: file.replace('.html', ''),
             title: file.replace('.html', '').replace(/-/g, ' '),
             date: new Date().toISOString().split('T')[0]
           }));
       } catch (dirError) {
         posts = [];
       }
     }
     
     // Create sitemap XML
     const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Main pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/posts.html</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/projects.html</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/recommendations.html</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Individual posts -->
${posts.map(post => `  <url>
    <loc>${baseUrl}/posts/${post.urlSlug}.html</loc>
    <lastmod>${post.date || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`).join('\n')}
</urlset>`;
     
     // Save sitemap to public directory
     const sitemapPath = path.join(process.cwd(), 'sitemap.xml');
     await fs.writeFile(sitemapPath, sitemap, 'utf8');
     
     console.log('Sitemap generated successfully');
     
   } catch (error) {
     console.error('Error generating sitemap:', error);
   }
 } 