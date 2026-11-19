/**
 * Comprehensive Database Alignment & Reseed Script for iBOSys
 * Reseeds:
 * - 10 Ordinances (with realistic legislative pipeline stages from Draft to Approved,
 *   isDraft flags, seriesYear, coAuthors, committee assignments)
 * - 10 Resolutions (with 5-stage pipeline, recitals, motionBy, secondedBy, adoption results, distribution)
 * - 10 Sessions (with June 15, 2026 reference alignment: sessionNumber, sessionType, legislativeBody,
 *   venue, municipality, orderOfBusiness, privilegeHour, structured attendance)
 * - 10 Consultation Feedback records (linked to ordinances in consultation)
 *
 * Preserves:
 * - 2025-2028 Term
 * - 11 SB Members
 * - 10 Standing Committees
 * - Users
 */
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { assertFixtureSeedingAllowed } = require('../utils/seedSafety');

const User = require('../models/User');
const Ordinance = require('../models/Ordinance');
const Session = require('../models/Session');
const ConsultationFeedback = require('../models/ConsultationFeedback');
const SBMember = require('../models/SBMember');
const Term = require('../models/Term');

const COMMITTEES_LIST = [
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

const BONGABONG_BARANGAYS = [
  'Poblacion', 'Aplaya', 'Labasan', 'Lisap', 'Masaguisi', 
  'San Jose', 'Formon', 'Carmundo', 'Bagong Bayan I', 'Mina de Oro',
  'Anilao', 'Batangan', 'Bukal', 'Camantigue', 'Cawayan', 'Dayhagan',
  'Hagan', 'Hagupit', 'Ipil', 'Kaligtasan', 'Labonan', 'Libertad',
  'Luna', 'Malitbog', 'Mapang', 'Morente', 'Ogbot', 'Orconuma',
  'Pulosahi', 'Sagana', 'San Isidro', 'San Juan', 'Sigange', 'Sta. Cruz', 'Tawas'
];

async function seedAlignedData() {
  assertFixtureSeedingAllowed();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required to seed aligned data.');
  console.log('[Seed] Connecting to the configured MongoDB database.');
  await mongoose.connect(uri);

  const secretaryUser = await User.findOne({ role: 'Secretary' }) || await User.findOne();
  const currentTerm = await Term.findOne({ startYear: 2025, endYear: 2028 }) || await Term.findOne().sort({ startYear: -1 });
  const sbMembers = await SBMember.find().sort({ order: 1 });

  if (!secretaryUser || !currentTerm || sbMembers.length === 0) {
    throw new Error('Required base data (User, Term, SBMember) missing. Ensure seed is initialized.');
  }

  console.log(`[Seed] Found Secretary: ${secretaryUser._id}, Current Term: ${currentTerm.label}, Members: ${sbMembers.length}`);

  // 1. DELETE EXISTING UNALIGNED DATA
  console.log('[Seed] Purging previous Ordinance, Session, and ConsultationFeedback records...');
  await Ordinance.deleteMany({});
  await Session.deleteMany({});
  await ConsultationFeedback.deleteMany({});

  // 2. CREATE 10 FULLY ALIGNED ORDINANCES
  console.log('[Seed] Generating 10 aligned Ordinances...');
  const councilors = sbMembers.filter(m => m.position !== 'Vice Mayor');
  
  const ordinancesSeed = [
    {
      number: '2026-001',
      type: 'Ordinance',
      title: 'An Ordinance Regulating the Use of Single-Use Plastics and Polystyrene in All Commercial Establishments within the Municipality of Bongabong',
      title_tl: 'Kautusang Nagre-regulate sa Paggamit ng Single-Use Plastics at Polystyrene sa Lahat ng Estabkisyimento sa Bayan ng Bongabong',
      proponentId: councilors[0]._id,
      coAuthors: [councilors[1]._id, councilors[2]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[3], // Environment
      committeeAssignment: {
        committee: COMMITTEES_LIST[3],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-01-15'),
        notes: 'Referred to Committee on Environment for comprehensive vendor hearings.'
      },
      sectorTag: 'Environment',
      explanatoryNote: 'Due to severe plastic pollution clogging municipal drainage canals and marine coastal habitats along Aplaya and Labasan, urgent reduction of non-biodegradable single-use plastics is necessary.',
      enactingClause: 'BE IT ORDAINED by the Sangguniang Bayan of Bongabong, Oriental Mindoro in session assembled:',
      provisions: '<p><strong>Section 1. Title.</strong> This Ordinance shall be known as the Bongabong Plastic Waste Minimization Ordinance of 2026.</p><p><strong>Section 2. Scope.</strong> All supermarkets, public market stalls, sari-sari stores, and dining establishments in all 36 barangays shall comply.</p><p><strong>Section 3. Prohibited Acts.</strong> Distribution of single-use thin plastic bags (sando bags) and polystyrene food containers for prepared food items.</p>',
      penaltyClause: 'First Offense: Php 1,000 fine; Second Offense: Php 2,500 fine; Third Offense: Php 5,000 fine and temporary suspension of business permit.',
      effectivityDate: new Date('2026-07-01'),
      status: 'Approved',
      isLocked: true,
      plainLanguageSummary: 'Bans single-use plastic bags and styrofoam food boxes in market stalls and stores across Bongabong to protect municipal waterways.',
      plainLanguageSummary_tl: 'Ipinagbabawal ang mga plastik na supot at styrofoam sa mga tindahan upang mapanatiling malinis ang mga kanal at dagat.',
      timeline: [
        { status: 'First Reading', notes: 'Formally introduced in plenary session.', updatedBy: secretaryUser._id, date: new Date('2026-01-12') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Environment.', updatedBy: secretaryUser._id, date: new Date('2026-01-15') },
        { status: 'Committee Hearing', notes: 'Joint hearing conducted with Market Vendors Association.', updatedBy: secretaryUser._id, date: new Date('2026-01-28') },
        { status: 'Public Consultation', notes: 'Citizen reviews gathered via iBOSys portal.', updatedBy: secretaryUser._id, date: new Date('2026-02-10') },
        { status: 'Second Reading', notes: 'Approved with floor amendments on packaging transition window.', updatedBy: secretaryUser._id, date: new Date('2026-02-25') },
        { status: 'Third Reading', notes: 'Passed unanimously on nominal voting.', updatedBy: secretaryUser._id, date: new Date('2026-03-10') },
        { status: "For Mayor's Signature", notes: 'Transmitted to Municipal Mayor.', updatedBy: secretaryUser._id, date: new Date('2026-03-18') },
        { status: 'For SP Review', notes: 'Transmitted to Sangguniang Panlalawigan of Oriental Mindoro.', updatedBy: secretaryUser._id, date: new Date('2026-03-24') },
        { status: 'Approved', notes: 'Certified approved and enacted into municipal law.', updatedBy: secretaryUser._id, date: new Date('2026-04-05') }
      ]
    },
    {
      number: '2026-002',
      type: 'Ordinance',
      title: 'An Ordinance Prescribing Municipal Curfew Hours for Minors from 10:00 PM to 4:00 AM to Promote Child Safety and Welfare',
      title_tl: 'Kautusang Nagtatakda ng Curfew para sa mga Menor de Edad mula 10:00 PM hanggang 4:00 AM para sa Kaligtasan ng Kabataan',
      proponentId: councilors[1]._id,
      coAuthors: [councilors[5]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[5], // Peace and Order
      committeeAssignment: {
        committee: COMMITTEES_LIST[5],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-03-08'),
        notes: 'Referred to Committee on Peace & Order and Public Safety.'
      },
      sectorTag: 'Peace and Order',
      explanatoryNote: 'A protective measure ensuring children and youth are shielded from street hazards, night-time exploitation, and gang violence across all 36 barangays.',
      enactingClause: 'BE IT ORDAINED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Curfew Hours.</strong> Minors aged below 18 years shall be prohibited from lingering in streets and public parks between 10:00 PM and 4:00 AM.</p><p><strong>Section 2. Exceptions.</strong> Minors accompanied by legal parents/guardians, emergency medical errands, or official school/employment activities with verified identification.</p>',
      penaltyClause: 'First Offense: Reprimand and parental counseling; Second Offense: 4 hours community service; Third Offense: Php 1,000 fine for parents/guardians.',
      effectivityDate: new Date('2026-08-01'),
      status: 'Public Consultation',
      isLocked: false,
      plainLanguageSummary: 'Minors under 18 must be home between 10 PM and 4 AM unless accompanied by parents or carrying verified school or work authorization.',
      plainLanguageSummary_tl: 'Bawal magpagala-gala sa labas ang mga menor de edad mula 10 ng gabi hanggang 4 ng umaga nang walang kasamang magulang.',
      timeline: [
        { status: 'First Reading', notes: 'Proposed during 9th Regular Session.', updatedBy: secretaryUser._id, date: new Date('2026-03-02') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Tourism, Transportation, Peace and Order and Beautification.', updatedBy: secretaryUser._id, date: new Date('2026-03-08') },
        { status: 'Committee Hearing', notes: 'Conducted hearing with PNP Bongabong and MSWDO.', updatedBy: secretaryUser._id, date: new Date('2026-03-18') },
        { status: 'Public Consultation', notes: 'Citizen comment and voting period opened on iBOSys portal.', updatedBy: secretaryUser._id, date: new Date('2026-03-20') }
      ]
    },
    {
      number: '2026-003',
      type: 'Ordinance',
      title: 'An Ordinance Establishing Barangay Health and Emergency Care Desks with Trained Health Personnel Across All Barangays',
      title_tl: 'Kautusang Nagtatatag ng Health and Emergency Care Desk sa Bawat Barangay ng Bongabong',
      proponentId: councilors[2]._id,
      coAuthors: [councilors[4]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[2], // Health
      committeeAssignment: {
        committee: COMMITTEES_LIST[2],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-04-10'),
        notes: 'Assigned to Committee on Health and Civil Society Organizations.'
      },
      sectorTag: 'Health',
      explanatoryNote: 'Guarantees that rural and coastal families have 24/7 access to primary emergency triage, blood pressure checks, and emergency first-responder kits.',
      enactingClause: 'BE IT ORDAINED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Establishment.</strong> Every barangay hall shall maintain a designated primary health triage desk with first-aid kits and emergency medicine.</p><p><strong>Section 2. Personnel.</strong> Accredited Barangay Health Workers (BHWs) shall be on rotation duty.</p>',
      penaltyClause: 'Administrative sanctions under DILG regulations for barangay councils failing to allocate designated clinic space.',
      status: 'Public Consultation',
      isLocked: false,
      plainLanguageSummary: 'Guarantees that every barangay hall in Bongabong has an operational health and emergency desk with free basic medicine.',
      plainLanguageSummary_tl: 'Sinisiguro na bawat barangay hall ay may health desk na may libreng gamot at nars para sa agarang tulong medikal.',
      timeline: [
        { status: 'First Reading', notes: 'First reading introduced.', updatedBy: secretaryUser._id, date: new Date('2026-04-05') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Health.', updatedBy: secretaryUser._id, date: new Date('2026-04-10') },
        { status: 'Committee Hearing', notes: 'Deliberation with Municipal Health Officer.', updatedBy: secretaryUser._id, date: new Date('2026-04-18') },
        { status: 'Public Consultation', notes: 'Public feedback open for all barangays.', updatedBy: secretaryUser._id, date: new Date('2026-04-25') }
      ]
    },
    {
      number: '2026-004',
      type: 'Ordinance',
      title: 'An Ordinance Institutionalizing Municipal Organic Agriculture and Farm-to-Market Transport Support in Bongabong',
      title_tl: 'Kautusang Nagtataguyod ng Organikong Pagsasaka at Suporta sa Transportasyon ng Ani sa Bongabong',
      proponentId: councilors[3]._id,
      coAuthors: [councilors[0]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[4], // Agriculture
      committeeAssignment: {
        committee: COMMITTEES_LIST[4],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-04-15'),
        notes: 'Referred to Committee on Agriculture for farmer federation inputs.'
      },
      sectorTag: 'Agriculture',
      explanatoryNote: 'Providing subsidized transport trucks and bio-fertilizer subsidies for smallholder farmers in Lisap, Morente, and Carmundo.',
      enactingClause: 'BE IT ENACTED by the Sangguniang Bayan of the Municipality of Bongabong:',
      provisions: '<p><strong>Section 1. Municipal Farm Transport.</strong> Municipal utility flatbeds scheduled weekly to haul produce from upland barangays directly to market.</p>',
      status: 'Committee Hearing',
      isLocked: false,
      plainLanguageSummary: 'Provides free organic seeds, fertilizer subsidies, and municipal trucks to transport farmers crops from farms to market.',
      plainLanguageSummary_tl: 'Nagkakaloob ng libreng binhi at transportasyon para sa ani ng mga magsasaka sa Bongabong.',
      timeline: [
        { status: 'First Reading', notes: 'Introduced on plenary floor.', updatedBy: secretaryUser._id, date: new Date('2026-04-12') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Agriculture.', updatedBy: secretaryUser._id, date: new Date('2026-04-15') },
        { status: 'Committee Hearing', notes: 'Hearing held with agrarian reform beneficiaries.', updatedBy: secretaryUser._id, date: new Date('2026-04-29') }
      ]
    },
    {
      number: '2026-005',
      type: 'Ordinance',
      title: 'An Ordinance Providing Free Tertiary Education Scholarship and Allowance to Deserving Students from Marginalized Families',
      title_tl: 'Kautusang Nagbibigay ng Iskolarship at Buwanang Allowance para sa mga Estudyante sa Kolehiyo',
      proponentId: councilors[4]._id,
      coAuthors: [councilors[6]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[1], // Education
      committeeAssignment: {
        committee: COMMITTEES_LIST[1],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-02-20'),
        notes: 'Assigned to Committee on Education and House Rules.'
      },
      sectorTag: 'Education',
      explanatoryNote: 'Empowering underprivileged youth by guaranteeing semester tuition assistance and a monthly book and transportation allowance.',
      enactingClause: 'BE IT ENACTED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Educational Grant.</strong> Php 5,000 semester grant and Php 1,500 monthly book stipend for low-income college youth.</p>',
      status: 'Second Reading',
      isLocked: false,
      plainLanguageSummary: 'Grants financial aid and monthly stipend to qualified college students from low-income families in Bongabong.',
      plainLanguageSummary_tl: 'Tulong pinansyal at buwanang allowance para sa mga estudyanteng kapos-palad sa kolehiyo.',
      timeline: [
        { status: 'First Reading', notes: 'First reading approved.', updatedBy: secretaryUser._id, date: new Date('2026-02-15') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Education.', updatedBy: secretaryUser._id, date: new Date('2026-02-20') },
        { status: 'Committee Hearing', notes: 'Joint hearing with Student Leaders Council.', updatedBy: secretaryUser._id, date: new Date('2026-03-01') },
        { status: 'Public Consultation', notes: 'Online survey completed on public portal.', updatedBy: secretaryUser._id, date: new Date('2026-03-12') },
        { status: 'Second Reading', notes: 'Second reading debate approved.', updatedBy: secretaryUser._id, date: new Date('2026-03-22') }
      ]
    },
    {
      number: '2026-006',
      type: 'Ordinance',
      title: 'An Ordinance Mandating Free Annual Medical and Dental Checkups for All Senior Citizens and Persons with Disabilities (PWDs)',
      title_tl: 'Kautusang Nag-aatas ng Libreng Taunang Checkup Medikal at Dental para sa mga Senior Citizen at PWD',
      proponentId: councilors[2]._id,
      coAuthors: [councilors[1]._id, councilors[3]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[6], // Social Welfare
      committeeAssignment: {
        committee: COMMITTEES_LIST[6],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-01-26'),
        notes: 'Assigned to Committee on Social Welfare and Community Development.'
      },
      sectorTag: 'Social Welfare',
      explanatoryNote: 'Ensuring comprehensive medical, laboratory, and dental wellness coverage for the most vulnerable sectors of the municipality.',
      enactingClause: 'BE IT ORDAINED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Entitlement.</strong> All registered senior citizens and PWDs entitled to comprehensive diagnostic testing annually.</p>',
      status: 'Third Reading',
      isLocked: false,
      plainLanguageSummary: 'Senior citizens and PWDs in Bongabong receive free annual laboratory and dental checkups at the municipal health center.',
      plainLanguageSummary_tl: 'Libreng checkup at gamot para sa lahat ng nakatatanda at may kapansanan sa bayan.',
      timeline: [
        { status: 'First Reading', notes: 'Introduced by Hon. Atienza.', updatedBy: secretaryUser._id, date: new Date('2026-01-20') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Social Welfare.', updatedBy: secretaryUser._id, date: new Date('2026-01-26') },
        { status: 'Committee Hearing', notes: 'Deliberation with OSCA and PWD Office.', updatedBy: secretaryUser._id, date: new Date('2026-02-15') },
        { status: 'Public Consultation', notes: 'Consultations conducted across clusters.', updatedBy: secretaryUser._id, date: new Date('2026-03-01') },
        { status: 'Second Reading', notes: 'Approved on second reading.', updatedBy: secretaryUser._id, date: new Date('2026-03-18') },
        { status: 'Third Reading', notes: 'Enrolled for final roll-call vote.', updatedBy: secretaryUser._id, date: new Date('2026-04-02') }
      ]
    },
    {
      number: '2026-007',
      type: 'Ordinance',
      title: 'An Ordinance Upgrading Municipal Drainage Infrastructure and Anti-Clogging Systems Along the Poblacion-Aplaya Coastal Strip',
      title_tl: 'Kautusang Nagpapatupad ng Pagsasaayos ng Drainage at Kanal sa Poblacion at Aplaya',
      proponentId: councilors[0]._id,
      coAuthors: [councilors[7]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[0], // Infrastructure
      committeeAssignment: {
        committee: COMMITTEES_LIST[0],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-01-22'),
        notes: 'Assigned to Committee on Appropriation and Infrastructure.'
      },
      sectorTag: 'Infrastructure',
      explanatoryNote: 'Mitigating perennial urban flash floods and seawater backflows during monsoon rains and storm surges.',
      enactingClause: 'BE IT ENACTED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Standard.</strong> Box culvert expansion and hydraulic trash traps installation along main seawall outfalls.</p>',
      status: "For Mayor's Signature",
      isLocked: false,
      plainLanguageSummary: 'Reconstructs storm drainage canals in town center and coastal areas to prevent flooding during typhoons.',
      plainLanguageSummary_tl: 'Pagpapalapad ng mga kanal sa sentro ng bayan para hindi bumaha kapag may bagyo.',
      timeline: [
        { status: 'First Reading', notes: 'First reading approved.', updatedBy: secretaryUser._id, date: new Date('2026-01-18') },
        { status: 'Committee Assignment', notes: 'Assigned to Committee on Infrastructure.', updatedBy: secretaryUser._id, date: new Date('2026-01-22') },
        { status: 'Committee Hearing', notes: 'Engineering office consultation.', updatedBy: secretaryUser._id, date: new Date('2026-02-10') },
        { status: 'Public Consultation', notes: 'Public consultation completed.', updatedBy: secretaryUser._id, date: new Date('2026-02-22') },
        { status: 'Second Reading', notes: 'Approved on second reading.', updatedBy: secretaryUser._id, date: new Date('2026-03-01') },
        { status: 'Third Reading', notes: 'Passed unanimously on third reading.', updatedBy: secretaryUser._id, date: new Date('2026-03-20') },
        { status: "For Mayor's Signature", notes: 'Transmitted to Mayor Office for enactment.', updatedBy: secretaryUser._id, date: new Date('2026-04-05') }
      ]
    },
    {
      number: '2026-008',
      type: 'Ordinance',
      title: 'An Ordinance Institutionalizing the Bongabong Youth Digital Technology Hub and Free Wi-Fi in Public Plazas and Barangay Halls',
      title_tl: 'Kautusang Nagtataguyod ng Youth Digital Tech Hub at Libreng Wi-Fi sa mga Plaza at Barangay Hall',
      proponentId: councilors[1]._id,
      coAuthors: [councilors[8]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: '', // Intentionally unassigned at First Reading stage per new rule!
      sectorTag: 'Technology',
      explanatoryNote: 'Bridging the digital divide for students, freelancers, and small business owners through municipal connectivity.',
      enactingClause: 'BE IT ENACTED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Digital Hub.</strong> 30 high-speed computers and public digital training center established at town library.</p>',
      status: 'First Reading',
      isLocked: false,
      plainLanguageSummary: 'Builds a modern municipal computer and training center for youth and provides free internet access in barangay halls.',
      plainLanguageSummary_tl: 'Libreng computer lab para sa kabataan at mabilis na internet sa bawat barangay hall.',
      timeline: [
        { status: 'First Reading', notes: 'Proposed and introduced in plenary session.', updatedBy: secretaryUser._id, date: new Date('2026-04-20') }
      ]
    },
    {
      number: '2026-009',
      type: 'Ordinance',
      title: 'An Ordinance Regulating Municipal Tricycle Fares, Route Zones, and Passenger Safety Guidelines in Bongabong',
      title_tl: 'Kautusang Nagtatakda ng Pamasahe at Ruta ng mga Traysikel sa Bayan ng Bongabong',
      proponentId: councilors[5]._id,
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: true, // Working draft demonstration record!
      committee: '',
      sectorTag: 'Transportation',
      explanatoryNote: 'Rationalizing fare matrices and color-coded zoning to prevent overcharging while maintaining operator livelihood.',
      enactingClause: 'BE IT ORDAINED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Base Fare.</strong> Php 15 for first two kilometers with 20% mandatory discount for students, PWDs, and seniors.</p>',
      status: 'Draft',
      isLocked: false,
      plainLanguageSummary: 'Standardizes tricycle fare matrix across town routes with strict discounts for students and senior citizens.',
      plainLanguageSummary_tl: 'Nagtatakda ng tamang pamasahe sa traysikel at diskwento para sa mga estudyante at nakatatanda.',
      timeline: [
        { status: 'Draft', notes: 'Working draft created by legislative staff.', updatedBy: secretaryUser._id, date: new Date('2026-05-01') }
      ]
    },
    {
      number: '2026-010',
      type: 'Ordinance',
      title: 'An Ordinance Providing Conservation Incentives for Mangrove Reforestation and Marine Protected Sanctuaries in Bongabong Coast',
      title_tl: 'Kautusang Nagbibigay ng Pabuya para sa Pangangalaga ng Bakawan at Marine Sanctuary sa Bayan ng Bongabong',
      proponentId: councilors[6]._id,
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: '', // Pending Committee Assignment stage
      sectorTag: 'Environment',
      explanatoryNote: 'Incentivizing coastal fisherfolk cooperatives to plant, monitor, and guard mangrove nurseries along southern coastlines.',
      enactingClause: 'BE IT ORDAINED by the Sangguniang Bayan of Bongabong in session assembled:',
      provisions: '<p><strong>Section 1. Sanctuaries.</strong> Demarcation of 50 hectares of municipal marine sanctuaries.</p>',
      status: 'Committee Assignment',
      isLocked: false,
      plainLanguageSummary: 'Provides cash honoraria and equipment to coastal fisherfolk protecting local mangrove forests and marine sanctuaries.',
      plainLanguageSummary_tl: 'Nagbibigay ng kagamitan at tulong pinansyal sa mga mangingisdang nagbabantay ng bakawanan at santuwaryo ng isda.',
      timeline: [
        { status: 'First Reading', notes: 'Introduced on plenary floor.', updatedBy: secretaryUser._id, date: new Date('2026-05-10') },
        { status: 'Committee Assignment', notes: 'Entered Committee Assignment stage; pending lead standing committee referral.', updatedBy: secretaryUser._id, date: new Date('2026-05-12') }
      ]
    }
  ];

  const createdOrdinances = await Ordinance.insertMany(ordinancesSeed);
  console.log(`[Seed] Successfully created ${createdOrdinances.length} Ordinances.`);

  // 3. CREATE 10 FULLY ALIGNED RESOLUTIONS
  console.log('[Seed] Generating 10 aligned Resolutions...');
  const resolutionsSeed = [
    {
      number: 'RES-2026-001',
      type: 'Resolution',
      title: 'A Resolution Strongly Supporting the Expansion of the Coconut Farmers and Industry Development Plan in the Municipality of Bongabong',
      title_tl: 'Resolusyong Nagpapahayag ng Buong Suporta sa Pagpapalawak ng Coconut Farmers Plan sa Bongabong',
      proponentId: councilors[3]._id,
      coAuthors: [councilors[0]._id, councilors[2]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[4], // Agriculture
      committeeAssignment: {
        committee: COMMITTEES_LIST[4],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-02-12'),
        notes: 'Referred to Committee on Agriculture.'
      },
      sectorTag: 'Agriculture',
      motionBy: councilors[3]._id,
      secondedBy: [councilors[0]._id, councilors[1]._id, councilors[2]._id],
      adoptionResult: 'Unanimously Approved',
      adoptionDate: new Date('2026-02-28'),
      distribution: [
        'Office of the Municipal Mayor, Bongabong',
        'Philippine Coconut Authority Regional Office IV-B',
        'Sangguniang Panlalawigan of Oriental Mindoro'
      ],
      explanatoryNote: 'WHEREAS, coconut farming is a cornerstone of the rural agricultural economy of Bongabong with thousands of smallholder farm families;\n\nWHEREAS, national funding under the Coconut Farmers and Industry Development Plan offers transformative replanting and mechanization grants;\n\nWHEREAS, favorable municipal endorsement accelerates grant allocation to local farmer associations;',
      enactingClause: 'NOW, THEREFORE, on motion of Hon. Jeremy Enriquez, seconded by Hon. Richard Candelario, Hon. Jose Rodney Liwanag, and Hon. Jeffrey Alea, BE IT RESOLVED, as it is hereby resolved by the Sangguniang Bayan of Bongabong in session assembled:',
      provisions: '<p><strong>RESOLVED,</strong> that the Sangguniang Bayan of Bongabong officially expresses its unequivocal support for the expansion of the Coconut Farmers and Industry Development Plan in Bongabong.</p><p><strong>RESOLVED FURTHER,</strong> that copies of this resolution be formally transmitted to the Philippine Coconut Authority Regional Office.</p>',
      status: 'Approved',
      isLocked: true,
      plainLanguageSummary: 'Formal municipal appeal endorsing national funding and hybrid seed grants for coconut farming families in Bongabong.',
      plainLanguageSummary_tl: 'Pormal na resolusyon ng suporta at pakiusap para sa dagdag pondo at binhi sa mga magtatanim ng niyog.',
      timeline: [
        { status: 'First Reading', notes: 'Introduced and read in plenary session.', updatedBy: secretaryUser._id, date: new Date('2026-02-05') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Agriculture.', updatedBy: secretaryUser._id, date: new Date('2026-02-12') },
        { status: 'Third Reading', notes: 'Adopted unanimously on roll-call voting.', updatedBy: secretaryUser._id, date: new Date('2026-02-28') },
        { status: "For Mayor's Signature", notes: 'Transmitted to Municipal Mayor for confirmation.', updatedBy: secretaryUser._id, date: new Date('2026-03-02') },
        { status: 'Approved', notes: 'Enacted and sealed resolution copies dispatched.', updatedBy: secretaryUser._id, date: new Date('2026-03-05') }
      ]
    },
    {
      number: 'RES-2026-002',
      type: 'Resolution',
      title: 'A Resolution Commending the Top Performing Barangay Peacekeeping Action Teams (BPATs) and Barangay Tanods of Bongabong for CY 2025',
      title_tl: 'Resolusyong Nagbibigay Pugay at Pagkilala sa mga Huwarang Barangay Tanod at BPATs ng Bongabong',
      proponentId: councilors[8]._id,
      coAuthors: [councilors[1]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[9], // Barangay Affairs
      committeeAssignment: {
        committee: COMMITTEES_LIST[9],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-01-26'),
        notes: 'Referred to Committee on Barangay Affairs.'
      },
      sectorTag: 'Barangay Affairs',
      motionBy: councilors[8]._id,
      secondedBy: [councilors[1]._id, councilors[4]._id],
      adoptionResult: 'Unanimously Approved',
      adoptionDate: new Date('2026-02-10'),
      distribution: [
        'Liga ng mga Barangay, Bongabong Chapter',
        'Office of the Municipal Mayor',
        'All 36 Barangay Councils of Bongabong'
      ],
      explanatoryNote: 'WHEREAS, barangay tanods and peacekeeping action teams demonstrate untiring devotion in maintaining peaceful and orderly communities;\n\nWHEREAS, their immediate voluntary responses during floods, emergency accidents, and night patrols protect citizen safety;\n\nWHEREAS, such exemplary public service merits the highest commendation of the municipal legislature;',
      enactingClause: 'NOW, THEREFORE, on motion of Hon. Natalio Doce, seconded by Hon. Jose Rodney Liwanag and Hon. Niña Atienza, DMD, BE IT RESOLVED, as it is hereby resolved:',
      provisions: '<p><strong>RESOLVED,</strong> to confer highest commendation and recognition to the outstanding Barangay Peacekeeping Action Teams across all 36 barangays of Bongabong.</p>',
      status: 'Approved',
      isLocked: true,
      plainLanguageSummary: 'Honors the voluntary public service and dedication of barangay tanods and community peacekeeping watchmen across all 36 barangays.',
      plainLanguageSummary_tl: 'Pagpaparangal sa mga masisipag at tapat na tanod ng bawat barangay sa Bongabong.',
      timeline: [
        { status: 'First Reading', notes: 'First reading introduced.', updatedBy: secretaryUser._id, date: new Date('2026-01-20') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Barangay Affairs.', updatedBy: secretaryUser._id, date: new Date('2026-01-26') },
        { status: 'Third Reading', notes: 'Adopted with unanimous applause.', updatedBy: secretaryUser._id, date: new Date('2026-02-10') },
        { status: "For Mayor's Signature", notes: 'Signed by Mayor.', updatedBy: secretaryUser._id, date: new Date('2026-02-15') },
        { status: 'Approved', notes: 'Parchment certificates delivered to recipients.', updatedBy: secretaryUser._id, date: new Date('2026-02-18') }
      ]
    },
    {
      number: 'RES-2026-003',
      type: 'Resolution',
      title: 'A Resolution Requesting the Department of Public Works and Highways (DPWH) to Install Solar Streetlights Along the Bongabong-Roxas National Highway',
      title_tl: 'Resolusyong Humihiling sa DPWH na Magkabit ng Solar Streetlights sa National Highway',
      proponentId: councilors[0]._id,
      coAuthors: [councilors[5]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[0],
      committeeAssignment: {
        committee: COMMITTEES_LIST[0],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-03-05'),
        notes: 'Referred to Committee on Infrastructure.'
      },
      sectorTag: 'Infrastructure',
      motionBy: councilors[0]._id,
      secondedBy: [councilors[5]._id],
      adoptionResult: 'Adopted without objection',
      adoptionDate: new Date('2026-03-24'),
      distribution: [
        'DPWH Southern Mindoro District Engineering Office',
        'Office of the Provincial Governor of Oriental Mindoro'
      ],
      explanatoryNote: 'WHEREAS, poorly illuminated highway intersections along southern national corridors pose high accident risks to nighttime motorists;\n\nWHEREAS, solar streetlighting provides cost-effective, climate-resilient illumination for travelers and pedestrians;',
      enactingClause: 'NOW, THEREFORE, on motion of Hon. Richard Candelario, seconded by Hon. Melody Monreal, BE IT RESOLVED:',
      provisions: '<p><strong>RESOLVED,</strong> to respectfully petition the DPWH District Engineer for the prompt installation of solar street lighting along high-risk highway sections.</p>',
      status: 'Approved',
      isLocked: true,
      plainLanguageSummary: 'Petitions the DPWH to install modern solar street lamps along dark portions of the national highway to prevent accidents.',
      plainLanguageSummary_tl: 'Humihiling sa DPWH para sa mga solar street light sa national highway upang maging ligtas ang mga biyahero sa gabi.',
      timeline: [
        { status: 'First Reading', notes: 'Introduced on plenary floor.', updatedBy: secretaryUser._id, date: new Date('2026-03-01') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Infrastructure.', updatedBy: secretaryUser._id, date: new Date('2026-03-05') },
        { status: 'Third Reading', notes: 'Approved unanimously.', updatedBy: secretaryUser._id, date: new Date('2026-03-24') },
        { status: "For Mayor's Signature", notes: 'Endorsed by Municipal Mayor.', updatedBy: secretaryUser._id, date: new Date('2026-03-28') },
        { status: 'Approved', notes: 'Transmitted to DPWH.', updatedBy: secretaryUser._id, date: new Date('2026-04-02') }
      ]
    },
    {
      number: 'RES-2026-004',
      type: 'Resolution',
      title: 'A Resolution Authorizing the Municipal Mayor to Enter into a Memorandum of Agreement (MOA) with the Philippine Red Cross for Community Blood Drives',
      title_tl: 'Resolusyong Nagbibigay Pahintulot sa Punong Bayan na Lumagda sa MOA sa Philippine Red Cross para sa Blood Donation Drive',
      proponentId: councilors[2]._id,
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[2],
      committeeAssignment: {
        committee: COMMITTEES_LIST[2],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-03-15'),
        notes: 'Referred to Committee on Health.'
      },
      sectorTag: 'Health',
      motionBy: councilors[2]._id,
      secondedBy: [councilors[4]._id, councilors[1]._id],
      status: "For Mayor's Signature",
      isLocked: false,
      explanatoryNote: 'WHEREAS, ensuring an accessible reserve of safe blood transfusions saves lives during surgical and maternal emergencies in Bongabong;',
      enactingClause: 'NOW, THEREFORE, on motion of Hon. Jeffrey Alea, seconded by Hon. Niña Atienza and Hon. Jose Rodney Liwanag, BE IT RESOLVED:',
      provisions: '<p><strong>RESOLVED,</strong> to authorize the Municipal Mayor to execute the partnership agreement with the Philippine Red Cross.</p>',
      plainLanguageSummary: 'Authorizes municipal partnership with Red Cross to provide blood donation centers and emergency blood supply for citizens.',
      plainLanguageSummary_tl: 'Pinapahintulutan ang Mayor na pumirma sa kasunduan sa Red Cross para sa regular na donasyon ng dugo.',
      timeline: [
        { status: 'First Reading', notes: 'Filed by Committee on Health.', updatedBy: secretaryUser._id, date: new Date('2026-03-10') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Health.', updatedBy: secretaryUser._id, date: new Date('2026-03-15') },
        { status: 'Third Reading', notes: 'Adopted on plenary session.', updatedBy: secretaryUser._id, date: new Date('2026-03-29') },
        { status: "For Mayor's Signature", notes: 'Transmitted to Mayor Office for signing.', updatedBy: secretaryUser._id, date: new Date('2026-04-04') }
      ]
    },
    {
      number: 'RES-2026-005',
      type: 'Resolution',
      title: 'A Resolution Extending Heartfelt Congratulations to the Bongabong Municipal Athletics Team for Winning Overall Champions in the Provincial Meet 2026',
      title_tl: 'Resolusyong Nagpapaabot ng Taos-Pusong Pagbati sa Bongabong Athletics Team sa Kanilang Pagkapanalo sa Provincial Meet',
      proponentId: councilors[7]._id,
      coAuthors: [councilors[4]._id],
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[8],
      committeeAssignment: {
        committee: COMMITTEES_LIST[8],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-04-02'),
        notes: 'Referred to Committee on Youth and Sports Development.'
      },
      sectorTag: 'Sports',
      motionBy: councilors[7]._id,
      secondedBy: [councilors[4]._id],
      status: 'Third Reading',
      isLocked: false,
      explanatoryNote: 'WHEREAS, student athletes brought immense municipal pride by bagging 24 gold medals in track and field and swimming at the provincial championship meet;',
      enactingClause: 'NOW, THEREFORE, on motion of Hon. Jheremy Roman Abel, seconded by Hon. Niña Atienza, BE IT RESOLVED:',
      provisions: '<p><strong>RESOLVED,</strong> to convey the highest pride, congratulations, and gratitude of the Sangguniang Bayan to all coaches and student athletes.</p>',
      plainLanguageSummary: 'Congratulates local student athletes and coaching staff for winning overall championship honors at the 2026 Provincial Meet.',
      plainLanguageSummary_tl: 'Pagpupugay at pagbati sa mga kabataang atleta ng Bongabong na nagwagi sa palarong panlalawigan.',
      timeline: [
        { status: 'First Reading', notes: 'Introduced on plenary floor.', updatedBy: secretaryUser._id, date: new Date('2026-03-28') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Youth and Sports.', updatedBy: secretaryUser._id, date: new Date('2026-04-02') },
        { status: 'Third Reading', notes: 'Deliberated and slated for final adoption.', updatedBy: secretaryUser._id, date: new Date('2026-04-14') }
      ]
    },
    {
      number: 'RES-2026-006',
      type: 'Resolution',
      title: 'A Resolution Requesting the Department of Information and Communications Technology (DICT) for Broadband Towers in Remote Indigenous Communities',
      title_tl: 'Resolusyong Humihiling sa DICT ng Karagdagang Cell Towers sa mga Pamayanang Katutubo',
      proponentId: councilors[1]._id,
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: COMMITTEES_LIST[8],
      committeeAssignment: {
        committee: COMMITTEES_LIST[8],
        assignedBy: secretaryUser._id,
        assignedAt: new Date('2026-04-18'),
        notes: 'Assigned to Committee on Information and Communication Technology.'
      },
      sectorTag: 'Technology',
      status: 'Committee Assignment',
      isLocked: false,
      explanatoryNote: 'WHEREAS, digital connectivity is indispensable for educational access and disaster communications in upland barangays like Hagan and Lisap;',
      enactingClause: 'NOW, THEREFORE, on motion of Hon. Jose Rodney Liwanag, seconded by the body, BE IT RESOLVED:',
      provisions: '<p><strong>RESOLVED,</strong> to petition DICT Region IV-B to prioritize Bongabong under the Free Wi-Fi for All and missionary tower programs.</p>',
      plainLanguageSummary: 'Appeals to DICT for government cellular and broadband towers to connect remote upland indigenous sitios in Bongabong.',
      plainLanguageSummary_tl: 'Kahilingan sa DICT para sa mga tore ng internet sa mga kabundukan ng bayan.',
      timeline: [
        { status: 'First Reading', notes: 'Introduced during regular session.', updatedBy: secretaryUser._id, date: new Date('2026-04-15') },
        { status: 'Committee Assignment', notes: 'Assigned to Committee on ICT.', updatedBy: secretaryUser._id, date: new Date('2026-04-18') }
      ]
    },
    {
      number: 'RES-2026-007',
      type: 'Resolution',
      title: 'A Resolution Strongly Urging the National Irrigation Administration (NIA) to Rehabilitate Irrigation Canals in Carmundo, Morente, and Lisap',
      title_tl: 'Resolusyong Humihimok sa NIA na Kumpunihin ang mga Kanal ng Patubig sa Carmundo, Morente, at Lisap',
      proponentId: councilors[3]._id,
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: '', // Pending assignment
      sectorTag: 'Agriculture',
      status: 'First Reading',
      isLocked: false,
      explanatoryNote: 'WHEREAS, sustained crop yields for Bongabong rice farmers rely heavily on functioning irrigation canal networks;',
      enactingClause: 'NOW, THEREFORE, on motion of Hon. Jeremy Enriquez, BE IT RESOLVED:',
      provisions: '<p><strong>RESOLVED,</strong> to urge the NIA Provincial Office to inspect and desilt damaged lateral irrigation lines in rice-producing barangays.</p>',
      plainLanguageSummary: 'Urges the NIA to fund urgent repairs and declogging of broken farm irrigation canals in agricultural barangays.',
      plainLanguageSummary_tl: 'Pakiusap sa NIA na ayusin ang mga sirang kanal ng patubig sa palayan upang lumaki ang ani ng mga magsasaka.',
      timeline: [
        { status: 'First Reading', notes: 'Introduced on plenary floor.', updatedBy: secretaryUser._id, date: new Date('2026-04-22') }
      ]
    },
    {
      number: 'RES-2026-008',
      type: 'Resolution',
      title: 'A Resolution Accreditating the Bongabong Organic Citrus Growers Cooperative as an Authorized Civil Society Organization in the Municipality',
      title_tl: 'Resolusyong Nagpapatibay sa Akreditasyon ng Bongabong Organic Citrus Growers Cooperative bilang Lehitimong CSO',
      proponentId: councilors[5]._id,
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: false,
      committee: '',
      sectorTag: 'Governance',
      status: 'First Reading',
      isLocked: false,
      explanatoryNote: 'WHEREAS, civil society participation enhances transparency and multi-sectoral development in municipal governance;',
      enactingClause: 'NOW, THEREFORE, on motion of Hon. Melody Monreal, BE IT RESOLVED:',
      provisions: '<p><strong>RESOLVED,</strong> to confer full legislative accreditation to the Bongabong Organic Citrus Growers Cooperative.</p>',
      plainLanguageSummary: 'Accredits local organic citrus farming cooperative to participate in municipal special bodies and local development councils.',
      plainLanguageSummary_tl: 'Pagkilala at akreditasyon sa kooperatiba ng mga magtatanim ng kalamansi para makasama sa mga programa ng munisipyo.',
      timeline: [
        { status: 'First Reading', notes: 'First reading introduced.', updatedBy: secretaryUser._id, date: new Date('2026-04-25') }
      ]
    },
    {
      number: 'RES-2026-009',
      type: 'Resolution',
      title: 'A Resolution Expressing Profound Condolences of the Sangguniang Bayan to the Bereaved Family of Former Municipal Mayor Juan C. Malabanan',
      title_tl: 'Resolusyong Nagpapaabot ng Taos-Pusong Pakikiramay sa Pamilya ng Yumao na Dating Punong Bayan Juan C. Malabanan',
      proponentId: councilors[0]._id,
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: true, // Draft resolution
      committee: '',
      sectorTag: 'General',
      status: 'Draft',
      isLocked: false,
      explanatoryNote: 'WHEREAS, the late Mayor Malabanan served the municipality of Bongabong with profound honor, humility, and distinction during his tenure;',
      enactingClause: 'NOW, THEREFORE, on motion of Hon. Richard Candelario, BE IT RESOLVED:',
      provisions: '<p><strong>RESOLVED,</strong> that the Sangguniang Bayan officially expresses its collective sorrow and profound condolences to the Malabanan family.</p>',
      plainLanguageSummary: 'Draft memorial resolution extending solemn condolences and honoring the lifelong public service of former municipal mayor.',
      plainLanguageSummary_tl: 'Resolusyon ng pakikiramay ng Sangguniang Bayan sa pamilya ng yumao na dating Punong Bayan.',
      timeline: [
        { status: 'Draft', notes: 'Drafted by Legislative Staff.', updatedBy: secretaryUser._id, date: new Date('2026-05-02') }
      ]
    },
    {
      number: 'RES-2026-010',
      type: 'Resolution',
      title: 'A Resolution Authorizing the Reprogramming of Unobligated Municipal Disaster Risk Reduction and Management Funds for Flood Control Defenses',
      title_tl: 'Resolusyong Nagpapahintulot sa Paglilipat ng Pondo ng MDRRMF para sa mga Proyektong Pang-iwas Baha',
      proponentId: councilors[0]._id,
      termId: currentTerm._id,
      seriesYear: 2026,
      isDraft: true, // Another working draft
      committee: '',
      sectorTag: 'Infrastructure',
      status: 'Draft',
      isLocked: false,
      explanatoryNote: 'WHEREAS, preemptive slope protection and sandbag defenses are urgently needed prior to the onset of the southwest monsoon season;',
      enactingClause: 'NOW, THEREFORE, on motion of Hon. Richard Candelario, BE IT RESOLVED:',
      provisions: '<p><strong>RESOLVED,</strong> to approve the reprogramming of municipal calamity reserves toward priority river dike protection works.</p>',
      plainLanguageSummary: 'Draft resolution to realign contingency disaster savings to immediate flood barrier and river defense construction.',
      plainLanguageSummary_tl: 'Draft na resolusyon para ilaan ang natitirang pondo ng kalamidad sa pagtatayo ng mga dike at tabing-ilog.',
      timeline: [
        { status: 'Draft', notes: 'Working draft prepared for committee review.', updatedBy: secretaryUser._id, date: new Date('2026-05-04') }
      ]
    }
  ];

  const createdResolutions = await Ordinance.insertMany(resolutionsSeed);
  console.log(`[Seed] Successfully created ${createdResolutions.length} Resolutions.`);

  // 4. CREATE 10 FULLY ALIGNED SESSIONS
  console.log('[Seed] Generating 10 aligned Sessions matching June 15, 2026 reference...');
  const allSbMemberIds = sbMembers.map(m => m._id);

  const sessionsSeed = [];
  for (let i = 1; i <= 10; i++) {
    const sessionNumOrdinal = `${i}${i === 1 ? 'ST' : i === 2 ? 'ND' : i === 3 ? 'RD' : 'TH'}`;
    const dateStr = `2026-0${Math.min(i, 6)}-${10 + (i % 15)}`;
    const sessionDate = new Date(dateStr);

    // Present, OB, Absent rotation
    const presentMembers = allSbMemberIds.slice(0, 9);
    const obMembers = allSbMemberIds.slice(9, 10);
    const absentMembers = allSbMemberIds.slice(10);

    const relatedOrd = createdOrdinances[(i - 1) % createdOrdinances.length];
    const relatedRes = createdResolutions[(i - 1) % createdResolutions.length];

    sessionsSeed.push({
      title: `${sessionNumOrdinal} Regular Session of the 12th Sangguniang Bayan`,
      sessionNumber: `${sessionNumOrdinal}`,
      sessionType: 'Regular Session',
      legislativeBody: '12th Sangguniang Bayan',
      venue: 'Sangguniang Bayan Session Hall, Bongabong Municipal Building',
      municipality: 'Bongabong, Oriental Mindoro',
      date: sessionDate,
      createdBy: secretaryUser._id,
      itemsDiscussed: [relatedOrd._id, relatedRes._id],
      attendance: {
        present: presentMembers,
        onOfficialBusiness: obMembers,
        absent: absentMembers
      },
      callToOrder: `<p>The ${sessionNumOrdinal} Regular Session of the 12th Sangguniang Bayan of Bongabong, Province of Oriental Mindoro, was called to order at exactly 9:00 in the morning by Municipal Vice-Mayor Jayson M. Barcelona, Presiding Officer.</p>`,
      invocation: '<p>The opening invocation was led by Hon. Niña Atienza, followed by the singing of the Philippine National Anthem and the Bongabong Hymn with all members standing in solemn attention.</p>',
      rollCall: '<p>Upon roll call by the Secretary to the Sangguniang Bayan, a quorum was declared with a decisive majority of the honorable members of the august body present.</p>',
      readingOfPreviousMinutes: `<p>On motion of Hon. Richard Candelario, seconded by Hon. Jose Rodney Liwanag, the reading of the minutes of the preceding regular session was dispensed with, and the same was approved and adopted as written without amendments.</p>`,
      orderOfBusiness: '<p>The Order and Calendar of Business for the session was taken up and formally adopted without amendments upon joint motion by the floor leadership.</p>',
      privilegeHour: `<p>Hon. Melody Monreal availed of the Privilege Hour to address the council regarding the urgent necessity of rehabilitating municipal farm-to-market feeder roads in Barangay ${BONGABONG_BARANGAYS[i % BONGABONG_BARANGAYS.length]} to support smallholder producers.</p>`,
      citizensHour: `<p>Delegation of community leaders from Barangay ${BONGABONG_BARANGAYS[(i + 2) % BONGABONG_BARANGAYS.length]} presented petitions concerning rural electrification and street illumination.</p>`,
      questionHour: '<p>The Municipal Planning and Development Coordinator and Municipal Health Officer appeared before the plenary to address council inquiries on development milestone deliverables.</p>',
      committeeReport: `<p>Hon. Jeffrey Alea delivered Committee Report No. 2026-${i.toString().padStart(2, '0')} presenting findings and unanimous recommendations endorsing favorable action on pending legislative measures.</p>`,
      firstReading: `<p>Ordinance No. ${relatedOrd.number}: "<em>${relatedOrd.title}</em>" authored by Hon. ${councilors[(i - 1) % councilors.length].name} was introduced and read by title on First Reading.</p>`,
      unfinishedBusiness: '<p>Re-examination of municipal revenue code adjustments and quarterly capital expenditure disbursements under the General Fund.</p>',
      referralForAction: `<p>Resolution No. ${relatedRes.number}: "<em>${relatedRes.title}</em>" was approved and transmitted to the executive department for operational implementation.</p>`,
      referralForReference: '<p>Official communications from the Sangguniang Panlalawigan of Oriental Mindoro and DILG Regional Office were noted and referred to legislative archives for information and records.</p>',
      otherMatters: '<p>Announcements were made regarding upcoming joint committee inspections scheduled for Thursday at 9:00 AM.</p>',
      thanksgivingPrayer: '<p>The session concluded with a thanksgiving prayer offered by Hon. Jeremy Enriquez giving thanks for collective guidance and harmonious deliberations.</p>',
      adjournment: `<p>There being no other business to transact, on motion of the Floor Leader, the session was adjourned at 12:45 PM.</p>`,
      status: i <= 8 ? 'Final' : 'Draft'
    });
  }

  const createdSessions = await Session.insertMany(sessionsSeed);
  console.log(`[Seed] Successfully created ${createdSessions.length} Sessions.`);

  // 5. CREATE 10 CONSULTATION FEEDBACK RECORDS
  console.log('[Seed] Generating 10 Consultation Feedback records...');
  const consultationOrd1 = createdOrdinances[1]; // Curfew
  const consultationOrd2 = createdOrdinances[2]; // Health desks

  const feedbackSeed = [
    {
      ordinanceId: consultationOrd1._id,
      full_name: 'Juanito Dela Cruz',
      barangay: 'Poblacion',
      contact_number: '09181112201',
      id_attachment_url: '/uploads/id_samples/juanito_id.jpg',
      vote: 'Agree',
      comment: 'Lubos po akong sumasang-ayon sa curfew upang mapanatili ang kapayapaan at maiwasan ang rambol ng mga kabataan sa gabi sa aming barangay.',
      status: 'Approved',
      sentiment: 'Positive',
      data_privacy_consent: true,
      approved_by: secretaryUser._id,
      approved_at: new Date('2026-03-22')
    },
    {
      ordinanceId: consultationOrd1._id,
      full_name: 'Rosanna M. Bautista',
      barangay: 'Aplaya',
      contact_number: '09181112202',
      id_attachment_url: '/uploads/id_samples/rosanna_id.jpg',
      vote: 'Agree',
      comment: 'Maganda ito lalo na sa mga tabing-dagat kung saan madaming kabataan ang tumatambay hanggang madaling araw.',
      status: 'Approved',
      sentiment: 'Positive',
      data_privacy_consent: true,
      approved_by: secretaryUser._id,
      approved_at: new Date('2026-03-23')
    },
    {
      ordinanceId: consultationOrd1._id,
      full_name: 'Eduardo G. Santos',
      barangay: 'Labasan',
      contact_number: '09181112203',
      id_attachment_url: '/uploads/id_samples/eduardo_id.jpg',
      vote: 'Neutral',
      comment: 'Pabor ako ngunit pakiusap lang na huwag hulihin agad ang mga estudyanteng ginagabi dahil sa school projects.',
      status: 'Approved',
      sentiment: 'Neutral',
      data_privacy_consent: true,
      approved_by: secretaryUser._id,
      approved_at: new Date('2026-03-24')
    },
    {
      ordinanceId: consultationOrd1._id,
      full_name: 'Maricel P. Ramos',
      barangay: 'Lisap',
      contact_number: '09181112204',
      id_attachment_url: '/uploads/id_samples/maricel_id.jpg',
      vote: 'Agree',
      comment: 'Malaking tulong po ito sa aming mga magulang para maprotektahan ang aming mga anak laban sa masasamang bisyo.',
      status: 'Approved',
      sentiment: 'Positive',
      data_privacy_consent: true,
      approved_by: secretaryUser._id,
      approved_at: new Date('2026-03-25')
    },
    {
      ordinanceId: consultationOrd1._id,
      full_name: 'Dennis K. Alcantara',
      barangay: 'Masaguisi',
      contact_number: '09181112205',
      id_attachment_url: '/uploads/id_samples/dennis_id.jpg',
      vote: 'Disagree',
      comment: 'Masyadong maaga ang 10 PM para sa mga kabataang tumutulong sa pagsasaka at kargahan ng paninda sa palengke.',
      status: 'Approved',
      sentiment: 'Negative',
      data_privacy_consent: true,
      approved_by: secretaryUser._id,
      approved_at: new Date('2026-03-26')
    },
    {
      ordinanceId: consultationOrd2._id,
      full_name: 'Aling Corazon Rivera',
      barangay: 'San Jose',
      contact_number: '09181112206',
      id_attachment_url: '/uploads/id_samples/corazon_id.jpg',
      vote: 'Agree',
      comment: 'Napakaganda ng panukalang ito dahil malayo ang aming barangay sa kabayanan. Hindi na kami magbabayad ng mahal na pamasahe para magpa-BP at kumuha ng gamot.',
      status: 'Approved',
      sentiment: 'Positive',
      data_privacy_consent: true,
      approved_by: secretaryUser._id,
      approved_at: new Date('2026-04-26')
    },
    {
      ordinanceId: consultationOrd2._id,
      full_name: 'Vicente F. Morales',
      barangay: 'Formon',
      contact_number: '09181112207',
      id_attachment_url: '/uploads/id_samples/vicente_id.jpg',
      vote: 'Agree',
      comment: 'Suportado ng buong komunidad namin ang emergency health desk sa barangay hall. Laking tulong lalo na sa mga buntis at may edad.',
      status: 'Approved',
      sentiment: 'Positive',
      data_privacy_consent: true,
      approved_by: secretaryUser._id,
      approved_at: new Date('2026-04-27')
    },
    {
      ordinanceId: consultationOrd2._id,
      full_name: 'Teresita L. Castillo',
      barangay: 'Carmundo',
      contact_number: '09181112208',
      id_attachment_url: '/uploads/id_samples/teresita_id.jpg',
      vote: 'Agree',
      comment: 'Sana po may nakalaang oxygen tank at first aid supplies sa bawat health desk para sa mga emergency.',
      status: 'Pending',
      sentiment: 'Positive',
      data_privacy_consent: true,
      approved_by: null,
      approved_at: null
    },
    {
      ordinanceId: consultationOrd2._id,
      full_name: 'Ramon S. Hernandez',
      barangay: 'Bagong Bayan I',
      contact_number: '09181112209',
      id_attachment_url: '/uploads/id_samples/ramon_id.jpg',
      vote: 'Agree',
      comment: 'Mainam ito para sa mga batang may lagnat at mga buntis na kailangan ng agarang payo mula sa midwife.',
      status: 'Pending',
      sentiment: 'Positive',
      data_privacy_consent: true,
      approved_by: null,
      approved_at: null
    },
    {
      ordinanceId: consultationOrd2._id,
      full_name: 'Grace Anne Tolentino',
      barangay: 'Mina de Oro',
      contact_number: '09181112210',
      id_attachment_url: '/uploads/id_samples/grace_id.jpg',
      vote: 'Neutral',
      comment: 'Maganda ang layunin ngunit tiyakin sana na may sapat na budget para sa sweldo ng mga dagdag na health worker.',
      status: 'Pending',
      sentiment: 'Neutral',
      data_privacy_consent: true,
      approved_by: null,
      approved_at: null
    }
  ];

  const createdFeedback = await ConsultationFeedback.insertMany(feedbackSeed);
  console.log(`[Seed] Successfully created ${createdFeedback.length} Consultation Feedbacks.`);

  // FINAL VERIFICATION
  console.log('\n======================================================');
  console.log('       DATABASE VERIFICATION & COUNT CHECK             ');
  console.log('======================================================');
  const countOrds = await Ordinance.countDocuments({ type: 'Ordinance' });
  const countRes = await Ordinance.countDocuments({ type: 'Resolution' });
  const countSess = await Session.countDocuments();
  const countFeedback = await ConsultationFeedback.countDocuments();

  console.log(`Ordinances:            ${countOrds} (Target: 10)`);
  console.log(`Resolutions:           ${countRes} (Target: 10)`);
  console.log(`Sessions:              ${countSess} (Target: 10)`);
  console.log(`Consultation Feedback: ${countFeedback} (Target: 10)`);
  console.log('======================================================\n');

  await mongoose.disconnect();
}

seedAlignedData().catch(err => {
  console.error('[Error in seedAlignedData]:', err);
  process.exit(1);
});
