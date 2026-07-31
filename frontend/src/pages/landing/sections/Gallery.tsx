import { Placeholder } from '@/pages/landing/components/Placeholder';
import { Section } from '@/pages/landing/components/Section';
import { GALLERY } from '@/pages/landing/landingData';

export function Gallery() {
  return (
    <Section
      id="gallery"
      eyebrow="Campus"
      title="Around the campus"
      description="Forty-two acres of labs, libraries, hostels and open ground."
      centered
      className="bg-ink-50"
    >
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {GALLERY.map((caption, index) => (
          <Placeholder
            key={caption}
            label={caption}
            index={index}
            className="aspect-4/3 transition hover:brightness-110"
          />
        ))}
      </div>
    </Section>
  );
}
