const portraits = [
  { names: ['arnoldavillanueva'], image: '/official-council/arnold-villanueva.jpg' },
  { names: ['cindeefgunosibulan', 'cindeegunosibulan', 'cindeevgunosibulan'], image: '/official-council/cindee-guno-sibulan.jpg' },
  { names: ['joserodneylliwanag', 'joserodneyliwanag', 'dodieliwanag'], image: '/official-council/jose-rodney-liwanag.jpg' },
  { names: ['jeremyienriquez', 'jeremyenriquez', 'emyenriquez'], image: '/official-council/jeremy-enriquez.jpg' },
  { names: ['jeffreybalea', 'jeffreyalea'], image: '/official-council/jeffrey-alea.jpg' },
  { names: ['melodyfmonreal', 'melodymonreal'], image: '/official-council/melody-monreal.jpg' },
  { names: ['ninafatienza', 'ninaatienza'], image: '/official-council/nina-atienza.jpg' },
  { names: ['nataliogdoce', 'nataliodoce'], image: '/official-council/natalio-doce.jpg' },
  { names: ['richardscandelario', 'richardcandelario', 'totoycandelario'], image: '/official-council/richard-candelario.jpg' },
  { names: ['jheremyromanabel', 'jheremyabel', 'jheremyromanfabel'], image: '/official-council/jheremy-abel.jpg' },
  { names: ['jaysonmbarcelona', 'jaysonbarcelona'], image: '/official-council/jayson-barcelona.jpg' },
  { names: ['lawinaylgiayan', 'lawinaygiayan', 'lawingiayan'], image: '/official-council/ipmr-giayan.jpg' },
  { names: ['eduardommagsino', 'eduardomagsino'], image: '/official-council/attorney-magsino.jpg' },
];

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

export function officialCouncilPortrait(member) {
  const uploadedPortrait = member?.photoUrl?.trim();
  if (uploadedPortrait) return uploadedPortrait;

  const identity = normalize([
    member?.firstName,
    member?.middleName,
    member?.lastName,
    member?.name,
    member?.fullName,
  ].filter(Boolean).join(' '));
  const identityWithoutMiddle = normalize([member?.firstName, member?.lastName].filter(Boolean).join(' '));
  return portraits.find(({ names }) => names.some((name) => identity.includes(name) || identityWithoutMiddle.includes(name)))?.image || null;
}
