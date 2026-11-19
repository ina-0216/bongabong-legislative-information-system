import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Plus, Edit2, Trash2, Image as ImageIcon, Eye, EyeOff, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Pagination, Modal } from '@ibosys/ui';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { isPhotoUploadWithinLimit, MAX_ANNOUNCEMENT_COVER_UPLOAD_BYTES, MAX_ANNOUNCEMENT_GALLERY_UPLOAD_BYTES } from '@ibosys/api';
import PageSkeleton from '../components/ui/PageSkeleton';
import MultiValueInput from '../components/ui/MultiValueInput';
import { useAuth } from '../context/AuthContext';

const announcementImageUrl = (value) => /^https?:\/\//i.test(value || '')
  ? value
  : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5001'}${value || ''}`;

export default function NewsAdmin() {
  const { user } = useAuth();
  const canDeleteAnnouncements = user?.role === 'System Admin';
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);
  const [coverImage, setCoverImage] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });

  const fetchNews = async () => {
    try {
      setLoading(true);
      const res = await api.getAnnouncements();
      setNews(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const paginatedNews = news.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const revokeGalleryPreviews = (photos = gallery) => {
    photos.forEach((photo) => {
      if (photo.file && photo.url?.startsWith('blob:')) URL.revokeObjectURL(photo.url);
    });
  };

  const closeModal = () => {
    revokeGalleryPreviews();
    setGallery([]);
    setShowModal(false);
  };

  const openModal = (item = null) => {
    revokeGalleryPreviews();
    setEditingItem(item);
    if (item) {
      setTitle(item.title || '');
      setCategory(item.category || 'General');
      setExcerpt(item.excerpt || '');
      setContent(item.content || '');
      setTags(Array.isArray(item.tags) ? item.tags : []);
      setGallery((item.gallery || []).map((photo) => ({
        key: String(photo._id), id: String(photo._id), url: photo.url,
        caption: photo.caption || '', altText: photo.altText || '', file: null,
      })));
    } else {
      setTitle('');
      setCategory('General');
      setExcerpt('');
      setContent('');
      setTags([]);
      setGallery([]);
    }
    setCoverImage(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    let announcementId = editingItem?._id;
    try {
      const details = new FormData();
      details.append('title', title);
      details.append('category', category);
      details.append('excerpt', excerpt);
      details.append('content', content);
      details.append('tags', JSON.stringify(tags));
      if (coverImage) details.append('coverImage', coverImage);

      const response = editingItem
        ? await api.updateAnnouncement(editingItem._id, details)
        : await api.createAnnouncement(details);
      const savedAnnouncement = response.data || response;
      announcementId = savedAnnouncement._id;
      if (!editingItem) setEditingItem(savedAnnouncement);

      const pendingPhotos = gallery.filter((photo) => photo.file);
      setUploadProgress({ done: 0, total: pendingPhotos.length });
      let workingGallery = [...gallery];
      const chunks = [];
      let chunk = [];
      let chunkBytes = 0;
      for (const photo of pendingPhotos) {
        if (chunk.length >= 8 || chunkBytes + photo.file.size > 32 * 1024 * 1024) {
          chunks.push(chunk);
          chunk = [];
          chunkBytes = 0;
        }
        chunk.push(photo);
        chunkBytes += photo.file.size;
      }
      if (chunk.length) chunks.push(chunk);

      let completedPhotos = 0;
      for (const batch of chunks) {
        const batchForm = new FormData();
        const manifest = workingGallery
          .filter((photo) => photo.id)
          .map((photo) => ({ id: photo.id, caption: photo.caption, altText: photo.altText }));
        batch.forEach((photo, index) => {
          manifest.push({ uploadIndex: index, caption: photo.caption, altText: photo.altText });
          batchForm.append('galleryImages', photo.file);
        });
        batchForm.append('galleryItems', JSON.stringify(manifest));

        const batchResponse = await api.updateAnnouncement(announcementId, batchForm);
        const savedPhotos = batchResponse.data?.gallery || batchResponse.gallery || [];
        const uploadedPhotos = savedPhotos.slice(-batch.length);
        const uploadedByKey = new Map(batch.map((photo, index) => [photo.key, uploadedPhotos[index]]));
        workingGallery = workingGallery.map((photo) => {
          const saved = uploadedByKey.get(photo.key);
          if (!saved) return photo;
          if (photo.url?.startsWith('blob:')) URL.revokeObjectURL(photo.url);
          return { ...photo, id: String(saved._id), url: saved.url, file: null };
        });
        setGallery(workingGallery);
        completedPhotos += batch.length;
        setUploadProgress({ done: completedPhotos, total: pendingPhotos.length });
      }

      const finalGallery = new FormData();
      finalGallery.append('galleryItems', JSON.stringify(workingGallery.map((photo) => ({
        id: photo.id, caption: photo.caption, altText: photo.altText,
      }))));
      const finalResponse = await api.updateAnnouncement(announcementId, finalGallery);
      setEditingItem(finalResponse.data || finalResponse);
      revokeGalleryPreviews();
      setGallery([]);
      setShowModal(false);
      toast.success(editingItem ? 'Announcement updated' : 'Announcement created');
      await fetchNews();
    } catch (err) {
      console.error(err);
      toast.error(announcementId
        ? 'Announcement details are saved. Some photos may still need uploading; save again to retry.'
        : (err.message || 'Failed to save announcement'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteAnnouncement(id);
      setDeleteConfirm(null);
      toast.success('Announcement deleted');
      fetchNews();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to delete announcement');
    }
  };

  const togglePublish = async (id) => {
    try {
      await api.togglePublishAnnouncement(id);
      toast.success('Status updated');
      fetchNews();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status');
    }
  };

  if (loading && news.length === 0) {
    return <PageSkeleton rows={6} />;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">News & Announcements</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage public news, session notices, and ordinances updates.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground font-semibold text-sm rounded-lg hover:bg-primary/90 shadow-xs transition-colors"
        >
          <Plus size={16} /> Create Announcement
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-xs uppercase font-bold text-muted-foreground tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Title</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedNews.map(item => (
                <tr key={item._id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      {item.coverImage ? (
                        <img 
                          src={announcementImageUrl(item.coverImage)}
                          alt="Cover" 
                          className="w-10 h-10 rounded-md object-cover border border-border shrink-0" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-secondary text-primary flex items-center justify-center border border-border shrink-0">
                          <ImageIcon size={18} />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-foreground">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-xs font-semibold">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <button
                      onClick={() => togglePublish(item._id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                        item.isPublished
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                      }`}
                    >
                      {item.isPublished ? <Eye size={12} /> : <EyeOff size={12} />}
                      {item.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-6 py-3.5 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      <button onClick={() => openModal(item)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors" title="Edit">
                        <Edit2 size={15} />
                      </button>
                      {canDeleteAnnouncements && <button onClick={() => setDeleteConfirm(item._id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete" aria-label={`Delete ${item.title}`}>
                        <Trash2 size={15} />
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedNews.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-sm text-muted-foreground">
                    No announcements found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination currentPage={page} totalPages={Math.ceil(news.length / ITEMS_PER_PAGE)} onPageChange={setPage} />
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { if (!isSaving) closeModal(); }} title={editingItem ? 'Edit Announcement' : 'Create Announcement'} size="lg">
        <form onSubmit={handleSubmit}>
          <fieldset disabled={isSaving} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="sm:col-span-3">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-foreground mb-1">Title *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-foreground mb-1">Category *</label>
              <select value={category} onChange={e => setCategory(e.target.value)} required className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary/20">
                <option value="General">General</option>
                <option value="Ordinance Update">Ordinance Update</option>
                <option value="Session Notice">Session Notice</option>
                <option value="Public Consultation">Public Consultation</option>
                <option value="SP Corner">SP Corner</option>
                <option value="Press Release">Press Release</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-foreground mb-1">Excerpt (Short description)</label>
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} rows="2" className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary/20" />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-foreground mb-1">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows="8" className="w-full px-3.5 py-2.5 bg-background border border-input rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary/20" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="announcement-tags" className="block text-[10px] font-bold uppercase tracking-wider text-foreground mb-1.5">Tags</label>
              <MultiValueInput
                id="announcement-tags"
                value={tags}
                onChange={setTags}
                suggestions={news.flatMap(item => Array.isArray(item.tags) ? item.tags : [])}
                placeholder="Search or add a tag…"
                ariaLabel="Search or add a tag"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-foreground mb-1">Cover Image</label>
              {editingItem?.coverImage && !coverImage && <p className="mb-1 text-xs text-muted-foreground">A cover image is already saved. Choose a new file to replace it.</p>}
              <input type="file" onChange={e => {
                const file = e.target.files?.[0];
                if (file && file.size > MAX_ANNOUNCEMENT_COVER_UPLOAD_BYTES) {
                  setCoverImage(null);
                  toast.error('News cover photos must be 50 MB or smaller.');
                  e.target.value = '';
                  return;
                }
                setCoverImage(file || null);
              }} accept="image/jpeg,image/png,image/webp,image/gif" className="w-full text-xs text-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-border file:bg-secondary file:text-xs file:font-semibold hover:file:bg-secondary/80 cursor-pointer" />
              <p className="mt-1 text-xs text-muted-foreground">Maximum file size: 50 MB.</p>
            </div>
          </div>

          <section aria-labelledby="announcement-gallery-title" className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 id="announcement-gallery-title" className="text-sm font-semibold text-foreground">Photo gallery <span className="font-normal text-muted-foreground">({gallery.length}/50)</span></h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Add up to 50 event photos, then arrange them and provide captions or alt text.</p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/50">
                <ImageIcon size={14} /> Add photos
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(event) => {
                    const selected = Array.from(event.target.files || []);
                    const next = [...gallery];
                    for (const file of selected) {
                      if (!isPhotoUploadWithinLimit(file) || file.size > MAX_ANNOUNCEMENT_GALLERY_UPLOAD_BYTES) {
                        toast.error('Announcement photos must be 8 MB or smaller.');
                        continue;
                      }
                      if (next.length >= 50) {
                        toast.error('An announcement can include up to 50 gallery photos.');
                        break;
                      }
                      next.push({ key: `${Date.now()}-${Math.random()}`, file, url: URL.createObjectURL(file), caption: '', altText: '' });
                    }
                    setGallery(next);
                    event.target.value = '';
                  }}
                />
              </label>
            </div>
            {isSaving && uploadProgress.total > 0 && (
              <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground" role="status" aria-live="polite">
                Uploading photos: {uploadProgress.done} of {uploadProgress.total}
                <progress className="mt-1 block h-1.5 w-full accent-primary" max={uploadProgress.total} value={uploadProgress.done} />
              </div>
            )}
            {isSaving && uploadProgress.total === 0 && <p className="text-xs text-muted-foreground" role="status">Saving announcement…</p>}
            {gallery.length > 0 && (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Announcement gallery photos">
                {gallery.map((photo, index) => (
                  <li key={photo.key} className="relative rounded-lg border border-border p-2.5">
                    <div className="flex gap-3">
                    <img src={photo.file ? photo.url : announcementImageUrl(photo.url)} alt={photo.altText || ''} className="h-20 w-24 shrink-0 rounded-md object-cover bg-muted" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <label className="block text-[10px] font-semibold uppercase text-muted-foreground">
                          Caption
                          <input value={photo.caption} maxLength={200} onChange={(event) => setGallery(gallery.map((entry, entryIndex) => entryIndex === index ? { ...entry, caption: event.target.value } : entry))} className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-xs font-normal normal-case text-foreground" />
                        </label>
                        <label className="block text-[10px] font-semibold uppercase text-muted-foreground">
                          Alt text
                          <input value={photo.altText} maxLength={200} onChange={(event) => setGallery(gallery.map((entry, entryIndex) => entryIndex === index ? { ...entry, altText: event.target.value } : entry))} className="mt-1 w-full rounded border border-input bg-background px-2 py-1.5 text-xs font-normal normal-case text-foreground" />
                        </label>
                      </div>
                    </div>
                    <div className="absolute right-3 top-3 flex gap-1">
                      <button type="button" disabled={index === 0} onClick={() => setGallery(gallery.map((entry, entryIndex) => entryIndex === index ? gallery[index - 1] : entryIndex === index - 1 ? gallery[index] : entry))} aria-label={`Move photo ${index + 1} up`} className="rounded bg-background/90 p-1 text-foreground disabled:opacity-40"><ChevronUp size={14} /></button>
                      <button type="button" disabled={index === gallery.length - 1} onClick={() => setGallery(gallery.map((entry, entryIndex) => entryIndex === index ? gallery[index + 1] : entryIndex === index + 1 ? gallery[index] : entry))} aria-label={`Move photo ${index + 1} down`} className="rounded bg-background/90 p-1 text-foreground disabled:opacity-40"><ChevronDown size={14} /></button>
                      <button type="button" onClick={() => { if (photo.file && photo.url?.startsWith('blob:')) URL.revokeObjectURL(photo.url); setGallery(gallery.filter((_, entryIndex) => entryIndex !== index)); }} aria-label={`Remove photo ${index + 1}`} className="rounded bg-background/90 p-1 text-destructive"><X size={14} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
            <button type="button" onClick={closeModal} disabled={isSaving} className="px-4 py-2 text-xs font-semibold text-foreground bg-background border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60">
              {isSaving ? 'Saving…' : editingItem ? 'Save Changes' : 'Create Announcement'}
            </button>
          </div>
          </fieldset>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Announcement">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this announcement? This action cannot be undone.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setDeleteConfirm(null)} className="px-3.5 py-1.5 text-xs font-semibold text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={() => handleDelete(deleteConfirm)} className="px-3.5 py-1.5 text-xs font-semibold text-white bg-destructive rounded-md hover:bg-destructive/90 transition-colors">
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
