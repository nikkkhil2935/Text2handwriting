export interface FontItem {
  name: string;
  family: string;
  category: 'neat' | 'cursive' | 'messy' | 'kids' | 'signature' | 'calligraphy';
  path: string;
}

export const FONTS: FontItem[] = [
  // Neat
  { name: 'Caveat', family: 'Caveat', category: 'neat', path: '/fonts/neat/Caveat.woff2' },
  { name: 'ArchitectsDaughter', family: 'Architects Daughter', category: 'neat', path: '/fonts/neat/ArchitectsDaughter.woff2' },
  { name: 'PatrickHand', family: 'Patrick Hand', category: 'neat', path: '/fonts/neat/PatrickHand.woff2' },
  { name: 'IndieFlower', family: 'Indie Flower', category: 'neat', path: '/fonts/neat/IndieFlower.woff2' },
  { name: 'Kalam', family: 'Kalam', category: 'neat', path: '/fonts/neat/Kalam.woff2' },
  
  // Cursive
  { name: 'DancingScript', family: 'Dancing Script', category: 'cursive', path: '/fonts/cursive/DancingScript.woff2' },
  { name: 'Pacifico', family: 'Pacifico', category: 'cursive', path: '/fonts/cursive/Pacifico.woff2' },
  { name: 'Sacramento', family: 'Sacramento', category: 'cursive', path: '/fonts/cursive/Sacramento.woff2' },
  { name: 'Yellowtail', family: 'Yellowtail', category: 'cursive', path: '/fonts/cursive/Yellowtail.woff2' },
  { name: 'GreatVibes', family: 'Great Vibes', category: 'cursive', path: '/fonts/cursive/GreatVibes.woff2' },
  
  // Messy
  { name: 'ReenieBeanie', family: 'Reenie Beanie', category: 'messy', path: '/fonts/messy/ReenieBeanie.woff2' },
  { name: 'NothingYouCouldDo', family: 'Nothing You Could Do', category: 'messy', path: '/fonts/messy/NothingYouCouldDo.woff2' },
  { name: 'ShadowsIntoLight', family: 'Shadows Into Light', category: 'messy', path: '/fonts/messy/ShadowsIntoLight.woff2' },
  
  // Kids
  { name: 'GochiHand', family: 'Gochi Hand', category: 'kids', path: '/fonts/kids/GochiHand.woff2' },
  { name: 'Pangolin', family: 'Pangolin', category: 'kids', path: '/fonts/kids/Pangolin.woff2' },
  
  // Signature
  { name: 'AlexBrush', family: 'Alex Brush', category: 'signature', path: '/fonts/signature/AlexBrush.woff2' },
  { name: 'MrDeHaviland', family: 'Mr De Haviland', category: 'signature', path: '/fonts/signature/MrDeHaviland.woff2' },
  
  // Calligraphy
  { name: 'PinyonScript', family: 'Pinyon Script', category: 'calligraphy', path: '/fonts/calligraphy/PinyonScript.woff2' },
  { name: 'Playball', family: 'Playball', category: 'calligraphy', path: '/fonts/calligraphy/Playball.woff2' },
  { name: 'MarckScript', family: 'Marck Script', category: 'calligraphy', path: '/fonts/calligraphy/MarckScript.woff2' },

  // Devanagari / Multi-language Handwriting
  { name: 'Amita', family: 'Amita', category: 'cursive', path: '/fonts/cursive/Amita.woff2' },
  { name: 'Tillana', family: 'Tillana', category: 'neat', path: '/fonts/neat/Tillana.woff2' },
  { name: 'YatraOne', family: 'Yatra One', category: 'calligraphy', path: '/fonts/calligraphy/YatraOne.woff2' },
  { name: 'Laila', family: 'Laila', category: 'neat', path: '/fonts/neat/Laila.woff2' },

  // Added requested realistic handwriting fonts
  { name: 'HomemadeApple', family: 'Homemade Apple', category: 'cursive', path: '/fonts/cursive/HomemadeApple.woff2' },
  { name: 'LiuJianMaoCao', family: 'Liu Jian Mao Cao', category: 'cursive', path: '/fonts/cursive/LiuJianMaoCao.woff2' },
  { name: 'JustAnotherHand', family: 'Just Another Hand', category: 'messy', path: '/fonts/messy/JustAnotherHand.woff2' },
  { name: 'CedarvilleCursive', family: 'Cedarville Cursive', category: 'cursive', path: '/fonts/cursive/CedarvilleCursive.woff2' },
  { name: 'DawningofaNewDay', family: 'Dawning of a New Day', category: 'messy', path: '/fonts/messy/DawningofaNewDay.woff2' },
  { name: 'Zeyada', family: 'Zeyada', category: 'messy', path: '/fonts/messy/Zeyada.woff2' },
  { name: 'LaBelleAurore', family: 'La Belle Aurore', category: 'cursive', path: '/fonts/cursive/LaBelleAurore.woff2' },
  { name: 'GloriaHallelujah', family: 'Gloria Hallelujah', category: 'kids', path: '/fonts/kids/GloriaHallelujah.woff2' },
  { name: 'LovedbytheKing', family: 'Loved by the King', category: 'messy', path: '/fonts/messy/LovedbytheKing.woff2' },
  { name: 'BadScript', family: 'Bad Script', category: 'neat', path: '/fonts/neat/BadScript.woff2' },
  { name: 'Mynerve', family: 'Mynerve', category: 'neat', path: '/fonts/neat/Mynerve.woff2' },
  { name: 'WaitingfortheSunrise', family: 'Waiting for the Sunrise', category: 'neat', path: '/fonts/neat/WaitingfortheSunrise.woff2' },
  { name: 'CoveredByYourGrace', family: 'Covered By Your Grace', category: 'neat', path: '/fonts/neat/CoveredByYourGrace.woff2' },
  { name: 'ComingSoon', family: 'Coming Soon', category: 'neat', path: '/fonts/neat/ComingSoon.woff2' },
  { name: 'Itim', family: 'Itim', category: 'neat', path: 'https://fonts.gstatic.com/s/itim/v16/0nknC9ziJOYe8ANAkA.woff2' },
  { name: 'PermanentMarker', family: 'Permanent Marker', category: 'messy', path: 'https://fonts.gstatic.com/s/permanentmarker/v16/Fh4uPib9Iyv2ucM6pGQMWimMp004La2Cfw.woff2' },
  { name: 'CaveatBrush', family: 'Caveat Brush', category: 'neat', path: 'https://fonts.gstatic.com/s/caveatbrush/v12/EYq0maZfwr9S9-ETZc3fKXt8XLOS.woff2' },
  { name: 'Lacquer', family: 'Lacquer', category: 'messy', path: 'https://fonts.gstatic.com/s/lacquer/v16/EYqzma1QwqpG4_BBN7iKXw.woff2' }
];

