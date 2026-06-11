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
  { name: 'Laila', family: 'Laila', category: 'neat', path: '/fonts/neat/Laila.woff2' }
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
