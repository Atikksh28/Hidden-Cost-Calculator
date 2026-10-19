/**
 * Builds the "Send to Hidden Cost Calculator" bookmarklet. It runs on the listing page the user
 * is viewing: it reads page text (selection, else <main>/<article>/<body>), plus title/meta/JSON-LD,
 * and opens THIS app with the payload in the URL fragment. No network calls, no remote script,
 * no cookies/storage, no form inputs. The only secret-free thing it knows is the app origin.
 */
export function buildBookmarkletCode(appOrigin: string): string {
  // Minified by hand. '\n' below is a literal backslash-n in the generated code.
  return (
    `(function(){var M=8000,` +
    `s=String(window.getSelection?window.getSelection():'').trim(),` +
    `r=document.querySelector('main')||document.querySelector('article')||document.body,` +
    `b=s||r.innerText,` +
    `m=function(p){var e=document.querySelector('meta[property="'+p+'"],meta[name="'+p+'"]');return e?e.content:''},` +
    `l=Array.prototype.map.call(document.querySelectorAll('script[type="application/ld+json"]'),function(x){return x.textContent}).join('\\n').slice(0,2000),` +
    `t=[document.title,m('og:title'),m('og:description'),l,b].filter(Boolean).join('\\n\\n').slice(0,M),` +
    `p={v:1,url:location.href.slice(0,500),title:document.title.slice(0,300),text:t};` +
    `window.open(${JSON.stringify(appOrigin)}+'/#lx='+encodeURIComponent(JSON.stringify(p)),'_blank','noopener,noreferrer')})();`
  )
}

/** The `javascript:` URL to put on the link / in a manually-created bookmark. */
export function buildBookmarkletHref(appOrigin: string): string {
  return 'javascript:' + encodeURIComponent(buildBookmarkletCode(appOrigin))
}
