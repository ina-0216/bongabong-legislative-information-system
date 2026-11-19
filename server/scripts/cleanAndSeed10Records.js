const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const createBackup = require('./backupDb');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { assertFixtureSeedingAllowed } = require('../utils/seedSafety');

const User = require('../models/User');
const Ordinance = require('../models/Ordinance');
const Session = require('../models/Session');
const ConsultationFeedback = require('../models/ConsultationFeedback');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');

const SBMember = require('../models/SBMember');
const Committee = require('../models/Committee');
const Term = require('../models/Term');

// Authentic Bongabong, Oriental Mindoro Barangays
const BONGABONG_BARANGAYS = [
  'Poblacion', 'Aplaya', 'Labasan', 'Lisap', 'Masaguisi', 
  'San Jose', 'Formon', 'Carmundo', 'Bagong Bayan I', 'Mina de Oro',
  'Anilao', 'Batangan', 'Bukal', 'Camantigue', 'Cawayan', 'Dayhagan',
  'Hagan', 'Hagupit', 'Ipil', 'Kaligtasan', 'Labonan', 'Libertad',
  'Luna', 'Malitbog', 'Mapang', 'Morente', 'Ogbot', 'Orconuma',
  'Pulosahi', 'Sagana', 'San Isidro', 'San Juan', 'Sigange', 'Sta. Cruz', 'Tawas'
];

