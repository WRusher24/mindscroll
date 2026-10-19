/**
 * Curated topic directory. Every topic ships with several independent sources so the
 * interleaving engine always has variety to work with. Feeds that go dark are skipped
 * automatically by the ingestion engine (see lib/ingest.ts) and can be audited with
 * `npm run feeds:check`.
 */
export type CatalogFeed = { name: string; url: string; siteUrl: string };
export type CatalogTopic = {
  id: string;
  name: string;
  emoji: string;
  accent: string;
  description: string;
  feeds: CatalogFeed[];
};

export const CATALOG: CatalogTopic[] = [
  {
    id: "artificial-intelligence",
    name: "Artificial Intelligence",
    emoji: "🤖",
    accent: "#8b5cf6",
    description: "Machine learning, language models, robotics and the people shaping them.",
    feeds: [
      { name: "MIT Technology Review", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", siteUrl: "https://www.technologyreview.com" },
      { name: "Google Research", url: "https://research.google/blog/rss/", siteUrl: "https://research.google/blog/" },
      { name: "Hugging Face", url: "https://huggingface.co/blog/feed.xml", siteUrl: "https://huggingface.co/blog" },
      { name: "Berkeley AI Research", url: "https://bair.berkeley.edu/blog/feed.xml", siteUrl: "https://bair.berkeley.edu/blog/" },
      { name: "The Gradient", url: "https://thegradient.pub/rss/", siteUrl: "https://thegradient.pub" },
      { name: "OpenAI", url: "https://openai.com/news/rss.xml", siteUrl: "https://openai.com/news" },
    ],
  },
  {
    id: "psychology",
    name: "Psychology",
    emoji: "🧠",
    accent: "#ec4899",
    description: "How minds work: behavior, emotion, cognition and mental health research.",
    feeds: [
      { name: "PsyPost", url: "https://www.psypost.org/feed/", siteUrl: "https://www.psypost.org" },
      { name: "ScienceDaily Psychology", url: "https://www.sciencedaily.com/rss/mind_brain/psychology.xml", siteUrl: "https://www.sciencedaily.com" },
      { name: "Neuroscience News", url: "https://neurosciencenews.com/feed/", siteUrl: "https://neurosciencenews.com" },
      { name: "Mind Hacks", url: "https://mindhacks.com/feed/", siteUrl: "https://mindhacks.com" },
      { name: "ScienceDaily Mind & Brain", url: "https://www.sciencedaily.com/rss/mind_brain.xml", siteUrl: "https://www.sciencedaily.com" },
    ],
  },
  {
    id: "history",
    name: "History",
    emoji: "🏛️",
    accent: "#d97706",
    description: "Stories from the ancient world to the modern era, told well.",
    feeds: [
      { name: "Smithsonian Magazine", url: "https://www.smithsonianmag.com/rss/history/", siteUrl: "https://www.smithsonianmag.com" },
      { name: "JSTOR Daily", url: "https://daily.jstor.org/feed/", siteUrl: "https://daily.jstor.org" },
      { name: "The Public Domain Review", url: "https://publicdomainreview.org/rss.xml", siteUrl: "https://publicdomainreview.org" },
      { name: "Medievalists.net", url: "https://www.medievalists.net/feed/", siteUrl: "https://www.medievalists.net" },
      { name: "HistoryExtra", url: "https://www.historyextra.com/feed/", siteUrl: "https://www.historyextra.com" },
      { name: "Atlas Obscura", url: "https://www.atlasobscura.com/feeds/latest", siteUrl: "https://www.atlasobscura.com" },
    ],
  },
  {
    id: "science",
    name: "Science",
    emoji: "🔬",
    accent: "#0ea5e9",
    description: "Discoveries across physics, biology, chemistry and the natural world.",
    feeds: [
      { name: "Quanta Magazine", url: "https://api.quantamagazine.org/feed/", siteUrl: "https://www.quantamagazine.org" },
      { name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/top/science.xml", siteUrl: "https://www.sciencedaily.com" },
      { name: "Nature", url: "https://www.nature.com/nature.rss", siteUrl: "https://www.nature.com" },
      { name: "Ars Technica Science", url: "https://feeds.arstechnica.com/arstechnica/science", siteUrl: "https://arstechnica.com/science" },
      { name: "Knowable Magazine", url: "https://knowablemagazine.org/rss", siteUrl: "https://knowablemagazine.org" },
      { name: "Live Science", url: "https://www.livescience.com/feeds/all", siteUrl: "https://www.livescience.com" },
    ],
  },
  {
    id: "philosophy",
    name: "Philosophy",
    emoji: "🦉",
    accent: "#14b8a6",
    description: "Ethics, meaning, logic and timeless ideas for modern life.",
    feeds: [
      { name: "Aeon", url: "https://aeon.co/feed.rss", siteUrl: "https://aeon.co" },
      { name: "Daily Nous", url: "https://dailynous.com/feed/", siteUrl: "https://dailynous.com" },
      { name: "Stanford Encyclopedia of Philosophy", url: "https://plato.stanford.edu/rss/sep.xml", siteUrl: "https://plato.stanford.edu" },
      { name: "The Marginalian", url: "https://www.themarginalian.org/feed/", siteUrl: "https://www.themarginalian.org" },
      { name: "Daily Stoic", url: "https://dailystoic.com/feed/", siteUrl: "https://dailystoic.com" },
      { name: "3 Quarks Daily", url: "https://3quarksdaily.com/feed", siteUrl: "https://3quarksdaily.com" },
    ],
  },
  {
    id: "economics",
    name: "Economics",
    emoji: "📈",
    accent: "#22c55e",
    description: "Markets, incentives, policy and how the world's money really moves.",
    feeds: [
      { name: "Marginal Revolution", url: "https://marginalrevolution.com/feed", siteUrl: "https://marginalrevolution.com" },
      { name: "Econlib", url: "https://www.econlib.org/feed/", siteUrl: "https://www.econlib.org" },
      { name: "Our World in Data", url: "https://ourworldindata.org/atom.xml", siteUrl: "https://ourworldindata.org" },
      { name: "Tim Harford", url: "https://timharford.com/feed/", siteUrl: "https://timharford.com" },
      { name: "NPR Economy", url: "https://feeds.npr.org/1017/rss.xml", siteUrl: "https://www.npr.org/sections/economy/" },
      { name: "Noahpinion", url: "https://www.noahpinion.blog/feed", siteUrl: "https://www.noahpinion.blog" },
      { name: "Freakonomics", url: "https://freakonomics.com/feed/", siteUrl: "https://freakonomics.com" },
    ],
  },
  {
    id: "technology",
    name: "Technology",
    emoji: "💻",
    accent: "#3b82f6",
    description: "Software, hardware, the internet and engineering craft.",
    feeds: [
      { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", siteUrl: "https://arstechnica.com" },
      { name: "IEEE Spectrum", url: "https://spectrum.ieee.org/feeds/feed.rss", siteUrl: "https://spectrum.ieee.org" },
      { name: "Simon Willison", url: "https://simonwillison.net/atom/everything/", siteUrl: "https://simonwillison.net" },
      { name: "Wired", url: "https://www.wired.com/feed/rss", siteUrl: "https://www.wired.com" },
      { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", siteUrl: "https://www.theverge.com" },
    ],
  },
  {
    id: "health-medicine",
    name: "Health & Medicine",
    emoji: "🩺",
    accent: "#ef4444",
    description: "Evidence-based health, medicine and the biology of well-being.",
    feeds: [
      { name: "ScienceDaily Health", url: "https://www.sciencedaily.com/rss/health_medicine.xml", siteUrl: "https://www.sciencedaily.com" },
      { name: "Harvard Health", url: "https://www.health.harvard.edu/blog/feed", siteUrl: "https://www.health.harvard.edu" },
      { name: "NPR Health", url: "https://feeds.npr.org/1128/rss.xml", siteUrl: "https://www.npr.org/sections/health/" },
      { name: "STAT", url: "https://www.statnews.com/feed/", siteUrl: "https://www.statnews.com" },
      { name: "Medical News Today", url: "https://www.medicalnewstoday.com/rss", siteUrl: "https://www.medicalnewstoday.com" },
    ],
  },
  {
    id: "space",
    name: "Space & Astronomy",
    emoji: "🪐",
    accent: "#6366f1",
    description: "Planets, telescopes, rockets and the structure of the cosmos.",
    feeds: [
      { name: "NASA", url: "https://www.nasa.gov/feed/", siteUrl: "https://www.nasa.gov" },
      { name: "Space.com", url: "https://www.space.com/feeds/all", siteUrl: "https://www.space.com" },
      { name: "Universe Today", url: "https://www.universetoday.com/feed", siteUrl: "https://www.universetoday.com" },
      { name: "Sky & Telescope", url: "https://skyandtelescope.org/feed/", siteUrl: "https://skyandtelescope.org" },
      { name: "ESA Space Science", url: "https://www.esa.int/rssfeed/Our_Activities/Space_Science", siteUrl: "https://www.esa.int" },
    ],
  },
  {
    id: "environment",
    name: "Environment & Climate",
    emoji: "🌍",
    accent: "#10b981",
    description: "Climate science, ecosystems, energy and sustainability.",
    feeds: [
      { name: "Carbon Brief", url: "https://www.carbonbrief.org/feed/", siteUrl: "https://www.carbonbrief.org" },
      { name: "Mongabay", url: "https://news.mongabay.com/feed/", siteUrl: "https://news.mongabay.com" },
      { name: "Yale Environment 360", url: "https://e360.yale.edu/feed.xml", siteUrl: "https://e360.yale.edu" },
      { name: "Grist", url: "https://grist.org/feed/", siteUrl: "https://grist.org" },
      { name: "ScienceDaily Earth & Climate", url: "https://www.sciencedaily.com/rss/earth_climate.xml", siteUrl: "https://www.sciencedaily.com" },
    ],
  },
  {
    id: "business",
    name: "Business & Startups",
    emoji: "🚀",
    accent: "#f97316",
    description: "Strategy, product, leadership and lessons from builders.",
    feeds: [
      { name: "Harvard Business Review", url: "http://feeds.hbr.org/harvardbusiness", siteUrl: "https://hbr.org" },
      { name: "Paul Graham Essays", url: "https://www.aaronsw.com/2002/feeds/pgessays.rss", siteUrl: "https://paulgraham.com" },
      { name: "First Round Review", url: "https://review.firstround.com/feed.xml", siteUrl: "https://review.firstround.com" },
      { name: "Seth's Blog", url: "https://seths.blog/feed/", siteUrl: "https://seths.blog" },
      { name: "a16z", url: "https://a16z.com/feed/", siteUrl: "https://a16z.com" },
    ],
  },
  {
    id: "learning-habits",
    name: "Learning & Habits",
    emoji: "🌱",
    accent: "#84cc16",
    description: "Better thinking, deliberate practice and sustainable habits.",
    feeds: [
      { name: "James Clear", url: "https://jamesclear.com/feed", siteUrl: "https://jamesclear.com" },
      { name: "Farnam Street", url: "https://fs.blog/feed/", siteUrl: "https://fs.blog" },
      { name: "Cal Newport", url: "https://calnewport.com/feed/", siteUrl: "https://calnewport.com" },
      { name: "Zen Habits", url: "https://zenhabits.net/feed/", siteUrl: "https://zenhabits.net" },
      { name: "Scott H Young", url: "https://www.scotthyoung.com/blog/feed/", siteUrl: "https://www.scotthyoung.com/blog" },
    ],
  },
  {
    id: "design",
    name: "Design & Creativity",
    emoji: "🎨",
    accent: "#f43f5e",
    description: "Interfaces, craft, typography and the creative process.",
    feeds: [
      { name: "A List Apart", url: "https://alistapart.com/main/feed/", siteUrl: "https://alistapart.com" },
      { name: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed/", siteUrl: "https://www.smashingmagazine.com" },
      { name: "Nielsen Norman Group", url: "https://www.nngroup.com/feed/rss/", siteUrl: "https://www.nngroup.com" },
      { name: "It's Nice That", url: "https://www.itsnicethat.com/rss/all", siteUrl: "https://www.itsnicethat.com" },
      { name: "Design Observer", url: "https://designobserver.com/feed", siteUrl: "https://designobserver.com" },
    ],
  },
  {
    id: "literature-culture",
    name: "Literature & Culture",
    emoji: "📚",
    accent: "#a855f7",
    description: "Books, essays, art and the ideas that shape culture.",
    feeds: [
      { name: "Literary Hub", url: "https://lithub.com/feed/", siteUrl: "https://lithub.com" },
      { name: "The Paris Review", url: "https://www.theparisreview.org/blog/feed/", siteUrl: "https://www.theparisreview.org" },
      { name: "Open Culture", url: "https://www.openculture.com/feed", siteUrl: "https://www.openculture.com" },
      { name: "The Millions", url: "https://themillions.com/feed", siteUrl: "https://themillions.com" },
      { name: "Electric Literature", url: "https://electricliterature.com/feed/", siteUrl: "https://electricliterature.com" },
    ],
  },
];
