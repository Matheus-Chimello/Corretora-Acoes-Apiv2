const NOMES_FANTASIA_GENERICOS = new Set([
    'EST UNIF',
    'EST. UNIF',
    'MATRIZ',
    'FILIAL'
]);

export const isNomeFantasiaGenerico = (nomeFantasia) => {
    const nome = (nomeFantasia || '').trim().toUpperCase();
    return !nome || NOMES_FANTASIA_GENERICOS.has(nome);
};

export const getNomeCorretora = (corretora, fallback = '---') => {
    if (!corretora) {
        return fallback;
    }

    if (!isNomeFantasiaGenerico(corretora.nomeFantasia)) {
        return corretora.nomeFantasia.trim();
    }

    return corretora.razaoSocial || corretora.nomeFantasia || fallback;
};
