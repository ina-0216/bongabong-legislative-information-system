import PageSkeleton from '../components/PageSkeleton';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mediaUrl, api } from '../utils/api';
import { sanitizeArticleHtml } from '../utils/sanitizeHtml';
import { Newspaper } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const optimizedNewsImage = (url, width = 1200) => mediaUrl(url).replace(
  '/image/upload/',
  `/image/upload/f_auto,q_auto,w_${width},c_limit/`,
);

export default function NewsDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.getNewsDetail(id)
      .then((res) => setItem(res?.data || res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (activePhotoIndex === null) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setActivePhotoIndex(null);
      if (event.key === 'ArrowRight') setActivePhotoIndex((index) => (index + 1) % item.gallery.length);
      if (event.key === 'ArrowLeft') setActivePhotoIndex((index) => (index - 1 + item.gallery.length) % item.gallery.length);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activePhotoIndex, item?.gallery?.length]);

  if (loading) {
    return <div className="container v11-page-pad"><PageSkeleton variant="article" label={t('loadingArticle')} /></div>;
  }

  if (!item) {
    return (
      <div className="container v11-page-pad v11-notfound">
        <Newspaper size={40} aria-hidden="true" />
        <p>{t('articleNotFound')}</p>
        <Link to="/news" className="v11-link">← Back to news</Link>
      </div>
    );
  }

  const published = item.publishedAt || item.createdAt;

  return (
    <div className="container v11-page-pad">
      <nav aria-label={t('ariaBreadcrumb')} className="v11-crumbs">
        <ol className="v11-crumb-list">
          <li><Link to="/">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link to="/news">News &amp; updates</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">{item.title}</li>
        </ol>
      </nav>

      <article className="v11-article v11-article-wide">
        {item.coverImage && (
          <div className="v11-figure v11-article-figure">
            <img src={mediaUrl(item.coverImage)} alt="" />
          </div>
        )}

        <p className="v11-feature-meta">
          <span className="v11-tag">{item.category || 'News'}</span>
          {published && <time dateTime={published}>{new Date(published).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time>}
          {item.author && <span>{item.author}</span>}
        </p>

        <h1 className="v11-article-h1">{item.title}</h1>

        {item.excerpt && <p className="v11-article-excerpt">{item.excerpt}</p>}

        {/* Article body is CMS-authored rich text. It is sanitised through
            an allow-list before reaching the DOM: no script, no event
            handlers, no style, no javascript:/data: URLs. */}
        {item.content?.includes('<') ? (
          <div
            className="v11-prose"
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(item.content) }}
          />
        ) : (
          <div className="v11-prose">
            <p className="v11-pre">{item.content || t('noAdditionalDetails')}</p>
          </div>
        )}

        {item.gallery?.length > 0 && (
          <section className="v11-article-gallery" aria-labelledby="news-gallery-title">
            <div className="v11-gallery-heading">
              <h2 id="news-gallery-title">{t('photoGallery')}</h2>
              <span>{item.gallery.length} {t(item.gallery.length === 1 ? 'photo' : 'photos')}</span>
            </div>
            <div className="v11-gallery-grid">
              {item.gallery.map((photo, index) => (
                <figure className="v11-gallery-item" key={photo._id || photo.publicId || `${item._id}-${index}`}>
                  <button
                    type="button"
                    className="v11-gallery-open"
                    onClick={() => setActivePhotoIndex(index)}
                    aria-label={t('viewAnnouncementPhoto', { number: index + 1, caption: photo.caption ? `: ${photo.caption}` : '' })}
                  >
                    <img
                      src={optimizedNewsImage(photo.url, 640)}
                      srcSet={[480, 800, 1200].map((width) => `${optimizedNewsImage(photo.url, width)} ${width}w`).join(', ')}
                      sizes="(max-width: 640px) 50vw, (max-width: 900px) 50vw, 280px"
                      alt={photo.altText || photo.caption || t('announcementPhoto', { number: index + 1 })}
                      loading="lazy"
                    />
                  </button>
                  {photo.caption && <figcaption>{photo.caption}</figcaption>}
                </figure>
              ))}
            </div>
          </section>
        )}

        <Link to="/news" className="v11-link v11-back">← Back to news</Link>
      </article>

      {activePhotoIndex !== null && item.gallery?.[activePhotoIndex] && (
        <div className="v11-lightbox" role="dialog" aria-modal="true" aria-label={t('photoViewer')} onClick={() => setActivePhotoIndex(null)}>
          <button type="button" className="v11-lightbox-close" onClick={() => setActivePhotoIndex(null)} aria-label={t('closePhotoViewer')}>×</button>
          {item.gallery.length > 1 && <button type="button" className="v11-lightbox-prev" onClick={(event) => { event.stopPropagation(); setActivePhotoIndex((index) => (index - 1 + item.gallery.length) % item.gallery.length); }} aria-label={t('previousPhoto')}>‹</button>}
          <figure className="v11-lightbox-figure" onClick={(event) => event.stopPropagation()}>
            <img src={optimizedNewsImage(item.gallery[activePhotoIndex].url, 1800)} alt={item.gallery[activePhotoIndex].altText || item.gallery[activePhotoIndex].caption || t('announcementPhoto', { number: activePhotoIndex + 1 })} />
            {item.gallery[activePhotoIndex].caption && <figcaption>{item.gallery[activePhotoIndex].caption}</figcaption>}
            <span>{activePhotoIndex + 1} / {item.gallery.length}</span>
          </figure>
          {item.gallery.length > 1 && <button type="button" className="v11-lightbox-next" onClick={(event) => { event.stopPropagation(); setActivePhotoIndex((index) => (index + 1) % item.gallery.length); }} aria-label={t('nextPhoto')}>›</button>}
        </div>
      )}
    </div>
  );
}
