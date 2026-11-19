import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from '../server.js';

describe('Legislative workflow API integration', () => {
  let replicaSet;
  let request;
  let headers;
  let term;
  let proponent;
  let committee;

  beforeAll(async () => {
    replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replicaSet.getUri());

    const User = mongoose.model('User');
    const Term = mongoose.model('Term');
    const SBMember = mongoose.model('SBMember');
    const Committee = mongoose.model('Committee');
    await Promise.all(mongoose.modelNames().map(name => mongoose.model(name).init()));
    term = await Term.create({ label: '2025–2028 Test Term', startYear: 2025, endYear: 2028 });
    proponent = await SBMember.create({
      firstName: 'Test', lastName: 'Member', position: 'SB Member', termId: term._id,
      committees: ['Committee on Finance'], contactEmail: 'member@example.test',
    });
    committee = await Committee.create({ name: 'Committee on Finance', termId: term._id });
    await User.create({
      firstName: 'Test', lastName: 'Secretary', email: 'secretary@example.test', password: await bcrypt.hash('SmokeRun!2026', 10),
      role: 'Secretary', contactNumber: '09123456789', status: 'Active',
    });
    process.env.JWT_SECRET = 'test_jwt_secret';
    request = supertest(app);
    const loginResponse = await request.post('/api/auth/login').send({ email: 'secretary@example.test', password: 'SmokeRun!2026' });
    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.user.role).toBe('Secretary');
    headers = { Authorization: `Bearer ${loginResponse.body.token}` };
  }, 240000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (replicaSet) await replicaSet.stop();
  });

  it('keeps generated document PDFs behind authentication', async () => {
    const response = await request.get('/api/reports/document/507f1f77bcf86cd799439011');
    expect(response.status).toBe(401);
  });

  it('creates, edits, files, and enforces type-specific measure stages and committee assignment', async () => {
    const draftResponse = await request.post('/api/ordinances').set(headers).send({
      type: 'Resolution', number: 'RES-2026-TEST-01', title: 'Draft Resolution', title_tl: 'Panukalang Resolusyon',
      proponentId: String(proponent._id), termId: String(term._id), seriesYear: 2026, isDraft: true,
    });
    expect(draftResponse.status).toBe(201);
    expect(draftResponse.body).toMatchObject({ status: 'Draft', isDraft: true, number: 'RES-2026-TEST-01' });
    expect(draftResponse.body.filedAt).toBeFalsy();

    const editResponse = await request.put(`/api/ordinances/${draftResponse.body._id}`).set(headers).send({
      isDraft: true, title: 'Edited Resolution', seriesYear: '2026', coAuthors: [String(proponent._id)],
      motionBy: String(proponent._id), secondedBy: [String(proponent._id)], adoptionResult: 'Adopted unanimously',
      adoptionDate: '2026-06-15', distribution: ['mayor@example.test'], sections: [{ title: 'Section 1', content: '<p>Text</p>' }],
    });
    expect(editResponse.status).toBe(200);
    expect(editResponse.body).toMatchObject({
      title: 'Edited Resolution', isDraft: true, seriesYear: 2026, adoptionResult: 'Adopted unanimously',
      distribution: ['mayor@example.test'],
    });
    expect(editResponse.body.coAuthors).toHaveLength(1);
    expect(editResponse.body.secondedBy).toHaveLength(1);
    expect(editResponse.body.sections).toHaveLength(1);

    const fileResponse = await request.put(`/api/ordinances/${draftResponse.body._id}`).set(headers).send({
      isDraft: false, explanatoryNote: '<p>Reason for the resolution.</p>', provisions: '<p>Be it resolved.</p>',
    });
    expect(fileResponse.status).toBe(200);
    expect(fileResponse.body.status).toBe('First Reading');
    expect(fileResponse.body.isDraft).toBe(false);
    expect(fileResponse.body.filedBy).toBeTruthy();
    expect(fileResponse.body.filedAt).toBeTruthy();

    const draftCommitteeAttempt = await request.put(`/api/ordinances/${fileResponse.body._id}/assign-committee`).set(headers).send({ committee: committee.name });
    expect(draftCommitteeAttempt.status).toBe(400);
    const resolutionWrongStage = await request.put(`/api/ordinances/${fileResponse.body._id}/status`).set(headers).send({ status: 'Committee Hearing' });
    expect(resolutionWrongStage.status).toBe(400);
    const resolutionAssignmentStage = await request.put(`/api/ordinances/${fileResponse.body._id}/status`).set(headers).send({ status: 'Committee Assignment' });
    expect(resolutionAssignmentStage.status).toBe(200);
    const resolutionThirdReading = await request.put(`/api/ordinances/${fileResponse.body._id}/status`).set(headers).send({ status: 'Third Reading' });
    expect(resolutionThirdReading.status).toBe(400);

    const ordinanceResponse = await request.post('/api/ordinances').set(headers).send({
      type: 'Ordinance', number: '2026-001', title: 'Filed Ordinance', title_tl: 'Ordinansa',
      proponentId: String(proponent._id), termId: String(term._id), isDraft: false,
      explanatoryNote: '<p>Purpose.</p>', provisions: '<p>Ordinance text.</p>',
    });
    expect(ordinanceResponse.status).toBe(201);
    const skipStage = await request.put(`/api/ordinances/${ordinanceResponse.body._id}/status`).set(headers).send({ status: 'Committee Hearing' });
    expect(skipStage.status).toBe(400);
    const toAssignment = await request.put(`/api/ordinances/${ordinanceResponse.body._id}/status`).set(headers).send({ status: 'Committee Assignment' });
    expect(toAssignment.status).toBe(200);
    const blockedAdvance = await request.put(`/api/ordinances/${ordinanceResponse.body._id}/status`).set(headers).send({ status: 'Committee Hearing' });
    expect(blockedAdvance.status).toBe(400);

    const forgedCommittee = await request.put(`/api/ordinances/${ordinanceResponse.body._id}`).set(headers).send({ committee: committee.name });
    expect(forgedCommittee.status).toBe(400);
    const assignment = await request.put(`/api/ordinances/${ordinanceResponse.body._id}/assign-committee`).set(headers).send({ committee: committee.name });
    expect(assignment.status).toBe(200);
    expect(assignment.body.committee).toBe(committee.name);
    const toHearing = await request.put(`/api/ordinances/${ordinanceResponse.body._id}/status`).set(headers).send({ status: 'Committee Hearing' });
    expect(toHearing.status).toBe(200);
    const filteredDocuments = await request.get('/api/public/documents').query({
      type: 'Ordinance',
      status: 'Committee Hearing',
      termId: String(term._id),
      year: String(new Date(ordinanceResponse.body.filedAt).getUTCFullYear()),
      committee: committee.name,
    });
    expect(filteredDocuments.status).toBe(200);
    expect(filteredDocuments.body.docs.some(document => document._id === ordinanceResponse.body._id)).toBe(true);
    const report = await request.put(`/api/ordinances/${ordinanceResponse.body._id}/committee-report`).set(headers).send({ findings: '<p>Findings</p>', recommendation: '<p>Recommend passage</p>' });
    expect(report.status).toBe(200);
    expect(report.body.committeeReport.findings).toContain('Findings');
  }, 30000);

  it('creates and edits linked minutes, protects public Drafts, and generates Final public minutes', async () => {
    const ordinance = await request.post('/api/ordinances').set(headers).send({
      type: 'Ordinance', number: '2026-002', title: 'Session Linked Ordinance', title_tl: 'Ordinansa',
      proponentId: String(proponent._id), termId: String(term._id), isDraft: false,
      explanatoryNote: '<p>Purpose.</p>', provisions: '<p>Instrument.</p>',
    });
    expect(ordinance.status).toBe(201);

    const draftMinutes = await request.post('/api/sessions').set(headers).send({
      title: 'Test Session Minutes', sessionNumber: '1st', sessionType: 'Regular Session',
      legislativeBody: 'Test Council', municipality: 'Bongabong', date: '2026-06-15',
      status: 'Draft', itemsDiscussed: [ordinance.body._id], attendance: { present: [String(proponent._id)] },
      callToOrder: '<p>Called to order.</p>',
    });
    expect(draftMinutes.status).toBe(201);
    const populated = await request.get(`/api/sessions/${draftMinutes.body._id}`).set(headers);
    expect(populated.body.createdBy.name).toBe('Test Secretary');
    expect(populated.body.itemsDiscussed[0]).toMatchObject({ type: 'Ordinance', number: '2026-002' });
    expect(populated.body.attendance.present[0]._id).toBe(String(proponent._id));
    const sessionList = await request.get('/api/sessions').set(headers);
    const listedSession = sessionList.body.docs.find(session => session._id === draftMinutes.body._id);
    expect(listedSession.createdBy.name).toBe('Test Secretary');

    const invalidLink = await request.put(`/api/sessions/${draftMinutes.body._id}`).set(headers).send({ itemsDiscussed: ['507f1f77bcf86cd799439099'] });
    expect(invalidLink.status).toBe(400);
    const finalMinutes = await request.put(`/api/sessions/${draftMinutes.body._id}`).set(headers).send({
      status: 'Final', itemsDiscussed: [ordinance.body._id], referenceOfBusiness: '<p>Measure introduced.</p>',
    });
    expect(finalMinutes.status).toBe(200);
    const publicSessions = await request.get('/api/public/sessions');
    expect(publicSessions.status).toBe(200);
    expect(publicSessions.body.docs.some(session => session._id === draftMinutes.body._id)).toBe(true);

    const publicMinutes = await request.get(`/api/public/minutes/${draftMinutes.body._id}`).timeout({ response: 30000, deadline: 35000 });
    expect(publicMinutes.status).toBe(200);
    expect(publicMinutes.headers['content-type']).toContain('application/pdf');
    expect(publicMinutes.headers['content-disposition']).toContain('inline; filename="Official Minutes - 1st - Test Session Minutes - 2026-06-15.pdf"');
    expect(publicMinutes.body.length).toBeGreaterThan(1000);
    const downloadedMinutes = await request.get(`/api/public/minutes/${draftMinutes.body._id}?download=true`).timeout({ response: 30000, deadline: 35000 });
    expect(downloadedMinutes.headers['content-disposition']).toContain('attachment; filename="Official Minutes - 1st - Test Session Minutes - 2026-06-15.pdf"');
    const reportMinutes = await request.get(`/api/reports/minutes/${draftMinutes.body._id}`).set(headers).timeout({ response: 30000, deadline: 35000 });
    expect(reportMinutes.status).toBe(200);
    expect(reportMinutes.headers['content-disposition']).toContain('attachment; filename="Official Minutes - 1st - Test Session Minutes - 2026-06-15.pdf"');
    expect(reportMinutes.body.length).toBeGreaterThan(1000);

    const draftMeasure = await request.post('/api/ordinances').set(headers).send({
      type: 'Resolution', number: 'RES-2026-TEST-02', title: 'Unpublished Draft', title_tl: 'Draft',
      proponentId: String(proponent._id), termId: String(term._id), isDraft: true,
    });
    expect(draftMeasure.status).toBe(201);
    const publicDocuments = await request.get('/api/public/documents');
    expect(publicDocuments.body.docs.some(doc => doc._id === draftMeasure.body._id)).toBe(false);
    const publicDraftDocument = await request.get(`/api/public/documents/${draftMeasure.body._id}`);
    expect(publicDraftDocument.status).toBe(404);
  }, 60000);

  it('reports per-proponent approved and rejected outcomes while excluding drafts', async () => {
    const Ordinance = mongoose.model('Ordinance');
    const make = (overrides) => Ordinance.create({
      type: 'Ordinance', proponentId: proponent._id, termId: term._id,
      explanatoryNote: '<p>Purpose.</p>', provisions: '<p>Text.</p>',
      isDraft: false, status: 'First Reading', ...overrides,
    });

    await make({ number: '2026-101', title: 'Approved One', status: 'Approved' });
    await make({ number: '2026-102', title: 'Approved Two', status: 'Approved' });
    const legacyRejected = await make({ number: '2026-103', title: 'Rejected One', adoptionResult: 'Rejected' });
    await make({ number: '2026-104', title: 'Rejected Lowercase With Spaces', adoptionResult: '  rejected  ' });
    await make({ number: '2026-105', title: 'Draft Rejected', isDraft: true, status: 'Draft', adoptionResult: 'Rejected' });

    const storedRejected = await Ordinance.countDocuments({ adoptionResult: /^\s*rejected\s*$/i });
    expect(storedRejected).toBe(3);

    const response = await request.get('/api/ordinances/stats').set(headers);
    expect(response.status).toBe(200);
    expect(response.body.rejected).toBe(2);
    const expectedInProgress = await Ordinance.countDocuments({
      isDraft: { $ne: true },
      status: { $nin: ['Approved', 'Rejected', 'Draft'] },
      $nor: [{ type: 'Ordinance', adoptionResult: { $regex: /^\s*rejected\s*$/i } }],
    });
    expect(response.body.inProgress).toBe(expectedInProgress);

    const rejectedFilter = await request.get('/api/ordinances?status=Rejected').set(headers);
    expect(rejectedFilter.status).toBe(200);
    expect(rejectedFilter.body.docs.some(doc => doc._id === String(legacyRejected._id) && doc.status === 'Rejected' && doc.legacyRejection)).toBe(true);
    const legacyDetail = await request.get('/api/ordinances/' + legacyRejected._id).set(headers);
    expect(legacyDetail.body).toMatchObject({ status: 'Rejected', legacyRejection: true });
    expect((await request.put('/api/ordinances/' + legacyRejected._id).set(headers).send({ title: 'Edited rejected ordinance' })).status).toBe(400);
    expect((await request.put('/api/ordinances/' + legacyRejected._id + '/status').set(headers).send({ status: 'Committee Assignment' })).status).toBe(400);
    expect((await request.put('/api/ordinances/' + legacyRejected._id + '/assign-committee').set(headers).send({ committee: committee.name })).status).toBe(400);

    const rejectedTextCreate = await request.post('/api/ordinances').set(headers).send({
      type: 'Ordinance', number: '2026-106', title: 'Text Rejection Attempt',
      proponentId: String(proponent._id), termId: String(term._id), isDraft: true, adoptionResult: ' Rejected ',
    });
    expect(rejectedTextCreate.status).toBe(400);
    const editable = await make({ number: '2026-107', title: 'Editable Ordinance' });
    const rejectedTextUpdate = await request.put('/api/ordinances/' + editable._id).set(headers).send({ adoptionResult: 'Rejected' });
    expect(rejectedTextUpdate.status).toBe(400);

    const entry = response.body.byProponentOutcomes.find(o => o.name.includes('Test'));
    expect(entry).toMatchObject({ approved: 2, rejected: 2 });
  }, 30000);
});
