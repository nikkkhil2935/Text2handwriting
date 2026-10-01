export interface AdSlotConfig {
  id: string;
  size: 'leaderboard' | 'rectangle' | 'sidebar' | 'in-content';
  enabled: boolean;
  className?: string;
}

// AdSense publisher ID. Note: the `id` values below are placeholder ad-unit
// names — replace them with the real slot IDs from the AdSense account before
// going live.
export const AD_CLIENT = 'ca-pub-9725731987817847';

export const AD_CONFIGS: Record<string, AdSlotConfig> = {
  // Below header on each tool page (leaderboard)
  'header-leaderboard': {
    id: 'header-leaderboard-slot',
    size: 'leaderboard',
    enabled: false,
    className: 'my-4 mx-auto flex justify-center'
  },
  // Sidebar (rectangle, sticky)
  'sidebar-sticky': {
    id: 'sidebar-sticky-slot',
    size: 'rectangle',
    enabled: false,
    className: 'sticky top-20 my-4 flex justify-center'
  },
  // Between blog content sections (in-content)
  'blog-in-content': {
    id: 'blog-in-content-slot',
    size: 'in-content',
    enabled: false,
    className: 'my-6 flex justify-center'
  },
  // Above footer (leaderboard)
  'footer-leaderboard': {
    id: 'footer-leaderboard-slot',
    size: 'leaderboard',
    enabled: false,
    className: 'my-8 mx-auto flex justify-center'
  },
  // Bulk generator: between queue and results (in-content)
  'bulk-generator-in-content': {
    id: 'bulk-generator-slot',
    size: 'in-content',
    enabled: false,
    className: 'my-6 flex justify-center'
  }
};
