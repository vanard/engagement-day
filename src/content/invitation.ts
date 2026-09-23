export interface InvitationContent {
  isPreview: boolean;
  couple: { first: string; second: string; firstShort: string; secondShort: string };
  greeting: string;
  artwork: { engaged: string; bouquet: string };
  event: { dateStamp: string; dateLabel: string; timeLabel: string; startsAt: string | null; timeZone: string; venue: string; address: string; mapUrl: string | null };
  music: { src: string | null; title: string };
}

export const invitation: InvitationContent = {
  isPreview: true,
  couple: { first: 'Vian Rasyid D', second: 'Ghea Citra M', firstShort: 'Vian', secondShort: 'Ghea' },
  artwork: { engaged: '/images/couple-engaged.webp', bouquet: '/images/couple-bouquet.webp' },
  greeting: 'Merupakan kebahagiaan bagi kami dan keluarga apabila Anda berkenan hadir dan memberikan doa restu untuk langkah pertama kami bersama.',
  event: {
    dateStamp: '21 · 10 · 2026',
    dateLabel: 'Rabu, 21 Oktober 2026',
    timeLabel: '16.00 – selesai',
    startsAt: null, // Date/time transcribed from the supplied video; confirm timezone before setting startsAt.
    timeZone: 'Asia/Jakarta',
    venue: 'Roemah Langko',
    address: 'Alamat lengkap akan dibagikan di sini.',
    mapUrl: null,
  },
  // Put your licensed audio in public/audio/ and set src to '/audio/your-song.mp3'.
  music: { src: null, title: 'Musik undangan' },
};
