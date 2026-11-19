const express = require('express');
const router = express.Router();
const Term = require('../models/Term'); // Used by the migrate route
const Committee = require('../models/Committee'); // Used by the migrate route
const { protect, authorize } = require('../middleware/auth');
const { getCommittees, updateCommittee, ensureTermCommittees } = require('../controllers/committeeController');
const validate = require('../middleware/validate');
const { updateCommitteeSchema, ensureTermCommitteesSchema } = require('../validations/committeeValidation');
const { ROLES } = require('../utils/constants');

router.get('/', protect, getCommittees);

router.post('/ensure-term-defaults',
  protect,
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN),
  validate(ensureTermCommitteesSchema),
  ensureTermCommittees
);

router.put('/:id', 
  protect, 
  authorize(ROLES.SECRETARY, ROLES.SYSTEM_ADMIN), 
  validate(updateCommitteeSchema), 
  updateCommittee
);

router.post('/migrate-2025', protect, authorize(ROLES.SYSTEM_ADMIN), async (req, res) => {
  const committeeData = [
    {
      name: 'Committee on Appropriation, Infrastructure and Power and Energy',
      chairperson: 'Hon. RICHARD S. CANDELARIO',
      viceChairperson: 'Hon. JOSE RODNEY L. LIWANAG',
      members: ['Hon. JEFFREY B. ALEA', 'Hon. JEREMY I. ENRIQUEZ', 'Hon. NIÑA F. ATIENZA, DMD']
    },
    {
      name: 'Committee on Social Welfare, Disaster Risk Reduction and Management and Community Driven Development',
      chairperson: 'Hon. JEFFREY B. ALEA',
      viceChairperson: 'Hon. Atty. CINDEE V. GUNO-SIBULAN',
      members: ['Hon. JEREMY I. ENRIQUEZ', 'Hon. NIÑA F. ATIENZA, DMD', 'Hon. JOSE RODNEY L. LIWANAG']
    },
    {
      name: 'Committee on Agriculture and Games and Amusement',
      chairperson: 'Hon. JEREMY I. ENRIQUEZ',
      viceChairperson: 'Hon. JEFFREY B. ALEA',
      members: ['Hon. NIÑA F. ATIENZA, DMD', 'Hon. JOSE RODNEY L. LIWANAG', 'Hon. MELODY F. MONREAL']
    },
    {
      name: 'Committee on Health, Livelihood and Civil Society Organizations',
      chairperson: 'Hon. NIÑA F. ATIENZA, DMD',
      viceChairperson: 'Hon. JEFFREY B. ALEA',
      members: ['Hon. JOSE RODNEY L. LIWANAG', 'Hon. Atty. CINDEE V. GUNO-SIBULAN', 'Hon. JHEREMY ROMAN F. ABEL']
    },
    {
      name: 'Committee on Ways and Means, Trade and Industry, Land Use, Labor and Human Resource, Overseas Filipino Workers, Oversight and Sisterhood',
      chairperson: 'Hon. JOSE RODNEY L. LIWANAG',
      viceChairperson: 'Hon. RICHARD S. CANDELARIO',
      members: ['Hon. JEFFREY B. ALEA', 'Hon. JEREMY I. ENRIQUEZ', 'Hon. NIÑA F. ATIENZA, DMD']
    },
    {
      name: 'Committee on Environment, Grievances, Human Rights, Cooperative, Market and Economic Enterprise',
      chairperson: 'Hon. MELODY F. MONREAL',
      viceChairperson: 'Hon. Atty. CINDEE V. GUNO-SIBULAN',
      members: ['Hon. NIÑA F. ATIENZA, DMD', 'Hon. ARNOLD A. VILLANUEVA', 'Hon. JHEREMY ROMAN F. ABEL']
    },
    {
      name: 'Committee on Tourism, Transportation, Peace and Order and Beautification',
      chairperson: 'Hon. ARNOLD A. VILLANUEVA',
      viceChairperson: 'Hon. Atty. CINDEE V. GUNO-SIBULAN',
      members: ['Hon. JEFFREY B. ALEA', 'Hon. MELODY F. MONREAL', 'Hon. JHEREMY ROMAN F. ABEL']
    },
    {
      name: 'Committee on Education, Culture and Arts, Legal Matters, House Rules, Ordinances, Technical and Vocational Education, Good Governance, Public Ethics and Accountability',
      chairperson: 'Hon. Atty. CINDEE V. GUNO-SIBULAN',
      viceChairperson: 'Hon. ARNOLD A. VILLANUEVA',
      members: ['Hon. JEFFREY B. ALEA', 'Hon. MELODY F. MONREAL', 'Hon. JHEREMY ROMAN F. ABEL']
    },
    {
      name: 'Committee on Youth and Sports Development, Science and Technology and Information and Communication Technology',
      chairperson: 'Hon. JHEREMY ROMAN F. ABEL',
      viceChairperson: 'Hon. ARNOLD A. VILLANUEVA',
      members: ['Hon. JEFFREY B. ALEA', 'Hon. NIÑA F. ATIENZA, DMD', 'Hon. Atty. CINDEE V. GUNO-SIBULAN']
    },
    {
      name: 'Committee on Barangay Affairs',
      chairperson: 'Hon. NATALIO G. DOCE',
      viceChairperson: 'Hon. Atty. CINDEE V. GUNO-SIBULAN',
      members: ['Hon. NIÑA F. ATIENZA, DMD', 'Hon. ARNOLD A. VILLANUEVA', 'Hon. MELODY F. MONREAL']
    }
  ];

  try {
    const term = await Term.findOne({ label: { $regex: /2025.*2028/i } });
    if (!term) return res.status(404).json({ message: 'Could not find 2025-2028 term.' });

    const results = [];
    for (const data of committeeData) {
      const committee = await Committee.findOne({ name: data.name, termId: term._id });
      if (committee) {
        committee.chairperson = data.chairperson;
        committee.viceChairperson = data.viceChairperson;
        committee.members = data.members;
        await committee.save();
        results.push({ action: 'updated', name: data.name });
      } else {
        const newComm = new Committee({ name: data.name, termId: term._id, ...data });
        await newComm.save();
        results.push({ action: 'created', name: data.name });
      }
    }

    res.json({ success: true, term: term.label, results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
