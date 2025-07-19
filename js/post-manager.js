// Post Manager - Automates adding new posts
class PostManager {
    constructor() {
        this.postsContainer = document.querySelector('.right');
        this.posts = [];
    }

    // Add a new post from Word content
    addPostFromWord(title, wordContent, options = {}) {
        const post = {
            id: this.generatePostId(title),
            title: title,
            content: this.formatWordContent(wordContent),
            date: options.date || new Date(),
            category: options.category || 'general',
            externalLink: options.externalLink || null,
            readMoreLink: options.readMoreLink || null
        };

        // Add to posts array
        this.posts.unshift(post);
        
        // Update the website
        this.updateWebsite();
        
        // Track analytics
        this.trackNewPost(post);
        
        return post;
    }

    // Format Word content for web
    formatWordContent(wordContent) {
        let formatted = wordContent
            // Remove Word-specific formatting
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\t/g, '    ')
            
            // Convert Word headings to HTML
            .replace(/^(.*?)\n={3,}$/gm, '<h3>$1</h3>')
            .replace(/^(.*?)\n-{3,}$/gm, '<h4>$1</h4>')
            
            // Convert bold and italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // Convert links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
            
            // Convert paragraphs
            .split('\n\n')
            .map(para => para.trim())
            .filter(para => para.length > 0)
            .map(para => {
                if (para.startsWith('<h3>') || para.startsWith('<h4>') || para.startsWith('<a ')) {
                    return para;
                }
                return `<p>${para}</p>`;
            })
            .join('\n\n');

        return formatted;
    }

    // Generate unique post ID
    generatePostId(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    // Update the website with new posts
    updateWebsite() {
        const postsHTML = this.posts.map(post => this.generatePostHTML(post)).join('\n\n');
        
        // Find the posts container and update it
        const postsContainer = document.querySelector('.right');
        if (postsContainer) {
            const existingPosts = postsContainer.querySelectorAll('.post-preview');
            existingPosts.forEach(post => post.remove());
            
            // Add new posts after the RSS section
    
                    postsContainer.insertAdjacentHTML('beforeend', postsHTML);
        }
    }

    // Generate HTML for a single post
    generatePostHTML(post) {
        const dateStr = post.date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        let content = post.content;
        if (post.readMoreLink) {
            content += `\n<p><a class="read-more" href="${post.readMoreLink}" target="_blank">Read More</a></p>`;
        }

        return `
    <div class="post-preview" id="post-${post.id}">
        <h2 class="post-title collapsed">${post.title}</h2>
        <div class="post-content hidden">
            <div class="post-meta">
                <span class="post-date">${dateStr}</span>
                ${post.category ? `<span class="post-category">${post.category}</span>` : ''}
            </div>
            <div class="post-body">
                ${content}
            </div>
        </div>
    </div>`;
    }



    // Track new post in analytics
    trackNewPost(post) {
        if (typeof gtag !== 'undefined') {
            gtag('event', 'new_post_published', {
                'event_category': 'content',
                'event_label': post.title,
                'value': 1
            });
        }
    }

    // Quick add post method
    quickAdd(title, content, options = {}) {
        return this.addPostFromWord(title, content, options);
    }

    // Add post with external link
    addExternalPost(title, description, externalLink, options = {}) {
        return this.addPostFromWord(title, description, {
            ...options,
            externalLink: externalLink,
            readMoreLink: externalLink
        });
    }

    // Get all posts
    getAllPosts() {
        return this.posts;
    }

    // Export posts data
    exportPosts() {
        return JSON.stringify(this.posts, null, 2);
    }

    // Import posts data
    importPosts(postsData) {
        this.posts = JSON.parse(postsData);
        this.updateWebsite();
    }
}

// Usage Examples:

// 1. Add a post from Word content
/*
const postManager = new PostManager();
postManager.quickAdd(
    "My New Post Title",
    `This is content I copied from Word.
    
    It can have multiple paragraphs.
    
    **Bold text** and *italic text* work too.
    
    [Link text](https://example.com) becomes a link.
    
    =====
    This becomes a heading
    =====
    
    -----
    This becomes a subheading
    -----`,
    {
        category: 'finance',
        date: new Date('2024-01-15')
    }
);
*/

// 2. Add an external post
/*
postManager.addExternalPost(
    "Article on External Site",
    "This is a summary of an article I wrote for another publication...",
    "https://external-site.com/my-article",
    {
        category: 'housing',
        date: new Date('2024-01-10')
    }
);
*/

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PostManager;
} 