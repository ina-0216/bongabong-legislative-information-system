require('dotenv').config();

const mongoose = require('mongoose');
const ConsultationFeedback = require('../models/ConsultationFeedback');
const { uploadToCloudinary, deleteFromCloudinary, extractPublicId } = require('../utils/cloudinary');

const APPLY = process.argv.includes('--apply');
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

const isDeleted = (result) => ['ok', 'not found', 'already deleted'].includes(String(result?.result || '').toLowerCase());

async function downloadLegacyImage(url) {
  const parsed = new URL(url);
  if (parsed.hostname !== 'res.cloudinary.com' || parsed.protocol !== 'https:') {
    throw new Error('Legacy attachment URL is not a Cloudinary HTTPS asset.');
  }

  const response = await fetch(parsed, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
  if (!response.ok) throw new Error(`Legacy image download failed (${response.status}).`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error('Legacy asset is not an image.');
  const length = Number(response.headers.get('content-length') || 0);
  if (length > MAX_IMAGE_BYTES) throw new Error('Legacy image exceeds the 25 MB migration limit.');

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Legacy image response has no readable body.');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error('Legacy image exceeds the 25 MB migration limit.');
    }
    chunks.push(Buffer.from(value));
  }
  if (!size) throw new Error('Legacy image is empty.');
  return Buffer.concat(chunks, size);
}

async function migrateOne(feedback) {
  const legacyPublicId = feedback.id_attachment_legacy_public_id || feedback.id_attachment_public_id || extractPublicId(feedback.id_attachment_url);

  if (feedback.id_attachment_type === 'authenticated') {
    const stalePublicId = feedback.id_attachment_legacy_public_id;
    if (!stalePublicId) return { action: 'already-private', feedbackId: String(feedback._id) };
    if (stalePublicId === feedback.id_attachment_public_id) {
      feedback.id_attachment_legacy_public_id = '';
      await feedback.save();
      return { action: 'cleared-duplicate-legacy-reference', feedbackId: String(feedback._id) };
    }
    const result = await deleteFromCloudinary(stalePublicId, 'image');
    if (!isDeleted(result)) throw new Error(`Legacy cleanup returned ${result?.result || 'unknown'}.`);
    feedback.id_attachment_legacy_public_id = '';
    await feedback.save();
    return { action: 'removed-legacy-copy', feedbackId: String(feedback._id) };
  }

  const sourceUrl = feedback.id_attachment_url;
  const oldPublicId = feedback.id_attachment_public_id || extractPublicId(sourceUrl);
  if (!sourceUrl || !oldPublicId) throw new Error('Legacy URL or Cloudinary public ID is missing.');

  const image = await downloadLegacyImage(sourceUrl);
  const replacement = await uploadToCloudinary(image, {
    folder: 'ibosys/consultation-ids-private',
    public_id: `guestid_${feedback._id}_${Date.now()}`,
    resource_type: 'image',
    type: 'authenticated',
  });

  try {
    feedback.id_attachment_legacy_public_id = oldPublicId;
    feedback.id_attachment_url = replacement.secure_url;
    feedback.id_attachment_public_id = replacement.public_id;
    feedback.id_attachment_format = replacement.format || 'jpg';
    feedback.id_attachment_type = 'authenticated';
    await feedback.save();
  } catch (error) {
    await deleteFromCloudinary(replacement.public_id, 'image').catch(() => {});
    throw error;
  }

  const deletion = await deleteFromCloudinary(oldPublicId, 'image');
  if (!isDeleted(deletion)) throw new Error(`New private asset saved; legacy copy cleanup returned ${deletion?.result || 'unknown'}.`);
  feedback.id_attachment_legacy_public_id = '';
  await feedback.save();
  return { action: 'migrated', feedbackId: String(feedback._id) };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
  await mongoose.connect(process.env.MONGODB_URI);

  const filter = {
    $or: [
      { id_attachment_type: { $ne: 'authenticated' }, id_attachment_public_id: { $type: 'string', $ne: '' } },
      { id_attachment_type: { $ne: 'authenticated' }, id_attachment_url: { $type: 'string', $regex: '^https://res\\.cloudinary\\.com/' } },
      { id_attachment_type: { $ne: 'authenticated' }, id_attachment_url: { $type: 'string', $regex: '^/uploads/' } },
      { id_attachment_legacy_public_id: { $type: 'string', $ne: '' } },
    ],
  };
  const records = await ConsultationFeedback.find(filter)
    .select('id_attachment_url id_attachment_public_id id_attachment_format id_attachment_type id_attachment_legacy_public_id')
    .sort({ createdAt: 1 });

  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'}: ${records.length} consultation attachment(s) require review.`);
  if (!APPLY) {
    console.log('No records or Cloudinary assets were changed. Re-run with --apply to migrate eligible Cloudinary URLs.');
    return;
  }

  let migrated = 0;
  let failed = 0;
  for (const feedback of records) {
    try {
      const result = await migrateOne(feedback);
      console.log(`${result.action}: ${result.feedbackId}`);
      migrated++;
    } catch (error) {
      console.error(`failed: ${feedback._id}: ${error.message}`);
      failed++;
    }
  }
  console.log(`Finished: ${migrated} handled, ${failed} failed.`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(`Consultation ID migration failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
