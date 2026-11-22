import type { Metadata } from "next";
import Link from "next/link";
import { StoreHeader } from "@/components/store-header";

export const metadata: Metadata = {
  title: "Training & Academy",
  description:
    "Explore online and offline makeup artistry and nail technician training with Beautify by Mansi.",
};

const makeupTopics = [
  "Skin preparation, hygiene and client consultation",
  "Tools, products, colour matching and complexion basics",
  "Base makeup, concealing, contouring and highlighting",
  "Eye makeup, brows, lashes and occasion looks",
  "Bridal and party makeup techniques with portfolio practice",
];

const nailTopics = [
  "Nail anatomy, sanitation and safe nail preparation",
  "Manicure fundamentals and natural nail care",
  "Gel polish, extensions and professional finishing",
  "Nail art, design planning and product knowledge",
  "Press-on nail sizing, custom design, application and aftercare",
];

const deliveryModes = [
  {
    number: "01",
    title: "Online training",
    label: "Learn from your own space",
    description:
      "A convenient learning format for students who prefer to join remotely. Batch details can include instructor demonstrations, guided practice tasks and feedback, depending on the selected programme.",
    points: ["Remote learning", "Demonstration-led lessons", "Practice tasks and guidance"],
  },
  {
    number: "02",
    title: "Offline training",
    label: "Learn with practical guidance",
    description:
      "In-person classes for students who want to learn techniques through trainer demonstrations and supervised hands-on practice at the scheduled training location.",
    points: ["In-person instruction", "Hands-on skill practice", "Direct trainer guidance"],
  },
];

