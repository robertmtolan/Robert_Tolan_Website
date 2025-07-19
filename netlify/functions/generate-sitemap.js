const fs = require('fs').promises;
const path = require('path');

exports.handler = async function(event, context) {
  try {
    // Get the base URL from environment or default
    const baseUrl = process.env.URL || 'https://roberttolan.com';
    
    // Read posts listing to get all posts
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
        // If posts directory doesn't exist, start with empty array
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
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        success: true, 
        message: 'Sitemap generated successfully',
        postsCount: posts.length,
        sitemapUrl: `${baseUrl}/sitemap.xml`
      })
    };

  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        error: 'Failed to generate sitemap',
        details: error.message 
      })
    };
  }
}; 