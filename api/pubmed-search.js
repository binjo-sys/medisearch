const NCBI_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'public, max-age=60'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response('', { headers: corsHeaders });

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    const max = Math.min(Math.max(Number(url.searchParams.get('max') || 5), 1), 8);

    if (!q) return json({ error: 'Missing q query parameter.' }, 400);
    if (q.length > 300) return json({ error: 'Search query is too long.' }, 400);

    const common = {
      tool: env.NCBI_TOOL || 'MediSearch',
      email: env.NCBI_EMAIL || ''
    };

    try {
      const searchUrl = new URL(`${NCBI_BASE}/esearch.fcgi`);
      searchUrl.search = new URLSearchParams({
        db: 'pubmed',
        term: q,
        retmode: 'json',
        retmax: String(max),
        sort: 'relevance',
        ...common
      });

      const searchResponse = await fetch(searchUrl);
      if (!searchResponse.ok) return json({ error: 'NCBI search request failed.' }, 502);
      const searchData = await searchResponse.json();
      const ids = searchData?.esearchresult?.idlist || [];
      const total = searchData?.esearchresult?.count || '0';

      if (!ids.length) {
        return json({ query: q, total, records: [] });
      }

      const fetchUrl = new URL(`${NCBI_BASE}/efetch.fcgi`);
      fetchUrl.search = new URLSearchParams({
        db: 'pubmed',
        id: ids.join(','),
        retmode: 'xml',
        rettype: 'abstract',
        ...common
      });

      const fetchResponse = await fetch(fetchUrl);
      if (!fetchResponse.ok) return json({ error: 'NCBI abstract request failed.' }, 502);
      const xml = await fetchResponse.text();
      const records = parsePubMedXml(xml, ids);

      return json({
        query: q,
        total,
        source: 'PubMed / NCBI',
        records
      });
    } catch (error) {
      return json({ error: 'PubMed service unavailable.' }, 502);
    }
  }
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function parsePubMedXml(xml, ids) {
  const articles = [];
  const blocks = xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) || [];

  for (const block of blocks) {
    const pmid = text(block, /<PMID[^>]*>(.*?)<\/PMID>/);
    const title = text(block, /<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
    const journal = text(block, /<Title>([\s\S]*?)<\/Title>/);
    const year = text(block, /<PubDate>[\s\S]*?(?:<Year>|<MedlineDate>)(.*?)(?:<\/Year>|<\/MedlineDate>)/);
    const abstractParts = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map(m => strip(m[1]));
    const authors = [...block.matchAll(/<Author>[\s\S]*?<LastName>(.*?)<\/LastName>[\s\S]*?<Initials>(.*?)<\/Initials>[\s\S]*?<\/Author>/g)]
      .slice(0, 4)
      .map(m => `${strip(m[1])} ${strip(m[2])}`);

    articles.push({
      pmid: strip(pmid) || ids[articles.length],
      title: strip(title),
      journal: strip(journal),
      year: strip(year),
      authors,
      abstract: abstractParts.join(' '),
      url: `https://pubmed.ncbi.nlm.nih.gov/${encodeURIComponent(strip(pmid) || ids[articles.length])}/`
    });
  }
  return articles;
}

function text(source, regex) {
  const m = source.match(regex);
  return m ? m[1] : '';
}

function strip(value) {
  return String(value || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