export default function AcademyPage() {
  return (
    <>
      <StoreHeader />
      <main className="academy-page">
        <section className="academy-hero">
          <div className="academy-container academy-hero-grid">
            <div className="academy-hero-copy">
              <p className="academy-eyebrow">BEAUTIFY BY MANSI · TRAINING & ACADEMY</p>
              <h1>Turn your passion<br /><em>into your skill.</em></h1>
              <p className="academy-lead">
                Learn makeup artistry and nail technology through online or
                offline training formats. Build your technique, confidence and
                creative point of view with guided learning.
              </p>
              <div className="academy-hero-actions">
                <Link className="academy-button academy-button-primary" href="#programmes">
                  Explore classes
                </Link>
                <Link className="academy-button academy-button-secondary" href="#enquiry">
                  Enquire about batches
                </Link>
              </div>
              <div className="academy-tags" aria-label="Training options">
                <span>Makeup artistry</span>
                <span>Nail technology</span>
                <span>Online & offline</span>
              </div>
            </div>
            <aside className="academy-hero-panel">
              <span className="academy-panel-mark" aria-hidden="true">B·M</span>
              <p className="academy-panel-kicker">THE BEAUTY SKILLS EDIT</p>
              <h2>Learn the craft.<br /><em>Create your signature.</em></h2>
              <p>
                A learning space for aspiring makeup artists and nail
                technicians, from foundational techniques to creative practice.
              </p>
            </aside>
          </div>
        </section>

        <section className="academy-section academy-container" id="formats">
          <div className="academy-section-heading">
            <p className="academy-eyebrow">CHOOSE HOW YOU LEARN</p>
            <h2>Two ways to learn.<br /><em>One creative direction.</em></h2>
            <p>
              Choose the format that suits your schedule and learning style.
              Availability, lesson structure and practical requirements are
              confirmed for each batch.
            </p>
          </div>
          <div className="academy-format-grid">
            {deliveryModes.map((mode) => (
              <article className="academy-format-card" key={mode.number}>
                <span className="academy-card-number">{mode.number}</span>
                <p className="academy-card-label">{mode.label}</p>
                <h3>{mode.title}</h3>
                <p className="academy-card-description">{mode.description}</p>
                <ul>
                  {mode.points.map((point) => <li key={point}>{point}</li>)}
                </ul>
                <Link href="#enquiry">Ask about this format <span aria-hidden="true">↗</span></Link>
              </article>
            ))}
          </div>
        </section>

        <section className="academy-programmes" id="programmes">
          <div className="academy-container">
            <div className="academy-section-heading">
              <p className="academy-eyebrow">OUR LEARNING PATHS</p>
              <h2>Choose your area<br /><em>of expertise.</em></h2>
              <p>
                Explore the two core programmes. The exact syllabus and
                techniques covered will be shared with you before enrolment.
              </p>
            </div>
            <div className="academy-course-grid">
              <article className="academy-course-card" id="makeup-course">
                <div className="academy-course-topline">
                  <span>PROGRAMME 01</span><span>MAKEUP</span>
                </div>
                <div className="academy-course-art academy-course-art-makeup" aria-hidden="true">
                  <span>MAKEUP</span><span>ARTISTRY</span>
                </div>
                <div className="academy-course-content">
                  <p className="academy-eyebrow">MAKEUP ARTISTRY CLASSES</p>
                  <h3>Makeup Artist Training</h3>
                  <p>
                    Develop a strong makeup foundation, learn professional
                    application techniques and explore occasion and bridal
                    looks through structured practice.
                  </p>
                  <ul>
                    {makeupTopics.map((topic) => <li key={topic}>{topic}</li>)}
                  </ul>
                  <Link className="academy-text-link" href="#enquiry">
                    Enquire about makeup classes <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>

              <article className="academy-course-card" id="nail-course">
                <div className="academy-course-topline">
                  <span>PROGRAMME 02</span><span>NAIL TECH</span>
                </div>
                <div className="academy-course-art academy-course-art-nails" aria-hidden="true">
                  <span>NAIL</span><span>DESIGN</span>
                </div>
                <div className="academy-course-content">
                  <p className="academy-eyebrow">NAIL TECHNOLOGY CLASSES</p>
                  <h3>Nail Technician Training</h3>
                  <p>
                    Learn nail preparation, professional finishing and
                    creative design techniques, including custom press-on nail
                    concepts and client aftercare.
                  </p>
                  <ul>
                    {nailTopics.map((topic) => <li key={topic}>{topic}</li>)}
                  </ul>
                  <Link className="academy-text-link" href="#enquiry">
                    Enquire about nail classes <span aria-hidden="true">↗</span>
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="academy-section academy-container">
          <div className="academy-section-heading">
            <p className="academy-eyebrow">YOUR NEXT STEP</p>
            <h2>From first enquiry<br /><em>to confident practice.</em></h2>
          </div>
          <div className="academy-steps">
            <article><span>01</span><h3>Choose your course</h3><p>Select makeup artistry, nail technology or ask about learning both.</p></article>
            <article><span>02</span><h3>Choose your format</h3><p>Ask which online and offline batches are currently being planned.</p></article>
            <article><span>03</span><h3>Confirm the details</h3><p>Review the syllabus, schedule, fees, kit requirements and available seats before enrolling.</p></article>
          </div>
        </section>

        <section className="academy-enquiry" id="enquiry">
          <div className="academy-container academy-enquiry-inner">
            <div>
              <p className="academy-eyebrow">START YOUR LEARNING JOURNEY</p>
              <h2>Ready to learn<br /><em>something beautiful?</em></h2>
              <p>
                Message Beautify by Mansi for current batch dates, course fees,
                syllabus, training format, kit requirements and seat
                availability.
              </p>
              <p className="academy-fine-print">
                Course duration, fees, batch size, kit inclusions and certificate
                details are shared and confirmed before enrolment.
              </p>
            </div>
            <div className="academy-enquiry-actions">
              <a
                className="academy-button academy-button-primary"
                href="https://wa.me/919877339755?text=Hello%2C%20I%20would%20like%20details%20about%20online%20and%20offline%20makeup%20and%20nail%20technician%20classes."
                target="_blank"
                rel="noreferrer"
              >
                Enquire on WhatsApp <span aria-hidden="true">↗</span>
              </a>
              <Link className="academy-button academy-button-secondary" href="/">
                Back to Beautify by Mansi
              </Link>
            </div>
          </div>
        </section>
      </main>
      <footer className="academy-footer">
        <span>© {new Date().getFullYear()} Beautify by Mansi</span>
        <span>Learn with creativity. Grow with confidence.</span>
      </footer>
    </>
  );
}
