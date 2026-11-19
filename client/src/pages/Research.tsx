import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation } from "wouter";
import { ArrowUpRight, BookOpen, Search, SlidersHorizontal } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Research() {
  const [path] = useLocation();
  const isDiscoveries = path.startsWith("/discoveries");
  const defaultQuery = isDiscoveries ? "recent scientific discoveries" : "astronomy";
  const [draft, setDraft] = useState(defaultQuery);
  const [query, setQuery] = useState(defaultQuery);
  const papers = trpc.science.papers.useQuery({ query }, { staleTime: 120_000, retry: 1 });
  const sourceLabel = papers.data?.provider ?? "Crossref";

  function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (draft.trim().length >= 2) setQuery(draft.trim()); }
  return (
    <div className="page-container research-page">
      <div className="page-heading"><div><div className="section-kicker"><span>04</span> {isDiscoveries ? "DISCOVERY INDEX" : "SCIENCE NEWS & RESEARCH"}</div><h1>{isDiscoveries ? <>Follow the<br /><span>discovery trail.</span></> : <>Read what has<br /><span>been published.</span></>}</h1></div><p>Search real Crossref bibliographic metadata. Each entry links to its DOI record; a title, publisher or date is not a substitute for reading and assessing the underlying work.</p></div>
      <form className="research-search" onSubmit={search}><Search size={18} /><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Search scientific research" aria-label="Search Crossref research metadata" /><button type="submit">Search <ArrowUpRight size={14} /></button></form>
      <div className="research-toolbar"><span><SlidersHorizontal size={14} /> SEARCH RESULTS</span><span>PROVIDER · {sourceLabel.toUpperCase()}</span>{papers.data && <span>RETRIEVED · {new Date(papers.data.fetchedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>}</div>
      {papers.isLoading ? <div className="research-loading">Searching Crossref for “{query}”…</div> : papers.error ? <div className="research-error" role="alert"><BookOpen size={20} /><h2>Source unavailable</h2><p>{papers.error.message}</p><button className="button-outline" onClick={() => void papers.refetch()}>Try again</button></div> : <div className="research-results">{papers.data?.sources.map((paper, index) => <article className="research-result" key={paper.url}><span className="result-index">{String(index + 1).padStart(2, "0")}</span><div className="result-copy"><div className="result-meta"><span>{paper.publisher || "Publisher not listed"}</span>{paper.publishedAt && <span>{paper.publishedAt}</span>}</div><h2>{paper.title}</h2><p>{paper.authors.length ? paper.authors.join(", ") : "Author details not listed in returned metadata"}</p><a href={paper.url} target="_blank" rel="noreferrer">Open DOI record <ArrowUpRight size={13} /></a></div><span className="result-source-pill">CROSSREF RECORD</span></article>)}{!papers.data?.sources.length && <div className="research-error"><BookOpen size={20} /><h2>No records returned</h2><p>Crossref returned no usable records for this query. Try a different phrase.</p></div>}</div>}
      <div className="research-disclaimer"><BookOpen size={15} /><p>Crossref supplies publication metadata. This application does not reproduce article text or claim that metadata validates a paper’s findings. Use the original source and evaluate its methods and evidence.</p></div>
      {isDiscoveries && <section className="historical-discovery"><span className="card-kicker">FEATURED HISTORICAL DISCOVERY · 12 JUL 2022</span><h2>Webb’s Cosmic Cliffs in the Carina Nebula</h2><p>NASA’s James Webb Space Telescope revealed previously obscured star-forming regions in NGC 3324. This dated historical observation is not a new or live discovery feed.</p><a className="text-link" href="https://science.nasa.gov/asset/webb/cosmic-cliffs-in-the-carina-nebula-nircam-image/" target="_blank" rel="noreferrer">Open the NASA image record <ArrowUpRight size={14} /></a></section>}
    </div>
  );
}
