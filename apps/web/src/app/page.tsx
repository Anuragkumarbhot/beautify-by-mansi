import Link from "next/link";

const services = [
  {
    title: "Makeup Artistry",
    description: "Makeup for bridal celebrations, parties, and meaningful occasions.",
    href: "/services/makeup",
  },
  {
    title: "Press-on Nails",
    description: "Wearable nail designs with sizing options and custom details.",
    href: "/shop",
  },
  {
    title: "Studio Appointments",
    description: "Enquire about availability and plan your beauty appointment.",
    href: "/book",
  },
  {
    title: "Training & Academy",
    description: "Explore online and offline makeup artistry and nail technician classes.",
    href: "/academy",
  },
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Beautify by Mansi home">
          BEAUTIFY <span>by Mansi</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#services">Services</a>
          <Link href="/academy">Academy</Link>
          <Link href="/shop">Shop nails</Link>
          <Link href="/book">Appointments</Link>
        </nav>
      </header>

      <section className="hero">
        <p className="eyebrow">MAKEUP ARTISTRY · NAIL DESIGN</p>
        <h1>Feel beautiful.<br /><em>Be unforgettable.</em></h1>
        <p className="hero-copy">
          Thoughtful beauty experiences, personal artistry, and press-on nails
          designed to make every detail feel like you.
        </p>
        <div className="hero-actions">
          <Link className="button button-primary" href="/book">Enquire about an appointment</Link>
          <Link className="button button-secondary" href="/shop">Explore press-on nails</Link>
        </div>
        <p className="hero-note">A new digital experience is taking shape.</p>
      </section>

      <section className="services" id="services">
        <div className="section-heading">
          <p className="eyebrow">THE BEAUTY EDIT</p>
          <h2>Beauty, with a personal touch.</h2>
        </div>
        <div className="service-grid">
          {services.map((service) => (
            <article className="service-card" key={service.title}>
              <p className="card-index">0{services.indexOf(service) + 1}</p>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <Link href={service.href}>Discover more <span aria-hidden="true">↗</span></Link>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Beautify by Mansi</span>
        <span>Beauty, thoughtfully created.</span>
      </footer>
    </main>
  );
}
