const fs = require('fs').promises;
const path = require('path');

// This function will be triggered by Netlify's scheduled functions
exports.handler = async function(event, context) {
  try {
    console.log('Scheduled publisher running...');
    
    // Read scheduled posts
    const scheduledPostsPath = path.join(process.cwd(), 'scheduled-posts.json');
    let scheduledPosts = [];
    
    try {
      const data = await fs.readFile(scheduledPostsPath, 'utf8');
      scheduledPosts = JSON.parse(data);
    } catch (error) {
      console.log('No scheduled posts found or file doesn\'t exist');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No scheduled posts to process' })
      };
    }
    
    const now = new Date();
    const postsToPublish = [];
    const remainingPosts = [];
    
    // Check each scheduled post
    for (const post of scheduledPosts) {
      const scheduledTime = new Date(post.scheduledFor);
      
      if (scheduledTime <= now) {
        // This post should be published now
        postsToPublish.push(post);
      } else {
        // Keep this post scheduled for later
        remainingPosts.push(post);
      }
    }
    
    // Publish posts that are due
    for (const post of postsToPublish) {
      try {
        await publishPost(post);
        console.log(`Published post: ${post.title}`);
      } catch (error) {
        console.error(`Failed to publish post ${post.title}:`, error);
        // Keep failed posts in the queue for retry
        remainingPosts.push(post);
      }
    }
    
    // Update scheduled posts file
    await fs.writeFile(scheduledPostsPath, JSON.stringify(remainingPosts, null, 2), 'utf8');
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `Processed ${postsToPublish.length} posts`,
        published: postsToPublish.length,
        remaining: remainingPosts.length
      })
    };
    
  } catch (error) {
    console.error('Error in scheduled publisher:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};

async function publishPost(post) {
  // Convert markdown to HTML
  const htmlContent = convertMarkdownToHtml(post.content);
  
  // Format date
  const postDate = new Date(post.scheduledFor).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  // Generate tags HTML
  const tagsHtml = (post.tags || []).map(tag => 
    `<span class="post-tag">${tag}</span>`
  ).join('');
  
  // Generate keywords string
  const keywordsString = (post.seoKeywords || []).join(', ');
  
  // Read template
  const templatePath = path.join(process.cwd(), 'post-template.html');
  let template = await fs.readFile(templatePath, 'utf8');
  
  // Replace placeholders
  template = template
    .replace(/{{POST_TITLE}}/g, post.title)
    .replace(/{{POST_CONTENT}}/g, htmlContent)
    .replace(/{{POST_DATE}}/g, postDate)
    .replace(/{{POST_CATEGORY}}/g, post.category || 'general')
    .replace(/{{POST_TAGS}}/g, tagsHtml)
    .replace(/{{META_DESCRIPTION}}/g, post.metaDescription || post.title)
    .replace(/{{KEYWORDS}}/g, keywordsString)
    .replace(/{{URL_SLUG}}/g, post.urlSlug);
  
  // Create posts directory if it doesn't exist
  const postsDir = path.join(process.cwd(), 'posts');
  try {
    await fs.access(postsDir);
  } catch {
    await fs.mkdir(postsDir, { recursive: true });
  }
  
  // Create post file
  const postFileName = `${post.urlSlug}.html`;
  const postFilePath = path.join(postsDir, postFileName);
  
  await fs.writeFile(postFilePath, template, 'utf8');
  
  // Update posts listing
  await updatePostsListing(post.title, post.urlSlug, postDate, post.category);
  
  // Generate sitemap
  await generateSitemap();
  
  // Send newsletter if requested
  if (post.sendNewsletter) {
    try {
      await sendNewsletter(post);
    } catch (error) {
      console.error('Failed to send newsletter:', error);
    }
  }
}

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
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;
    
    // Write sitemap
    const sitemapPath = path.join(process.cwd(), 'sitemap.xml');
    await fs.writeFile(sitemapPath, sitemap, 'utf8');
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }
}

// Send newsletter (placeholder - you can integrate with your newsletter service)
async function sendNewsletter(post) {
  // This is a placeholder - you can integrate with your existing newsletter system
  console.log(`Newsletter would be sent for post: ${post.title}`);
  // You can call your existing newsletter function here
} 