export interface InvitationContent {
  isPreview: boolean;
  couple: { first: string; second: string; firstShort: string; secondShort: string };
  greeting: string;
  artwork: { engaged: string; engagedSmall: string; bouquet: string; bouquetSmall: string };
  event: { dateStamp: string; dateLabel: string; timeLabel: string; startsAt: string | null; timeZone: string; venue: string; address: string; mapUrl: string | null };
  music: { src: string | null; title: string };
}

export const invitation: InvitationContent = {
  isPreview: true,
  couple: { first: 'Ghea Citra', second: 'Vian Rasyid', firstShort: 'Ghea', secondShort: 'Vian' },
  artwork: {
    engaged: '/images/couple-engaged.webp',
    engagedSmall: '/images/couple-engaged-small.webp',
    bouquet: '/images/couple-bouquet.webp',
    bouquetSmall: '/images/couple-bouquet-small.webp',
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
