const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Ordinance = require('../models/Ordinance');
const { assertFixtureSeedingAllowed } = require('../utils/seedSafety');


const seedDatabase = async () => {
  assertFixtureSeedingAllowed();
  try {
    console.log('Seeding database with mock data...');

    await User.deleteMany({});
    await Ordinance.deleteMany({});


    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin@1234', salt);
    const secretaryPassword = await bcrypt.hash('Secretary@1234', salt);
    const viceMayorPassword = await bcrypt.hash('ViceMayor@1234', salt);
    const memberPassword = await bcrypt.hash('Member@1234', salt);

    const admin = await User.create({
      firstName: 'System',
      lastName: 'Administrator',
      email: 'admin@ibosys.gov',
      password: adminPassword,
      role: 'System Admin',
      contactNumber: '09000000000',
      status: 'Active'
    });

    const secretary = await User.create({
      firstName: 'Maria',
      lastName: 'Clara',
      email: 'secretary@ibosys.gov',
      password: secretaryPassword,
      role: 'Secretary',
      contactNumber: '09111111111',
      status: 'Active'
    });

    const viceMayor = await User.create({
      firstName: 'Juan',
      lastName: 'Dela Cruz',
      email: 'vicemayor@ibosys.gov',
      password: viceMayorPassword,
      role: 'Vice Mayor',
      position: 'Vice Mayor',
      contactNumber: '09222222222',
      status: 'Active'
    });

    const sbMember1 = await User.create({
      firstName: 'Carlos',
      middleName: 'P.',
      lastName: 'Romulo',
      email: 'romulo@ibosys.gov',
      password: memberPassword,
      role: 'SB Member',
      position: 'Committee Chair on Environment',
      contactNumber: '09333333333',
      status: 'Active'
    });

    const sbMember2 = await User.create({
      firstName: 'Jose',
      lastName: 'Rizal',
      email: 'rizal@ibosys.gov',
      password: memberPassword,
      role: 'SB Member',
      position: 'Committee Chair on Peace & Order',
      contactNumber: '09333333334',
      status: 'Active'
    });


    console.log('Users seeded successfully!');


    const ord1 = await Ordinance.create({
      number: '2026-001',
      title: 'An Ordinance Regulating the Use of Single-Use Plastics within the Municipality',
      proponentId: sbMember1._id,
      committee: 'Environmental Protection',
      sectorTag: 'Environment',
      explanatoryNote: 'Single-use plastics pose a major threat to our municipal drains and ecosystems. This ordinance seeks to ban single-use plastics in commercial establishments.',
      enactingClause: 'Be it enacted by the Sangguniang Bayan of the Municipality of iBOSys.',
      provisions: 'Section 1. Prohibition on Single-Use Plastics in supermarkets and restaurants. Section 2. Alternatives: Establishments shall encourage reusable bags.',
      penaltyClause: 'First offense: PHP 1,000. Second offense: PHP 2,500. Third offense: PHP 5,000.',
      effectivityDate: new Date('2026-06-01'),
      status: 'Approved',
      isLocked: true,
      createdAt: new Date('2026-01-10'),
      plainLanguageSummary: 'This ordinance bans single-use plastics in all local stores and restaurants to protect the environment.',
      timeline: [
        { status: 'First Reading', notes: 'First reading session completed.', updatedBy: secretary._id, date: new Date('2026-01-10') },
        { status: 'Committee Assignment', notes: 'Assigned to Environmental Protection Committee.', updatedBy: secretary._id, date: new Date('2026-01-15') },
        { status: 'Committee Hearing', notes: 'Hearing held with local business associations.', updatedBy: secretary._id, date: new Date('2026-02-01') },
        { status: 'Public Consultation', notes: 'Public consultation period opened.', updatedBy: secretary._id, date: new Date('2026-02-10') },
        { status: 'Second Reading', notes: 'Approved during second reading with amendments.', updatedBy: secretary._id, date: new Date('2026-03-01') },
        { status: 'Third Reading', notes: 'Final reading and voting completed.', updatedBy: secretary._id, date: new Date('2026-03-15') },
        { status: 'For Mayor\'s Signature', notes: 'Transmitted to Mayor\'s office.', updatedBy: secretary._id, date: new Date('2026-03-20') },
        { status: 'For SP Review', notes: 'Signed by Mayor, submitted for Provincial review.', updatedBy: secretary._id, date: new Date('2026-04-01') },
        { status: 'Approved', notes: 'Provincial review completed, officially approved.', updatedBy: secretary._id, date: new Date('2026-04-15') }
      ]
    });

    const ord2 = await Ordinance.create({
      number: '2026-002',
      title: 'An Ordinance Prescribing Curfew Hours for Minors from 10:00 PM to 4:00 AM',
      proponentId: sbMember2._id,
      committee: 'Peace and Order',
      sectorTag: 'Social Services',
      explanatoryNote: 'To promote the safety and welfare of minors and reduce juvenile delinquency, this ordinance establishes municipal curfew hours.',
      enactingClause: 'Be it enacted by the Sangguniang Bayan of the Municipality of iBOSys.',
      provisions: 'Section 1. Curfew hours from 10:00 PM to 4:00 AM for minors under 18 years old. Section 2. Exemptions for work, education, and family emergencies.',
      penaltyClause: 'First offense: Warning. Second offense: Community service. Third offense: Parent counseling and PHP 500 fine.',
      effectivityDate: new Date('2026-07-01'),
      status: 'Public Consultation',
      isLocked: false,
      createdAt: new Date('2026-04-20'),
      plainLanguageSummary: 'Minors under 18 years of age are not allowed in public spaces from 10 PM to 4 AM unless accompanied by parents or for work/school.',
      timeline: [
        { status: 'First Reading', notes: 'Draft introduced.', updatedBy: secretary._id, date: new Date('2026-04-20') },
        { status: 'Committee Assignment', notes: 'Assigned to Committee on Peace and Order.', updatedBy: secretary._id, date: new Date('2026-04-25') },
        { status: 'Committee Hearing', notes: 'Conducted hearing with barangay captains.', updatedBy: secretary._id, date: new Date('2026-05-05') },
        { status: 'Public Consultation', notes: 'Public consultation launched on the iBOSys portal.', updatedBy: secretary._id, date: new Date('2026-05-10') }
      ]
    });

    const ord3 = await Ordinance.create({
      number: '2026-003',
      title: 'An Ordinance Establishing Barangay Health and Wellness Desks',
      proponentId: sbMember1._id,
      committee: 'Health and Sanitation',
      sectorTag: 'Health',
      explanatoryNote: 'To bring primary healthcare closer to the grassroots, health desks must be set up in every barangay.',
      enactingClause: 'Be it enacted by the Sangguniang Bayan of the Municipality of iBOSys.',
      provisions: 'Section 1. Installation of a Health Desk in each barangay hall. Section 2. Deployment of barangay health workers.',
      penaltyClause: 'Non-compliance by barangay officials will be subject to administrative review.',
      effectivityDate: new Date('2026-08-01'),
      status: 'First Reading',
      isLocked: false,
      createdAt: new Date('2026-05-20'),
      plainLanguageSummary: 'Every barangay hall will have a designated health desk with trained health workers to offer primary care.',
      timeline: [
        { status: 'First Reading', notes: 'Introduced by Hon. Romulo.', updatedBy: secretary._id, date: new Date('2026-05-20') }
      ]
    });

    console.log('Ordinances seeded successfully!');





    console.log('Database seeding complete!');
  } catch (error) {
    console.error('Error seeding database:', error.message);
  }
};

module.exports = seedDatabase;
