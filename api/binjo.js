// BINJO — MediSearch AI backend
// Cloudflare Worker-compatible endpoint.
// Required secret: OPENAI_API_KEY
// Optional vars: BINJO_MODEL, NCBI_EMAIL, BINJO_ALLOWED_ORIGIN

const cors = (env) => ({
  'Access-Control-Allow-Origin': env.BINJO_ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8'
});

const json = (data, env, status = 200) => new Response(JSON.stringify(data), {status, headers:cors(env)});

async function pubmed(query, env) {
  const base = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
  const searchUrl = new URL(base + 'esearch.fcgi');
  searchUrl.search = new URLSearchParams({db:'pubmed',term:query,retmode:'json',retmax:'6',sort:'relevance',tool:'binjo-medsearch',email:env.NCBI_EMAIL || ''});
  const sr = await fetch(searchUrl);
  if (!sr.ok) throw new Error('PubMed search failed');
  const sd = await sr.json();
  const ids = sd?.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const sumUrl = new URL(base + 'esummary.fcgi');
  sumUrl.search = new URLSearchParams({db:'pubmed',id:ids.join(','),retmode:'json',tool:'binjo-medsearch',email:env.NCBI_EMAIL || ''});
  const rr = await fetch(sumUrl);
  if (!rr.ok) throw new Error('PubMed summary failed');
  const d = await rr.json();
  const result = d.result || {};
  return ids.map(id => {
    const x = result[id] || {};
    return {
      pmid:id,
      title:x.title || 'Untitled article',
      journal:x.fulljournalname || x.source || 'PubMed',
      date:x.pubdate || x.epubdate || '',
      authors:(x.authors || []).slice(0,5).map(a=>a.name).join(', '),
      url:`https://pubmed.ncbi.nlm.nih.gov/${id}/`
    };
  });
}

function buildPrompt(query, mode, sources, hasImage) {
  const sourceText = sources.map((s,i)=>`${i+1}. ${s.title}\nJournal: ${s.journal}\nDate: ${s.date}\nPMID: ${s.pmid}\nURL: ${s.url}`).join('\n\n');
  return `You are BINJO, the medical learning and evidence assistant inside MediSearch.\n\n`+
  `Mode: ${mode}\nUser query: ${query || '(No written question; inspect the uploaded image.)'}\nImage supplied: ${hasImage ? 'Yes' : 'No'}\n\n`+
  `Use the retrieved biomedical records as evidence context. Do not invent citations or claim that a source supports a detail when the record does not establish it. Clearly distinguish visual observations from clinical interpretation, and distinguish established background from uncertain or current-guideline-dependent points.\n\n`+
  `For image analysis, first describe only what is visibly present (including text, labels, patterns or structures). Then explain plausible medical meaning at an educational level. Do not present an image-based interpretation as a definitive diagnosis. State important limitations such as image quality, missing clinical history or need for clinician/radiologist/pathologist review when relevant.\n\n`+
  `Return a useful educational answer with headings appropriate to the mode. For clinical topics, consider definition, causes, pathophysiology, clinical features, investigations, management overview, complications and escalation/red-flag points as appropriate. For Nursing mode, emphasize assessment, nursing priorities, interventions, rationales and patient education. For Clinical Case mode, use history, examination, differentials, investigations, diagnosis, management and follow-up. For Exam/NCLEX mode, provide the question, answer, rationale and key learning point. For Drug Reference mode, organize class, mechanism, indications, contraindications/cautions, adverse effects, interactions and monitoring, while avoiding individualized prescribing. For Compare mode, use a clear comparison structure. For Research mode, synthesize the retrieved literature and identify evidence gaps.\n\n`+
  `Medical safety: this is educational/reference content, not a diagnosis or personalized treatment plan. Recommend professional/emergency care where urgent symptoms warrant it.\n\n`+
  `Retrieved PubMed records:\n${sourceText || 'No PubMed records were retrieved.'}`;
}

async function binjo(query, mode, sources, env, imageData) {
  if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
  const model = env.BINJO_MODEL || 'gpt-5.6-luna';
  const prompt = buildPrompt(query, mode, sources, Boolean(imageData));
  const content = [{type:'input_text', text:prompt}];
  if (imageData) content.push({type:'input_image', image_url:imageData, detail:'high'});

  const response = await fetch('https://api.openai.com/v1/responses', {
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.OPENAI_API_KEY}`},
    body:JSON.stringify({
      model,
      input:[{role:'user',content}]
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed: ${response.status} ${text.slice(0,500)}`);
  }
  const data = await response.json();
  return data.output_text || (data.output || []).flatMap(o=>o.content || []).map(c=>c.text || '').join('\n').trim();
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, {status:204, headers:cors(env)});
    const url = new URL(request.url);
    if (url.pathname !== '/api/binjo' || request.method !== 'POST') return json({error:'Not found'}, env, 404);
    try {
      const body = await request.json();
      const query = String(body?.query || '').trim();
      const mode = String(body?.mode || 'Explain').trim();
      const imageData = typeof body?.imageData === 'string' ? body.imageData.trim() : '';
      if (!query && !imageData) return json({error:'Query or image is required'}, env, 400);
      if (query.length > 1200) return json({error:'Query is too long'}, env, 400);
      if (imageData && (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(imageData) || imageData.length > 12000000)) {
        return json({error:'Image must be a JPEG, PNG, WebP or GIF data URL under the upload limit'}, env, 400);
      }

      const retrievalQuery = query || mode || 'medical image interpretation';
      const sources = await pubmed(retrievalQuery, env);
      const answer = await binjo(query, mode, sources, env, imageData);
      return json({answer, mode, sources, imageAnalyzed:Boolean(imageData)}, env);
    } catch (e) {
      return json({error:'BINJO backend error', detail:e instanceof Error ? e.message : 'Unknown error'}, env, 500);
    }
  }
};
