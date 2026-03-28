import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Domain → category mapping
const DOMAIN_MAP: Record<string, string> = {
  // AI
  'openai.com': 'ai', 'anthropic.com': 'ai', 'huggingface.co': 'ai', 'midjourney.com': 'ai', 'stability.ai': 'ai', 'replicate.com': 'ai', 'runwayml.com': 'ai', 'deepmind.com': 'ai', 'chat.openai.com': 'ai',
  // Architecture
  'archdaily.com': 'architecture', 'dezeen.com': 'architecture', 'architecturaldigest.com': 'architecture',
  // Archives
  'archive.org': 'archives', 'web.archive.org': 'archives', 'loc.gov': 'archives', 'gutenberg.org': 'archives',
  // Art
  'deviantart.com': 'art', 'artstation.com': 'art', 'behance.net': 'art', 'dribbble.com': 'art', 'flickr.com': 'art', 'unsplash.com': 'art', 'artsandculture.google.com': 'art',
  // Creative code
  'codepen.io': 'creative-code', 'glitch.com': 'creative-code', 'shadertoy.com': 'creative-code', 'p5js.org': 'creative-code', 'openprocessing.org': 'creative-code', 'threejs.org': 'creative-code',
  // Crypto
  'coindesk.com': 'crypto', 'coingecko.com': 'crypto', 'etherscan.io': 'crypto', 'coinmarketcap.com': 'crypto',
  // Culture/History
  'wikipedia.org': 'culture/history', 'en.wikipedia.org': 'culture/history', 'smithsonianmag.com': 'culture/history', 'history.com': 'culture/history', 'bbc.co.uk/history': 'culture/history',
  // Data/Research
  'kaggle.com': 'data/research', 'data.gov': 'data/research', 'ourworldindata.org': 'data/research', 'statista.com': 'data/research', 'arxiv.org': 'data/research',
  // Design
  'figma.com': 'design', 'canva.com': 'design', 'awwwards.com': 'design', 'siteinspire.com': 'design', 'typewolf.com': 'design', 'fonts.google.com': 'design',
  // Earth science
  'earthquake.usgs.gov': 'earth-science', 'volcanodiscovery.com': 'earth-science', 'weather.gov': 'earth-science',
  // Film/Animation
  'imdb.com': 'film/animation', 'letterboxd.com': 'film/animation', 'vimeo.com': 'film/animation',
  // Food/Drink
  'seriouseats.com': 'food/drink', 'bonappetit.com': 'food/drink', 'allrecipes.com': 'food/drink', 'tasteatlas.com': 'food/drink',
  // Fun/Weird
  'reddit.com/r/internetisbeautiful': 'fun/weird', 'boredpanda.com': 'fun/weird', 'atlasobscura.com': 'fun/weird', 'theuselessweb.com': 'fun/weird', 'stumbleupon.com': 'fun/weird',
  // Games
  'itch.io': 'games', 'newgrounds.com': 'games', 'kongregate.com': 'games', 'miniclip.com': 'games', 'coolmathgames.com': 'games', 'poki.com': 'games', 'crazygames.com': 'games', 'slither.io': 'games', 'agar.io': 'games',
  // Life hacks
  'lifehacker.com': 'life-hacks', 'instructables.com': 'life-hacks', 'wikihow.com': 'life-hacks',
  // Maps/Geography
  'earth.google.com': 'maps/geography', 'openstreetmap.org': 'maps/geography', 'mapbox.com': 'maps/geography', 'zoom.earth': 'maps/geography', 'flightradar24.com': 'maps/geography', 'marinetraffic.com': 'maps/geography',
  // Memes
  'knowyourmeme.com': 'memes', 'imgflip.com': 'memes', '9gag.com': 'memes',
  // Music/Audio
  'spotify.com': 'music/audio', 'soundcloud.com': 'music/audio', 'bandcamp.com': 'music/audio', 'musicbrainz.org': 'music/audio', 'everynoise.com': 'music/audio',
  // Nature
  'nationalgeographic.com': 'nature', 'worldwildlife.org': 'nature', 'inaturalist.org': 'nature',
  // News/Journalism
  'bbc.com': 'news/journalism', 'reuters.com': 'news/journalism', 'apnews.com': 'news/journalism', 'theguardian.com': 'news/journalism', 'nytimes.com': 'news/journalism',
  // Pop culture
  'buzzfeed.com': 'pop/culture', 'vulture.com': 'pop/culture', 'ew.com': 'pop/culture',
  // Reading/Writing
  'medium.com': 'reading/writing', 'substack.com': 'reading/writing', 'longform.org': 'reading/writing', 'lithub.com': 'reading/writing',
  // Retro/Web
  'neocities.org': 'retro/web', 'geocities.ws': 'retro/web', 'cameronsworld.net': 'retro/web', 'theoldnet.com': 'retro/web',
  // Science
  'nature.com': 'science', 'sciencedaily.com': 'science', 'newscientist.com': 'science', 'pnas.org': 'science', 'science.org': 'science',
  // Space
  'nasa.gov': 'space', 'spacex.com': 'space', 'hubblesite.org': 'space', 'stellarium-web.org': 'space', 'eyes.nasa.gov': 'space', 'solarsystem.nasa.gov': 'space',
  // Tech
  'github.com': 'tech', 'stackoverflow.com': 'tech', 'hackernews.com': 'tech', 'news.ycombinator.com': 'tech', 'techcrunch.com': 'tech', 'arstechnica.com': 'tech', 'wired.com': 'tech', 'theverge.com': 'tech',
  // Tools/Utilities
  'alternativeto.net': 'tools/utilities', 'producthunt.com': 'tools/utilities', 'speedtest.net': 'tools/utilities',
  // Transport
  'openrailwaymap.org': 'transport',
  // Travel
  'lonelyplanet.com': 'travel', 'tripadvisor.com': 'travel', 'atlasandboots.com': 'travel',
}

