export interface FAQItem {
  q: string;
  a: string;
}

export const FAQS: FAQItem[] = [
  {
    q: 'How do I convert text to handwriting online?',
    a: 'Simply type or paste your digital text into our editor, select your preferred handwriting font and paper style, and customize the realism engine to add natural slants, baseline drift, and ink pressure. You can then download the resulting sheets as PNG images or combined PDFs.'
  },
  {
    q: 'Is the handwriting generator free?',
    a: 'Yes! Our text-to-handwriting converter is completely free to use without any limitations, registration requirements, or watermarks. All high-quality PDF and image exports are accessible for free.'
  },
  {
    q: 'Can I insert images or formulas into my handwritten document?',
    a: 'Yes, you can upload diagrams, sketches, and signatures directly onto the live canvas preview. You can also insert mathematical equations using LaTeX notation, which gets rendered with KaTeX. All elements can be dragged, resized, and positioned anywhere on the page.'
  },
  {
    q: 'How do I download my handwriting as a PDF?',
    a: 'Navigate to the export panel on the sidebar, select "PDF Document", choose your desired page size (A4, Letter, or Legal) and DPI quality, and click export. Multi-page document lines are sequentially compiled into a single file.'
  },
  {
    q: 'Can I generate multiple pages at once?',
    a: 'Yes! The system auto-paginates your text dynamically based on the font size, line height, and page margins. You can also manually insert page breaks using the "---page break---" delimiter.'
  },
  {
    q: 'How realistic does the handwriting look?',
    a: 'Extremely realistic! Our realism engine simulates natural human inconsistencies by introducing character-by-character slant variations, random vertical and horizontal jitters, line baseline drifts, and stroke pressure variations.'
  },
  {
    q: 'Can I use this for school and college assignments?',
    a: 'Absolutely. Many students use this tool to write practical records, assignment submissions, and homework files to save time. We recommend using neat printing fonts like Architects Daughter or Kalam for academic submissions.'
  },
  {
    q: 'What fonts are available on the platform?',
    a: 'We offer over 20 handwriting fonts categorized into neat script, flowing cursive, messy jotting, signatures, and calligraphy styles. All fonts are self-hosted and load instantly in the editor.'
  },
  {
    q: 'Can I change the ink color?',
    a: 'Yes, you can choose from standard ink presets (royal blue, classic black, correction red) or use our custom color picker to select any ink hex code. You can also customize the pen texture (ballpoint, fountain, or pencil).'
  },
  {
    q: 'Is there a bulk generator for multiple documents?',
    a: 'Yes, our bulk generator page allows you to paste multiple documents separated by delimiters, upload CSV sheets, or load text files in parallel. It uses browser Web Workers to process document batches in the background.'
  },
  {
    q: 'Can I write in cursive?',
    a: 'Yes, you can select cursive fonts like Dancing Script or Sacramento and adjust character spacing slightly negative to pull ligatures closer together, creating continuous script lines.'
  },
  {
    q: 'Do I need to install any software or extensions?',
    a: 'No. The generator runs completely in your web browser using HTML5 Canvas API and Web Workers. It does not require any plugins, local installs, or extensions.'
  },
  {
    q: 'Can I use my own paper background?',
    a: 'Yes! You can upload an image of your own physical ruled or blank paper under the margins and background settings. The engine will render the handwritten text directly onto your uploaded image.'
  },
  {
    q: 'Is my data saved or sent to a server?',
    a: 'No. Privacy is central to our design. All text rendering, image processing, LaTeX generation, and PDF compilations are done locally in your browser. No personal data or document content is uploaded to our servers.'
  }
];
