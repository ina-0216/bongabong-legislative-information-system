import { describe, it, expect } from 'vitest';
import { PDFParse } from 'pdf-parse';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { applyPdfHeaderTemplate, generateOrdinancePdf, generateResolutionPdf, generateSessionPdf } from '../services/pdfService.js';

const readPdfText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  try {
    return (await parser.getText()).text;
  } finally {
    await parser.destroy();
  }
};

describe('Session PDF Generation Alignment', () => {
  it('applies a single-page PDF template behind every generated page', async () => {
    const template = await PDFDocument.create();
    const templateFont = await template.embedFont(StandardFonts.Helvetica);
    const templatePage = template.addPage();
    templatePage.drawText('OFFICIAL HEADER TEMPLATE', { x: 48, y: 740, size: 16, font: templateFont });
    const templateBuffer = Buffer.from(await template.save());

    const content = await PDFDocument.create();
    const contentFont = await content.embedFont(StandardFonts.Helvetica);
    for (let index = 1; index <= 2; index++) {
      const page = content.addPage();
      page.drawText(`BODY PAGE ${index}`, { x: 48, y: 680, size: 12, font: contentFont });
    }
    const contentBuffer = Buffer.from(await content.save());

    const merged = await applyPdfHeaderTemplate(contentBuffer, templateBuffer);
    const mergedPdf = await PDFDocument.load(merged);

    expect(mergedPdf.getPageCount()).toBe(2);
    const mergedText = await readPdfText(merged);
    expect(mergedText.match(/OFFICIAL HEADER TEMPLATE/g)).toHaveLength(2);
    expect(mergedText).toContain('BODY PAGE 1');
    expect(mergedText).toContain('BODY PAGE 2');
  });

  it('includes ordinance and resolution definitions in generated PDFs', async () => {
    const ordinancePdf = await generateOrdinancePdf({
      type: 'Ordinance',
      number: '2026-099',
      title: 'Definitions Test Ordinance',
      proponentId: { name: 'Test Author', position: 'Councilor' },
      explanatoryNote: '<p>Purpose of this ordinance.</p>',
      definitionsOfTerms: '<p>“Municipal waters” means waters within Bongabong.</p>',
      enactingClause: 'BE IT ORDAINED.',
      provisions: '<p>Section 1. This is a test.</p>',
      sections: [],
      status: 'First Reading',
    });
    const resolutionPdf = await generateResolutionPdf({
      number: 'RES-2026-099',
      title: 'Definitions Test Resolution',
      proponentId: { name: 'Test Author' },
      explanatoryNote: '<p>WHEREAS, this resolution tests definitions.</p>',
      definitionsOfTerms: '<p>“Public consultation” means an open community hearing.</p>',
      enactingClause: 'BE IT RESOLVED.',
      provisions: '<p>RESOLVED, to test the defined terms.</p>',
      sections: [],
      secondedBy: [],
      coAuthors: [],
      distribution: [],
      status: 'First Reading',
    });

    expect(await readPdfText(ordinancePdf)).toContain('Municipal waters');
    expect(await readPdfText(resolutionPdf)).toContain('Public consultation');
  }, 30000);

  it('generates PDF buffer for populated session matching reference structure', async () => {
    const session = {
      title: '47th Regular Session',
      sessionNumber: '47th',
      sessionType: 'Regular Session',
      legislativeBody: '12th Sangguniang Bayan',
      venue: 'Sangguniang Bayan Session Hall, 2nd Floor, Executive and Legislative Building, Poblacion, Bongabong, Oriental Mindoro',
      municipality: 'Bongabong, Oriental Mindoro',
      date: new Date('2026-06-15'),
      status: 'Draft',
      createdBy: {
        firstName: 'Test',
        middleName: 'M.',
        lastName: 'Secretary',
      },
      attendance: {
        present: [
          { name: 'Jayson M. Barcelona', position: 'Municipal Vice-Mayor Presiding Officer' },
          { name: 'Jeffrey B. Alea', position: 'Member' },
        ],
        onOfficialBusiness: [
          { name: 'Richard S. Candelario', position: 'Member' },
        ],
        absent: [],
      },
      callToOrder: '<p>The Presiding Officer called the session to order at 10:15 AM.</p>',
      invocation: '<p>Hon. Villanueva led the opening prayer.</p>',
      rollCall: '<p>The Secretary conducted the roll call. Quorum declared.</p>',
      readingOfPreviousMinutes: '<p>Minutes of the previous session were adopted.</p>',
      orderOfBusiness: '<p>Order and calendar of business adopted.</p>',
      privilegeHour: '<p>Hon. Monreal availed of the privilege hour.</p>',
      questionHour: '<p>Question hour deliberations.</p>',
      committeeReport: '<p>Committee on Ordinances presented report.</p>',
      firstReading: '<p>Draft Ordinance No. 2026-015 filed.</p>',
      unfinishedBusiness: '<p>Review of pending measure.</p>',
      referralForAction: '<p>Referred to Committee on Laws.</p>',
      referralForReference: '<p>Communication from DILG noted.</p>',
      otherMatters: '<p>Discussion on upcoming municipal fiesta.</p>',
      thanksgivingPrayer: '<p>Thanksgiving prayer led by Hon. Villanueva.</p>',
      adjournment: '<p>The session adjourned at 11:18 AM.</p>',
    };

    const pdfBuffer = await generateSessionPdf(session);
    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
    const pdfText = await readPdfText(pdfBuffer);
    expect(pdfText).toContain('Recorded by: Test M. Secretary');
    expect(pdfText).toContain('Secretary / Recording Officer');
    expect(pdfText).toContain('DRAFT');
  }, 20000);

  it('generates PDF buffer for legacy session using citizensHour fallback', async () => {
    const legacySession = {
      title: 'Legacy 40th Session',
      date: new Date('2026-05-01'),
      attendance: {
        present: [{ name: 'Jayson M. Barcelona', position: 'Vice-Mayor' }],
        onOfficialBusiness: [],
        absent: [],
      },
      callToOrder: '<p>Session called to order.</p>',
      citizensHour: '<p>Citizens spoke on road maintenance.</p>', // Legacy field
      adjournment: '<p>Adjourned at 11:00 AM.</p>',
    };

    const pdfBuffer = await generateSessionPdf(legacySession);
    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  }, 20000);

  it('omits empty optional sections cleanly without breaking layout', async () => {
    const sparseSession = {
      title: 'Sparse Special Session',
      date: new Date('2026-07-01'),
      attendance: {
        present: [],
        onOfficialBusiness: [],
        absent: [],
      },
      callToOrder: '<p>Order called.</p>',
      adjournment: '<p>Adjourned.</p>',
    };

    const pdfBuffer = await generateSessionPdf(sparseSession);
    expect(pdfBuffer).toBeDefined();
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(1000);
  }, 20000);
});
