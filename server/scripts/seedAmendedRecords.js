/**
 * seedAmendedRecords.js
 *
 * Appends amendment pairs to the existing database WITHOUT deleting any records.
 *
 * Creates:
 *   - 3 "old" Approved Ordinances  → each gets amendedByOrdinanceId set
 *   - 3 "new" Amending Ordinances  → each sets amendsOrdinanceId to the old record
 *   - 3 "old" Approved Resolutions → each gets amendedByOrdinanceId set
 *   - 3 "new" Amending Resolutions → each sets amendsOrdinanceId to the old record
 *
 * Numbers are chosen in the 2025 series to avoid collision with existing 2026 records.
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { assertFixtureSeedingAllowed } = require('../utils/seedSafety');

const User      = require('../models/User');
const Ordinance = require('../models/Ordinance');
const SBMember  = require('../models/SBMember');
const Term      = require('../models/Term');

const COMMITTEES = [
  'Committee on Appropriation, Infrastructure and Power and Energy',
  'Committee on Education, Culture and Arts, Legal Matters, House Rules, Ordinances, Technical and Vocational Education, Good Governance, Public Ethics and Accountability',
  'Committee on Health, Livelihood and Civil Society Organizations',
  'Committee on Environment, Grievances, Human Rights, Cooperative, Market and Economic Enterprise',
  'Committee on Agriculture and Games and Amusement',
  'Committee on Tourism, Transportation, Peace and Order and Beautification',
  'Committee on Social Welfare, Disaster Risk Reduction and Management and Community Driven Development',
  'Committee on Ways and Means, Trade and Industry, Land Use, Labor and Human Resource, Overseas Filipino Workers, Oversight and Sisterhood',
  'Committee on Youth and Sports Development, Science and Technology and Information and Communication Technology',
  'Committee on Barangay Affairs',
];

async function seedAmendedRecords() {
  assertFixtureSeedingAllowed();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required to seed amended records.');
  console.log('[Amendment Seed] Connecting to the configured MongoDB database.');
  await mongoose.connect(uri);

  const secretaryUser  = await User.findOne({ role: 'Secretary' }) || await User.findOne();
  const currentTerm    = await Term.findOne({ startYear: 2025, endYear: 2028 }) || await Term.findOne().sort({ startYear: -1 });
  const sbMembers      = await SBMember.find().sort({ order: 1 });

  if (!secretaryUser || !currentTerm || sbMembers.length === 0) {
    throw new Error('Required base data (User, Term, SBMember) missing.');
  }

  const councilors = sbMembers.filter(m => m.position !== 'Vice Mayor');
  const S          = secretaryUser._id;

  // HELPER: check for duplicate number collision
  async function safeNumber(num) {
    const exists = await Ordinance.findOne({ number: num, termId: currentTerm._id });
    if (exists) {
      console.warn('[Amendment Seed] Number ' + num + ' already exists — skipping its pair.');
      return null;
    }
    return num;
  }

  console.log('[Amendment Seed] Creating amendment pairs for Ordinances...');

  // ORDINANCE AMENDMENT PAIR 1
  // Old: 2025-008  Plastic Waste (original, now superseded)
  // New: 2026-011  Amended/Expanded Plastic Waste Ordinance
  const OLD_ORD_1_NUM = await safeNumber('2025-008');
  if (OLD_ORD_1_NUM) {
    const oldOrd1 = await Ordinance.create({
      number:   OLD_ORD_1_NUM,
      type:     'Ordinance',
      title:    'An Ordinance Regulating the Use of Single-Use Plastics in Commercial Establishments within the Municipality of Bongabong (Original)',
      title_tl: 'Kautusang Nagtatakda ng Paggamit ng mga Plastik sa mga Establisyimento sa Bongabong (Orihinal)',
      proponentId:   councilors[0]._id,
      coAuthors:     [councilors[1]._id],
      termId:        currentTerm._id,
      seriesYear:    2025,
      isDraft:       false,
      committee:     COMMITTEES[3],
      committeeAssignment: {
        committee:  COMMITTEES[3],
        assignedBy: S,
        assignedAt: new Date('2025-05-10'),
        notes:      'Original referral to Committee on Environment.'
      },
      sectorTag:       'Environment',
      explanatoryNote: 'WHEREAS, single-use plastic bags have been identified as a primary contributor to drainage blockages and marine litter in coastal barangays of Bongabong; WHEREAS, regulating their use in commercial establishments is a necessary first step toward sustainable municipal waste management;',
      enactingClause:  'BE IT ORDAINED by the Sangguniang Bayan of Bongabong, Oriental Mindoro in session assembled:',
      provisions:      '<p><strong>Section 1. Title.</strong> This Ordinance shall be known as the Bongabong Plastic Use Regulation Ordinance of 2025.</p><p><strong>Section 2. Coverage.</strong> All supermarkets, public market stalls, and sari-sari stores are covered.</p><p><strong>Section 3. Regulation.</strong> Use of thin sando bags for dry goods is regulated and subject to a Php 0.50 eco-levy per bag.</p>',
      penaltyClause:   'First Offense: Written Warning; Second Offense: Php 500 fine; Third Offense: Php 1,000 fine.',
      effectivityDate: new Date('2025-08-01'),
      status:          'Approved',
      isLocked:        true,
      plainLanguageSummary:    'Original 2025 ordinance that placed an eco-levy on plastic bags in stores. Later expanded and superseded by the 2026 Plastic Waste Minimization Ordinance.',
      plainLanguageSummary_tl: 'Ang orihinal na kautusan noong 2025 ukol sa paggamit ng plastik sa mga tindahan. Pinalawak at pinalitan ng mas komprehensibong kautusan noong 2026.',
      timeline: [
        { status: 'First Reading',        notes: 'Introduced in the 2025 regular session.',             updatedBy: S, date: new Date('2025-05-05') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Environment.',               updatedBy: S, date: new Date('2025-05-10') },
        { status: 'Committee Hearing',    notes: 'Hearing conducted with market vendors.',              updatedBy: S, date: new Date('2025-05-22') },
        { status: 'Public Consultation', notes: 'Open consultation period online.',                     updatedBy: S, date: new Date('2025-06-01') },
        { status: 'Second Reading',       notes: 'Deliberated with amendments.',                        updatedBy: S, date: new Date('2025-06-15') },
        { status: 'Third Reading',        notes: 'Passed on nominal vote.',                             updatedBy: S, date: new Date('2025-07-01') },
        { status: "For Mayor's Signature", notes: 'Transmitted to Municipal Mayor.',                   updatedBy: S, date: new Date('2025-07-08') },
        { status: 'Approved',             notes: 'Enacted into municipal law.',                         updatedBy: S, date: new Date('2025-07-15') },
      ]
    });

    const NEW_ORD_1_NUM = await safeNumber('2026-011');
    if (NEW_ORD_1_NUM) {
      const newOrd1 = await Ordinance.create({
        number:   NEW_ORD_1_NUM,
        type:     'Ordinance',
        title:    'An Ordinance Strengthening and Expanding the Regulation on Single-Use Plastics and Polystyrene, Amending Ordinance No. 2025-008',
        title_tl: 'Kautusang Nagpapalawak at Nagpapalakas ng Regulasyon sa Single-Use Plastics, na Binabago ang Kautusan Blg. 2025-008',
        proponentId:   councilors[0]._id,
        coAuthors:     [councilors[1]._id, councilors[2]._id],
        termId:        currentTerm._id,
        seriesYear:    2026,
        isDraft:       false,
        committee:     COMMITTEES[3],
        committeeAssignment: {
          committee:  COMMITTEES[3],
          assignedBy: S,
          assignedAt: new Date('2026-06-02'),
          notes:      'Fast-tracked referral citing urgency of expanded coverage.'
        },
        sectorTag:        'Environment',
        amendsOrdinanceId: oldOrd1._id,
        explanatoryNote:  'WHEREAS, Ordinance No. 2025-008 limited plastic regulation to supermarkets, market stalls, and sari-sari stores, creating unaddressed gaps in dining establishments and service businesses; WHEREAS, polystyrene containers were not covered by the original ordinance despite being a major source of non-biodegradable coastal litter;',
        enactingClause:   'BE IT ORDAINED by the Sangguniang Bayan of Bongabong, Oriental Mindoro in session assembled:',
        provisions:       '<p><strong>Section 1. Title.</strong> This Ordinance shall be known as the Bongabong Plastic Waste Minimization and Expanded Regulation Ordinance of 2026.</p><p><strong>Section 2. Amendment of Coverage.</strong> Section 2 of Ordinance No. 2025-008 is hereby amended to include all dining establishments, service businesses, carinderia operators, and delivery services.</p><p><strong>Section 3. Polystyrene Ban.</strong> Distribution and use of expanded polystyrene (Styrofoam) containers for prepared food and beverages is hereby expressly prohibited.</p><p><strong>Section 4. Mandatory Eco-Bag Shift.</strong> Establishments shall provide only reusable cloth bags or paper bags for customer packaging needs.</p>',
        penaltyClause:    'First Offense: Php 1,000 fine; Second Offense: Php 2,500 fine; Third Offense: Php 5,000 fine and temporary suspension of business permit for 30 days.',
        effectivityDate:  new Date('2026-09-01'),
        status:           'Approved',
        isLocked:         true,
        plainLanguageSummary:    'Amends and expands the 2025 plastic ordinance to cover restaurants, carinderia, and delivery services, and adds a full ban on Styrofoam food containers.',
        plainLanguageSummary_tl: 'Pinalawak ang 2025 na kautusan sa plastik kasama na ang mga kainan at delivery service, at ganap na ipinagbabawal ang Styrofoam.',
        timeline: [
          { status: 'First Reading',        notes: 'Introduced citing implementation gaps in Ord. 2025-008.',  updatedBy: S, date: new Date('2026-05-20') },
          { status: 'Committee Assignment', notes: 'Referred to Committee on Environment for expedited review.', updatedBy: S, date: new Date('2026-06-02') },
          { status: 'Committee Hearing',    notes: 'Joint hearing with Restaurant Owners Association.',          updatedBy: S, date: new Date('2026-06-12') },
          { status: 'Public Consultation', notes: 'Public input gathered via iBOSys portal.',                   updatedBy: S, date: new Date('2026-06-20') },
          { status: 'Second Reading',       notes: 'Approved with technical amendments to Section 4.',          updatedBy: S, date: new Date('2026-07-05') },
          { status: 'Third Reading',        notes: 'Passed unanimously.',                                        updatedBy: S, date: new Date('2026-07-20') },
          { status: "For Mayor's Signature", notes: 'Transmitted to Mayor.',                                    updatedBy: S, date: new Date('2026-07-25') },
          { status: 'Approved',             notes: 'Signed and enacted.',                                        updatedBy: S, date: new Date('2026-08-05') },
        ]
      });

      await Ordinance.findByIdAndUpdate(oldOrd1._id, { amendedByOrdinanceId: newOrd1._id });
      console.log('[Amendment Seed] Linked Ord pair 1: ' + OLD_ORD_1_NUM + ' -> ' + NEW_ORD_1_NUM);
    }
  }

  // ORDINANCE AMENDMENT PAIR 2
  // Old: 2025-004  Curfew Ordinance (original, limited scope)
  // New: 2026-012  Amended Curfew (expanded hours + stricter enforcement)
  const OLD_ORD_2_NUM = await safeNumber('2025-004');
  if (OLD_ORD_2_NUM) {
    const oldOrd2 = await Ordinance.create({
      number:   OLD_ORD_2_NUM,
      type:     'Ordinance',
      title:    'An Ordinance Establishing Curfew Hours for Minors in the Municipality of Bongabong (Original)',
      title_tl: 'Kautusang Nagtatakda ng Curfew para sa mga Menor de Edad sa Bongabong (Orihinal)',
      proponentId:   councilors[1]._id,
      termId:        currentTerm._id,
      seriesYear:    2025,
      isDraft:       false,
      committee:     COMMITTEES[5],
      committeeAssignment: {
        committee:  COMMITTEES[5],
        assignedBy: S,
        assignedAt: new Date('2025-03-10'),
        notes:      'Referred to Committee on Tourism, Transportation, Peace and Order.'
      },
      sectorTag:       'Peace and Order',
      explanatoryNote: 'WHEREAS, incidents of juvenile delinquency and street crimes involving minors have been increasingly reported in several barangays; WHEREAS, setting structured curfew hours provides a protective framework for the youth and their families;',
      enactingClause:  'BE IT ORDAINED by the Sangguniang Bayan of Bongabong:',
      provisions:      '<p><strong>Section 1. Curfew Hours.</strong> Minors aged below 18 shall observe an 11:00 PM to 5:00 AM curfew in all public spaces.</p><p><strong>Section 2. Exceptions.</strong> Minors with parental written consent or school-issued event passes are exempt.</p>',
      penaltyClause:   'Parents/Guardians: Php 500 fine for first offense; counseling required.',
      effectivityDate: new Date('2025-05-01'),
      status:          'Approved',
      isLocked:        true,
      plainLanguageSummary:    'Original 2025 curfew ordinance for minors (11 PM to 5 AM). Later amended in 2026 to adjust curfew hours and strengthen enforcement.',
      plainLanguageSummary_tl: 'Ang orihinal na kautusan sa curfew noong 2025. Binago noong 2026 upang palakasin ang pagpapatupad.',
      timeline: [
        { status: 'First Reading',        notes: 'First reading approved.',          updatedBy: S, date: new Date('2025-03-05') },
        { status: 'Committee Assignment', notes: 'Referred to Peace and Order.',      updatedBy: S, date: new Date('2025-03-10') },
        { status: 'Committee Hearing',    notes: 'Hearing with PNP Bongabong.',       updatedBy: S, date: new Date('2025-03-20') },
        { status: 'Second Reading',       notes: 'Passed second reading.',            updatedBy: S, date: new Date('2025-04-01') },
        { status: 'Third Reading',        notes: 'Unanimously approved.',             updatedBy: S, date: new Date('2025-04-15') },
        { status: 'Approved',             notes: 'Signed by the Municipal Mayor.',    updatedBy: S, date: new Date('2025-04-22') },
      ]
    });

    const NEW_ORD_2_NUM = await safeNumber('2026-012');
    if (NEW_ORD_2_NUM) {
      const newOrd2 = await Ordinance.create({
        number:   NEW_ORD_2_NUM,
        type:     'Ordinance',
        title:    'An Ordinance Amending Ordinance No. 2025-004, Revising Curfew Hours and Strengthening Enforcement Mechanisms for Minors in Bongabong',
        title_tl: 'Kautusang Binabago ang Kautusan Blg. 2025-004, Binabago ang Oras ng Curfew at Pinapalakas ang Pagpapatupad para sa mga Menor',
        proponentId:   councilors[1]._id,
        coAuthors:     [councilors[5]._id, councilors[6]._id],
        termId:        currentTerm._id,
        seriesYear:    2026,
        isDraft:       false,
        committee:     COMMITTEES[5],
        committeeAssignment: {
          committee:  COMMITTEES[5],
          assignedBy: S,
          assignedAt: new Date('2026-07-08'),
          notes:      'Referred to Committee on Peace and Order for review of enforcement gaps.'
        },
        sectorTag:        'Peace and Order',
        amendsOrdinanceId: oldOrd2._id,
        explanatoryNote:  'WHEREAS, the implementation of Ordinance No. 2025-004 has revealed enforcement limitations, particularly during school vacation periods and municipal fiesta celebrations; WHEREAS, feedback from the Bongabong Municipal Police Station indicates the original curfew hours of 11 PM to 5 AM are too lenient;',
        enactingClause:   'BE IT ORDAINED by the Sangguniang Bayan of Bongabong:',
        provisions:       '<p><strong>Section 1. Amendment of Curfew Hours.</strong> Section 1 of Ordinance No. 2025-004 is hereby amended. The curfew period for minors below 18 shall be 10:00 PM to 5:00 AM on regular school days, and 12:00 midnight to 5:00 AM during weekends and school holidays.</p><p><strong>Section 2. Enforcement Body.</strong> A Municipal Curfew Task Force composed of PNP, MSWDO, and two (2) barangay tanods per barangay shall be constituted.</p><p><strong>Section 3. Surrender Procedure.</strong> Apprehended minors shall be temporarily turned over to the barangay hall and parents/guardians notified within one (1) hour.</p>',
        penaltyClause:    'First Offense: Mandatory parental counseling; Second Offense: Php 1,000 fine and 8 hours community service; Third Offense: Php 2,500 fine and MSWDO intervention.',
        effectivityDate:  new Date('2026-10-01'),
        status:           'Third Reading',
        isLocked:         false,
        plainLanguageSummary:    'Amends the 2025 curfew ordinance by tightening curfew hours to 10 PM and creating a Municipal Curfew Task Force for stricter enforcement.',
        plainLanguageSummary_tl: 'Binago ang oras ng curfew at nagtatag ng task force para sa mas mahigpit na pagpapatupad.',
        timeline: [
          { status: 'First Reading',        notes: 'Presented citing enforcement gaps in Ord. 2025-004.',    updatedBy: S, date: new Date('2026-07-01') },
          { status: 'Committee Assignment', notes: 'Referred to Committee on Peace and Order.',               updatedBy: S, date: new Date('2026-07-08') },
          { status: 'Committee Hearing',    notes: 'Joint hearing with PNP and MSWDO.',                       updatedBy: S, date: new Date('2026-07-18') },
          { status: 'Public Consultation', notes: 'Community feedback via iBOSys portal.',                    updatedBy: S, date: new Date('2026-07-25') },
          { status: 'Second Reading',       notes: 'Approved with minor amendments to Section 2.',            updatedBy: S, date: new Date('2026-08-10') },
          { status: 'Third Reading',        notes: 'Enrolled for final nominal vote.',                        updatedBy: S, date: new Date('2026-08-20') },
        ]
      });

      await Ordinance.findByIdAndUpdate(oldOrd2._id, { amendedByOrdinanceId: newOrd2._id });
      console.log('[Amendment Seed] Linked Ord pair 2: ' + OLD_ORD_2_NUM + ' -> ' + NEW_ORD_2_NUM);
    }
  }

  // ORDINANCE AMENDMENT PAIR 3
  // Old: 2025-006  Health Desk Ordinance (original)
  // New: 2026-013  Amended Health Desk (expanded mandate, funding)
  const OLD_ORD_3_NUM = await safeNumber('2025-006');
  if (OLD_ORD_3_NUM) {
    const oldOrd3 = await Ordinance.create({
      number:   OLD_ORD_3_NUM,
      type:     'Ordinance',
      title:    'An Ordinance Establishing Barangay Health Desks with Basic Medicine Supplies in the Municipality of Bongabong (Original)',
      title_tl: 'Kautusang Nagtatayo ng Health Desk sa mga Barangay ng Bongabong (Orihinal)',
      proponentId:   councilors[2]._id,
      termId:        currentTerm._id,
      seriesYear:    2025,
      isDraft:       false,
      committee:     COMMITTEES[2],
      committeeAssignment: {
        committee:  COMMITTEES[2],
        assignedBy: S,
        assignedAt: new Date('2025-06-05'),
        notes:      'Referred to Committee on Health and Civil Society.'
      },
      sectorTag:       'Health',
      explanatoryNote: 'WHEREAS, many barangays in Bongabong lack basic first-aid facilities; WHEREAS, establishing health desks at every barangay hall will improve primary emergency response capacity;',
      enactingClause:  'BE IT ORDAINED by the Sangguniang Bayan of Bongabong:',
      provisions:      '<p><strong>Section 1. Establishment.</strong> Every barangay hall shall maintain a health desk with basic first-aid kit and blood pressure monitoring equipment.</p><p><strong>Section 2. Personnel.</strong> At least one Barangay Health Worker shall be assigned per barangay desk.</p>',
      penaltyClause:   'Administrative sanctions for barangay councils failing to maintain the health desk.',
      effectivityDate: new Date('2025-09-01'),
      status:          'Approved',
      isLocked:        true,
      plainLanguageSummary:    'Original 2025 ordinance establishing basic health desks in barangay halls. Expanded in 2026 to include emergency medicine and 24/7 rotation.',
      plainLanguageSummary_tl: 'Ang orihinal na kautusan sa health desk noong 2025. Pinalawak noong 2026 na may mas maraming gamot at 24/7 na serbisyo.',
      timeline: [
        { status: 'First Reading',        notes: 'Introduced during regular session.',    updatedBy: S, date: new Date('2025-05-28') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Health.',      updatedBy: S, date: new Date('2025-06-05') },
        { status: 'Committee Hearing',    notes: 'Hearing with Municipal Health Office.', updatedBy: S, date: new Date('2025-06-18') },
        { status: 'Second Reading',       notes: 'Passed second reading.',                updatedBy: S, date: new Date('2025-07-01') },
        { status: 'Third Reading',        notes: 'Unanimously approved.',                 updatedBy: S, date: new Date('2025-07-15') },
        { status: 'Approved',             notes: 'Signed and enacted.',                   updatedBy: S, date: new Date('2025-07-22') },
      ]
    });

    const NEW_ORD_3_NUM = await safeNumber('2026-013');
    if (NEW_ORD_3_NUM) {
      const newOrd3 = await Ordinance.create({
        number:   NEW_ORD_3_NUM,
        type:     'Ordinance',
        title:    'An Ordinance Amending Ordinance No. 2025-006, Expanding Barangay Health and Emergency Care Desks with 24/7 Operations and Quarterly Medication Replenishment',
        title_tl: 'Kautusang Binabago ang Kautusan Blg. 2025-006, Nagpapalawak ng Health Desk sa 24-Oras na Operasyon at Quarterly na Gamot',
        proponentId:   councilors[2]._id,
        coAuthors:     [councilors[4]._id, councilors[3]._id],
        termId:        currentTerm._id,
        seriesYear:    2026,
        isDraft:       false,
        committee:     COMMITTEES[2],
        committeeAssignment: {
          committee:  COMMITTEES[2],
          assignedBy: S,
          assignedAt: new Date('2026-08-05'),
          notes:      'Referred back to Committee on Health for expanded mandate review.'
        },
        sectorTag:        'Health',
        amendsOrdinanceId: oldOrd3._id,
        explanatoryNote:  'WHEREAS, operational monitoring of Ordinance No. 2025-006 revealed that single-shift BHW assignments are insufficient for overnight emergency coverage; WHEREAS, barangay health desks are currently limited to basic first-aid supplies without essential emergency medications;',
        enactingClause:   'BE IT ORDAINED by the Sangguniang Bayan of Bongabong:',
        provisions:       '<p><strong>Section 1. Amendment of Section 2.</strong> Section 2 of Ordinance No. 2025-006 is hereby amended to require two (2) Barangay Health Workers per desk operating in rotating 12-hour shifts to ensure 24/7 availability.</p><p><strong>Section 2. Essential Medication List.</strong> Each barangay health desk shall maintain a prescribed list of essential emergency medications including antihypertensives, analgesics, wound care supplies, and oral rehydration salts.</p><p><strong>Section 3. Quarterly Replenishment.</strong> The Municipal Health Officer shall coordinate quarterly medication delivery to all barangay health desks funded from the Municipal Health and Nutrition Fund.</p>',
        penaltyClause:    'Administrative penalties and budget reduction for barangay councils with non-compliant health desks under DILG guidelines.',
        effectivityDate:  new Date('2026-11-01'),
        status:           'Public Consultation',
        isLocked:         false,
        plainLanguageSummary:    'Expands the 2025 barangay health desk ordinance to mandate 24/7 BHW coverage and quarterly free medicine replenishment for every barangay hall.',
        plainLanguageSummary_tl: 'Pinalawak ang health desk sa bawat barangay — dalawang BHW sa rotation at quarterly na libreng gamot.',
        timeline: [
          { status: 'First Reading',        notes: 'Introduced citing operational gaps in Ord. 2025-006.',  updatedBy: S, date: new Date('2026-07-28') },
          { status: 'Committee Assignment', notes: 'Referred to Committee on Health.',                       updatedBy: S, date: new Date('2026-08-05') },
          { status: 'Committee Hearing',    notes: 'Joint hearing with Municipal Health Office and BHWs.',   updatedBy: S, date: new Date('2026-08-15') },
          { status: 'Public Consultation', notes: 'Consultation open across all barangay clusters.',         updatedBy: S, date: new Date('2026-08-22') },
        ]
      });

      await Ordinance.findByIdAndUpdate(oldOrd3._id, { amendedByOrdinanceId: newOrd3._id });
      console.log('[Amendment Seed] Linked Ord pair 3: ' + OLD_ORD_3_NUM + ' -> ' + NEW_ORD_3_NUM);
    }
  }

  // RESOLUTION AMENDMENT PAIR 1
  // Old: RES-2025-003  Coconut Support Resolution (original)
  // New: RES-2026-011  Amended Coconut Resolution (expanded beneficiary scope)
  console.log('[Amendment Seed] Creating amendment pairs for Resolutions...');

  const OLD_RES_1_NUM = await safeNumber('RES-2025-003');
  if (OLD_RES_1_NUM) {
    const oldRes1 = await Ordinance.create({
      number:   OLD_RES_1_NUM,
      type:     'Resolution',
      title:    'A Resolution Expressing Municipal Support for the Coconut Farmers Industry Development Plan in Bongabong, Oriental Mindoro (Original)',
      title_tl: 'Resolusyong Nagpapahayag ng Suporta sa Programa para sa mga Magsasakang Niyog sa Bongabong (Orihinal)',
      proponentId:   councilors[3]._id,
      coAuthors:     [councilors[0]._id],
      termId:        currentTerm._id,
      seriesYear:    2025,
      isDraft:       false,
      committee:     COMMITTEES[4],
      committeeAssignment: {
        committee:  COMMITTEES[4],
        assignedBy: S,
        assignedAt: new Date('2025-04-08'),
        notes:      'Referred to Committee on Agriculture.'
      },
      sectorTag:      'Agriculture',
      motionBy:       councilors[3]._id,
      secondedBy:     [councilors[0]._id, councilors[1]._id],
      adoptionResult: 'Unanimously Approved',
      adoptionDate:   new Date('2025-04-22'),
      distribution: [
        'Office of the Municipal Mayor, Bongabong',
        'Philippine Coconut Authority, Region IV-B',
      ],
      explanatoryNote: 'WHEREAS, thousands of smallholder coconut farm families in Bongabong depend on coconut farming for their livelihood; WHEREAS, the national Coconut Farmers Industry Development Plan offers replanting and mechanization grants that require LGU endorsement;',
      enactingClause:  'NOW, THEREFORE, on motion of Hon. Jeremy Enriquez, seconded by Hon. Richard Candelario and Hon. Jose Rodney Liwanag, BE IT RESOLVED:',
      provisions:      '<p><strong>RESOLVED,</strong> that the Sangguniang Bayan of Bongabong officially endorses the Coconut Farmers Industry Development Plan and requests the Philippine Coconut Authority to prioritize Bongabong farmer associations.</p><p><strong>RESOLVED FURTHER,</strong> that copies of this Resolution be transmitted to all relevant government agencies.</p>',
      status:          'Approved',
      isLocked:        true,
      plainLanguageSummary:    'Original 2025 resolution endorsing the national coconut farming development plan. Superseded in 2026 by an expanded resolution covering more barangays.',
      plainLanguageSummary_tl: 'Ang orihinal na resolusyon ng 2025 para sa mga magsasakang niyog. Pinalawak noong 2026.',
      timeline: [
        { status: 'First Reading',        notes: 'Introduced and presented.',    updatedBy: S, date: new Date('2025-04-02') },
        { status: 'Committee Assignment', notes: 'Referred to Agriculture.',      updatedBy: S, date: new Date('2025-04-08') },
        { status: 'Third Reading',        notes: 'Adopted unanimously.',          updatedBy: S, date: new Date('2025-04-22') },
        { status: 'Approved',             notes: 'Sealed and dispatched.',        updatedBy: S, date: new Date('2025-04-28') },
      ]
    });

    const NEW_RES_1_NUM = await safeNumber('RES-2026-011');
    if (NEW_RES_1_NUM) {
      const newRes1 = await Ordinance.create({
        number:   NEW_RES_1_NUM,
        type:     'Resolution',
        title:    'A Resolution Amending Resolution No. RES-2025-003, Expanding Municipal Support for the Coconut Farmers Industry Development Plan to Include All 36 Barangays of Bongabong',
        title_tl: 'Resolusyong Binabago ang RES-2025-003, Pinalawak ang Suporta sa Programang Niyog upang Saklawin ang Lahat ng 36 Barangay ng Bongabong',
        proponentId:   councilors[3]._id,
        coAuthors:     [councilors[0]._id, councilors[4]._id, councilors[7]._id],
        termId:        currentTerm._id,
        seriesYear:    2026,
        isDraft:       false,
        committee:     COMMITTEES[4],
        committeeAssignment: {
          committee:  COMMITTEES[4],
          assignedBy: S,
          assignedAt: new Date('2026-06-10'),
          notes:      'Expedited review for agricultural coverage expansion.'
        },
        sectorTag:      'Agriculture',
        motionBy:       councilors[3]._id,
        secondedBy:     [councilors[0]._id, councilors[1]._id, councilors[2]._id, councilors[4]._id],
        adoptionResult: 'Unanimously Approved',
        adoptionDate:   new Date('2026-07-10'),
        distribution: [
          'Office of the Municipal Mayor, Bongabong',
          'Philippine Coconut Authority, Region IV-B',
          'Department of Agriculture, MIMAROPA',
          'All 36 Barangay Captains, Municipality of Bongabong',
          'Sangguniang Panlalawigan of Oriental Mindoro',
        ],
        amendsOrdinanceId: oldRes1._id,
        explanatoryNote:   'WHEREAS, Resolution No. RES-2025-003 extended municipal endorsement for the Coconut Farmers Industry Development Plan but did not explicitly enumerate all 36 barangays as beneficiary communities; WHEREAS, the Philippine Coconut Authority has requested a more comprehensive endorsement;',
        enactingClause:    'NOW, THEREFORE, on motion of Hon. Jeremy Enriquez, seconded by Hon. Richard Candelario, Hon. Jose Rodney Liwanag, Hon. Jeffrey Alea, and Hon. Rene Villanueva, BE IT RESOLVED:',
        provisions:        '<p><strong>RESOLVED,</strong> that Resolution No. RES-2025-003 is hereby amended to explicitly extend the municipal endorsement of the Coconut Farmers Industry Development Plan to all thirty-six (36) registered barangay coconut farmer associations in Bongabong.</p><p><strong>RESOLVED FURTHER,</strong> that the Municipal Agriculturist is hereby directed to compile and submit a comprehensive list of all eligible farmer beneficiaries to the Philippine Coconut Authority within thirty (30) days.</p><p><strong>RESOLVED FINALLY,</strong> that certified copies of this Resolution be transmitted to all agencies and barangay captains listed in the distribution list.</p>',
        status:            'Approved',
        isLocked:          true,
        plainLanguageSummary:    'Amends the 2025 coconut resolution to explicitly include all 36 barangays and directs the Municipal Agriculturist to submit a comprehensive beneficiary list.',
        plainLanguageSummary_tl: 'Pinalawak ang dating resolusyon para isama ang lahat ng 36 barangay at inuutos ang Municipal Agriculturist na magsumite ng listahan ng mga benepisyaryo.',
        timeline: [
          { status: 'First Reading',        notes: 'Introduced citing PCA request for expanded endorsement.',  updatedBy: S, date: new Date('2026-06-05') },
          { status: 'Committee Assignment', notes: 'Referred to Committee on Agriculture.',                    updatedBy: S, date: new Date('2026-06-10') },
          { status: 'Third Reading',        notes: 'Adopted unanimously on nominal roll call.',                 updatedBy: S, date: new Date('2026-07-10') },
          { status: "For Mayor's Signature", notes: 'Transmitted to Municipal Mayor.',                         updatedBy: S, date: new Date('2026-07-14') },
          { status: 'Approved',             notes: 'Signed and certified copies dispatched.',                  updatedBy: S, date: new Date('2026-07-18') },
        ]
      });

      await Ordinance.findByIdAndUpdate(oldRes1._id, { amendedByOrdinanceId: newRes1._id });
      console.log('[Amendment Seed] Linked Res pair 1: ' + OLD_RES_1_NUM + ' -> ' + NEW_RES_1_NUM);
    }
  }

  // RESOLUTION AMENDMENT PAIR 2
  // Old: RES-2025-007  Youth Scholarship Resolution (original)
  // New: RES-2026-012  Amended (expanded scholarship slots & increased allowance)
  const OLD_RES_2_NUM = await safeNumber('RES-2025-007');
  if (OLD_RES_2_NUM) {
    const oldRes2 = await Ordinance.create({
      number:   OLD_RES_2_NUM,
      type:     'Resolution',
      title:    'A Resolution Endorsing the Provision of Municipal Scholarship Grants to Ten (10) Deserving Students per Semester in Bongabong (Original)',
      title_tl: 'Resolusyong Nag-eendorso ng Iskolarship para sa Sampung Estudyante bawat Semester sa Bongabong (Orihinal)',
      proponentId:   councilors[4]._id,
      coAuthors:     [councilors[6]._id],
      termId:        currentTerm._id,
      seriesYear:    2025,
      isDraft:       false,
      committee:     COMMITTEES[1],
      committeeAssignment: {
        committee:  COMMITTEES[1],
        assignedBy: S,
        assignedAt: new Date('2025-07-15'),
        notes:      'Referred to Committee on Education.'
      },
      sectorTag:      'Education',
      motionBy:       councilors[4]._id,
      secondedBy:     [councilors[6]._id, councilors[2]._id],
      adoptionResult: 'Approved (9-1)',
      adoptionDate:   new Date('2025-08-05'),
      distribution: [
        'Office of the Municipal Mayor, Bongabong',
        'CHED Regional Office IV-B',
      ],
      explanatoryNote: 'WHEREAS, access to tertiary education remains a challenge for students from low-income families in Bongabong; WHEREAS, providing a modest number of municipal scholarship slots addresses the most urgent cases;',
      enactingClause:  'NOW, THEREFORE, on motion of Hon. Mira Villanueva, seconded by Hon. Arnel Candelario and Hon. Mary Grace Atienza, BE IT RESOLVED:',
      provisions:      '<p><strong>RESOLVED,</strong> that the Sangguniang Bayan of Bongabong endorses the creation of ten (10) municipal scholarship slots per semester valued at Php 5,000 each for qualifying students.</p><p><strong>RESOLVED FURTHER,</strong> that the Office of the Mayor coordinate with CHED for administration of the scholarship program.</p>',
      status:          'Approved',
      isLocked:        true,
      plainLanguageSummary:    'Original 2025 resolution endorsing 10 municipal scholarship slots per semester. Expanded in 2026 to 25 slots with increased allowances.',
      plainLanguageSummary_tl: 'Ang orihinal na resolusyon sa 10 iskolarship bawat semester. Pinalawak noong 2026 sa 25 iskolarship at mas malaking allowance.',
      timeline: [
        { status: 'First Reading',        notes: 'Introduced.',                      updatedBy: S, date: new Date('2025-07-08') },
        { status: 'Committee Assignment', notes: 'Referred to Education Committee.', updatedBy: S, date: new Date('2025-07-15') },
        { status: 'Third Reading',        notes: 'Approved 9-1 on roll call.',        updatedBy: S, date: new Date('2025-08-05') },
        { status: 'Approved',             notes: 'Sealed and dispatched.',            updatedBy: S, date: new Date('2025-08-10') },
      ]
    });

    const NEW_RES_2_NUM = await safeNumber('RES-2026-012');
    if (NEW_RES_2_NUM) {
      const newRes2 = await Ordinance.create({
        number:   NEW_RES_2_NUM,
        type:     'Resolution',
        title:    'A Resolution Amending Resolution No. RES-2025-007, Increasing Municipal Scholarship Slots to Twenty-Five (25) and Raising the Semestral Grant to Php 8,000 per Scholar',
        title_tl: 'Resolusyong Binabago ang RES-2025-007, Itinaas ang Bilang ng Iskolarship sa 25 at ang Halaga sa Php 8,000 bawat Scholar',
        proponentId:   councilors[4]._id,
        coAuthors:     [councilors[6]._id, councilors[1]._id, councilors[3]._id],
        termId:        currentTerm._id,
        seriesYear:    2026,
        isDraft:       false,
        committee:     COMMITTEES[1],
        committeeAssignment: {
          committee:  COMMITTEES[1],
          assignedBy: S,
          assignedAt: new Date('2026-08-12'),
          notes:      'Referred to Committee on Education for expanded program review.'
        },
        sectorTag:      'Education',
        motionBy:       councilors[4]._id,
        secondedBy:     [councilors[6]._id, councilors[1]._id, councilors[2]._id, councilors[5]._id],
        adoptionResult: 'Unanimously Approved',
        adoptionDate:   new Date('2026-09-05'),
        distribution: [
          'Office of the Municipal Mayor, Bongabong',
          'CHED Regional Office IV-B',
          'State Universities and Colleges within Oriental Mindoro',
          'Municipal Social Welfare and Development Office, Bongabong',
        ],
        amendsOrdinanceId: oldRes2._id,
        explanatoryNote:   'WHEREAS, Resolution No. RES-2025-007 established ten (10) municipal scholarship slots, which have proven insufficient to address the growing number of qualified applicants; WHEREAS, the number of qualified scholarship applicants has increased by 150% since the program inception in 2025;',
        enactingClause:    'NOW, THEREFORE, on motion of Hon. Mira Villanueva, seconded by Hon. Arnel Candelario, Hon. Jose Rodney Liwanag, Hon. Mary Grace Atienza, and Hon. Rommel Magalona, BE IT RESOLVED:',
        provisions:        '<p><strong>RESOLVED,</strong> that Resolution No. RES-2025-007 is hereby amended to increase the number of municipal scholarship slots from ten (10) to twenty-five (25) per semester.</p><p><strong>RESOLVED FURTHER,</strong> that the semestral scholarship grant is hereby increased from Php 5,000 to Php 8,000 per scholar.</p><p><strong>RESOLVED ADDITIONALLY,</strong> that the MSWDO is directed to conduct a needs-based and merit-based screening within sixty (60) days to identify additional scholarship beneficiaries from all thirty-six (36) barangays.</p><p><strong>RESOLVED FINALLY,</strong> that certified copies of this Resolution be transmitted to all agencies listed in the distribution list.</p>',
        status:            'Approved',
        isLocked:          true,
        plainLanguageSummary:    'Amends the 2025 scholarship resolution by raising slots from 10 to 25 and increasing the semestral grant from Php 5,000 to Php 8,000 per scholar.',
        plainLanguageSummary_tl: 'Pinalaki ang iskolarship mula 10 hanggang 25 bawat semester, at itinaas ang grant mula Php 5,000 hanggang Php 8,000.',
        timeline: [
          { status: 'First Reading',        notes: 'Introduced citing oversubscription of scholarship program.', updatedBy: S, date: new Date('2026-08-05') },
          { status: 'Committee Assignment', notes: 'Referred to Committee on Education.',                        updatedBy: S, date: new Date('2026-08-12') },
          { status: 'Third Reading',        notes: 'Adopted unanimously on nominal vote.',                       updatedBy: S, date: new Date('2026-09-05') },
          { status: "For Mayor's Signature", notes: 'Transmitted to Municipal Mayor.',                          updatedBy: S, date: new Date('2026-09-08') },
          { status: 'Approved',             notes: 'Signed and copies dispatched.',                              updatedBy: S, date: new Date('2026-09-12') },
        ]
      });

      await Ordinance.findByIdAndUpdate(oldRes2._id, { amendedByOrdinanceId: newRes2._id });
      console.log('[Amendment Seed] Linked Res pair 2: ' + OLD_RES_2_NUM + ' -> ' + NEW_RES_2_NUM);
    }
  }

  // RESOLUTION AMENDMENT PAIR 3
  // Old: RES-2025-010  BPAT Commendation Resolution (original)
  // New: RES-2026-013  Amended Commendation (includes more awardees, established criteria)
  const OLD_RES_3_NUM = await safeNumber('RES-2025-010');
  if (OLD_RES_3_NUM) {
    const councilor9 = councilors[9] || councilors[8]; // fallback if fewer members
    const oldRes3 = await Ordinance.create({
      number:   OLD_RES_3_NUM,
      type:     'Resolution',
      title:    'A Resolution Commending the Top Performing Barangay Peacekeeping Action Teams (BPATs) of Bongabong for Calendar Year 2024 (Original)',
      title_tl: 'Resolusyong Nagbibigay-Pugay sa mga Pinakamahusay na BPAT ng Bongabong para sa Taong 2024 (Orihinal)',
      proponentId:   councilors[8]._id,
      coAuthors:     [councilors[1]._id],
      termId:        currentTerm._id,
      seriesYear:    2025,
      isDraft:       false,
      committee:     COMMITTEES[9],
      committeeAssignment: {
        committee:  COMMITTEES[9],
        assignedBy: S,
        assignedAt: new Date('2025-01-20'),
        notes:      'Referred to Committee on Barangay Affairs.'
      },
      sectorTag:      'Barangay Affairs',
      motionBy:       councilors[8]._id,
      secondedBy:     [councilors[1]._id, councilors[5]._id],
      adoptionResult: 'Unanimously Approved',
      adoptionDate:   new Date('2025-02-10'),
      distribution: [
        'Barangay Poblacion BPAT',
        'Barangay Aplaya BPAT',
        'PNP Bongabong Municipal Station',
        'DILG Bongabong',
      ],
      explanatoryNote: 'WHEREAS, Barangay Peacekeeping Action Teams (BPATs) serve as a frontline community safety force; WHEREAS, recognition of top-performing BPATs serves as an incentive for continued excellence and service;',
      enactingClause:  'NOW, THEREFORE, on motion of Hon. Alvin Ramos, seconded by Hon. Jose Rodney Liwanag and Hon. Rommel Magalona, BE IT RESOLVED:',
      provisions:      '<p><strong>RESOLVED,</strong> that the Sangguniang Bayan of Bongabong commends and recognizes Barangay Poblacion and Barangay Aplaya BPATs as the Top Performing BPATs of Bongabong for Calendar Year 2024.</p><p><strong>RESOLVED FURTHER,</strong> that this recognition be duly furnished to DILG and the PNP municipal station.</p>',
      status:          'Approved',
      isLocked:        true,
      plainLanguageSummary:    'Original 2025 resolution commending 2 top BPATs for CY 2024. Amended in 2026 to include additional recognized teams and updated evaluation criteria.',
      plainLanguageSummary_tl: 'Ang orihinal na resolusyon ng pagkilala sa 2 BPAT para sa 2024. Binago noong 2026 para isama ang mas maraming koponan.',
      timeline: [
        { status: 'First Reading',        notes: 'Introduced.',                        updatedBy: S, date: new Date('2025-01-15') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Barangay.', updatedBy: S, date: new Date('2025-01-20') },
        { status: 'Third Reading',        notes: 'Adopted unanimously.',               updatedBy: S, date: new Date('2025-02-10') },
        { status: 'Approved',             notes: 'Dispatched to recipients.',          updatedBy: S, date: new Date('2025-02-15') },
      ]
    });

    const NEW_RES_3_NUM = await safeNumber('RES-2026-013');
    if (NEW_RES_3_NUM) {
      const newRes3 = await Ordinance.create({
        number:   NEW_RES_3_NUM,
        type:     'Resolution',
        title:    'A Resolution Amending Resolution No. RES-2025-010, Expanding the Commendation to Include Five (5) Outstanding Barangay Peacekeeping Action Teams and Establishing Annual BPAT Excellence Award Criteria',
        title_tl: 'Resolusyong Binabago ang RES-2025-010, Pinalawak ang Pagkilala sa Lima (5) Natatanging BPAT at Nagtatatag ng Taunang Pamantayan ng Gawad',
        proponentId:   councilors[8]._id,
        coAuthors:     [councilors[1]._id, councilors[5]._id, councilor9._id],
        termId:        currentTerm._id,
        seriesYear:    2026,
        isDraft:       false,
        committee:     COMMITTEES[9],
        committeeAssignment: {
          committee:  COMMITTEES[9],
          assignedBy: S,
          assignedAt: new Date('2026-01-22'),
          notes:      'Referred to Committee on Barangay Affairs for expanded criteria formulation.'
        },
        sectorTag:      'Barangay Affairs',
        motionBy:       councilors[8]._id,
        secondedBy:     [councilors[1]._id, councilors[5]._id, councilors[6]._id, councilor9._id],
        adoptionResult: 'Unanimously Approved',
        adoptionDate:   new Date('2026-02-15'),
        distribution: [
          'Barangay Poblacion BPAT',
          'Barangay Aplaya BPAT',
          'Barangay San Jose BPAT',
          'Barangay Labasan BPAT',
          'Barangay Lisap BPAT',
          'PNP Bongabong Municipal Station',
          'DILG Bongabong Municipal Office',
          'Office of the Municipal Mayor, Bongabong',
        ],
        amendsOrdinanceId: oldRes3._id,
        explanatoryNote:   'WHEREAS, Resolution No. RES-2025-010 limited BPAT commendation to only two (2) barangays, leaving out equally deserving teams; WHEREAS, the DILG Bongabong Municipal Field Office has recommended establishing a standardized evaluation rubric for BPAT excellence;',
        enactingClause:    'NOW, THEREFORE, on motion of Hon. Alvin Ramos, seconded by Hon. Jose Rodney Liwanag, Hon. Rommel Magalona, Hon. Jeffrey Alea, and Hon. Rene Villanueva, BE IT RESOLVED:',
        provisions:        '<p><strong>RESOLVED,</strong> that Resolution No. RES-2025-010 is hereby amended to expand the annual BPAT Excellence Commendation from two (2) to five (5) outstanding Barangay Peacekeeping Action Teams per year.</p><p><strong>RESOLVED FURTHER,</strong> that the following BPATs are hereby commended as the Top 5 Performing BPATs of Bongabong for Calendar Year 2025: (1) Barangay Poblacion, (2) Barangay Aplaya, (3) Barangay San Jose, (4) Barangay Labasan, and (5) Barangay Lisap.</p><p><strong>RESOLVED ADDITIONALLY,</strong> that the following criteria are hereby established for the Annual BPAT Excellence Award: (a) crime prevention index; (b) response time to incidents; (c) community engagement activities; and (d) DILG compliance rating.</p><p><strong>RESOLVED FINALLY,</strong> that certified copies of this Resolution be transmitted to all agencies and recognized BPATs in the distribution list.</p>',
        status:            'Approved',
        isLocked:          true,
        plainLanguageSummary:    'Amends the 2025 BPAT commendation resolution to recognize 5 BPATs (up from 2) and establishes formal annual evaluation criteria for future awards.',
        plainLanguageSummary_tl: 'Pinalawak ang pagkilala sa 5 BPAT at nagtatag ng opisyal na pamantayan para sa taunang pagsusuri.',
        timeline: [
          { status: 'First Reading',        notes: 'Introduced citing need for expanded recognition.',            updatedBy: S, date: new Date('2026-01-15') },
          { status: 'Committee Assignment', notes: 'Referred to Committee on Barangay Affairs.',                  updatedBy: S, date: new Date('2026-01-22') },
          { status: 'Third Reading',        notes: 'Adopted unanimously.',                                        updatedBy: S, date: new Date('2026-02-15') },
          { status: "For Mayor's Signature", notes: 'Transmitted to Mayor for formal countersignature.',          updatedBy: S, date: new Date('2026-02-18') },
          { status: 'Approved',             notes: 'Certified and dispatched to all listed recipients.',          updatedBy: S, date: new Date('2026-02-22') },
        ]
      });

      await Ordinance.findByIdAndUpdate(oldRes3._id, { amendedByOrdinanceId: newRes3._id });
      console.log('[Amendment Seed] Linked Res pair 3: ' + OLD_RES_3_NUM + ' -> ' + NEW_RES_3_NUM);
    }
  }

  console.log('[Amendment Seed] All amendment pairs created successfully!');
  console.log('[Amendment Seed] Summary:');
  console.log('  Ordinance pairs: 2025-008 -> 2026-011 | 2025-004 -> 2026-012 | 2025-006 -> 2026-013');
  console.log('  Resolution pairs: RES-2025-003 -> RES-2026-011 | RES-2025-007 -> RES-2026-012 | RES-2025-010 -> RES-2026-013');
  await mongoose.disconnect();
  console.log('[Amendment Seed] Done. Connection closed.');
}

seedAmendedRecords().catch(err => {
  console.error('[Amendment Seed] FATAL:', err);
  process.exit(1);
});
