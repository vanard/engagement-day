export interface InvitationContent {
  isPreview: boolean;
  couple: { bride: string; groom: string };
  greeting: string;
  artwork: { engaged: string; engagedSmall: string; bouquet: string; bouquetSmall: string };
  /** Link preview for WhatsApp/Instagram/Facebook. Width/height must match the JPEG. */
  share: { title: string; description: string; image: string; imageWidth: number; imageHeight: number; imageAlt: string };
  event: { dateStamp: string; dateLabel: string; timeLabel: string; startsAt: string | null; timeZone: string; venue: string; address: string; mapUrl: string | null };
  music: { src: string | null; title: string };
}

export const invitation: InvitationContent = {
  isPreview: true,
  // Engagement order is bride first (Ghea & Vian); the wedding project uses groom first.
  couple: { bride: 'Ghea', groom: 'Vian' },
  artwork: {
    engaged: '/images/couple-engaged.webp',
    engagedSmall: '/images/couple-engaged-small.webp',
    bouquet: '/images/couple-bouquet.webp',
    bouquetSmall: '/images/couple-bouquet-small.webp',
  },
  share: {
    title: 'Lamaran Ghea & Vian',
    description: 'Dengan penuh syukur, kami mengundang Anda untuk berbagi kebahagiaan di hari lamaran kami.',
    image: '/images/metadata-image.jpeg',
    imageWidth: 833,
    imageHeight: 1279,
    imageAlt: 'Ilustrasi Ghea dan Vian memperlihatkan cincin lamaran',
  },
  greeting: '',
  event: {
    dateStamp: '21 · 10 · 2026',
    dateLabel: 'Rabu, 21 Oktober 2026',
    timeLabel: '16.00 – selesai',
    startsAt: null, // Date/time transcribed from the supplied video; confirm timezone before setting startsAt.
    timeZone: 'Asia/Jakarta',
    venue: 'Roemah Langko',
    address: 'Alamat lengkap akan dibagikan di sini.',
    mapUrl: 'https://maps.app.goo.gl/PhT9fWTZyzfHF7ii7',
  },
  music: { src: '/audio/kisah-romantis-clip.mp3', title: 'Glenn Fredly — Kisah Romantis' },
};
