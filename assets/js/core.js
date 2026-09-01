/* Registry. Data files call RM.part({...}) in load order. */
window.RM = (function () {
  const parts = [];
  return {
    parts,
    part(p) { parts.push(p); return p; },
    allNodes() {
      const out = [];
      for (const p of parts)
        for (const g of p.groups)
          for (const n of g.nodes) out.push({ node: n, part: p, group: g });
      return out;
    }
  };
})();
