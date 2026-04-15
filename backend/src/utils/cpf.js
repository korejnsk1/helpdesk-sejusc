export function stripCpf(cpf) {
  return (cpf || "").replace(/\D/g, "");
}

export function maskCpf(cpf) {
  const digits = stripCpf(cpf).padStart(11, "0").slice(0, 11);
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function isValidCpf(cpf) {
  const d = stripCpf(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const calc = (slice, factor) => {
    let sum = 0;
    for (let i = 0; i < slice.length; i++) {
      sum += parseInt(slice[i], 10) * (factor - i);
    }
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };

  const dig1 = calc(d.slice(0, 9), 10);
  if (dig1 !== parseInt(d[9], 10)) return false;
  const dig2 = calc(d.slice(0, 10), 11);
  if (dig2 !== parseInt(d[10], 10)) return false;
  return true;
}
