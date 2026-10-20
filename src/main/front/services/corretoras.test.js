import { describe, expect, it } from 'vitest';
import { getNomeCorretora, isNomeFantasiaGenerico } from './corretoras';

describe('nome de corretora', () => {
    it('trata nomes genericos e ausentes', () => {
        expect(isNomeFantasiaGenerico(null)).toBe(true);
        expect(isNomeFantasiaGenerico(' Filial ')).toBe(true);
        expect(isNomeFantasiaGenerico('Investimentos')).toBe(false);
        expect(getNomeCorretora(null)).toBe('---');
        expect(getNomeCorretora(null, 'Sem corretora')).toBe('Sem corretora');
    });

    it('prefere nome fantasia especifico e usa alternativas quando necessario', () => {
        expect(getNomeCorretora({ nomeFantasia: ' Investimentos ', razaoSocial: 'Empresa' })).toBe('Investimentos');
        expect(getNomeCorretora({ nomeFantasia: 'MATRIZ', razaoSocial: 'Empresa' })).toBe('Empresa');
        expect(getNomeCorretora({ nomeFantasia: 'FILIAL' })).toBe('FILIAL');
        expect(getNomeCorretora({})).toBe('---');
    });
});
