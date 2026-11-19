import arnold from '../assets/official-council/arnold-villanueva.jpg';
import cindee from '../assets/official-council/cindee-guno-sibulan.jpg';
import dodie from '../assets/official-council/jose-rodney-liwanag.jpg';
import jeremy from '../assets/official-council/jeremy-enriquez.jpg';
import jeffrey from '../assets/official-council/jeffrey-alea.jpg';
import melody from '../assets/official-council/melody-monreal.jpg';
import nina from '../assets/official-council/nina-atienza.jpg';
import natalio from '../assets/official-council/natalio-doce.jpg';
import richard from '../assets/official-council/richard-candelario.jpg';
import jheremy from '../assets/official-council/jheremy-abel.jpg';
import jayson from '../assets/official-council/jayson-barcelona.jpg';
import lawin from '../assets/official-council/ipmr-giayan.jpg';
import eduardo from '../assets/official-council/attorney-magsino.jpg';

const portraits = [
  { names: ['arnoldavillanueva'], image: arnold },
  { names: ['cindeefgunosibulan', 'cindeegunosibulan', 'cindeevgunosibulan'], image: cindee },
  { names: ['joserodneyl liwanag', 'joserodneylliwanag', 'joserodneyliwanag', 'dodie liwanag'], image: dodie },
  { names: ['jeremyienriquez', 'jeremyenriquez', 'emyenriquez'], image: jeremy },
  { names: ['jeffreybalea', 'jeffreyalea'], image: jeffrey },
  { names: ['melodyfmonreal', 'melodymonreal'], image: melody },
  { names: ['ninafatienza', 'ninaatienza'], image: nina },
  { names: ['nataliogdoce', 'nataliodoce'], image: natalio },
  { names: ['richardscandelario', 'richardcandelario', 'totoycandelario'], image: richard },
  { names: ['jheremyromanabel', 'jheremyabel', 'jheremyromanfabel'], image: jheremy },
  { names: ['jaysombarcelona', 'jaysonmbarcelona', 'jaysonbarcelona'], image: jayson },
  { names: ['lawinaylgiayan', 'lawinaygiayan', 'lawingiayan'], image: lawin },
  { names: ['eduardommagsino', 'eduardomagsino'], image: eduardo },
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
  return portraits.find(({ names }) => names.some((name) => {
    const normalizedName = normalize(name);
    return identity.includes(normalizedName) || identityWithoutMiddle.includes(normalizedName);
  }))?.image || null;
}