export const CATEGORIES = [
  { id: 'neat', label: 'Neat / Handwriting' },
  { id: 'cursive', label: 'Cursive / Script' },
  { id: 'messy', label: 'Messy / Jotted' },
  { id: 'kids', label: 'Kids / Print' },
  { id: 'signature', label: 'Signature / Flowing' },
  { id: 'calligraphy', label: 'Calligraphy / Elegant' }
];

export function getFontsByCategory(category: string): FontItem[] {
  return FONTS.filter(f => f.category === category);
}

export function getFontByFamily(family: string): FontItem | undefined {
  return FONTS.find(f => f.family === family);
}

export function getDefaultBaselineOffset(family: string): number {
  const offsets: Record<string, number> = {
    'Architects Daughter': 4,
    'Caveat': 3,
    'Patrick Hand': 3,
    'Indie Flower': 3,
    'Kalam': 4,
    'Dancing Script': 3,
    'Pacifico': 1,
    'Sacramento': 6,
    'Yellowtail': 2,
    'Great Vibes': 2,
    'Reenie Beanie': 9,
    'Nothing You Could Do': 3,
    'Shadows Into Light': 4,
    'Gochi Hand': 4,
    'Pangolin': 3,
    'Alex Brush': 2,
    'Mr De Haviland': 2,
    'Pinyon Script': 2,
    'Playball': 2,
    'Marck Script': 2,
    'Amita': 3,
    'Tillana': 3,
    'Yatra One': 2,
    'Laila': 3,
    'Homemade Apple': 6,
    'Liu Jian Mao Cao': 4,
    'Just Another Hand': 8,
    'Cedarville Cursive': 4,
    'Dawning of a New Day': 7,
    'Zeyada': 8,
    'La Belle Aurore': 5,
    'Gloria Hallelujah': 3,
    'Loved by the King': 7,
    'Bad Script': 3,
    'Mynerve': 3,
    'Waiting for the Sunrise': 4,
    'Covered By Your Grace': 4,
    'Coming Soon': 3,
    'Itim': 2,
    'Permanent Marker': 2,
    'Caveat Brush': 3,
    'Lacquer': 2
  };
  return offsets[family] !== undefined ? offsets[family] : 0;
}
