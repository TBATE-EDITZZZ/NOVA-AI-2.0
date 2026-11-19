import { Link } from "wouter";
import { ArrowUpRight, BookMarked, Download, FileText, LoaderCircle, Trash2 } from "lucide-react";
import { Streamdown } from "streamdown";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function Library() {
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const library = trpc.workspace.list.useQuery(undefined, { enabled: Boolean(user) && !loading, retry: false });
  const deleteOne = trpc.workspace.delete.useMutation({ onSuccess: () => utils.workspace.list.invalidate() });
  const clearAll = trpc.workspace.clear.useMutation({ onSuccess: () => utils.workspace.list.invalidate() });
  const rows = library.data ?? [];

  function exportReport(record: typeof rows[number]) {
    const sources = record.sources.map((source, index) => `${index + 1}. [${source.title}](${source.url})${source.publishedAt ? ` — ${source.publishedAt}` : ""}`).join("\n");
    const markdown = `# ${record.title}\n\nSaved ${record.createdAt.toISOString()} · ${record.mode}\n\n## Question\n\n${record.question}\n\n## NOVA response\n\n${record.answer}\n\n${sources ? `## Source metadata\n\n${sources}\n\nCrossref bibliographic metadata; not independent validation of paper findings.` : "No sources were requested or returned for this answer."}\n`;
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${record.title.replace(/[^a-z0-9-]/gi, "-").slice(0, 48) || "research"}.md`; anchor.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="page-container library-page">
      <div className="page-heading"><div><div className="section-kicker"><span>08</span> PERSONAL RESEARCH LIBRARY</div><h1>Keep the<br /><span>question alive.</span></h1></div><p>Saved reports are tied to your signed-in account and visible only to their owner. The list does not include your temporary tab-scoped chat history.</p></div>
      {loading ? <div className="library-gate"><LoaderCircle size={18} className="spin" /> Checking your sign-in status…</div>
        : !user ? <div className="library-gate"><div className="library-gate-mark"><BookMarked size={21} /></div><span className="card-kicker">PRIVATE BY DEFAULT</span><h2>Sign in to keep research.</h2><p>Use your Google account to save and retrieve NOVA answers across sessions. Guest exploration remains available without signing in.</p><button className="button-primary" onClick={() => startLogin()}>Continue with Google <ArrowUpRight size={14} /></button><Link className="text-link" href="/nova">Continue as a guest <ArrowUpRight size={13} /></Link></div>
          : library.isLoading ? <div className="library-gate"><LoaderCircle size={18} className="spin" /> Loading your private library…</div>
            : library.error ? <div className="research-error"><BookMarked size={19} /><h2>Library unavailable</h2><p>{library.error.message}</p><button className="button-outline" onClick={() => void library.refetch()}>Try again</button></div>
              : !rows.length ? <div className="library-gate"><div className="library-gate-mark"><FileText size={21} /></div><span className="card-kicker">NO SAVED RESEARCH YET</span><h2>Start with a question.</h2><p>Open NOVA and save an answer to create your first private research snapshot.</p><Link className="button-primary" href="/nova">Ask NOVA <ArrowUpRight size={14} /></Link></div>
                : <><div className="library-toolbar"><span>{rows.length} {rows.length === 1 ? "saved report" : "saved reports"} · newest first</span><button className="small-icon-action danger-action" disabled={clearAll.isPending} onClick={() => { if (window.confirm(`Permanently delete all ${rows.length} saved reports from your library?`)) clearAll.mutate(); }}><Trash2 size={14} /> Delete all</button></div><div className="library-list">{rows.map(record => <article className="library-record" key={record.id}><div className="library-record-top"><span className="library-record-id">NOVA / {String(record.id).padStart(4, "0")}</span><span className="library-record-mode">{record.mode.replaceAll("_", " ").toUpperCase()}</span><span className="library-record-date">{record.createdAt.toLocaleDateString([], { dateStyle: "medium" })}</span></div><h2>{record.title}</h2><div className="library-question"><span>QUESTION</span><p>{record.question}</p></div><details className="library-answer"><summary>Open saved answer <ArrowUpRight size={13} /></summary><div className="library-answer-body"><Streamdown>{record.answer}</Streamdown></div></details>{record.sources.length > 0 && <div className="library-source-links"><span className="card-kicker">SOURCE METADATA SAVED</span>{record.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={12} /></a>)}</div>}<div className="library-record-actions"><button className="small-icon-action" onClick={() => exportReport(record)}><Download size={13} /> Export .md</button><button className="small-icon-action danger-action" disabled={deleteOne.isPending} onClick={() => { if (window.confirm(`Delete “${record.title}” from your research library?`)) deleteOne.mutate({ id: record.id }); }}><Trash2 size={13} /> Delete report</button></div></article>)}</div><p className="library-privacy-note">Saved by account {user.name || "signed in"}. Each database query and mutation is restricted by your authenticated user ID.</p></>}
    </div>
  );
}
