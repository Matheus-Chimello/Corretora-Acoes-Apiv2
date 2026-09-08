const normalizar = (valor) => String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const correspondeAoFiltro = (filtro, valores) => {
    const termo = normalizar(filtro).trim();
    return !termo || valores.some((valor) => normalizar(valor).includes(termo));
};

export const opcoesUnicas = (valores) => [...new Set(
    valores
        .map((valor) => String(valor ?? '').trim())
        .filter(Boolean)
)].sort((primeiro, segundo) => primeiro.localeCompare(segundo, 'pt-BR'));