async function main() {
  assertFixtureSeedingAllowed();
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required to reset and seed the database.');
  console.log('================================================================');
  console.log('   iBOSys Database Reset & 10 Records Per Table Generator       ');
  console.log('================================================================');

  // Step 1: CREATE BACKUP FIRST
  console.log('\n[Step 1/5] Creating automated pre-reset backup for safe rollback...');
  const backupFile = await createBackup();
  console.log(`[Backup Verified] Created rollback point: ${backupFile}\n`);

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // Step 2: IDENTIFY PRESERVED DATA
  console.log('[Step 2/5] Identifying preserved data (2025-2028 Term, SB Members, Committees)...');
  
  // Find or preserve current 2025-2028 Term
  let currentTerm = await Term.findOne({ startYear: 2025, endYear: 2028 });

  if (!currentTerm) {
    currentTerm = await Term.create({
      label: '2025-2028 Term',
      startYear: 2025,
      endYear: 2028,
      description: 'Current legislative term (June 30, 2025 – June 30, 2028)',
      presidingOfficer: 'Jayson M. Barcelona'
    });
    console.log('Created 2025-2028 Term.');
  } else {
    currentTerm.presidingOfficer = 'Jayson M. Barcelona';
    await currentTerm.save();
    console.log(`Preserved 2025-2028 Term (${currentTerm._id})`);
  }

  // Preserve the 11 SB Members in 2025-2028 term and remove older inactive ones
  const preservedSbMembers = await SBMember.find({
    $or: [
      { termId: currentTerm._id },
      { termId: String(currentTerm._id) }
    ]
  });
  let currentViceMayor = preservedSbMembers.find(member => member.position === 'Vice Mayor');
  if (!currentViceMayor) {
    currentViceMayor = new SBMember({
      termId: currentTerm._id,
      position: 'Vice Mayor',
      committees: [],
      biography: '',
      contactEmail: '',
      fbLink: '',
      sbNumber: '',
    });
    preservedSbMembers.push(currentViceMayor);
  }
  currentViceMayor.firstName = 'Jayson';
  currentViceMayor.middleName = 'M.';
  currentViceMayor.lastName = 'Barcelona';
  currentViceMayor.position = 'Vice Mayor';
  currentViceMayor.order = 1;
  currentViceMayor.isActive = true;
  await currentViceMayor.save();
  const rankedCurrentMembers = preservedSbMembers
    .filter(member => member._id.toString() !== currentViceMayor._id.toString())
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
  for (const [index, member] of rankedCurrentMembers.entries()) {
    member.order = index + 2;
    await member.save();
  }
  console.log(`Preserved ${preservedSbMembers.length} SB Members in 2025-2028 term.`);

  // Delete SB Members not in 2025-2028 term
  const sbDeleteResult = await SBMember.deleteMany({
    _id: { $nin: preservedSbMembers.map(m => m._id) }
  });
  console.log(`Removed ${sbDeleteResult.deletedCount} older SB Members from previous terms.`);

  // Preserve 2025-2028 Committees
  const preservedCommittees = await Committee.find({
    $or: [
      { termId: currentTerm._id },
      { termId: String(currentTerm._id) }
    ]
  });
  console.log(`Preserved ${preservedCommittees.length} Committees in 2025-2028 term.`);

  // Clean older committees not in current term
  const commDeleteResult = await Committee.deleteMany({
    _id: { $nin: preservedCommittees.map(c => c._id) }
  });
  console.log(`Removed ${commDeleteResult.deletedCount} older committees from other terms.`);

  // Step 3: CLEAR DATA COLLECTIONS
  console.log('\n[Step 3/5] Deleting existing data from specified tables...');
  await Ordinance.deleteMany({});
  console.log(' - Ordinances cleared.');
  await Session.deleteMany({});
  console.log(' - Sessions cleared.');
  await ConsultationFeedback.deleteMany({});
  console.log(' - Consultation Feedbacks cleared.');
  await Notification.deleteMany({});
  console.log(' - Notifications cleared.');
  await Announcement.deleteMany({});
  console.log(' - Announcements cleared.');

  await User.deleteMany({});
  console.log(' - Users cleared (will re-create 10 clean official accounts).');

  // Also clean legacy tables
  try { await db.collection('votes').deleteMany({}); } catch (e) {}
  try { await db.collection('comments').deleteMany({}); } catch (e) {}

  // Step 4: CREATE 10 RECORDS FOR EACH TABLE
  console.log('\n[Step 4/5] Generating 10 high-quality records per table...');

  // 4.1 USERS (10 accounts)
  console.log('--> Creating 10 User accounts...');
  const salt = await bcrypt.genSalt(10);
  const standardPassword = await bcrypt.hash('Password@1234', salt);

  const usersData = [
    {
      firstName: 'System', lastName: 'Administrator',
      email: 'admin@ibosys.gov', password: standardPassword,
      role: 'System Admin', position: 'IT Administrator',
      contactNumber: '09170000001', status: 'Active'
    },
    {
      firstName: 'Maria', middleName: 'Santos', lastName: 'Clara',
      email: 'secretary@ibosys.gov', password: standardPassword,
      role: 'Secretary', position: 'Secretary to the Sangguniang Bayan',
      contactNumber: '09170000002', status: 'Active'
    },
    {
      firstName: 'Jayson', middleName: 'M.', lastName: 'Barcelona',
      email: 'vicemayor@ibosys.gov', password: standardPassword,
      role: 'Vice Mayor', position: 'Vice Mayor & Presiding Officer',
      contactNumber: '09170000003', status: 'Active'
    },
    {
      firstName: 'Richard', middleName: 'S.', lastName: 'Candelario',
      email: 'candelario@ibosys.gov', password: standardPassword,
      role: 'SB Member', position: 'SB Member',
      contactNumber: '09170000004', status: 'Active'
    },
    {
      firstName: 'Jose Rodney', middleName: 'L.', lastName: 'Liwanag',
      email: 'liwanag@ibosys.gov', password: standardPassword,
      role: 'SB Member', position: 'SB Member',
      contactNumber: '09170000005', status: 'Active'
    },
    {
      firstName: 'Jeffrey', middleName: 'B.', lastName: 'Alea',
      email: 'alea@ibosys.gov', password: standardPassword,
      role: 'SB Member', position: 'SB Member',
      contactNumber: '09170000006', status: 'Active'
    },
    {
      firstName: 'Jeremy', middleName: 'I.', lastName: 'Enriquez',
      email: 'enriquez@ibosys.gov', password: standardPassword,
      role: 'SB Member', position: 'SB Member',
      contactNumber: '09170000007', status: 'Active'
    },
    {
      firstName: 'Niña', middleName: 'F.', lastName: 'Atienza, DMD',
      email: 'atienza@ibosys.gov', password: standardPassword,
      role: 'SB Member', position: 'SB Member',
      contactNumber: '09170000008', status: 'Active'
    },
    {
      firstName: 'Cindee', middleName: 'V.', lastName: 'Guno-Sibulan',
      email: 'guno@ibosys.gov', password: standardPassword,
      role: 'SB Member', position: 'SB Member',
      contactNumber: '09170000009', status: 'Active'
    },
    {
      firstName: 'Melody', middleName: 'F.', lastName: 'Monreal',
      email: 'monreal@ibosys.gov', password: standardPassword,
      role: 'SB Member', position: 'SB Member',
      contactNumber: '09170000010', status: 'Active'
    }
  ];

  const createdUsers = await User.insertMany(usersData);
  const adminUser = createdUsers.find(u => u.role === 'System Admin');
  const secretaryUser = createdUsers.find(u => u.role === 'Secretary');
  const viceMayorUser = createdUsers.find(u => u.role === 'Vice Mayor');
  console.log(`✓ 10 Users created (Admin: admin@ibosys.gov | Password: Password@1234)`);

  // 4.2 ORDINANCES (10 records: 8 Ordinances + 2 Resolutions)
  console.log('--> Creating 10 Ordinances and Resolutions...');
  
  // Pick active proponents from preserved SB Members
  const proponent1 = preservedSbMembers[1] || preservedSbMembers[0];
  const proponent2 = preservedSbMembers[2] || preservedSbMembers[0];
  const proponent3 = preservedSbMembers[3] || preservedSbMembers[0];
  const proponent4 = preservedSbMembers[4] || preservedSbMembers[0];
  const proponent5 = preservedSbMembers[5] || preservedSbMembers[0];

  const ordinancesData = [
    {
      number: '2026-001',
      type: 'Ordinance',
      title: 'An Ordinance Regulating the Use of Single-Use Plastics and Polystyrene in All Commercial Establishments within the Municipality of Bongabong',
      title_tl: 'Kautusang Nagre-regulate sa Paggamit ng Single-Use Plastics at Polystyrene sa Lahat ng Estabkisyimento sa Bayan ng Bongabong',
      proponentId: proponent1._id,
      termId: currentTerm._id,
      committee: 'Committee on Environment, Grievances, Human Rights, Cooperative, Market and Economic Enterprise',
      sectorTag: 'Environment',
      explanatoryNote: 'Due to severe plastic pollution clogging municipal drainage systems and damaging coastal fishing grounds, urgent regulation of non-biodegradable plastics is required.',
      enactingClause: 'BE IT ENACTED by the Sangguniang Bayan of Bongabong, Oriental Mindoro in session assembled:',
      provisions: '<p><strong>Section 1. Title.</strong> This Ordinance shall be known as the Bongabong Plastic Waste Reduction Ordinance.</p><p><strong>Section 2. Scope.</strong> All business entities operating in Poblacion, Aplaya, Labasan, and all other barangays shall comply.</p><p><strong>Section 3. Alternatives.</strong> Use of reusable bags, eco-friendly food containers, and banana leaf wraps is mandated.</p>',
      penaltyClause: 'First Offense: Php 1,000 fine; Second Offense: Php 2,500 fine; Third Offense: Php 5,000 fine and 1-month business suspension.',
      effectivityDate: new Date('2026-07-01'),
      status: 'Approved',
      plainLanguageSummary: 'This law bans single-use plastic bags and styrofoam food boxes in stores and markets in Bongabong to protect the municipal environment and rivers.',
      plainLanguageSummary_tl: 'Ipinagbabawal ng batas na ito ang mga plastik na supot at styrofoam sa mga pamilihan ng Bongabong upang maprotektahan ang kapaligiran.',
      isLocked: true,
      timeline: [
        { status: 'First Reading', notes: 'Introduced in 1st Regular Session.', updatedBy: secretaryUser._id, date: new Date('2026-01-12') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Environment.', updatedBy: secretaryUser._id, date: new Date('2026-01-15') },
        { status: 'Committee Hearing', notes: 'Joint hearing conducted with market vendors.', updatedBy: secretaryUser._id, date: new Date('2026-01-28') },
        { status: 'Public Consultation', notes: 'Citizen comments gathered on iBOSys portal.', updatedBy: secretaryUser._id, date: new Date('2026-02-10') },
        { status: 'Second Reading', notes: 'Deliberated on second reading with floor amendments.', updatedBy: secretaryUser._id, date: new Date('2026-02-25') },
        { status: 'Third Reading', notes: 'Approved unanimously on nominal voting.', updatedBy: secretaryUser._id, date: new Date('2026-03-10') },
        { status: 'Approved', notes: 'Enacted and signed into municipal law.', updatedBy: secretaryUser._id, date: new Date('2026-03-25') }
      ]
    },
    {
      number: '2026-002',
      type: 'Ordinance',
      title: 'An Ordinance Prescribing Municipal Curfew Hours for Minors from 10:00 PM to 4:00 AM to Promote Child Safety and Welfare',
      title_tl: 'Kautusang Nagtatakda ng Curfew para sa mga Menor de Edad mula 10:00 PM hanggang 4:00 AM para sa Kaligtasan ng Kabataan',
      proponentId: proponent2._id,
      termId: currentTerm._id,
      committee: 'Committee on Tourism, Transportation, Peace and Order and Beautification',
      sectorTag: 'Peace and Order',
      explanatoryNote: 'A measure to protect minors from street hazards, juvenile delinquency, and nocturnal crimes across all 36 barangays of Bongabong.',
      enactingClause: 'BE IT ENACTED by the Sangguniang Bayan of Bongabong, Oriental Mindoro:',
      provisions: '<p><strong>Section 1. Curfew Period.</strong> Minors aged 17 and below must stay indoors between 10:00 PM and 4:00 AM.</p><p><strong>Section 2. Exemptions.</strong> School-sponsored late night activities, emergency medical errands, and work-study engagements with parent consent.</p>',
      penaltyClause: 'First Offense: Reprimand and counseling; Second Offense: 4 hours community service; Third Offense: Php 1,000 fine for parents/guardians.',
      effectivityDate: new Date('2026-08-01'),
      status: 'Public Consultation',
      plainLanguageSummary: 'Minors under 18 must be home between 10 PM and 4 AM unless accompanied by parents or carrying verified permits for school/work.',
      plainLanguageSummary_tl: 'Bawal magpagala-gala sa labas ang mga menor de edad mula 10 ng gabi hanggang 4 ng umaga nang walang kasamang magulang.',
      isLocked: false,
      timeline: [
        { status: 'First Reading', notes: 'Sponsored by Committee on Peace & Order.', updatedBy: secretaryUser._id, date: new Date('2026-03-02') },
        { status: 'Committee Assignment', notes: 'Assigned for inter-barangay consultation.', updatedBy: secretaryUser._id, date: new Date('2026-03-08') },
        { status: 'Public Consultation', notes: 'Public feedback open for constituents of all barangays.', updatedBy: secretaryUser._id, date: new Date('2026-03-20') }
      ]
    },
    {
      number: '2026-003',
      type: 'Ordinance',
      title: 'An Ordinance Establishing Barangay Health and Emergency Care Desks with Trained Health Personnel Across All Barangays',
      title_tl: 'Kautusang Nagtatatag ng Health and Emergency Care Desk sa Bawat Barangay ng Bongabong',
      proponentId: proponent3._id,
      termId: currentTerm._id,
      committee: 'Committee on Health, Livelihood and Civil Society Organizations',
      sectorTag: 'Health',
      explanatoryNote: 'Bringing frontline primary medical consultations and emergency triage desks directly to rural and coastal barangay halls.',
      enactingClause: 'BE IT ORDAINED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Establishment.</strong> Every barangay hall shall designate a clean, air-conditioned primary health desk.</p><p><strong>Section 2. Staffing.</strong> Certified Barangay Health Workers (BHWs) and one assigned municipal nurse.</p>',
      penaltyClause: 'Administrative sanctions for non-compliant barangay officials under DILG regulations.',
      effectivityDate: new Date('2026-09-01'),
      status: 'Public Consultation',
      plainLanguageSummary: 'Guarantees that every barangay hall has an operational health desk equipped with basic medicine, blood pressure apparatus, and emergency kits.',
      plainLanguageSummary_tl: 'Sinisiguro na ang bawat barangay ay may health desk na may gamot at nars para sa agarang tulong medikal.',
      isLocked: false,
      timeline: [
        { status: 'First Reading', notes: 'First reading introduced.', updatedBy: secretaryUser._id, date: new Date('2026-04-05') },
        { status: 'Committee Hearing', notes: 'Hearing held with Municipal Health Officer.', updatedBy: secretaryUser._id, date: new Date('2026-04-18') },
        { status: 'Public Consultation', notes: 'Public consultation period opened.', updatedBy: secretaryUser._id, date: new Date('2026-04-25') }
      ]
    },
    {
      number: '2026-004',
      type: 'Ordinance',
      title: 'An Ordinance Institutionalizing Municipal Organic Agriculture and Farm-to-Market Transport Support in Bongabong',
      title_tl: 'Kautusang Nagtataguyod ng Organikong Pagsasaka at Suporta sa Transportasyon ng Ani sa Bongabong',
      proponentId: proponent4._id,
      termId: currentTerm._id,
      committee: 'Committee on Agriculture and Games and Amusement',
      sectorTag: 'Agriculture',
      explanatoryNote: 'Promoting food self-sufficiency, sustainable farming practices, and subsidized hauling for local agrarian cooperatives.',
      enactingClause: 'BE IT ENACTED by the Sangguniang Bayan of the Municipality of Bongabong:',
      provisions: '<p><strong>Section 1. Municipal Organic Hub.</strong> Creation of municipal seedbank and bio-fertilizer distribution center.</p><p><strong>Section 2. Hauling Trucks.</strong> Municipal utility trucks dispatched on harvest days for farmers in Lisap, Morente, and Carmundo.</p>',
      penaltyClause: 'Any unauthorized commercial diversion of subsidized farm inputs shall result in permanent disqualification and fine of Php 5,000.',
      status: 'Committee Hearing',
      plainLanguageSummary: 'Provides free organic seeds, composting inputs, and free transport trucks to bring farmers produce from upland farms to the Bongabong public market.',
      plainLanguageSummary_tl: 'Nagkakaloob ng libreng binhi at transportasyon para sa ani ng mga magsasaka sa Bongabong.',
      isLocked: false,
      timeline: [
        { status: 'First Reading', notes: 'Introduced by Committee on Agriculture.', updatedBy: secretaryUser._id, date: new Date('2026-04-12') },
        { status: 'Committee Hearing', notes: 'Consultative meeting with local farmer federations.', updatedBy: secretaryUser._id, date: new Date('2026-04-29') }
      ]
    },
    {
      number: '2026-005',
      type: 'Ordinance',
      title: 'An Ordinance Providing Free Tertiary Education Scholarship and Allowance to Deserving Students from Marginalized Families',
      title_tl: 'Kautusang Nagbibigay ng Iskolarship at Buwanang Allowance para sa mga Estudyante sa Kolehiyo',
      proponentId: proponent5._id,
      termId: currentTerm._id,
      committee: 'Committee on Education, Culture and Arts, Legal Matters, House Rules, Ordinances, Technical and Vocational Education, Good Governance, Public Ethics and Accountability',
      sectorTag: 'Education',
      explanatoryNote: 'Empowering underprivileged youth by guaranteeing semester tuition assistance and a monthly book and transportation allowance.',
      enactingClause: 'BE IT ENACTED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Scholarship Grant.</strong> Php 5,000 per semester plus Php 1,500 monthly stipend for accredited state university students.</p><p><strong>Section 2. Academic Retention.</strong> Grantees must maintain a GPA of at least 83% or equivalent without failing grades.</p>',
      penaltyClause: 'Falsification of poverty certificate documents will trigger forfeiture and criminal prosecution under Article 172 of the Revised Penal Code.',
      status: 'Second Reading',
      plainLanguageSummary: 'Grants financial aid and monthly stipend to qualified college students from low-income families residing in Bongabong.',
      plainLanguageSummary_tl: 'Tulong pinansyal at buwanang allowance para sa mga estudyanteng kapos-palad sa kolehiyo.',
      isLocked: false,
      timeline: [
        { status: 'First Reading', notes: 'First reading approved.', updatedBy: secretaryUser._id, date: new Date('2026-02-15') },
        { status: 'Committee Hearing', notes: 'Joint session with student councils.', updatedBy: secretaryUser._id, date: new Date('2026-03-01') },
        { status: 'Second Reading', notes: 'Approved on second reading with amended stipend amounts.', updatedBy: secretaryUser._id, date: new Date('2026-03-22') }
      ]
    },
    {
      number: '2026-006',
      type: 'Ordinance',
      title: 'An Ordinance Mandating Free Annual Medical and Dental Checkups for All Senior Citizens and Persons with Disabilities (PWDs)',
      title_tl: 'Kautusang Nag-aatas ng Libreng Taunang Checkup Medikal at Dental para sa mga Senior Citizen at PWD',
      proponentId: proponent3._id,
      termId: currentTerm._id,
      committee: 'Committee on Social Welfare, Disaster Risk Reduction and Management and Community Driven Development',
      sectorTag: 'Social Welfare',
      explanatoryNote: 'Ensuring equitable public health interventions for elderly and differently-abled Bongabong constituents.',
      enactingClause: 'BE IT ORDAINED by the Sangguniang Bayan:',
      provisions: '<p><strong>Section 1. Free Annual Checkup.</strong> Comprehensive blood chemistry, ECG, chest X-ray, and dental prophylaxis at the Municipal Health Center.</p><p><strong>Section 2. Mobile Clinic.</strong> Mobile healthcare team to visit island and remote mountain barangays semi-annually.</p>',
      penaltyClause: 'Health personnel refusing service shall face administrative investigation.',
      status: 'Third Reading',
      plainLanguageSummary: 'Senior citizens and PWDs in Bongabong are entitled to free medical laboratory exams and dental care annually.',
      plainLanguageSummary_tl: 'Libreng checkup at gamot para sa lahat ng nakatatanda at may kapansanan sa bayan.',
      isLocked: false,
      timeline: [
        { status: 'First Reading', notes: 'Introduced by Hon. Atienza.', updatedBy: secretaryUser._id, date: new Date('2026-01-20') },
        { status: 'Committee Hearing', notes: 'Deliberation with OSCA and PWD Office.', updatedBy: secretaryUser._id, date: new Date('2026-02-15') },
        { status: 'Public Consultation', notes: 'Consultations conducted across clusters.', updatedBy: secretaryUser._id, date: new Date('2026-03-01') },
        { status: 'Second Reading', notes: 'Approved on second reading.', updatedBy: secretaryUser._id, date: new Date('2026-03-18') },
        { status: 'Third Reading', notes: 'Enrolled for final nominal voting.', updatedBy: secretaryUser._id, date: new Date('2026-04-02') }
      ]
    },
    {
      number: '2026-007',
      type: 'Ordinance',
      title: 'An Ordinance Upgrading Municipal Drainage Infrastructure and Anti-Clogging Systems Along the Poblacion-Aplaya Coastal Strip',
      title_tl: 'Kautusang Nagpapatupad ng Pagsasaayos ng Drainage at Kanal sa Poblacion at Aplaya',
      proponentId: proponent1._id,
      termId: currentTerm._id,
      committee: 'Committee on Appropriation, Infrastructure and Power and Energy',
      sectorTag: 'Infrastructure',
      explanatoryNote: 'Mitigating perennial urban flash floods and seawater backflows during monsoon rains and high tides.',
      enactingClause: 'BE IT ENACTED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Infrastructure Standard.</strong> Widening of main storm drains to 1.5 meters with reinforced box culverts.</p><p><strong>Section 2. Trash Traps.</strong> Heavy-duty hydraulic trash interceptors installed at coastal outfalls.</p>',
      penaltyClause: 'Dumping construction debris or domestic refuse into public drainage: Php 2,500 fine and cost of declogging.',
      status: "For Mayor's Signature",
      plainLanguageSummary: 'Reconstructs storm drainage canals in town center and coastal areas to prevent flooding during typhoons.',
      plainLanguageSummary_tl: 'Pagpapalapad ng mga kanal sa sentro ng bayan para hindi bumaha kapag may bagyo.',
      isLocked: false,
      timeline: [
        { status: 'First Reading', notes: 'First reading approved.', updatedBy: secretaryUser._id, date: new Date('2026-01-18') },
        { status: 'Committee Hearing', notes: 'Engineering office consultation.', updatedBy: secretaryUser._id, date: new Date('2026-02-10') },
        { status: 'Second Reading', notes: 'Approved on second reading.', updatedBy: secretaryUser._id, date: new Date('2026-03-01') },
        { status: 'Third Reading', notes: 'Passed unanimously on third reading.', updatedBy: secretaryUser._id, date: new Date('2026-03-20') },
        { status: "For Mayor's Signature", notes: 'Transmitted to Mayor Office for signature.', updatedBy: secretaryUser._id, date: new Date('2026-04-05') }
      ]
    },
    {
      number: '2026-008',
      type: 'Ordinance',
      title: 'An Ordinance Institutionalizing the Bongabong Youth Digital Technology Hub and Free Wi-Fi in Public Plazas and Barangay Halls',
      title_tl: 'Kautusang Nagtataguyod ng Youth Digital Tech Hub at Libreng Wi-Fi sa mga Plaza at Barangay Hall',
      proponentId: proponent2._id,
      termId: currentTerm._id,
      committee: 'Committee on Youth and Sports Development, Science and Technology and Information and Communication Technology',
      sectorTag: 'Technology',
      explanatoryNote: 'Bridging the digital divide for students, young professionals, and remote gig economy workers in Bongabong.',
      enactingClause: 'BE IT ENACTED by the Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Section 1. Digital Hub.</strong> Equipped with 30 high-speed computers, coding tutorials, and co-working desks.</p><p><strong>Section 2. Public Wi-Fi.</strong> High-speed optical fiber connection deployed to all 36 barangay halls with minimum 25 Mbps speed.</p>',
      penaltyClause: 'Tampering with municipal routers or cybersecurity infrastructure: Php 5,000 fine and legal prosecution.',
      status: 'First Reading',
      plainLanguageSummary: 'Builds a modern municipal computer and training center for youth and provides free internet access in barangay halls.',
      plainLanguageSummary_tl: 'Libreng computer lab para sa kabataan at mabilis na internet sa bawat barangay hall.',
      isLocked: false,
      timeline: [
        { status: 'First Reading', notes: 'Proposed during 8th Regular Session.', updatedBy: secretaryUser._id, date: new Date('2026-04-20') }
      ]
    },
    {
      number: '2026-009',
      type: 'Resolution',
      title: 'A Resolution Strongly Supporting the Expansion of the Coconut Farmers and Industry Development Plan in the Municipality of Bongabong',
      title_tl: 'Resolusyong Nagpapahayag ng Buong Suporta sa Pagpapalawak ng Coconut Farmers Plan sa Bongabong',
      proponentId: proponent4._id,
      termId: currentTerm._id,
      committee: 'Committee on Agriculture and Games and Amusement',
      sectorTag: 'Agriculture',
      explanatoryNote: 'A resolution requesting the Philippine Coconut Authority to allocate specialized hybrid planting materials and processing centers for Bongabong coconut growers.',
      enactingClause: 'RESOLVED, AS IT IS HEREBY RESOLVED by the 12th Sangguniang Bayan of Bongabong:',
      provisions: '<p><strong>Resolution Operative Clause:</strong> That the Sangguniang Bayan formally appeals to the Provincial and National PCA offices for a Php 15M grant.</p>',
      status: 'Approved',
      plainLanguageSummary: 'Formal municipal appeal to national agencies for financial and technological assistance for local coconut farmers.',
      plainLanguageSummary_tl: 'Pormal na resolusyon ng suporta at pakiusap para sa dagdag pondo sa mga magtatanim ng niyog.',
      isLocked: true,
      timeline: [
        { status: 'First Reading', notes: 'Filed and sponsored on the floor.', updatedBy: secretaryUser._id, date: new Date('2026-02-05') },
        { status: 'Committee Assignment', notes: 'Referred to Committee on Agriculture.', updatedBy: secretaryUser._id, date: new Date('2026-02-12') },
        { status: 'Third Reading', notes: 'Unanimously adopted by the council.', updatedBy: secretaryUser._id, date: new Date('2026-02-28') },
        { status: 'Approved', notes: 'Signed and furnished to PCA Regional Director.', updatedBy: secretaryUser._id, date: new Date('2026-03-05') }
      ]
    },
    {
      number: '2026-010',
      type: 'Resolution',
      title: 'A Resolution Commending the Top Performing Barangay Peacekeeping Action Teams (BPATs) and Barangay Tanods of Bongabong for CY 2025',
      title_tl: 'Resolusyong Nagbibigay Pugay at Pagkilala sa mga Huwarang Barangay Tanod at BPATs ng Bongabong',
      proponentId: proponent5._id,
      termId: currentTerm._id,
      committee: 'Committee on Barangay Affairs',
      sectorTag: 'Barangay Affairs',
      explanatoryNote: 'Recognizing the heroic volunteer frontline service rendered by village watchmen during natural calamities and peacekeeping operations.',
      enactingClause: 'RESOLVED, by the Sangguniang Bayan of Bongabong in session assembled:',
      provisions: '<p><strong>Resolution Operative Clause:</strong> Bestowing certificates of commendation and cash incentives to top performing BPAT units from all 36 barangays.</p>',
      status: 'Approved',
      plainLanguageSummary: 'Honors the exemplary service and sacrifice of barangay tanods and community watchmen across all barangays.',
      plainLanguageSummary_tl: 'Pagpaparangal sa mga masisipag at tapat na tanod ng bawat barangay sa Bongabong.',
      isLocked: true,
      timeline: [
        { status: 'First Reading', notes: 'Introduced by Committee on Barangay Affairs.', updatedBy: secretaryUser._id, date: new Date('2026-01-25') },
        { status: 'Third Reading', notes: 'Adopted with enthusiastic applause.', updatedBy: secretaryUser._id, date: new Date('2026-02-10') },
        { status: 'Approved', notes: 'Official parchment copies transmitted to all barangays.', updatedBy: secretaryUser._id, date: new Date('2026-02-18') }
      ]
    }
  ];

  const createdOrdinances = await Ordinance.insertMany(ordinancesData);
  console.log(`✓ 10 Ordinances/Resolutions created.`);

  // 4.3 SESSIONS (10 records)
  console.log('--> Creating 10 Legislative Sessions...');
  const allSbMemberIds = preservedSbMembers.map(m => m._id);
  
  const sessionsData = [];
  for (let i = 1; i <= 10; i++) {
    const sessionDate = new Date(`2026-0${Math.min(i, 6)}-${10 + (i % 15)}`);
    // Attendance rotation
    const presentMembers = allSbMemberIds.slice(0, 9);
    const obMembers = allSbMemberIds.slice(9, 10);
    const absentMembers = allSbMemberIds.slice(10);

    const relatedOrdinance = createdOrdinances[(i - 1) % createdOrdinances.length];

    sessionsData.push({
      title: `${i}${i === 1 ? 'st' : i === 2 ? 'nd' : i === 3 ? 'rd' : 'th'} Regular Session of the 12th Sangguniang Bayan`,
      date: sessionDate,
      createdBy: secretaryUser._id,
      itemsDiscussed: [relatedOrdinance._id],
      attendance: {
        present: presentMembers,
        onOfficialBusiness: obMembers,
        absent: absentMembers
      },
      callToOrder: `The ${i}th Regular Session of the 12th Sangguniang Bayan was called to order at exactly 9:00 AM by the Presiding Officer.`,
      invocation: 'Led by the designated council member, followed by the singing of the Philippine National Anthem and Bongabong Hymn.',
      rollCall: 'Secretary Maria Clara called the roll. A quorum was declared with a majority of council members present.',
      readingOfPreviousMinutes: `The minutes of the preceding regular session were reviewed, corrected, and adopted without objection.`,
      citizensHour: `Constituents from Barangay ${BONGABONG_BARANGAYS[i % BONGABONG_BARANGAYS.length]} presented petitions concerning local road and lighting improvements.`,
      questionHour: `Department heads answered council inquiries regarding project timelines and expenditure reports.`,
      committeeReport: `Chairpersons submitted formal reports on measures referred for study and hearing.`,
      firstReading: `Deliberated on draft ordinance: ${relatedOrdinance.title}`,
      unfinishedBusiness: 'Review of municipal development fund allocations for the current fiscal quarter.',
      referralForAction: 'Transmitted approved legislative resolutions to the executive department for operational execution.',
      adjournment: `There being no other matters to discuss, the session was officially adjourned at 12:30 PM.`,
      status: i <= 8 ? 'Final' : 'Draft'
    });
  }

  await Session.insertMany(sessionsData);
  console.log(`✓ 10 Sessions created.`);

  // 4.4 CONSULTATION FEEDBACK (10 records across real Bongabong barangays)
  console.log('--> Creating 10 Consultation Feedback records...');
  // Ordinances 2 and 3 are in 'Public Consultation' status
  const targetOrd1 = createdOrdinances[1]; // Curfew
  const targetOrd2 = createdOrdinances[2]; // Health desks

  const feedbackData = [
    {
      ordinanceId: targetOrd1._id,
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
      ordinanceId: targetOrd1._id,
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
      ordinanceId: targetOrd1._id,
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
      ordinanceId: targetOrd1._id,
      full_name: 'Maricel P. Ramos',
      barangay: 'Lisap',
      contact_number: '09181112204',
      id_attachment_url: '/uploads/id_samples/maricel_id.jpg',
      vote: 'Agree',
      comment: 'Malaking tulong po ito sa aming mga magulang para maprotektahan ang aming mga anak.',
      status: 'Approved',
      sentiment: 'Positive',
      data_privacy_consent: true,
      approved_by: secretaryUser._id,
      approved_at: new Date('2026-03-25')
    },
    {
      ordinanceId: targetOrd1._id,
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
      ordinanceId: targetOrd2._id,
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
      ordinanceId: targetOrd2._id,
      full_name: 'Vicente F. Morales',
      barangay: 'Formon',
      contact_number: '09181112207',
      id_attachment_url: '/uploads/id_samples/vicente_id.jpg',
      vote: 'Agree',
      comment: 'Suportado ng buong komunidad namin ang emergency health desk sa barangay hall.',
      status: 'Approved',
      sentiment: 'Positive',
      data_privacy_consent: true,
      approved_by: secretaryUser._id,
      approved_at: new Date('2026-04-27')
    },
    {
      ordinanceId: targetOrd2._id,
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
      ordinanceId: targetOrd2._id,
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
      ordinanceId: targetOrd2._id,
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

  await ConsultationFeedback.insertMany(feedbackData);
  console.log(`✓ 10 Consultation Feedback records created.`);

  // 4.5 ANNOUNCEMENTS (10 records)
  console.log('--> Creating 10 Announcements...');
  const announcementsData = [
    {
      title: 'Notice of Public Hearing: Proposed Curfew Ordinance for Minors in Bongabong',
      slug: 'notice-public-hearing-curfew-ordinance',
      excerpt: 'The Sangguniang Bayan invites all barangay officials, parent associations, and youth leaders to participate in the public consultation.',
      content: '<p>The Committee on Peace and Order cordially invites all citizens to the Legislative Session Hall on June 15, 2026, at 9:00 AM for the public discussion on Ordinance No. 2026-002.</p>',
      category: 'Public Consultation',
      author: 'Sangguniang Bayan ng Bongabong',
      isPublished: true,
      publishedAt: new Date('2026-05-01'),
      isFeatured: true,
      tags: ['Curfew', 'Public Hearing', 'Peace and Order']
    },
    {
      title: 'Implementation Guidelines for the Single-Use Plastics Regulation Ordinance',
      slug: 'implementation-guidelines-plastics-regulation',
      excerpt: 'Business permits will require compliance with eco-friendly packaging beginning the next fiscal quarter.',
      content: '<p>All retail establishments and market vendors are reminded of Ordinance No. 2026-001 enacted by the council. Please switch to bio-degradable alternatives.</p>',
      category: 'Ordinance Update',
      author: 'Office of the Secretary to the Sangguniang Bayan',
      isPublished: true,
      publishedAt: new Date('2026-04-15'),
      isFeatured: true,
      tags: ['Environment', 'Plastics', 'Commercial']
    },
    {
      title: 'Schedule of Regular Legislative Sessions for the Month of July 2026',
      slug: 'schedule-regular-sessions-july-2026',
      excerpt: 'The 12th Sangguniang Bayan convenes every Monday morning at the 2nd Floor Executive and Legislative Hall.',
      content: '<p>Regular council sessions are open to the viewing public and accredited media. Citizen participation hour commences at 10:00 AM.</p>',
      category: 'Session Notice',
      author: 'Sangguniang Bayan ng Bongabong',
      isPublished: true,
      publishedAt: new Date('2026-06-25'),
      tags: ['Sessions', 'Calendar', 'Public Notice']
    },
    {
      title: 'Sangguniang Bayan Commends Bongabong Farmers on Record Crop Harvest',
      slug: 'sb-commends-bongabong-farmers-harvest',
      excerpt: 'Resolution enacted recognizing the agricultural cooperatives of Bongabong for sustained food resilience.',
      content: '<p>Through Resolution No. 2026-009, the municipal council salutes our hardworking farmers for excellent yields during the summer cropping cycle.</p>',
      category: 'Press Release',
      author: 'Committee on Agriculture',
      isPublished: true,
      publishedAt: new Date('2026-03-10'),
      tags: ['Agriculture', 'Commendation']
    },
    {
      title: 'SP Corner: Understanding the Legislative Process of Local Ordinances',
      slug: 'sp-corner-understanding-legislative-process',
      excerpt: 'An educational primer on how citizen ideas turn into enacted municipal ordinances in Bongabong.',
      content: '<p>Learn about First Reading, Committee Hearings, Citizen Consultation, Second Reading amendments, and Mayoral approval.</p>',
      category: 'SP Corner',
      author: 'Legislative Research Division',
      isPublished: true,
      publishedAt: new Date('2026-02-18'),
      tags: ['Civic Education', 'Legislation']
    },
    {
      title: 'Call for Applications: Municipal Tertiary Education Financial Assistance Program',
      slug: 'call-applications-tertiary-scholarship-program',
      excerpt: 'College students from low-income households may now submit scholarship application forms at the SB Secretariat.',
      content: '<p>In line with Ordinance No. 2026-005, slots are open for qualified Bongabong college students. Deadline is July 30, 2026.</p>',
      category: 'General',
      author: 'Committee on Education',
      isPublished: true,
      publishedAt: new Date('2026-06-01'),
      tags: ['Scholarship', 'Education', 'Youth']
    },
    {
      title: 'Advisory on Emergency Drainage Canal Desilting Along Coastal Barangays',
      slug: 'advisory-drainage-desilting-coastal-barangays',
      excerpt: 'Public works maintenance scheduled in Barangays Poblacion, Aplaya, and Labasan ahead of the rainy season.',
      content: '<p>Motorists and residents are advised of partial lane closures during drainage excavation operations.</p>',
      category: 'General',
      author: 'Committee on Infrastructure',
      isPublished: true,
      publishedAt: new Date('2026-05-20'),
      tags: ['Infrastructure', 'Flood Control']
    },
    {
      title: 'Digital Portal Citizen Feedback Milestone Reached on iBOSys',
      slug: 'digital-portal-citizen-feedback-milestone',
      excerpt: 'Over 500 verified residents have submitted electronic feedback and votes on pending municipal ordinances.',
      content: '<p>The local government celebrates transparent digital democracy powered by the iBOSys platform.</p>',
      category: 'Press Release',
      author: 'Office of the Vice Mayor',
      isPublished: true,
      publishedAt: new Date('2026-04-30'),
      tags: ['iBOSys', 'Good Governance', 'Civic Tech']
    },
    {
      title: 'Free Rabies Vaccination and Pet Registration Caravan Announced',
      slug: 'free-rabies-vaccination-caravan-announced',
      excerpt: 'Municipal Agriculture and Veterinary team to tour 10 barangays next week for rabies eradication.',
      content: '<p>Protect your pets and family. Free anti-rabies shots will be administered at barangay covered courts.</p>',
      category: 'General',
      author: 'Municipal Health & Agriculture Office',
      isPublished: true,
      publishedAt: new Date('2026-03-15'),
      tags: ['Health', 'Veterinary', 'Safety']
    },
    {
      title: 'Celebration of Bongabong Founding Anniversary and Cultural Heritage Week',
      slug: 'celebration-bongabong-anniversary-heritage-week',
      excerpt: 'Special commemorative session scheduled honoring historic leaders and community champions.',
      content: '<p>Join the town-wide cultural festivities, indigenous sports exhibitions, and grand civic parade.</p>',
      category: 'General',
      author: 'Sangguniang Bayan ng Bongabong',
      isPublished: true,
      publishedAt: new Date('2026-06-10'),
      tags: ['Heritage', 'Anniversary', 'Festival']
    }
  ];

  await Announcement.insertMany(announcementsData);
  console.log(`✓ 10 Announcements created.`);


  // 4.7 NOTIFICATIONS (10 records)
  console.log('--> Creating 10 Notifications...');
  const notificationsData = [
    {
      recipientId: secretaryUser._id,
      title: 'New Citizen Feedback Submitted',
      message: 'A verified constituent from Brgy. Poblacion submitted a vote on Ordinance No. 2026-002.',
      isRead: false,
      link: '/consultation-verification'
    },
    {
      recipientId: viceMayorUser._id,
      title: 'Legislative Calendar Updated',
      message: 'Session schedule for the next quarter has been posted. Please check the sessions page.',
      isRead: false,
      link: '/sessions'
    },
    {
      recipientId: adminUser._id,
      title: 'System Backup Completed',
      message: 'Automated database snapshot verified and archived securely.',
      isRead: true,
      link: '/admin/system'
    },
    {
      recipientId: secretaryUser._id,
      title: 'Session Minutes Draft Ready',
      message: 'Proceedings for the 8th Regular Session are ready for final signing.',
      isRead: true,
      link: '/sessions'
    },
    {
      recipientId: viceMayorUser._id,
      title: 'New Ordinance Filed for First Reading',
      message: 'Hon. Candelario sponsored a new ordinance regarding environmental protection.',
      isRead: false,
      link: '/ordinances'
    },
    {
      recipientId: createdUsers[3]._id, // SB Member Candelario
      title: 'Committee Hearing Scheduled',
      message: 'Your committee hearing on waste management is set for Monday at 10:00 AM.',
      isRead: false,
      link: '/committees'
    },
    {
      recipientId: createdUsers[4]._id, // SB Member Liwanag
      title: 'Public Consultation Feedback Summary',
      message: '10 new citizen comments were received for your sponsored health measure.',
      isRead: false,
      link: '/ordinances'
    },
    {
      recipientId: secretaryUser._id,
      title: 'Mayor Transmittal Received',
      message: 'Office of the Municipal Mayor returned signed copies of Ordinance No. 2026-001.',
      isRead: true,
      link: '/ordinances'
    },
    {
      recipientId: viceMayorUser._id,
      title: 'Upcoming Provincial SP Review',
      message: 'Provincial Board of Oriental Mindoro acknowledged receipt of municipal ordinances.',
      isRead: true,
      link: '/ordinances'
    },
    {
      recipientId: adminUser._id,
      title: 'Security Audit Passed',
      message: 'Zod validation and rate limiting operational with zero unauthorized attempts.',
      isRead: true,
      link: '/admin/system'
    }
  ];

  await Notification.insertMany(notificationsData);
  console.log(`✓ 10 Notifications created.`);

  // Step 5: VERIFICATION SUMMARY
  console.log('\n[Step 5/5] Compiling final verification statistics...');
  const collectionsList = await db.listCollections().toArray();
  const summary = {};

  for (const c of collectionsList) {
    const count = await db.collection(c.name).countDocuments();
    summary[c.name] = count;
  }

  console.log('\n================================================================');
  console.log('              FINAL DATABASE STATE & DOCUMENT COUNTS             ');
  console.log('================================================================');
  console.table(summary);

  console.log('\n================================================================');
  console.log('                  ROLLBACK INSTRUCTIONS (SAFETY)                 ');
  console.log('================================================================');
  console.log(`To revert this entire operation back to before the cleanup, run:`);
  console.log(`  npm run rollback`);
  console.log(`  OR: node scripts/rollback.js "${backupFile}"`);
  console.log('================================================================\n');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('[Error during clean and seed]:', err);
  process.exit(1);
});
