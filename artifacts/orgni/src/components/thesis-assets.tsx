import React from "react";

export function Figure1() {
  return (
    <figure className="my-12 p-2 md:p-6 bg-white rounded-xl shadow-2xl flex flex-col items-center group relative overflow-hidden">
      <img
        src={`${import.meta.env.BASE_URL}thesis/orgni-architecture-transformer.png`}
        alt="Orgni Architecture: Live Organizational Intelligence Model (O1)"
        className="w-full max-w-4xl h-auto object-contain rounded-md"
        loading="lazy"
      />
      <figcaption className="mt-6 text-sm text-center text-black/70 font-sans max-w-2xl">
        <strong className="text-black font-bold">Figure 1.</strong> Orgni
        Architecture: Live Organizational Intelligence Model (O1). Detail of the
        decoder-stack showing input embeddings of packed organisational signals,
        positional encoding, and <span className="italic">L</span> decoder
        layers with masked multi-head self-attention and feed-forward networks.
      </figcaption>
    </figure>
  );
}

export function Figure2() {
  return (
    <figure className="my-12 p-2 md:p-6 bg-white rounded-xl shadow-2xl flex flex-col items-center group relative overflow-hidden">
      <img
        src={`${import.meta.env.BASE_URL}thesis/orgni-model-architecture.png`}
        alt="Orgni Model Architecture (O1)"
        className="w-full max-w-4xl h-auto object-contain rounded-md"
        loading="lazy"
      />
      <figcaption className="mt-6 text-sm text-center text-black/70 font-sans max-w-2xl">
        <strong className="text-black font-bold">Figure 2.</strong> Orgni Model
        Architecture (O1). Full specification outlining the Context Compression
        Layer, Multi-Head Latent Attention (MLA), and Mixture of Experts (MoE)
        routing.
      </figcaption>
    </figure>
  );
}

