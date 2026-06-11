export interface AdSlotConfig {
  id: string;
  size: 'leaderboard' | 'rectangle' | 'sidebar' | 'in-content';
  enabled: boolean;
  className?: string;
}

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
