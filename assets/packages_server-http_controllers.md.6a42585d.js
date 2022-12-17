import{_ as s,o as n,c as a,f as l}from"./app.7b3df345.js";const A=JSON.parse('{"title":"Controllers","description":"","frontmatter":{},"headers":[],"relativePath":"packages/server-http/controllers.md"}'),p={name:"packages/server-http/controllers.md"},o=l(`<h1 id="controllers" tabindex="-1">Controllers <a class="header-anchor" href="#controllers" aria-hidden="true">#</a></h1><p>The controllers must be registered in the gap of the common- &amp; error-<a href="./middlewares.html">middlewares</a>.</p><div class="language-typescript"><button title="Copy Code" class="copy"></button><span class="lang">typescript</span><pre class="shiki"><code><span class="line"><span style="color:#89DDFF;">import</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">{</span></span>
<span class="line"><span style="color:#F07178;">    </span><span style="color:#A6ACCD;">registerControllers</span></span>
<span class="line"><span style="color:#89DDFF;">}</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">from</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">@authup/server-http</span><span style="color:#89DDFF;">&quot;</span><span style="color:#89DDFF;">;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#89DDFF;">import</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">{</span><span style="color:#F07178;"> </span><span style="color:#A6ACCD;">Router</span><span style="color:#F07178;"> </span><span style="color:#89DDFF;">}</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">from</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">routup</span><span style="color:#89DDFF;">&quot;</span><span style="color:#89DDFF;">;</span></span>
<span class="line"><span style="color:#89DDFF;">import</span><span style="color:#A6ACCD;"> path </span><span style="color:#89DDFF;">from</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">&quot;</span><span style="color:#C3E88D;">path</span><span style="color:#89DDFF;">&quot;</span><span style="color:#89DDFF;">;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#C792EA;">const</span><span style="color:#A6ACCD;"> router </span><span style="color:#89DDFF;">=</span><span style="color:#A6ACCD;"> </span><span style="color:#89DDFF;">new</span><span style="color:#A6ACCD;"> </span><span style="color:#82AAFF;">Router</span><span style="color:#A6ACCD;">()</span><span style="color:#89DDFF;">;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#676E95;">// Register middlewares</span></span>
<span class="line"><span style="color:#676E95;">/* ... */</span></span>
<span class="line"></span>
<span class="line"><span style="color:#676E95;">// Register controllers</span></span>
<span class="line"><span style="color:#676E95;">/* ... */</span></span>
<span class="line"></span>
<span class="line"><span style="color:#676E95;">// Register controllers</span></span>
<span class="line"><span style="color:#82AAFF;">registerControllers</span><span style="color:#A6ACCD;">(router)</span><span style="color:#89DDFF;">;</span></span>
<span class="line"></span>
<span class="line"><span style="color:#676E95;">// Register error middleware</span></span>
<span class="line"><span style="color:#676E95;">/* ... */</span></span>
<span class="line"></span>
<span class="line"></span>
<span class="line"><span style="color:#A6ACCD;">router</span><span style="color:#89DDFF;">.</span><span style="color:#82AAFF;">listen</span><span style="color:#A6ACCD;">(</span><span style="color:#F78C6C;">3010</span><span style="color:#A6ACCD;">)</span><span style="color:#89DDFF;">;</span></span>
<span class="line"></span></code></pre></div>`,3),e=[o];function r(t,c,D,y,i,F){return n(),a("div",null,e)}const d=s(p,[["render",r]]);export{A as __pageData,d as default};
