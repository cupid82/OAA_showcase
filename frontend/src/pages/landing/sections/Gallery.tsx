import { Placeholder } from '@/pages/landing/components/Placeholder';
import { Section } from '@/pages/landing/components/Section';
import { GALLERY } from '@/pages/landing/landingData';

export function Gallery() {
  return (
    <Section
      id="gallery"
      index="05"
      eyebrow="Campus"
      title="Around the campus"
      description="Forty-two acres of labs, libraries, hostels and open ground."
      className="bg-ink-50"
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {GALLERY.map((caption) => (
          <Placeholder
            key={caption}
            label={caption}
            className="aspect-4/3 transition hover:border-brand-500"
          />
        ))}
      </div>
    </Section>
  );
}
