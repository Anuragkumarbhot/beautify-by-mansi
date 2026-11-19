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
];

export default function HomePage() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="/" aria-label="Beautify by Mansi home">
          BEAUTIFY <span>by Mansi</span>
        </a>
        <nav aria-label="Main navigation">
          <a href="#services">Services</a>
          <a href="/shop">Shop nails</a>
          <a href="/book">Appointments</a>
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
          <a className="button button-primary" href="/book">Enquire about an appointment</a>
          <a className="button button-secondary" href="/shop">Explore press-on nails</a>
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
              <a href={service.href}>Discover more <span aria-hidden="true">↗</span></a>
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
