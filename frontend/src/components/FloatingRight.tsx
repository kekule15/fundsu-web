"use client";
import "../styles/FloatingRight.css";

export function FloatingRight() {
  // Sample blog data - you can replace with actual data
  const blogPost = {
    title: "The Future of Crowdfunding with Blockchain",
    description: "Discover how blockchain technology is revolutionizing the crowdfunding space, providing more transparency, security, and global accessibility for both creators and supporters.",
    imageUrl: "https://images.unsplash.com/photo-1639762681057-408e52192e55?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
    readMoreUrl: "https://example.com/blog/blockchain-crowdfunding-future"
  };

  const truncatedDescription = 
    blogPost.description.length > 120 
      ? blogPost.description.substring(0, 120) + "..." 
      : blogPost.description;

  return (
    <aside className="floating-right">
      <h2 className="floating-title">Featured Blog</h2>
      <div className="floating-content">
        <div className="blog-card">
          <div className="blog-image-container">
            <img 
              src={blogPost.imageUrl} 
              alt={blogPost.title}
              className="blog-image"
            />
          </div>
          <div className="blog-content">
            <h3 className="blog-title">{blogPost.title}</h3>
            <p className="blog-description">{truncatedDescription}</p>
            <a 
              href={blogPost.readMoreUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="read-more-button"
            >
              Read More
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}