// Keyword → category matching (checked against URL path + domain)
const KEYWORD_MAP: [RegExp, string][] = [
  [/\b(game|play|puzzle|arcade|rpg|tetris|chess|sudoku|quiz)\b/i, 'games'],
  [/\b(recipe|cook|food|restaurant|cafe|kitchen|bake|meal)\b/i, 'food/drink'],
  [/\b(music|song|band|album|playlist|audio|synth|piano|guitar)\b/i, 'music/audio'],
  [/\b(space|planet|star|galaxy|nebula|astro|cosmos|orbit|solar)\b/i, 'space'],
  [/\b(science|physics|chemistry|biology|quantum|molecule|atom)\b/i, 'science'],
  [/\b(art|gallery|museum|painting|sculpture|exhibition|illustration)\b/i, 'art'],
  [/\b(map|geography|earth|globe|satellite|terrain|geo)\b/i, 'maps/geography'],
  [/\b(code|programming|developer|software|algorithm|api|javascript|python|css)\b/i, 'tech'],
  [/\b(design|typography|font|ux|ui|layout|graphic)\b/i, 'design'],
  [/\b(nature|wildlife|animal|forest|ocean|marine|bird|plant)\b/i, 'nature'],
  [/\b(history|ancient|medieval|century|civilization|war|empire)\b/i, 'culture/history'],
  [/\b(news|journal|reporter|breaking|headline)\b/i, 'news/journalism'],
  [/\b(crypto|bitcoin|blockchain|ethereum|nft|defi|web3)\b/i, 'crypto'],
  [/\b(ai|artificial.intelligence|machine.learning|neural|gpt|llm|chatbot)\b/i, 'ai'],
  [/\b(film|movie|cinema|animation|anime|cartoon|pixar)\b/i, 'film/animation'],
  [/\b(weird|strange|bizarre|odd|random|useless|pointless|absurd)\b/i, 'fun/weird'],
  [/\b(retro|vintage|90s|80s|geocities|old.web|nostalgia)\b/i, 'retro/web'],
  [/\b(book|read|write|author|novel|fiction|literature|poem|story)\b/i, 'reading/writing'],
  [/\b(meme|funny|humor|lol|comedy)\b/i, 'memes'],
  [/\b(hack|tip|trick|lifehack|diy|howto|tutorial)\b/i, 'life-hacks'],
  [/\b(archive|library|collection|museum|preserved|historical)\b/i, 'archives'],
  [/\b(tool|utility|calculator|converter|generator)\b/i, 'tools/utilities'],
  [/\b(shader|generative|creative.cod|webgl|three\.js|p5|processing|canvas)\b/i, 'creative-code'],
]

function categorizeByDomain(domain: string): string | null {
  // Exact match
  if (DOMAIN_MAP[domain]) return DOMAIN_MAP[domain]
  // Try without subdomain
  const parts = domain.split('.')
  if (parts.length > 2) {
    const base = parts.slice(-2).join('.')
    if (DOMAIN_MAP[base]) return DOMAIN_MAP[base]
  }
  return null
}

function categorizeByKeywords(url: string, domain: string): string | null {
  const text = (url + ' ' + domain).toLowerCase()
  for (const [regex, category] of KEYWORD_MAP) {
    if (regex.test(text)) return category
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const cookie = req.cookies.get('chance_admin_token')
    if (!cookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { batchSize = 50 } = body

    // Get uncategorized URLs
    const { data: urls, error } = await supabase
      .from('urls')
      .select('id, url, domain')
      .is('category', null)
      .eq('is_dead', false)
      .order('created_at', { ascending: false })
      .limit(batchSize)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!urls || urls.length === 0) return NextResponse.json({ done: true, categorized: 0, remaining: 0 })

    let categorized = 0
    let skipped = 0

    for (const u of urls) {
      const domain = (u.domain || '').toLowerCase()
      let category = categorizeByDomain(domain)
      if (!category) category = categorizeByKeywords(u.url, domain)

      if (category) {
        await supabase.from('urls').update({ category }).eq('id', u.id)
        categorized++
      } else {
        skipped++
      }
    }

    // Count remaining uncategorized
    const { count } = await supabase
      .from('urls')
      .select('*', { count: 'exact', head: true })
      .is('category', null)
      .eq('is_dead', false)

    return NextResponse.json({
      done: (count || 0) === 0 || (categorized === 0 && skipped > 0),
      categorized,
      skipped,
      remaining: count || 0,
      batchSize,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}

// GET — return stats on uncategorized URLs
export async function GET(req: NextRequest) {
  try {
    const { count: uncategorized } = await supabase
      .from('urls')
      .select('*', { count: 'exact', head: true })
      .is('category', null)
      .eq('is_dead', false)

    const { count: total } = await supabase
      .from('urls')
      .select('*', { count: 'exact', head: true })
      .eq('is_dead', false)

    return NextResponse.json({
      uncategorized: uncategorized || 0,
      total: total || 0,
      categorized: (total || 0) - (uncategorized || 0),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 })
  }
}
