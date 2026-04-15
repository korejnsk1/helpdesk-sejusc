export function stripCpf(v) {
  return (v || "").replace(/\D/g, "");
}

export function maskCpf(v) {
  const d = stripCpf(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

export function isValidCpf(cpf) {
  const d = stripCpf(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  const calc = (slice, factor) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) sum += parseInt(slice[i], 10) * (factor - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  if (calc(d.slice(0, 9), 10) !== parseInt(d[9], 10)) return false;
  if (calc(d.slice(0, 10), 11) !== parseInt(d[10], 10)) return false;
  return true;
}