export function Table1() {
  return (
    <div className="my-12 overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[600px]">
        <caption className="mb-4 text-sm text-muted-foreground font-sans text-left">
          <strong className="text-foreground">Table 1.</strong> Context-quality
          comparison across intelligence approaches (illustrative internal
          evaluation targets).
        </caption>
        <thead>
          <tr className="border-b border-border text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <th className="py-4 pl-4 font-normal">Approach</th>
            <th className="py-4 font-normal">Task Accuracy</th>
            <th className="py-4 font-normal">Hallucination Rate</th>
            <th className="py-4 font-normal">Action-Safety</th>
            <th className="py-4 font-normal">Freshness</th>
          </tr>
        </thead>
        <tbody className="text-sm font-sans text-foreground/80">
          <tr className="border-b border-border hover:bg-muted/60 transition-colors">
            <td className="py-4 pl-4 font-medium">No Context</td>
            <td className="py-4 font-mono text-muted-foreground">Low</td>
            <td className="py-4 font-mono text-muted-foreground">High</td>
            <td className="py-4 font-mono text-muted-foreground">Low</td>
            <td className="py-4 font-mono text-muted-foreground">N/A</td>
          </tr>
          <tr className="border-b border-border hover:bg-muted/60 transition-colors">
            <td className="py-4 pl-4 font-medium">Standard RAG</td>
            <td className="py-4 font-mono text-muted-foreground">Medium</td>
            <td className="py-4 font-mono text-muted-foreground">Medium</td>
            <td className="py-4 font-mono text-muted-foreground">Low</td>
            <td className="py-4 font-mono text-muted-foreground">Medium</td>
          </tr>
          <tr className="border-b border-border hover:bg-muted/60 transition-colors">
            <td className="py-4 pl-4 font-medium">Static Knowledge Graph</td>
            <td className="py-4 font-mono text-muted-foreground">High</td>
            <td className="py-4 font-mono text-muted-foreground">Low</td>
            <td className="py-4 font-mono text-muted-foreground">Medium</td>
            <td className="py-4 font-mono text-muted-foreground">Low</td>
          </tr>
          <tr className="border-b-2 border-primary bg-primary/5">
            <td className="py-4 pl-4 font-bold text-primary">
              Orgni Live Context
            </td>
            <td className="py-4 font-mono font-bold text-primary">High</td>
            <td className="py-4 font-mono font-bold text-primary">Very Low</td>
            <td className="py-4 font-mono font-bold text-primary">High</td>
            <td className="py-4 font-mono font-bold text-primary">Real-time</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function Table2() {
  return (
    <div className="my-12 overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[500px]">
        <caption className="mb-4 text-sm text-muted-foreground font-sans text-left">
          <strong className="text-foreground">Table 2.</strong> Orgni O1 Model
          Properties (illustrative architecture specification).
        </caption>
        <thead>
          <tr className="border-b border-border text-xs font-mono uppercase tracking-widest text-muted-foreground">
            <th className="py-4 pl-4 font-normal">Component / Metric</th>
            <th className="py-4 font-normal">Specification</th>
          </tr>
        </thead>
        <tbody className="text-sm font-sans text-foreground/80">
          <tr className="border-b border-border">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              Total Parameters
            </td>
            <td className="py-3 font-mono">~671B</td>
          </tr>
          <tr className="border-b border-border bg-muted/40">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              Active Parameters
            </td>
            <td className="py-3 font-mono text-primary">~37B</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              Transformer Layers (L)
            </td>
            <td className="py-3 font-mono">48</td>
          </tr>
          <tr className="border-b border-border bg-muted/40">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              Attention Heads
            </td>
            <td className="py-3 font-mono">64</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              Hidden Dimension (d_model)
            </td>
            <td className="py-3 font-mono">8192</td>
          </tr>
          <tr className="border-b border-border bg-muted/40">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              FFN Dimension (d_ff)
            </td>
            <td className="py-3 font-mono">32768</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              Context Length
            </td>
            <td className="py-3 font-mono text-primary">128K tokens</td>
          </tr>
          <tr className="border-b border-border bg-muted/40">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              Vocabulary Size
            </td>
            <td className="py-3 font-mono">~256K</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              Attention Mechanism
            </td>
            <td className="py-3 font-mono">
              Multi-Head Latent Attention (MLA)
            </td>
          </tr>
          <tr className="border-b border-border bg-muted/40">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              Feed-Forward Network
            </td>
            <td className="py-3 font-mono">SwiGLU</td>
          </tr>
          <tr className="border-b border-border">
            <td className="py-3 pl-4 font-medium text-muted-foreground">
              Mixture of Experts (MoE)
            </td>
            <td className="py-3 font-mono">64 experts (Top-K=8 routing)</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function FormulaAttention() {
  return (
    <div className="my-10 p-6 md:p-8 bg-muted/40 border border-border rounded-sm overflow-x-auto">
      <div className="font-serif text-lg md:text-xl text-center mb-6 text-foreground tracking-wide whitespace-nowrap">
        <span className="italic mr-2">Attention</span>(Q, K, V) =
        <span className="font-sans ml-2">softmax</span>
        <span className="inline-flex items-center align-middle mx-1">
          <span className="text-3xl font-light leading-none">(</span>
          <span className="inline-flex flex-col text-center px-1">
            <span className="border-b border-foreground/40 pb-0.5 mb-0.5 leading-none italic">
              QK<sup className="text-xs">T</sup>
            </span>
            <span className="leading-none text-sm italic">
              √d<sub className="text-[10px]">k</sub>
            </span>
          </span>
          <span className="text-3xl font-light leading-none">)</span>
        </span>
        <span className="italic">V</span>
      </div>
      <p className="text-sm text-muted-foreground font-sans max-w-2xl mx-auto text-center">
        Scaled dot-product attention mapping queries (
        <span className="italic">Q</span>) and keys (
        <span className="italic">K</span>) to values (
        <span className="italic">V</span>), where{" "}
        <span className="italic">
          d<sub>k</sub>
        </span>{" "}
        is the key dimension. Used concurrently in Multi-Head Latent Attention.
      </p>
    </div>
  );
}

export function FormulaMoE() {
  return (
    <div className="my-10 p-6 md:p-8 bg-muted/40 border border-border rounded-sm overflow-x-auto">
      <div className="font-serif text-lg md:text-xl text-center mb-6 text-foreground tracking-wide whitespace-nowrap flex items-center justify-center">
        <span className="italic mr-2">MoE</span>(x) =
        <span className="inline-flex flex-col items-center justify-center mx-3 align-middle">
          <span className="text-xs italic leading-none">K</span>
          <span className="text-2xl leading-none">∑</span>
          <span className="text-[10px] italic leading-none">i=1</span>
        </span>
        <span className="italic">G</span>(x)
        <sub className="text-xs italic">i</sub>
        <span className="italic ml-2">
          E<sub className="text-xs">i</sub>
        </span>
        (x)
      </div>
      <p className="text-sm text-muted-foreground font-sans max-w-2xl mx-auto text-center">
        Mixture of Experts routing layer computing a weighted sum over the top-
        <span className="italic">K</span> active experts{" "}
        <span className="italic">
          E<sub>i</sub>
        </span>
        (x), with gating weights <span className="italic">G</span>(x)
        <sub>i</sub>.
      </p>
    </div>
  );
}

export function FormulaConfidence() {
  return (
    <div className="my-10 p-6 md:p-8 bg-muted/40 border border-border rounded-sm overflow-x-auto">
      <div className="font-serif text-lg md:text-xl text-center mb-6 text-foreground tracking-wide whitespace-nowrap">
        <span className="italic mr-2 text-primary">C</span>
        <sub className="text-xs italic">rel</sub>(e) =
        <span className="italic ml-3 mr-1">α</span> ·{" "}
        <span className="italic">P</span>(e) +
        <span className="italic ml-3 mr-1">β</span> ·{" "}
        <span className="italic">V</span>(e) -
        <span className="italic ml-3 mr-1">γ</span> ·{" "}
        <span className="italic">D</span>(e)
      </div>
      <p className="text-sm text-muted-foreground font-sans max-w-2xl mx-auto text-center">
        Contextual confidence{" "}
        <span className="italic">
          C<sub>rel</sub>
        </span>{" "}
        of a given event <span className="italic">e</span>, derived from
        Provenance strength (<span className="italic">P</span>), explicit human
        Verification (<span className="italic">V</span>), and decay from
        structural Contradictions (<span className="italic">D</span>).
      </p>
    </div>
  );
}
