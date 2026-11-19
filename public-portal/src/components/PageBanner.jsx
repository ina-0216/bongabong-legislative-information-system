import heroImg from '../assets/hero.png';

export default function PageBanner({ title, subtitle, bgImage = heroImg }) {
  return (
    <section className="v11-band dark v11-page-banner">
      {bgImage && <img src={bgImage} alt="" className="v11-page-banner-image" />}
      <div className="v11-page-banner-scrim" aria-hidden="true" />
      <div className="container v11-page-banner-inner">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </section>
  );
}